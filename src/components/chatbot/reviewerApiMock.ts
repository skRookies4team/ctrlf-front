// src/components/chatbot/reviewerApiMock.ts
import type { ReviewWorkItem, WorkItemLock } from "./reviewerDeskTypes";
import type {
  AcquireLockResponse,
  ConflictPayload,
  DecisionRequest,
  DecisionResponse,
  ReviewListParams,
  ReviewListResponse,
  ReleaseLockResponse,
} from "./reviewerApiTypes";
import { ReviewerApiError, type ReviewerApiErrorCode } from "./reviewerApiErrors";
import type { ReviewerApi } from "./reviewerApi";

function nowISO() {
  return new Date().toISOString();
}
function addSecondsISO(sec: number) {
  const d = new Date();
  d.setSeconds(d.getSeconds() + sec);
  return d.toISOString();
}
function randToken() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

type LockRec = {
  token: string;
  ownerId: string;
  ownerName?: string;
  expiresAt: string;
};

// WorkItemLock(owner: string, expiresAt: string)을 만족시키면서 UI 편의 필드를 추가로 얹은 확장 타입
type WorkItemLockExt = WorkItemLock & {
  ownerId?: string;
  ownerName?: string;
};

// ReviewWorkItem 확장 타입(이 파일 내부 store용)
type ReviewWorkItemExt = Omit<ReviewWorkItem, "lock"> & {
  lock?: WorkItemLockExt;
  rejectReason?: string;
  updatedAt?: string;
};

function isExpired(iso: string) {
  return Date.now() > new Date(iso).getTime();
}

function toLockView(l: LockRec): WorkItemLockExt {
  const displayOwner = (l.ownerName ?? "").trim() || l.ownerId; // owner는 string 필수
  return {
    owner: displayOwner,
    expiresAt: l.expiresAt,
    ownerId: l.ownerId,
    ownerName: l.ownerName,
  };
}

export function createReviewerApiMock(opts?: {
  initialItems?: ReviewWorkItem[];
  me?: { id: string; name?: string };
  lockTtlSec?: number;
}): ReviewerApi {
  const me = opts?.me ?? { id: "me", name: "나(로컬)" };
  const lockTtlSec = opts?.lockTtlSec ?? 90;

  const store = new Map<string, ReviewWorkItemExt>();
  const locks = new Map<string, LockRec>();

  (opts?.initialItems ?? []).forEach((it) => store.set(it.id, it as ReviewWorkItemExt));

  function getLock(id: string): LockRec | null {
    const l = locks.get(id);
    if (!l) return null;
    if (isExpired(l.expiresAt)) {
      locks.delete(id);
      return null;
    }
    return l;
  }

  function conflict(code: ConflictPayload["code"], current?: Partial<ReviewWorkItemExt>): never {
    const payload: ConflictPayload = {
      code,
      current,
      message: "다른 사용자에 의해 변경되었습니다.",
    };

    // ConflictPayload["code"]는 더 좁은 유니온이고, ReviewerApiErrorCode는 더 넓은 유니온일 가능성이 높음.
    // 여기서는 실제 충돌 컨텍스트이므로 캐스팅으로 정리.
    throw new ReviewerApiError(payload.message ?? "충돌", {
      status: 409,
      code: code as ReviewerApiErrorCode,
      details: payload,
    });
  }

  return {
    async listWorkItems(params: ReviewListParams): Promise<ReviewListResponse> {
      const items = Array.from(store.values()).filter((it) => {
        if (params.tab === "REVIEW_PENDING") return it.status === "REVIEW_PENDING";
        if (params.tab === "APPROVED") return it.status === "APPROVED";
        if (params.tab === "REJECTED") return it.status === "REJECTED";
        return true;
      });

      const q = (params.q ?? "").trim().toLowerCase();
      const filtered = q
        ? items.filter((it) => {
            const hay = `${it.title ?? ""} ${it.department ?? ""} ${it.creatorName ?? ""}`.toLowerCase();
            return hay.includes(q);
          })
        : items;

      return { items: filtered, nextCursor: undefined };
    },

    async getWorkItem(id: string): Promise<ReviewWorkItem> {
      const item = store.get(id);
      if (!item) throw new ReviewerApiError("항목을 찾을 수 없습니다.", { status: 404, code: "NOT_FOUND" });
      return item as ReviewWorkItem;
    },

    async acquireLock(id: string): Promise<AcquireLockResponse> {
      const item = store.get(id);
      if (!item) throw new ReviewerApiError("항목을 찾을 수 없습니다.", { status: 404, code: "NOT_FOUND" });

      const l = getLock(id);
      if (l && l.ownerId !== me.id) {
        conflict("LOCK_CONFLICT", item);
      }

      const token = randToken();
      const lock: LockRec = {
        token,
        ownerId: me.id,
        ownerName: me.name,
        expiresAt: addSecondsISO(lockTtlSec),
      };
      locks.set(id, lock);

      // UI 반영(목록에서 락 표시)
      const patched: ReviewWorkItemExt = {
        ...item,
        lock: toLockView(lock),
      };
      store.set(id, patched);

      return {
        lockToken: token,
        expiresAt: lock.expiresAt,
        ownerId: lock.ownerId,
        ownerName: lock.ownerName,
      };
    },

    async releaseLock(id: string, lockToken: string): Promise<ReleaseLockResponse> {
      const l = getLock(id);
      if (!l) return { released: true };
      if (l.token !== lockToken) {
        return { released: false };
      }
      locks.delete(id);

      const item = store.get(id);
      if (item) {
        const patched: ReviewWorkItemExt = { ...item, lock: undefined };
        store.set(id, patched);
      }
      return { released: true };
    },

    async approve(id: string, req: DecisionRequest): Promise<DecisionResponse> {
      const item = store.get(id);
      if (!item) throw new ReviewerApiError("항목을 찾을 수 없습니다.", { status: 404, code: "NOT_FOUND" });

      const l = getLock(id);
      if (!l || l.token !== req.lockToken) conflict("LOCK_CONFLICT", item);

      if (item.version !== req.version) conflict("VERSION_CONFLICT", item);
      if (item.status !== "REVIEW_PENDING") conflict("ALREADY_PROCESSED", item);

      const next: ReviewWorkItemExt = {
        ...item,
        status: "APPROVED",
        version: item.version + 1,
        lastUpdatedAt: nowISO(),
        approvedAt: item.approvedAt ?? nowISO(),
      };

      store.set(id, next);
      return { item: next };
    },

    async reject(id: string, req: DecisionRequest): Promise<DecisionResponse> {
      const item = store.get(id);
      if (!item) throw new ReviewerApiError("항목을 찾을 수 없습니다.", { status: 404, code: "NOT_FOUND" });

      const l = getLock(id);
      if (!l || l.token !== req.lockToken) conflict("LOCK_CONFLICT", item);

      if (item.version !== req.version) conflict("VERSION_CONFLICT", item);
      if (item.status !== "REVIEW_PENDING") conflict("ALREADY_PROCESSED", item);

      const next: ReviewWorkItemExt = {
        ...item,
        status: "REJECTED",
        rejectReason: req.reason ?? "",
        version: item.version + 1,
        lastUpdatedAt: nowISO(),
        rejectedAt: item.rejectedAt ?? nowISO(),
      };

      store.set(id, next);
      return { item: next };
    },
  };
}
