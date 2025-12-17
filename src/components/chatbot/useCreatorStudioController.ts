// src/components/chatbot/useCreatorStudioController.ts

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CREATOR_CATEGORIES,
  CREATOR_DEPARTMENTS,
  categoryLabel,
  createMockCreatorWorkItems,
  createNewDraftItem,
  deptLabel,
  formatDateTime,
  labelStatus,
  labelTrainingType,
  mockGenerateScript,
  mockVideoUrl,
} from "./creatorStudioMocks";
import type {
  CategoryOption,
  CreatorTabId,
  CreatorValidationResult,
  CreatorWorkItem,
  CreatorSortMode,
  DepartmentOption,
} from "./creatorStudioTypes";

type ToastKind = "success" | "error" | "info";

export interface CreatorToast {
  kind: ToastKind;
  message: string;
}

export interface UseCreatorStudioControllerOptions {
  creatorName?: string;

  /**
   * DEPT_CREATOR 시나리오를 위해 "허용 부서"를 주입할 수 있게 둠.
   * - 미지정이면 전부서 허용(GLOBAL_CREATOR 가정)
   */
  allowedDeptIds?: string[] | null;
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function includesAny(hay: string, needles: string[]): boolean {
  for (const n of needles) {
    if (hay.includes(n)) return true;
  }
  return false;
}

function tabMatchesStatus(
  tab: CreatorTabId,
  status: CreatorWorkItem["status"]
): boolean {
  switch (tab) {
    case "draft":
      return status === "DRAFT" || status === "GENERATING";
    case "review_pending":
      return status === "REVIEW_PENDING";
    case "rejected":
      return status === "REJECTED";
    case "approved":
      return status === "APPROVED";
    case "failed":
      return status === "FAILED";
    default:
      return true;
  }
}

function sortItems(items: CreatorWorkItem[], mode: CreatorSortMode): CreatorWorkItem[] {
  const next = [...items];
  next.sort((a, b) => {
    const av = mode.startsWith("created") ? a.createdAt : a.updatedAt;
    const bv = mode.startsWith("created") ? b.createdAt : b.updatedAt;
    const diff = av - bv;
    return mode.endsWith("asc") ? diff : -diff;
  });
  return next;
}

function validateForReview(item: CreatorWorkItem): CreatorValidationResult {
  const issues: string[] = [];

  if (!item.title || item.title.trim().length < 3) issues.push("제목을 3자 이상 입력해주세요.");
  if (!item.categoryId) issues.push("카테고리를 선택해주세요.");
  if (!item.assets.sourceFileName) issues.push("교육 자료 파일을 업로드해주세요.");
  if (item.estimatedMinutes <= 0) issues.push("예상 시청 시간(분)을 입력해주세요.");

  const hasGenerated = Boolean(item.assets.script && item.assets.videoUrl);
  const pipelineOk = item.pipeline.state === "SUCCESS" || hasGenerated;

  if (!pipelineOk) issues.push("자동 생성이 완료되지 않았습니다. 생성 완료 후 검토 요청이 가능합니다.");

  if (item.trainingType === "JOB" && item.targetDeptIds.length === 0) {
    issues.push("직무교육은 대상 부서를 최소 1개 선택해야 합니다.");
  }

  if (item.status !== "DRAFT" && item.status !== "REJECTED") {
    issues.push("초안/반려 상태에서만 검토 요청이 가능합니다.");
  }

  return { ok: issues.length === 0, issues };
}

function resetPipeline(): CreatorWorkItem["pipeline"] {
  return { state: "IDLE", stage: null, progress: 0 };
}

function clearGeneratedAllAssets(item: CreatorWorkItem): CreatorWorkItem["assets"] {
  return {
    ...item.assets,
    script: "",
    videoUrl: "",
    thumbnailUrl: "",
  };
}

function isLockedForEdit(item: CreatorWorkItem): boolean {
  // 검토 흐름(SoD) + 생성 중에는 편집 금지
  return (
    item.status === "REVIEW_PENDING" ||
    item.status === "APPROVED" ||
    item.status === "GENERATING" ||
    item.pipeline.state === "RUNNING"
  );
}

/**
 * "이미 생성된 결과를 무효화하는 변경"인지 판별
 * - 결과(스크립트/영상) 존재 or pipeline SUCCESS 상태였다면 1회 안내를 띄움
 */
function hadGeneratedOutput(item: CreatorWorkItem): boolean {
  return Boolean(
    item.assets.videoUrl ||
    item.assets.thumbnailUrl ||
    item.pipeline.state === "SUCCESS"
  );
}

export function useCreatorStudioController(options?: UseCreatorStudioControllerOptions) {
  const creatorName = options?.creatorName ?? "VIDEO_CREATOR";
  const allowedDeptIds = options?.allowedDeptIds ?? null;

  const [items, setItems] = useState<CreatorWorkItem[]>(() => createMockCreatorWorkItems());
  const [tab, setTab] = useState<CreatorTabId>("draft");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<CreatorSortMode>("updated_desc");

  /**
   * rawSelectedId: 사용자가 마지막으로 "의도적으로" 선택한 값
   * - items/tab이 바뀌어도 여기서 억지로 setState로 보정하지 않는다(= set-state-in-effect 회피)
   * - 실제로 UI/액션에서 쓸 선택값은 아래 selectedId(useMemo)로 “항상 유효”하게 계산한다
   */
  const [rawSelectedId, setRawSelectedId] = useState<string | null>(null);

  const [toast, setToast] = useState<CreatorToast | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // 파이프라인 타이머(선택 항목마다 하나만) - mock
  const timerRef = useRef<number | null>(null);

  const clearToastSoon = (ms = 2200) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), ms);
  };

  const showToast = (kind: ToastKind, message: string, ms?: number) => {
    setToast({ kind, message });
    clearToastSoon(ms ?? (kind === "error" ? 3000 : 2200));
  };

  const stopPipelineTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const departments: DepartmentOption[] = useMemo(() => {
    if (!allowedDeptIds || allowedDeptIds.length === 0) return CREATOR_DEPARTMENTS;
    return CREATOR_DEPARTMENTS.filter((d) => allowedDeptIds.includes(d.id));
  }, [allowedDeptIds]);

  const categories: CategoryOption[] = useMemo(() => CREATOR_CATEGORIES, []);

  /**
   * selectedId를 “보정된 값”으로 파생 계산
   * 규칙:
   * - items가 비면 null
   * - rawSelectedId가 없으면: 현재 탭 첫 항목(없으면 전체 첫 항목)
   * - rawSelectedId가 삭제됐으면: fallback
   * - rawSelectedId가 현재 탭과 불일치면: 현재 탭 첫 항목(없으면 null)
   */
  const selectedId = useMemo(() => {
    if (items.length === 0) return null;

    const sorted = sortItems(items, "updated_desc");
    const byTab = sorted.filter((it) => tabMatchesStatus(tab, it.status));
    const fallback = (byTab[0] ?? sorted[0] ?? null)?.id ?? null;

    if (!rawSelectedId) return fallback;

    const exists = items.some((it) => it.id === rawSelectedId);
    if (!exists) return fallback;

    const cur = items.find((it) => it.id === rawSelectedId) ?? null;
    if (cur && !tabMatchesStatus(tab, cur.status)) {
      return (byTab[0] ?? null)?.id ?? null;
    }

    return rawSelectedId;
  }, [items, tab, rawSelectedId]);

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  const filteredItems = useMemo(() => {
    const q = normalizeQuery(query);
    const qTokens = q ? q.split(/\s+/).filter(Boolean) : [];

    const base = items.filter((it) => tabMatchesStatus(tab, it.status));
    const searched =
      qTokens.length === 0
        ? base
        : base.filter((it) => {
            const hay = [
              it.title,
              it.categoryLabel,
              labelTrainingType(it.trainingType),
              labelStatus(it.status),
              it.targetDeptIds.map(deptLabel).join(" "),
              it.assets.sourceFileName ?? "",
              formatDateTime(it.updatedAt),
            ]
              .join(" ")
              .toLowerCase();
            return includesAny(hay, qTokens);
          });

    return sortItems(searched, sortMode);
  }, [items, query, sortMode, tab]);

  const selectedValidation = useMemo(() => {
    if (!selectedItem) return { ok: false, issues: ["선택된 콘텐츠가 없습니다."] };
    return validateForReview(selectedItem);
  }, [selectedItem]);

  const selectItem = (id: string) => setRawSelectedId(id);

  const createDraft = () => {
    const next = createNewDraftItem({
      title: "새 교육 콘텐츠",
      trainingType: "JOB",
      categoryId: categories[0]?.id ?? "C001",
      categoryLabel: categories[0]?.name ?? categoryLabel("C001"),
      targetDeptIds: departments[0] ? [departments[0].id] : [],
      isMandatory: false,
      estimatedMinutes: 8,
      status: "DRAFT",
      createdByName: creatorName,
      assets: { sourceFileName: "", script: "", videoUrl: "", thumbnailUrl: "" },
    });

    setItems((prev) => [next, ...prev]);
    setRawSelectedId(next.id);
    setTab("draft");
    showToast("success", "새 초안이 생성되었습니다.");
  };

  const updateSelected = (patch: Partial<CreatorWorkItem>) => {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedId ? { ...it, ...patch, updatedAt: Date.now() } : it
      )
    );
  };

  const updateSelectedMeta = (
    patch: Partial<
      Pick<
        CreatorWorkItem,
        | "title"
        | "trainingType"
        | "categoryId"
        | "categoryLabel"
        | "targetDeptIds"
        | "isMandatory"
        | "estimatedMinutes"
      >
    >
  ) => {
    if (!selectedItem) return;

    if (isLockedForEdit(selectedItem)) {
      showToast("info", "검토 대기/승인/생성 중 상태에서는 편집할 수 없습니다.");
      return;
    }

    const willInvalidate =
      ("title" in patch && patch.title !== selectedItem.title) ||
      ("categoryId" in patch && patch.categoryId !== selectedItem.categoryId) ||
      ("categoryLabel" in patch && patch.categoryLabel !== selectedItem.categoryLabel) ||
      ("trainingType" in patch && patch.trainingType !== selectedItem.trainingType);

    const nextPatch: Partial<CreatorWorkItem> = { ...(patch as Partial<CreatorWorkItem>) };

    if (willInvalidate && hadGeneratedOutput(selectedItem)) {
      nextPatch.assets = clearGeneratedAllAssets(selectedItem);
      nextPatch.pipeline = resetPipeline();
      nextPatch.failedReason = undefined;
      updateSelected(nextPatch);

      showToast(
        "info",
        "기본 정보가 변경되어 생성 결과가 초기화되었습니다. 자동 생성을 다시 실행해 주세요."
      );
      return;
    }

    updateSelected(nextPatch);
  };

  const attachFileToSelected = (fileName: string) => {
    if (!selectedItem) return;

    if (isLockedForEdit(selectedItem)) {
      showToast("info", "검토 대기/승인/생성 중 상태에서는 파일을 변경할 수 없습니다.");
      return;
    }

    updateSelected({
      assets: {
        ...clearGeneratedAllAssets(selectedItem),
        sourceFileName: fileName,
      },
      pipeline: resetPipeline(),
      failedReason: undefined,
    });

    showToast("success", "파일이 업로드되었습니다. 자동 생성을 실행해 주세요.");
  };

  const runPipelineForSelected = () => {
    if (!selectedItem) return;

    const targetId = selectedItem.id;

    if (!selectedItem.assets.sourceFileName) {
      showToast("error", "먼저 교육 자료 파일을 업로드해 주세요.", 3000);
      return;
    }
    if (selectedItem.status === "REVIEW_PENDING" || selectedItem.status === "APPROVED") {
      showToast("info", "검토 대기/승인 상태에서는 자동 생성을 실행할 수 없습니다.");
      return;
    }
    if (selectedItem.pipeline.state === "RUNNING" || selectedItem.status === "GENERATING") {
      showToast("info", "이미 자동 생성이 진행 중입니다.");
      return;
    }

    stopPipelineTimer();

    const startedAt = Date.now();
    updateSelected({
      status: "GENERATING",
      pipeline: {
        state: "RUNNING",
        stage: "UPLOAD",
        progress: 0,
        startedAt,
        message: "업로드 처리 중…",
      },
    });

    timerRef.current = window.setInterval(() => {
      setItems((prev) => {
        const next = prev.map((it): CreatorWorkItem => {
          if (it.id !== targetId) return it;
          if (it.pipeline.state !== "RUNNING") return it;

          const p = it.pipeline.progress;
          let stage = it.pipeline.stage ?? "UPLOAD";
          let message = it.pipeline.message ?? "";

          const inc = 4 + Math.floor(Math.random() * 7); // 4~10
          const np = clamp(p + inc, 0, 100);

          if (np < 20) {
            stage = "UPLOAD";
            message = "업로드 처리 중…";
          } else if (np < 60) {
            stage = "SCRIPT";
            message = "스크립트 생성 중…";
          } else if (np < 92) {
            stage = "VIDEO";
            message = "영상 합성 중…";
          } else if (np < 100) {
            stage = "THUMBNAIL";
            message = "썸네일 생성 중…";
          } else {
            stage = "DONE";
            message = "생성 완료";
          }

          if (np >= 100) {
            const finishedAt = Date.now();
            const script = mockGenerateScript(it.title, it.categoryLabel);

            return {
              ...it,
              status: "DRAFT",
              updatedAt: finishedAt,
              pipeline: {
                state: "SUCCESS",
                stage: "DONE",
                progress: 100,
                startedAt: it.pipeline.startedAt ?? startedAt,
                finishedAt,
                message: "생성 완료",
              },
              assets: {
                ...it.assets,
                script,
                videoUrl: mockVideoUrl(it.id),
                thumbnailUrl: `mock://thumbnail/${it.id}`,
              },
              failedReason: undefined,
            };
          }

          return {
            ...it,
            pipeline: {
              ...it.pipeline,
              progress: np,
              stage,
              message,
            },
          };
        });

        return next;
      });
    }, 480);
  };

  // items 변화를 보면서 RUNNING이 하나도 없을 때만 타이머 정리
  useEffect(() => {
    const running = items.some((it) => it.pipeline.state === "RUNNING");
    if (!running) stopPipelineTimer();
  }, [items]);

  // 언마운트 정리
  useEffect(() => {
    return () => stopPipelineTimer();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const failPipelineForSelected = (reason: string) => {
    if (!selectedItem) return;

    stopPipelineTimer();

    updateSelected({
      status: "FAILED",
      failedReason: reason,
      pipeline: {
        ...selectedItem.pipeline,
        state: "FAILED",
        message: "생성 실패",
        finishedAt: Date.now(),
      },
    });

    showToast("error", `자동 생성 실패: ${reason}`, 3000);
  };

  const retryPipelineForSelected = () => {
    if (!selectedItem) return;
    if (selectedItem.status !== "FAILED") return;

    // UX: 실패 탭에서 재시도 누르면 FAILED → GENERATING 으로 바뀌며 실패 목록에서 빠짐
    // 사용자가 "사라졌다"로 느끼지 않도록 draft 탭으로 이동시킴
    setTab("draft");
    runPipelineForSelected();
  };

  const updateSelectedScript = (script: string) => {
    if (!selectedItem) return;

    if (isLockedForEdit(selectedItem)) {
      showToast("info", "검토 대기/승인/생성 중 상태에서는 스크립트를 수정할 수 없습니다.");
      return;
    }

    const shouldNotify = hadGeneratedOutput(selectedItem);

    updateSelected({
      assets: {
        ...selectedItem.assets,
        script,
        videoUrl: "",
        thumbnailUrl: "",
      },
      pipeline: resetPipeline(),
      failedReason: undefined,
    });

    if (shouldNotify) {
      showToast("info", "스크립트가 수정되어 영상/썸네일이 초기화되었습니다. 자동 생성을 다시 실행해 주세요.");
    }
  };

  const requestReviewForSelected = () => {
    if (!selectedItem) return;

    const v = validateForReview(selectedItem);
    if (!v.ok) {
      showToast("error", v.issues[0] ?? "검토 요청 조건을 확인해주세요.", 3000);
      return;
    }

    updateSelected({ status: "REVIEW_PENDING" });
    setTab("review_pending");
    showToast("success", "검토 요청이 제출되었습니다. 검토자 Work Queue에 반영됩니다.");
  };

  const reopenRejectedToDraft = () => {
    if (!selectedItem) return;
    if (selectedItem.status !== "REJECTED") return;

    updateSelected({ status: "DRAFT" });
    setTab("draft");
    showToast("info", "반려 건을 초안으로 되돌렸습니다. 수정 후 다시 검토 요청할 수 있습니다.");
  };

  const deleteDraft = () => {
    if (!selectedItem) return;

    if (selectedItem.status !== "DRAFT" && selectedItem.status !== "FAILED") {
      showToast("info", "초안/실패 상태만 삭제할 수 있습니다.");
      return;
    }

    const id = selectedItem.id;

    // 삭제 후에도 상세 패널이 비지 않도록 다음 선택을 미리 계산
    const remaining = items.filter((it) => it.id !== id);
    const sorted = sortItems(remaining, "updated_desc");
    const byTab = sorted.filter((it) => tabMatchesStatus(tab, it.status));
    const nextId = (byTab[0] ?? sorted[0] ?? null)?.id ?? null;

    setItems(remaining);
    setRawSelectedId(nextId);

    showToast("success", "초안이 삭제되었습니다.");
  };

  return {
    // static data
    departments,
    categories,

    // state
    tab,
    setTab,
    query,
    setQuery,
    sortMode,
    setSortMode,
    items,
    filteredItems,
    selectedId,       // ✅ 외부에는 “보정된 선택값”을 노출
    selectedItem,
    selectedValidation,
    toast,

    // actions
    selectItem,
    createDraft,
    updateSelectedMeta,
    attachFileToSelected,
    runPipelineForSelected,
    retryPipelineForSelected,
    failPipelineForSelected,
    updateSelectedScript,
    requestReviewForSelected,
    reopenRejectedToDraft,
    deleteDraft,
  };
}
