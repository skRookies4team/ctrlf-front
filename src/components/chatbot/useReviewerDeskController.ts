// src/components/chatbot/useReviewerDeskController.ts
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createMockReviewWorkItems,
  formatDateTime,
  mutateMockForConflict,
} from "./reviewerDeskMocks";
import type {
  AuditAction,
  ContentCategory,
  PiiRiskLevel,
  ReviewStatus,
  ReviewWorkItem,
  WorkItemLock,
} from "./reviewerDeskTypes";

import { getReviewerApi, type ReviewerApi } from "./reviewerApi";
import { createReviewerApiMock } from "./reviewerApiMock";
import { isReviewerApiError } from "./reviewerApiErrors";
import type { ConflictPayload } from "./reviewerApiTypes";

export type ReviewerTabId = "pending" | "approved" | "rejected" | "my";
export type DetailTabId = "preview" | "script" | "checks" | "audit";
export type SortMode = "newest" | "risk";
export type ListMode = "paged" | "virtual";

export type ToastState =
  | { open: false }
  | { open: true; tone: "neutral" | "warn" | "danger"; message: string };

export type DecisionModalState =
  | { open: false; kind: null }
  | { open: true; kind: "approve"; message: string }
  | { open: true; kind: "reject"; reason: string; error?: string };

type BusyState =
  | { busy: false }
  | { busy: true; itemId: string; kind: "approve" | "reject"; startedAt: string };

type GuardTone = "neutral" | "warn" | "danger";
type GuardPill = { tone: GuardTone; label: string; detail?: string };
type GuardRow = { allowed: boolean; pills: GuardPill[] };

export type ActionGuardInfo = {
  headline: string;
  approve: GuardRow;
  reject: GuardRow;
};

export interface UseReviewerDeskControllerOptions {
  reviewerName?: string;
}

function getEnvString(key: string): string | undefined {
  const env = import.meta.env as unknown as Record<string, unknown>;
  const v = env[key];
  return typeof v === "string" ? v : undefined;
}

function statusLabel(s: ReviewStatus) {
  switch (s) {
    case "REVIEW_PENDING":
      return "검토 대기";
    case "APPROVED":
      return "승인됨";
    case "REJECTED":
      return "반려됨";
  }
}

function statusTone(s: ReviewStatus): "neutral" | "warn" | "danger" {
  switch (s) {
    case "REVIEW_PENDING":
      return "warn";
    case "APPROVED":
      return "neutral";
    case "REJECTED":
      return "danger";
  }
}

function categoryLabel(c: ContentCategory) {
  switch (c) {
    case "MANDATORY":
      return "4대 의무교육";
    case "JOB":
      return "직무교육";
    case "POLICY":
      return "사규/정책";
    case "OTHER":
      return "기타";
  }
}

function piiTone(level: PiiRiskLevel): "neutral" | "warn" | "danger" {
  if (level === "high") return "danger";
  if (level === "medium") return "warn";
  return "neutral";
}

function readLockOwnerName(lock: unknown): string | undefined {
  if (!lock || typeof lock !== "object") return undefined;
  const l = lock as Record<string, unknown>;

  const ownerName = l["ownerName"];
  if (typeof ownerName === "string" && ownerName.trim()) return ownerName.trim();

  const owner = l["owner"];
  if (typeof owner === "string" && owner.trim()) return owner.trim();

  // 레거시 방어 (owner: {name})
  if (owner && typeof owner === "object") {
    const o = owner as Record<string, unknown>;
    const nm = o["name"];
    if (typeof nm === "string" && nm.trim()) return nm.trim();
  }
  return undefined;
}

function readLockExpiresAt(lock: unknown): string | undefined {
  if (!lock || typeof lock !== "object") return undefined;
  const l = lock as Record<string, unknown>;
  const exp = l["expiresAt"];
  return typeof exp === "string" ? exp : undefined;
}

type WorkItemLockView = WorkItemLock & {
  ownerId?: string;
  ownerName?: string;
};

// 내부 상태에서는 lock을 확장 형태로 관리
type ReviewWorkItemExt = Omit<ReviewWorkItem, "lock"> & {
  lock?: WorkItemLockView;
  rejectReason?: string;
  updatedAt?: string;
};

type LockState =
  | { kind: "idle" }
  | { kind: "locking"; itemId: string }
  | {
      kind: "locked";
      itemId: string;
      lockToken: string;
      expiresAt?: string;
      ownerName?: string;
    }
  | { kind: "blocked"; itemId: string; ownerName?: string; expiresAt?: string };

function formatConflictToast(payload?: ConflictPayload) {
  const code = payload?.code;
  if (code === "LOCK_CONFLICT")
    return {
      tone: "warn" as const,
      message: "다른 검토자가 먼저 처리 중입니다. 잠시 후 다시 시도하세요.",
    };
  if (code === "VERSION_CONFLICT")
    return {
      tone: "warn" as const,
      message: "다른 사용자에 의해 변경되었습니다. 최신 상태로 갱신합니다.",
    };
  if (code === "ALREADY_PROCESSED")
    return {
      tone: "warn" as const,
      message: "이미 처리된 항목입니다. 최신 상태를 확인하세요.",
    };
  return {
    tone: "warn" as const,
    message: "동시성 충돌이 발생했습니다. 최신 상태로 갱신합니다.",
  };
}

export function useReviewerDeskController(options: UseReviewerDeskControllerOptions) {
  const effectiveReviewerName = options.reviewerName ?? "Reviewer";

  const apiModeRaw = getEnvString("VITE_REVIEWER_API_MODE");
  const apiMode: "mock" | "http" = apiModeRaw === "http" ? "http" : "mock";
  const isHttpMode = apiMode === "http";

  // ===== mock data (운영 시나리오 + 대량 생성 지원) =====
  const [datasetKey, setDatasetKey] = useState<"base" | "load">("base");

  const seedItems = useMemo((): ReviewWorkItemExt[] => {
    const preset = datasetKey === "load" ? "load" : "base";
    const total = datasetKey === "load" ? 800 : 120;
    const seed = datasetKey === "load" ? 23 : 7;
    return createMockReviewWorkItems({
      preset,
      reviewerName: effectiveReviewerName,
      total,
      seed,
    }) as ReviewWorkItemExt[];
  }, [datasetKey, effectiveReviewerName]);

  // Reviewer API 인스턴스 (mock 모드에서는 seedItems로 store를 구성)
  const apiRef = useRef<ReviewerApi | null>(null);
  if (!apiRef.current) {
    apiRef.current = isHttpMode
      ? getReviewerApi()
      : createReviewerApiMock({
          initialItems: seedItems,
          me: { id: effectiveReviewerName, name: effectiveReviewerName },
        });
  }

  // http 모드: 최초 refresh로 세팅 / mock 모드: seedItems로 초기화
  const [items, setItems] = useState<ReviewWorkItemExt[]>(() =>
    isHttpMode ? [] : seedItems
  );

  // 탭/필터/정렬
  const [activeTab, setActiveTab] = useState<ReviewerTabId>("pending");
  const [detailTab, setDetailTab] = useState<DetailTabId>("preview");
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [riskOnly, setRiskOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    if (activeTab === "pending" && onlyMine) setOnlyMine(false);
  }, [activeTab, onlyMine]);

  // 리스트 모드(페이지/가상스크롤)
  const [listMode, setListMode] = useState<ListMode>(() =>
    (isHttpMode ? 0 : seedItems.length) >= 260 ? "virtual" : "paged"
  );
  const [pageSize, setPageSize] = useState<number>(30);
  const [pageIndex, setPageIndex] = useState<number>(0);

  // 선택
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // notes
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  // overlays
  const [decisionModal, setDecisionModal] = useState<DecisionModalState>({
    open: false,
    kind: null,
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  // busy / toast
  const [busy, setBusy] = useState<BusyState>({ busy: false });
  const [toast, setToast] = useState<ToastState>({ open: false });
  const toastTimerRef = useRef<number | null>(null);

  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(
    new Date().toISOString()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // decision optimistic-lock context (+ lockToken)
  const decisionCtxRef = useRef<{ itemId: string; version: number; lockToken: string } | null>(
    null
  );

  // lock state
  const [lockState, setLockState] = useState<LockState>({ kind: "idle" });
  const decisionLockRef = useRef<{ itemId: string; lockToken: string } | null>(null);
  const lockReqSeqRef = useRef(0);

  const isBusy = busy.busy;
  const isOverlayOpen = decisionModal.open || previewOpen;

  // busy timer label
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    if (!busy.busy) return;
    setNowTs(Date.now());
    const id = window.setInterval(() => setNowTs(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [busy.busy]);

  const busyText = useMemo(() => {
    if (!busy.busy) return null;
    const elapsedMs = Math.max(0, nowTs - new Date(busy.startedAt).getTime());
    const sec = Math.round(elapsedMs / 100) / 10;
    const kind = busy.kind === "approve" ? "승인" : "반려";
    return `${kind} 처리 중 · ${sec.toFixed(1)}s`;
  }, [busy, nowTs]);

  const lastRefreshedAtLabel = useMemo(
    () => formatDateTime(lastRefreshedAt),
    [lastRefreshedAt]
  );

  const closeToast = () => setToast({ open: false });

  const showToast = (tone: "neutral" | "warn" | "danger", message: string) => {
    setToast({ open: true, tone, message });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast({ open: false });
      toastTimerRef.current = null;
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  const isRiskItem = (it: ReviewWorkItem) => {
    const pii = it.autoCheck.piiRiskLevel;
    const banned = it.autoCheck.bannedWords?.length ?? 0;
    const qwarn = it.autoCheck.qualityWarnings?.length ?? 0;
    return pii === "high" || pii === "medium" || banned > 0 || qwarn > 0;
  };

  useEffect(() => {
    return () => {
      // 언마운트 시 남은 락 해제(상태 업데이트는 의미 없으니 API만 best-effort)
      const cur = decisionLockRef.current;
      if (cur) {
        void apiRef.current?.releaseLock(cur.itemId, cur.lockToken).catch(() => {});
        decisionLockRef.current = null;
      }
      decisionCtxRef.current = null;
      lockReqSeqRef.current += 1;
    };
  }, []);

  // ===== patch helpers =====
  const patchItemInState = (next: ReviewWorkItemExt) => {
    setItems((prev) => {
      let found = false;
      const out = prev.map((it) => {
        if (it.id !== next.id) return it;
        found = true;
        return next;
      });
      if (!found) out.unshift(next);
      return out;
    });
  };

  const patchItemLock = (itemId: string, lock?: WorkItemLockView) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const patched: ReviewWorkItemExt = { ...it, lock };
        return patched;
      })
    );
  };

  const mergeUniqueById = (lists: ReviewWorkItemExt[][]) => {
    const map = new Map<string, ReviewWorkItemExt>();
    for (const arr of lists) for (const it of arr) map.set(it.id, it);
    return Array.from(map.values());
  };

  // ===== refreshAllFromApi =====
  const refreshAllFromApi = async (opts?: { silent?: boolean; force?: boolean }) => {
    if (!opts?.force) {
      if (isBusy) return;
    }
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const api = apiRef.current!;
      const [p, a, r] = await Promise.all([
        api.listWorkItems({ tab: "REVIEW_PENDING", limit: 2000 }),
        api.listWorkItems({ tab: "APPROVED", limit: 2000 }),
        api.listWorkItems({ tab: "REJECTED", limit: 2000 }),
      ]);

      const merged = mergeUniqueById([
        p.items as ReviewWorkItemExt[],
        a.items as ReviewWorkItemExt[],
        r.items as ReviewWorkItemExt[],
      ]);

      setItems(merged);
      setLastRefreshedAt(new Date().toISOString());
      if (!opts?.silent) showToast("neutral", "새로고침 완료");
    } catch (err) {
      if (import.meta.env.DEV)
        console.warn("[ReviewerDesk] refreshAllFromApi failed", err);
      showToast("danger", "새로고침에 실패했습니다.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // http 모드: 최초 1회 로딩
  useEffect(() => {
    if (!isHttpMode) return;
    void refreshAllFromApi({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHttpMode]);

  // datasetKey 변경 시(mock) api store 재시드 + 상태 초기화
  useEffect(() => {
    if (isHttpMode) return;

    // 기존 락이 있으면 best-effort 해제 (mock에서도 상태 꼬임 방지)
    const cur = decisionLockRef.current;
    if (cur) {
      void apiRef.current?.releaseLock(cur.itemId, cur.lockToken).catch(() => {});
      decisionLockRef.current = null;
    }

    apiRef.current = createReviewerApiMock({
      initialItems: seedItems,
      me: { id: effectiveReviewerName, name: effectiveReviewerName },
    });

    setItems(seedItems);
    setActiveTab("pending");
    setDetailTab("preview");
    setQuery("");
    setOnlyMine(false);
    setRiskOnly(false);
    setSortMode("newest");
    setPageIndex(0);
    setListMode(seedItems.length >= 260 ? "virtual" : "paged");
    setSelectedId(null);
    setLastRefreshedAt(new Date().toISOString());
    setLockState({ kind: "idle" });
    decisionCtxRef.current = null;

  }, [datasetKey, seedItems, isHttpMode, effectiveReviewerName]);

  // ===== counts =====
  const counts = useMemo(() => {
    const pending = items.filter((i) => i.status === "REVIEW_PENDING").length;
    const approved = items.filter((i) => i.status === "APPROVED").length;
    const rejected = items.filter((i) => i.status === "REJECTED").length;
    const mine = items.filter((i) => i.audit.some((a) => a.actor === effectiveReviewerName)).length;
    return { pending, approved, rejected, my: mine };
  }, [items, effectiveReviewerName]);

  // ===== filtered =====
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const byTab = items.filter((it) => {
      if (activeTab === "pending") return it.status === "REVIEW_PENDING";
      if (activeTab === "approved") return it.status === "APPROVED";
      if (activeTab === "rejected") return it.status === "REJECTED";
      return it.audit.some((a) => a.actor === effectiveReviewerName);
    });

    const byMine = onlyMine
      ? byTab.filter((it) => it.audit.some((a) => a.actor === effectiveReviewerName))
      : byTab;
    const byRisk = riskOnly ? byMine.filter((it) => isRiskItem(it)) : byMine;

    const byQuery = q
      ? byRisk.filter((it) => {
          const hay = `${it.title} ${it.department} ${it.creatorName}`.toLowerCase();
          return hay.includes(q);
        })
      : byRisk;

    const list = [...byQuery];

    const riskRank = (it: ReviewWorkItem) => {
      const pii = it.autoCheck.piiRiskLevel;
      const piiScore = pii === "high" ? 100 : pii === "medium" ? 60 : pii === "low" ? 20 : 0;
      const banned = (it.autoCheck.bannedWords?.length ?? 0) * 15;
      const qwarn = (it.autoCheck.qualityWarnings?.length ?? 0) * 8;
      const base = it.riskScore ?? 0;
      return piiScore + banned + qwarn + base;
    };

    if (sortMode === "risk") {
      list.sort((a, b) => {
        const diff = riskRank(b) - riskRank(a);
        if (diff !== 0) return diff;
        return a.submittedAt < b.submittedAt ? 1 : -1;
      });
      return list;
    }

    list.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    return list;
  }, [items, activeTab, query, onlyMine, riskOnly, sortMode, effectiveReviewerName]);

  // pagination 계산
  const totalPages = useMemo(() => {
    if (listMode === "virtual") return 1;
    return Math.max(1, Math.ceil(filtered.length / pageSize));
  }, [filtered.length, pageSize, listMode]);

  useEffect(() => {
    if (listMode === "virtual") return;
    if (pageIndex > totalPages - 1) setPageIndex(totalPages - 1);
  }, [pageIndex, totalPages, listMode]);

  const pageItems = useMemo(() => {
    if (listMode === "virtual") return filtered;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, listMode, pageIndex, pageSize]);

  // selection 유지/초기화
  const selectionFrozen = isOverlayOpen || isBusy || lockState.kind === "locking";

  useEffect(() => {
    if (selectionFrozen) return; // overlay/처리/락확보 중에는 선택 자동 변경 금지

    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }

    setSelectedId((prev) => {
      if (!prev) return filtered[0].id;
      const exists = filtered.some((f) => f.id === prev);
      return exists ? prev : filtered[0].id;
    });
  }, [filtered, selectionFrozen]);

  // paged 모드에서 선택 항목이 페이지 밖이면 페이지 이동
  useEffect(() => {
    if (listMode === "virtual") return;
    if (!selectedId) return;
    const idx = filtered.findIndex((f) => f.id === selectedId);
    if (idx < 0) return;
    const nextPage = Math.floor(idx / pageSize);
    if (nextPage !== pageIndex) setPageIndex(nextPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, listMode, pageSize, filtered.length]);

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return filtered.findIndex((f) => f.id === selectedId);
  }, [filtered, selectedId]);

  const selectedItem = useMemo((): ReviewWorkItemExt | null => {
    if (!selectedId) return null;
    return items.find((i) => i.id === selectedId) ?? null;
  }, [items, selectedId]);

  const busyKindForSelected = useMemo(() => {
    if (!busy.busy) return null;
    if (!selectedItem) return null;
    if (busy.itemId !== selectedItem.id) return null;
    return busy.kind;
  }, [busy, selectedItem]);

  const approveProcessing = busyKindForSelected === "approve";
  const rejectProcessing = busyKindForSelected === "reject";

  const canApprove = !!selectedItem && selectedItem.status === "REVIEW_PENDING";
  const canReject = !!selectedItem && selectedItem.status === "REVIEW_PENDING";

  // ===== audit helpers =====
  const appendAudit = (itemId: string, action: AuditAction, detail?: string) => {
    const at = new Date().toISOString();
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          audit: [
            ...it.audit,
            {
              id: `aud-${Math.random().toString(36).slice(2, 10)}`,
              at,
              actor: action === "AUTO_CHECKED" || action === "PUBLISHED" ? "SYSTEM" : effectiveReviewerName,
              action,
              detail,
            },
          ],
          lastUpdatedAt: at,
        };
      })
    );
  };

  // ===== lock helpers =====
  const releaseDecisionLockSafely = async () => {
    const cur = decisionLockRef.current;
    if (!cur) {
      setLockState({ kind: "idle" });
      return;
    }

    decisionLockRef.current = null;
    try {
      await apiRef.current!.releaseLock(cur.itemId, cur.lockToken);
    } catch {
      // TTL 기반 회복 가정: 치명 처리 금지
    } finally {
      patchItemLock(cur.itemId, undefined);
      setLockState({ kind: "idle" });
    }
  };

  const acquireDecisionLock = async (itemId: string) => {
    const api = apiRef.current!;
    setLockState({ kind: "locking", itemId });

    try {
      const r = await api.acquireLock(itemId);
      decisionLockRef.current = { itemId, lockToken: r.lockToken };

      patchItemLock(itemId, {
        owner: (r.ownerName ?? effectiveReviewerName).trim() || r.ownerId,
        ownerId: r.ownerId,
        ownerName: r.ownerName ?? effectiveReviewerName,
        expiresAt: r.expiresAt,
      });

      setLockState({
        kind: "locked",
        itemId,
        lockToken: r.lockToken,
        expiresAt: r.expiresAt,
        ownerName: r.ownerName ?? effectiveReviewerName,
      });

      return r;
    } catch (err: unknown) {
      if (isReviewerApiError(err) && err.status === 409) {
        const payload = err.details as ConflictPayload | undefined;

        if (payload?.code === "LOCK_CONFLICT") {
          const cur = (payload.current ?? undefined) as Partial<ReviewWorkItemExt> | undefined;
          const ownerName = readLockOwnerName(cur?.lock as unknown);
          const expiresAt = readLockExpiresAt(cur?.lock as unknown);

          setLockState({ kind: "blocked", itemId, ownerName, expiresAt });
          showToast("warn", "다른 검토자가 먼저 처리 중입니다.");
          return null;
        }
      }

      setLockState({ kind: "idle" });
      showToast("danger", "락 확보에 실패했습니다.");
      return null;
    }
  };

  // ===== action guard =====
  const actionGuard: ActionGuardInfo | null = useMemo(() => {
    if (!selectedItem) return null;

    const statusBlock = selectedItem.status !== "REVIEW_PENDING";
    const overlayBlock = decisionModal.open || previewOpen;
    const busyBlock = busy.busy;

    const lockBlockingForSelected =
      (lockState.kind === "locking" && lockState.itemId === selectedItem.id) ||
      (lockState.kind === "blocked" && lockState.itemId === selectedItem.id);

    const commonBlockers: GuardPill[] = [];

    if (lockBlockingForSelected) {
      if (lockState.kind === "locking") {
        commonBlockers.push({
          tone: "warn",
          label: "락 확보 중",
          detail: "다른 검토자와의 충돌을 방지하기 위해 잠시 대기합니다.",
        });
      } else {
        commonBlockers.push({
          tone: "warn",
          label: "다른 검토자가 처리 중",
          detail: lockState.ownerName
            ? `처리자: ${lockState.ownerName}${
                lockState.expiresAt ? ` · 만료 ${formatDateTime(lockState.expiresAt)}` : ""
              }`
            : "잠시 후 다시 시도하세요.",
        });
      }
    }

    if (decisionModal.open) {
      commonBlockers.push({
        tone: "warn",
        label: "결정 모달 열림",
        detail: "모달을 닫은 뒤 승인/반려를 진행할 수 있습니다.",
      });
    } else if (previewOpen) {
      commonBlockers.push({
        tone: "warn",
        label: "확대 미리보기 열림",
        detail: "미리보기를 닫은 뒤 승인/반려를 진행할 수 있습니다.",
      });
    }

    if (busy.busy) {
      const isSameItem = selectedItem.id === busy.itemId;
      const kindLabel = busy.kind === "approve" ? "승인" : "반려";
      commonBlockers.push({
        tone: "warn",
        label: isSameItem ? `현재 항목 ${kindLabel} 처리 중` : `다른 항목 ${kindLabel} 처리 중`,
        detail: "처리가 끝나면 다시 시도하세요.",
      });
    }

    if (statusBlock) {
      commonBlockers.push({
        tone: "warn",
        label: `상태: ${statusLabel(selectedItem.status)}`,
        detail: "승인/반려는 '검토 대기' 상태에서만 가능합니다.",
      });
    }

    const approveAllowed =
      commonBlockers.length === 0 && !overlayBlock && !busyBlock && !statusBlock && !lockBlockingForSelected;
    const rejectAllowed =
      commonBlockers.length === 0 && !overlayBlock && !busyBlock && !statusBlock && !lockBlockingForSelected;

    const approvePills: GuardPill[] = approveAllowed
      ? [{ tone: "neutral", label: "승인 시 즉시 공개", detail: "승인(APPROVED) 후 자동 공개(PUBLISHED) 이력이 함께 기록됩니다." }]
      : commonBlockers;

    const rejectPills: GuardPill[] = rejectAllowed
      ? [{ tone: "neutral", label: "반려 사유 필수", detail: "반려 사유는 제작자에게 전달되며, 감사 이력에 기록됩니다." }]
      : commonBlockers;

    const headline = approveAllowed && rejectAllowed ? "처리 가이드" : "실행 제한 사유";

    return {
      headline,
      approve: { allowed: approveAllowed, pills: approvePills },
      reject: { allowed: rejectAllowed, pills: rejectPills },
    };
  }, [selectedItem, decisionModal.open, previewOpen, busy, lockState]);

  // ===== handlers =====
  const handleRefresh = async () => {
    if (isBusy) return;
    await refreshAllFromApi();
  };

  const moveSelection = (delta: number) => {
    if (filtered.length === 0) return;
    const curIdx = Math.max(0, filtered.findIndex((f) => f.id === selectedId));
    const next = Math.min(filtered.length - 1, Math.max(0, curIdx + delta));
    const nextId = filtered[next]?.id;
    if (nextId) setSelectedId(nextId);
  };

  const closeDecisionModal = () => {
    lockReqSeqRef.current += 1; // in-flight acquire 결과 무효화(취소 토큰 역할)
    setDecisionModal({ open: false, kind: null });
    decisionCtxRef.current = null;
    void releaseDecisionLockSafely();
  };

  const openApproveModal = () => {
    if (!selectedItem) return;
    if (selectedItem.status !== "REVIEW_PENDING") return showToast("warn", "현재 상태에서는 승인할 수 없습니다.");
    if (isBusy) return;
    if (decisionModal.open || previewOpen) return;

    const itemId = selectedItem.id;
    const itemVersion = selectedItem.version;
    const message = `'${selectedItem.title}' 항목을 승인합니다. 승인 시 즉시 공개(PUBLISHED) 처리됩니다.`;

    const seq = ++lockReqSeqRef.current;

    void (async () => {
      const lock = await acquireDecisionLock(itemId);
      if (!lock) return;

      if (lockReqSeqRef.current !== seq || selectedIdRef.current !== itemId) {
        await releaseDecisionLockSafely();
        return;
      }

      decisionCtxRef.current = { itemId, version: itemVersion, lockToken: lock.lockToken };
      setDecisionModal({ open: true, kind: "approve", message });
    })();
  };

  const openRejectModal = () => {
    if (!selectedItem) return;
    if (selectedItem.status !== "REVIEW_PENDING") return showToast("warn", "현재 상태에서는 반려할 수 없습니다.");
    if (isBusy) return;
    if (decisionModal.open || previewOpen) return;

    const itemId = selectedItem.id;
    const itemVersion = selectedItem.version;
    const seq = ++lockReqSeqRef.current;

    void (async () => {
      const lock = await acquireDecisionLock(itemId);
      if (!lock) return;

      if (lockReqSeqRef.current !== seq || selectedIdRef.current !== itemId) {
        await releaseDecisionLockSafely();
        return;
      }

      decisionCtxRef.current = { itemId, version: itemVersion, lockToken: lock.lockToken };
      setDecisionModal({ open: true, kind: "reject", reason: "" });
    })();
  };

  const ensureDecisionFresh = (expected: { itemId: string; version: number }) => {
    const cur = items.find((i) => i.id === expected.itemId);
    if (!cur) return { ok: false as const, reason: "해당 항목을 찾을 수 없습니다." };
    if (cur.version !== expected.version)
      return { ok: false as const, reason: "다른 사용자에 의해 변경되었습니다. 새로고침 후 다시 시도하세요." };
    if (cur.status !== "REVIEW_PENDING")
      return { ok: false as const, reason: "이미 처리된 항목입니다. 상태를 확인하세요." };
    return { ok: true as const, item: cur };
  };

  const normalizeDecisionResult = (item: ReviewWorkItemExt, kind: "approve" | "reject", reason?: string) => {
    const now = new Date().toISOString();
    const patched: ReviewWorkItemExt = { ...item };

    if (kind === "approve") {
      if (!patched.approvedAt) patched.approvedAt = now;
    } else {
      if (!patched.rejectedAt) patched.rejectedAt = now;
      if (reason && !patched.rejectReason) patched.rejectReason = reason;
    }
    if (!patched.lastUpdatedAt) patched.lastUpdatedAt = now;

    return patched;
  };

  const applyApprove = async () => {
    if (!selectedItem) return;
    if (!canApprove) return showToast("warn", "승인 조건을 만족하지 않습니다.");
    if (isBusy) return;

    const ctx = decisionCtxRef.current;
    if (!ctx || ctx.itemId !== selectedItem.id) {
      showToast("warn", "처리 컨텍스트가 유효하지 않습니다. 다시 시도하세요.");
      closeDecisionModal();
      return;
    }

    const fresh = ensureDecisionFresh({ itemId: ctx.itemId, version: ctx.version });
    if (!fresh.ok) {
      showToast("danger", fresh.reason);
      closeDecisionModal();
      return;
    }

    setBusy({ busy: true, itemId: selectedItem.id, kind: "approve", startedAt: new Date().toISOString() });

    try {
      const api = apiRef.current!;
      const res = await api.approve(selectedItem.id, { version: ctx.version, lockToken: ctx.lockToken });

      const next = normalizeDecisionResult(res.item as ReviewWorkItemExt, "approve");
      patchItemInState(next);

      if (!isHttpMode) {
        appendAudit(selectedItem.id, "APPROVED", "승인 처리");
        appendAudit(selectedItem.id, "PUBLISHED", "승인 즉시 자동 공개");
      }

      showToast("neutral", "승인 완료 (즉시 공개)");
      setDecisionModal({ open: false, kind: null });
      decisionCtxRef.current = null;
    } catch (err: unknown) {
      // 409 처리 중복 제거 + ctx.itemId 기준으로 최신 상태 갱신
      if (isReviewerApiError(err) && err.status === 409) {
        const payload = err.details as ConflictPayload | undefined;
        const t = formatConflictToast(payload);
        showToast(t.tone, t.message);

        const targetId = ctx.itemId;
        try {
          const latest = await apiRef.current!.getWorkItem(targetId);
          patchItemInState(latest as ReviewWorkItemExt);
        } catch {
          await refreshAllFromApi({ silent: true, force: true });
        }

        setDecisionModal({ open: false, kind: null });
        decisionCtxRef.current = null;
        return;
      }

      showToast("danger", "승인 처리에 실패했습니다.");
    } finally {
      setBusy({ busy: false });
      await releaseDecisionLockSafely();
    }
  };

  const applyReject = async (reason: string) => {
    if (!selectedItem) return;
    if (!canReject) return showToast("warn", "반려 조건을 만족하지 않습니다.");
    if (isBusy) return;

    const trimmed = reason.trim();
    if (!trimmed) {
      setDecisionModal({ open: true, kind: "reject", reason, error: "반려 사유는 필수입니다." });
      return;
    }

    const ctx = decisionCtxRef.current;
    if (!ctx || ctx.itemId !== selectedItem.id) {
      showToast("warn", "처리 컨텍스트가 유효하지 않습니다. 다시 시도하세요.");
      closeDecisionModal();
      return;
    }

    const fresh = ensureDecisionFresh({ itemId: ctx.itemId, version: ctx.version });
    if (!fresh.ok) {
      showToast("danger", fresh.reason);
      closeDecisionModal();
      return;
    }

    setBusy({ busy: true, itemId: selectedItem.id, kind: "reject", startedAt: new Date().toISOString() });

    try {
      const api = apiRef.current!;
      const res = await api.reject(selectedItem.id, { version: ctx.version, lockToken: ctx.lockToken, reason: trimmed });

      const next = normalizeDecisionResult(res.item as ReviewWorkItemExt, "reject", trimmed);
      patchItemInState(next);

      if (!isHttpMode) appendAudit(selectedItem.id, "REJECTED", trimmed);

      showToast("neutral", "반려 완료");
      setDecisionModal({ open: false, kind: null });
      decisionCtxRef.current = null;
    } catch (err: unknown) {
      // reject도 ctx.itemId 기준으로 갱신
      if (isReviewerApiError(err) && err.status === 409) {
        const payload = err.details as ConflictPayload | undefined;
        const t = formatConflictToast(payload);
        showToast(t.tone, t.message);

        const targetId = ctx.itemId;
        try {
          const latest = await apiRef.current!.getWorkItem(targetId);
          patchItemInState(latest as ReviewWorkItemExt);
        } catch {
          await refreshAllFromApi({ silent: true, force: true });
        }

        setDecisionModal({ open: false, kind: null });
        decisionCtxRef.current = null;
        return;
      }

      showToast("danger", "반려 처리에 실패했습니다.");
    } finally {
      setBusy({ busy: false });
      await releaseDecisionLockSafely();
    }
  };

  const openPreview = () => {
    if (!selectedItem) return;
    setPreviewOpen(true);
  };

  const closePreview = () => setPreviewOpen(false);

  const handleSaveNote = () => {
    if (!selectedItem) return;
    const note = (notesById[selectedItem.id] ?? "").trim();
    if (!note) return;
    appendAudit(selectedItem.id, "COMMENTED", note);
    showToast("neutral", "메모가 감사 이력에 저장되었습니다.");
  };

  // ===== DEV: 대량 데이터 + 충돌 시뮬레이션 =====
  const devEnabled = import.meta.env.DEV;

  const toggleDataset = () => {
    if (!devEnabled) return;
    if (isBusy || isOverlayOpen || lockState.kind === "locking") return;
    if (isHttpMode) return showToast("warn", "http 모드에서는 로컬 데이터셋 전환이 비활성화됩니다.");

    // 토스트/라벨 역전 + stale datasetKey 문제 해결
    setDatasetKey((prev) => {
      const next = prev === "base" ? "load" : "base";
      showToast("neutral", next === "load" ? "대량 데이터 로드" : "기본 데이터 로드");
      return next;
    });
  };

  const simulateConflict = () => {
    if (!devEnabled) return;
    if (!selectedId) return;
    if (isBusy || isOverlayOpen || lockState.kind === "locking") return;
    if (isHttpMode) return showToast("warn", "http 모드에서는 충돌 시뮬레이션이 비활성화됩니다.");

    const modes: Array<Parameters<typeof mutateMockForConflict>[2]> = [
      "version_bump",
      "already_approved",
      "already_rejected",
    ];
    const mode = modes[Math.floor(Math.random() * modes.length)];

    setItems((prev) => {
      const next = mutateMockForConflict(prev as ReviewWorkItem[], selectedId, mode) as ReviewWorkItemExt[];
      apiRef.current = createReviewerApiMock({
        initialItems: next,
        me: { id: effectiveReviewerName, name: effectiveReviewerName },
      });
      return next;
    });

    // setItems updater 내부에서 showToast 호출하지 않게 분리
    showToast("warn", `충돌 시뮬레이션 적용: ${mode.replace("_", " ")}`);
  };

  return {
    effectiveReviewerName,

    items,
    setItems,

    activeTab,
    setActiveTab,
    detailTab,
    setDetailTab,
    query,
    setQuery,
    onlyMine,
    setOnlyMine,
    riskOnly,
    setRiskOnly,
    sortMode,
    setSortMode,

    listMode,
    setListMode,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    totalPages,
    filtered,
    pageItems,

    selectedId,
    setSelectedId,
    selectedIndex,
    selectedItem,

    counts,

    notesById,
    setNotesById,

    actionGuard,
    canApprove,
    canReject,
    approveProcessing,
    rejectProcessing,

    decisionModal,
    previewOpen,
    isOverlayOpen,

    isBusy,
    busyText,
    toast,
    closeToast,

    handleRefresh,
    openApproveModal,
    openRejectModal,
    closeDecisionModal,
    applyApprove,
    applyReject,
    openPreview,
    closePreview,
    handleSaveNote,
    moveSelection,

    lastRefreshedAtLabel,

    ui: { statusLabel, statusTone, categoryLabel, piiTone, isRiskItem },

    devtools: {
      enabled: devEnabled,
      // 라벨 역전 수정: 현재 상태를 그대로 보여줌
      datasetLabel: datasetKey === "load" ? "대량 데이터" : "기본 데이터",
      toggleDataset,
      simulateConflict,
    },
  };
}
