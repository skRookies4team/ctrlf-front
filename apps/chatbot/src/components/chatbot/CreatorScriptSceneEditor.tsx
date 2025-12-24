// src/components/chatbot/CreatorScriptSceneEditor.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CreatorScriptScene,
  CreatorScriptScenePatchErrors,
} from "./creatorStudioTypes";
import {
  MockApiError,
  mockGetScenes,
  mockPatchScene,
  mockResetScript,
  mockSimulateExternalUpdate,
} from "./creatorSceneMockApi";

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

type ToastKind = "success" | "error" | "info";

type Props = {
  /** 백엔드 스크립트 식별자 */
  scriptId: string;
  /** (선택) videoId가 있는 경우 video-scope GET을 우선 시도 */
  videoId?: string | null;

  /** 데모/초기 mock scenes 생성에 활용 */
  scriptText?: string;

  disabled?: boolean;

  /** 상위(creator studio)의 toast 시스템을 재사용 */
  showToast: (kind: ToastKind, message: string, ms?: number) => void;

  /**
   * 씬 저장 성공 후 “평문 스크립트”를 상위 상태에도 반영해야 할 때 사용
   * - CreatorStudio는 검토 요청/미리보기에서 평문 스크립트를 사용 중
   */
  onCommitScriptText?: (nextScriptText: string) => void;

  /** 상위에서 검토요청 버튼 가드 등에 쓰고 싶으면 연결 */
  onDirtyChange?: (dirty: boolean) => void;
};

type SceneDraft = Pick<CreatorScriptScene, "narration" | "caption" | "duration_sec">;

type AnyRecord = Record<string, unknown>;

function asRecord(v: unknown): AnyRecord | null {
  return v && typeof v === "object" ? (v as AnyRecord) : null;
}

function pickList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const obj = asRecord(raw);
  if (obj) {
    const candidates = [obj.scenes, obj.items, obj.data, obj.results];
    const found = candidates.find(Array.isArray);
    if (Array.isArray(found)) return found;
  }
  return [];
}

function toStr(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function readFirstStr(obj: AnyRecord | null, keys: string[], fallback = ""): string {
  if (!obj) return fallback;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return fallback;
}

function readFirstNum(obj: AnyRecord | null, keys: string[], fallback?: number): number | undefined {
  if (!obj) return fallback;
  for (const k of keys) {
    const v = obj[k];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeScene(raw: unknown, idx: number): CreatorScriptScene {
  const obj = asRecord(raw);

  const id =
    readFirstStr(obj, ["id", "sceneId", "scene_id"], "") || `scene-${idx + 1}`;

  const chapter_id = readFirstStr(obj, ["chapter_id", "chapterId", "chapter"], "");
  const chapter_title =
    readFirstStr(obj, ["chapter_title", "chapterTitle", "chapter_name"], "") ||
    (chapter_id ? `챕터 ${chapter_id}` : "챕터 1");

  const chapter_order_raw = readFirstNum(obj, ["chapter_order", "chapterOrder", "chapter_no"]);
  const chapter_order =
    typeof chapter_order_raw === "number" && Number.isFinite(chapter_order_raw)
      ? chapter_order_raw
      : undefined;

  const scene_order_raw = readFirstNum(obj, ["scene_order", "sceneOrder", "order"]);
  const scene_order =
    typeof scene_order_raw === "number" && Number.isFinite(scene_order_raw)
      ? scene_order_raw
      : idx + 1;

  const duration_raw = readFirstNum(obj, ["duration_sec", "durationSec", "duration"], 0);
  const duration_sec = typeof duration_raw === "number" ? duration_raw : 0;

  const updated_at = readFirstStr(obj, ["updated_at", "updatedAt"], "");

  const source_refs_raw = obj ? (obj["source_refs"] ?? obj["sourceRefs"]) : undefined;
  const source_refs = Array.isArray(source_refs_raw)
    ? source_refs_raw.map((x) => toStr(x)).filter(Boolean)
    : [];

  return {
    id,
    chapter_id: chapter_id || undefined,
    chapter_title: chapter_title || undefined,
    chapter_order,

    scene_order,
    purpose: readFirstStr(obj, ["purpose", "scene_purpose"], ""),
    duration_sec,

    narration: readFirstStr(obj, ["narration"], ""),
    caption: readFirstStr(obj, ["caption"], ""),

    source_refs,
    updated_at,
  };
}

function composeScriptText(scenes: CreatorScriptScene[]): string {
  const lines: string[] = [];
  for (const s of scenes.slice().sort((a, b) => a.scene_order - b.scene_order)) {
    lines.push(
      `# Scene ${s.scene_order}${s.purpose ? ` · ${s.purpose}` : ""} · ${s.duration_sec}s`
    );
    if (s.narration.trim()) lines.push(`Narration: ${s.narration.trim()}`);
    if (s.caption.trim()) lines.push(`Caption: ${s.caption.trim()}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

function extractFieldErrors(payload: unknown): CreatorScriptScenePatchErrors {
  const errors: CreatorScriptScenePatchErrors = {};
  const obj = asRecord(payload);
  if (!obj) return errors;

  // 1) { errors: { narration: "...", ... } }
  const e = asRecord(obj["errors"]);
  if (e) {
    if (typeof e["narration"] === "string") errors.narration = e["narration"];
    if (typeof e["caption"] === "string") errors.caption = e["caption"];
    if (typeof e["duration_sec"] === "string") errors.duration_sec = e["duration_sec"];
    if (typeof e["durationSec"] === "string") errors.duration_sec = e["durationSec"];
    return errors;
  }

  // 2) FastAPI: { detail: [ { loc: ["body","narration"], msg: "..." }, ... ] }
  const detail = obj["detail"];
  if (Array.isArray(detail)) {
    for (const d of detail) {
      const row = asRecord(d);
      if (!row) continue;

      const loc = Array.isArray(row["loc"]) ? row["loc"].map(String) : [];
      const msg =
        typeof row["msg"] === "string"
          ? row["msg"]
          : typeof row["message"] === "string"
            ? row["message"]
            : "";

      const field = loc[loc.length - 1];
      if (!msg) continue;

      if (field === "narration") errors.narration = msg;
      if (field === "caption") errors.caption = msg;
      if (field === "duration_sec" || field === "durationSec") errors.duration_sec = msg;
    }
    return errors;
  }

  return errors;
}

async function safeReadJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function CreatorScriptSceneEditor({
  scriptId,
  videoId,
  scriptText,
  disabled,
  showToast,
  onCommitScriptText,
  onDirtyChange,
}: Props) {
  // mock|real (기본 mock)
  const API_MODE =
    (import.meta.env.VITE_CREATOR_SCENE_API_MODE as "mock" | "real" | undefined) ?? "mock";

  /**
   * 핵심: 부모 리렌더 때 showToast/scriptText 레퍼런스가 바뀌더라도
   * loadScenes(useEffect)가 재실행되어 draft/dirty가 초기화되지 않도록 ref로 분리
   */
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const scriptTextRef = useRef<string | undefined>(scriptText);
  useEffect(() => {
    scriptTextRef.current = scriptText;
  }, [scriptText]);

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [scenes, setScenes] = useState<CreatorScriptScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  const [draftById, setDraftById] = useState<Record<string, SceneDraft>>({});
  const [dirtyIds, setDirtyIds] = useState<Record<string, true>>({});
  const [fieldErrorsById, setFieldErrorsById] = useState<
    Record<string, CreatorScriptScenePatchErrors | undefined>
  >({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onDirtyChange?.(Object.keys(dirtyIds).length > 0);
  }, [dirtyIds, onDirtyChange]);

  const selectedScene = useMemo(() => {
    return scenes.find((s) => s.id === selectedSceneId) ?? null;
  }, [scenes, selectedSceneId]);

  const selectedDraft: SceneDraft | null = useMemo(() => {
    if (!selectedScene) return null;
    return (
      draftById[selectedScene.id] ?? {
        narration: selectedScene.narration ?? "",
        caption: selectedScene.caption ?? "",
        duration_sec: selectedScene.duration_sec ?? 0,
      }
    );
  }, [draftById, selectedScene]);

  const chapters = useMemo(() => {
    const map = new Map<
      string,
      { id: string; title: string; order: number; scenes: CreatorScriptScene[] }
    >();

    for (const s of scenes) {
      const id = s.chapter_id ?? "chapter-1";
      const title = s.chapter_title ?? "챕터 1";
      const order =
        typeof s.chapter_order === "number" && Number.isFinite(s.chapter_order)
          ? s.chapter_order
          : 1;

      const row = map.get(id) ?? { id, title, order, scenes: [] };
      row.scenes.push(s);
      map.set(id, row);
    }

    const list = Array.from(map.values()).map((c) => ({
      ...c,
      scenes: c.scenes.slice().sort((a, b) => a.scene_order - b.scene_order),
    }));

    list.sort((a, b) => a.order - b.order);
    return list;
  }, [scenes]);

  const [collapsedChapterIds, setCollapsedChapterIds] = useState<Record<string, true>>({});

  const toggleChapter = (chapterId: string) => {
    setCollapsedChapterIds((prev) => {
      const next = { ...prev };
      if (next[chapterId]) delete next[chapterId];
      else next[chapterId] = true;
      return next;
    });
  };

  const hardDisabled = Boolean(disabled || saving || loading);

  const loadScenes = useCallback(
    async (force = false) => {
      // eslint (react-hooks/set-state-in-effect) 회피:
      // effect에서 호출되더라도 "동기 setState"가 되지 않도록
      // 가장 먼저 microtask 경계를 만든다.
      await Promise.resolve();

      setLoading(true);
      setLoadingError(null);

      try {
        // 1) mock 모드: fetch 없이 “백엔드 동작” 시뮬레이션
        if (API_MODE === "mock") {
          const seedText = scriptTextRef.current;

          if (force) {
            mockResetScript({ scriptId, scriptText: seedText });
          }

          const nextScenes = mockGetScenes({ scriptId, scriptText: seedText });

          setScenes(nextScenes);
          setSelectedSceneId((prev) => {
            if (prev && nextScenes.some((s) => s.id === prev)) return prev;
            return nextScenes[0]?.id ?? null;
          });

          setDraftById({});
          setDirtyIds({});
          setFieldErrorsById({});
          return;
        }

        // 2) real 모드 (추후 백엔드 연동 시)
        const candidates: string[] = [];
        if (videoId) {
          candidates.push(
            `/api/videos/${encodeURIComponent(videoId)}/scripts/${encodeURIComponent(
              scriptId
            )}/scenes`
          );
        }
        candidates.push(`/api/scripts/${encodeURIComponent(scriptId)}/scenes`);

        let lastRes: Response | null = null;

        for (const url of candidates) {
          const res = await fetch(url, { method: "GET" });
          lastRes = res;

          if (res.ok) {
            const json = await safeReadJson(res);
            const list = pickList(json);
            const nextScenes = list.map((r, idx) => normalizeScene(r, idx));

            setScenes(nextScenes);
            setSelectedSceneId((prev) => {
              if (prev && nextScenes.some((s) => s.id === prev)) return prev;
              return nextScenes[0]?.id ?? null;
            });

            setDraftById({});
            setDirtyIds({});
            setFieldErrorsById({});
            return;
          }

          if (res.status === 403) {
            showToastRef.current("error", "권한이 없습니다. (403)", 3500);
            setLoadingError("권한이 없어 씬 목록을 불러올 수 없습니다.");
            return;
          }

          if (res.status === 404) continue;
        }

        const msg = lastRes ? `씬 목록 조회 실패 (${lastRes.status})` : "씬 목록 조회 실패";
        showToastRef.current("error", msg, 3500);
        setLoadingError(msg);
      } catch {
        const msg = "씬 목록 조회 중 예외가 발생했습니다.";
        showToastRef.current("error", msg, 3500);
        setLoadingError(msg);
      } finally {
        setLoading(false);
      }
    },
    // showToast/scriptText는 ref로 참조하므로 deps에서 제거 (재초기화 버그 방지)
    [API_MODE, scriptId, videoId]
  );

  useEffect(() => {
    void loadScenes(false);
  }, [loadScenes]);

  const markDirty = (sceneId: string) => {
    setDirtyIds((prev) => (prev[sceneId] ? prev : { ...prev, [sceneId]: true }));
  };

  const updateDraft = (sceneId: string, patch: Partial<SceneDraft>) => {
    const baseScene = scenes.find((s) => s.id === sceneId);

    setDraftById((prev) => {
      const base = prev[sceneId];
      const next: SceneDraft = {
        narration: base?.narration ?? baseScene?.narration ?? "",
        caption: base?.caption ?? baseScene?.caption ?? "",
        duration_sec: base?.duration_sec ?? baseScene?.duration_sec ?? 0,
        ...patch,
      };
      return { ...prev, [sceneId]: next };
    });

    markDirty(sceneId);
    setFieldErrorsById((prev) => ({ ...prev, [sceneId]: undefined }));
  };

  const canSaveSelected =
    !hardDisabled &&
    selectedScene != null &&
    Boolean(dirtyIds[selectedScene.id]) &&
    selectedDraft != null;

  const saveSelectedScene = async () => {
    if (!selectedScene || !selectedDraft) return;
    if (!dirtyIds[selectedScene.id]) return;

    const dur = Number(selectedDraft.duration_sec);
    if (!Number.isFinite(dur) || dur <= 0) {
      setFieldErrorsById((prev) => ({
        ...prev,
        [selectedScene.id]: {
          ...(prev[selectedScene.id] ?? {}),
          duration_sec: "1 이상의 숫자를 입력해 주세요.",
        },
      }));
      return;
    }

    setSaving(true);

    try {
      // mock 저장(PATCH/409/422)
      if (API_MODE === "mock") {
        const payload = {
          narration: selectedDraft.narration,
          caption: selectedDraft.caption,
          duration_sec: dur,
          expected_updated_at: selectedScene.updated_at,
        };

        const updated = mockPatchScene({
          scriptId,
          sceneId: selectedScene.id,
          patch: payload,
        });

        const nextScenes = scenes.map((s) => (s.id === updated.id ? updated : s));
        setScenes(nextScenes);

        setDirtyIds((prev) => {
          const next = { ...prev };
          delete next[selectedScene.id];
          return next;
        });
        setFieldErrorsById((prev) => ({ ...prev, [selectedScene.id]: undefined }));

        showToast("success", "씬이 저장되었습니다.", 1800);
        onCommitScriptText?.(composeScriptText(nextScenes));

        setSaving(false);
        return;
      }

      // real 저장(추후 백엔드 연동)
      const payload = {
        narration: selectedDraft.narration,
        caption: selectedDraft.caption,
        duration_sec: dur,
        expected_updated_at: selectedScene.updated_at,
      };

      const url = `/api/scripts/${encodeURIComponent(scriptId)}/scenes/${encodeURIComponent(
        selectedScene.id
      )}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await safeReadJson(res);
        const updated = json ? normalizeScene(json, 0) : null;

        const list = pickList(json);
        const nextScenes =
          list.length > 0
            ? list.map((r, idx) => normalizeScene(r, idx))
            : scenes.map((s) => (updated && s.id === updated.id ? updated : s));

        setScenes(nextScenes);
        setDirtyIds((prev) => {
          const next = { ...prev };
          delete next[selectedScene.id];
          return next;
        });
        setFieldErrorsById((prev) => ({ ...prev, [selectedScene.id]: undefined }));

        showToast("success", "씬이 저장되었습니다.", 1800);
        onCommitScriptText?.(composeScriptText(nextScenes));

        setSaving(false);
        return;
      }

      if (res.status === 409) {
        showToast("error", "다른 사용자가 먼저 수정했어요. 새로고침 후 다시 시도해주세요.", 4000);
        await loadScenes(true);
        setSaving(false);
        return;
      }

      if (res.status === 422) {
        const json = await safeReadJson(res);
        const errs = extractFieldErrors(json);
        setFieldErrorsById((prev) => ({ ...prev, [selectedScene.id]: errs }));
        showToast("error", "입력값 오류가 있습니다. 필드를 확인해 주세요.", 3500);
        setSaving(false);
        return;
      }

      if (res.status === 403) {
        showToast("error", "권한이 없습니다. (403)", 3500);
        setSaving(false);
        return;
      }

      if (res.status === 404) {
        showToast("error", "대상을 찾을 수 없습니다. (404)", 3500);
        setSaving(false);
        return;
      }

      showToast("error", `씬 저장 실패 (${res.status})`, 3500);
      setSaving(false);
    } catch (e) {
      // mock error handling
      if (e instanceof MockApiError && selectedScene) {
        if (e.status === 409) {
          showToast("error", "다른 사용자가 먼저 수정했어요. 새로고침 후 다시 시도해주세요.", 4000);
          const next = mockGetScenes({ scriptId, scriptText: scriptTextRef.current });
          setScenes(next);
          setSaving(false);
          return;
        }
        if (e.status === 422) {
          const errs = extractFieldErrors(e.payload);
          setFieldErrorsById((prev) => ({ ...prev, [selectedScene.id]: errs }));
          showToast("error", "입력값 오류가 있습니다. 필드를 확인해 주세요.", 3500);
          setSaving(false);
          return;
        }
        if (e.status === 404) {
          showToast("error", "대상을 찾을 수 없습니다. (404)", 3500);
          setSaving(false);
          return;
        }
      }

      showToast("error", "씬 저장 중 오류가 발생했습니다.", 3500);
      setSaving(false);
    }
  };

  const devShowConflictBtn =
    import.meta.env.DEV && API_MODE === "mock" && selectedScene != null;

  return (
    <div
      className={cx("cb-creator-scene-editor", hardDisabled && "is-disabled")}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="cb-creator-scene-list">
        <div className="cb-creator-scene-list-head">
          <span>씬 목록</span>
          <button
            type="button"
            className="cb-creator-scene-reload"
            onClick={() => void loadScenes(true)}
            disabled={loading}
          >
            새로고침
          </button>
        </div>

        {loadingError && (
          <div className="cb-creator-scene-error">
            {loadingError}
            <div className="cb-creator-scene-error-sub">
              문제가 지속되면 권한/대상(scriptId) 및 백엔드 API 연결을 확인하세요.
            </div>
          </div>
        )}

        {loading && <div className="cb-creator-scene-muted">불러오는 중…</div>}

        {!loading && scenes.length === 0 && (
          <div className="cb-creator-scene-muted">
            표시할 씬이 없습니다. (스크립트 생성 후 다시 시도)
          </div>
        )}

        {!loading &&
          chapters.map((ch) => {
            const collapsed = Boolean(collapsedChapterIds[ch.id]);
            return (
              <div key={ch.id} className="cb-creator-chapter">
                <button
                  type="button"
                  className="cb-creator-chapter-head"
                  onClick={() => toggleChapter(ch.id)}
                >
                  <span className="cb-creator-chapter-title">{ch.title}</span>
                  <span className="cb-creator-chapter-meta">
                    {ch.scenes.length}개
                    <span className={cx("cb-creator-chevron", collapsed && "is-collapsed")}>
                      ▾
                    </span>
                  </span>
                </button>

                {!collapsed && (
                  <div className="cb-creator-chapter-body">
                    {ch.scenes.map((s) => {
                      const isSelected = s.id === selectedSceneId;
                      const isDirty = Boolean(dirtyIds[s.id]);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={cx("cb-creator-scene-row", isSelected && "is-selected")}
                          onClick={() => setSelectedSceneId(s.id)}
                        >
                          <span className="cb-creator-scene-order">{s.scene_order}</span>
                          <span className="cb-creator-scene-purpose">
                            {s.purpose || "(목적 없음)"}
                          </span>
                          <span className="cb-creator-scene-duration">{s.duration_sec}s</span>
                          {isDirty && <span className="cb-creator-scene-dirty">수정됨</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <div className="cb-creator-scene-edit">
        <div className="cb-creator-scene-edit-head">
          <div className="cb-creator-scene-edit-title">
            {selectedScene ? `Scene ${selectedScene.scene_order}` : "씬 선택"}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {devShowConflictBtn && (
              <button
                type="button"
                className="cb-creator-scene-reload"
                onClick={() => {
                  mockSimulateExternalUpdate({ scriptId, sceneId: selectedScene!.id });
                  showToast("info", "다른 사용자가 먼저 수정한 것으로 시뮬레이션했습니다.", 2500);
                }}
              >
                충돌 테스트
              </button>
            )}

            <button
              type="button"
              className="cb-admin-primary-btn cb-creator-scene-save"
              disabled={!canSaveSelected}
              onClick={() => void saveSelectedScene()}
            >
              {saving ? "저장 중…" : "저장(씬)"}
            </button>
          </div>
        </div>

        {!selectedScene && (
          <div className="cb-creator-scene-muted">왼쪽 목록에서 씬을 선택하세요.</div>
        )}

        {selectedScene && selectedDraft && (
          <>
            <div className="cb-creator-scene-readonly">
              <div className="cb-creator-scene-ro-row">
                <span className="cb-creator-scene-ro-label">purpose</span>
                <span className="cb-creator-scene-ro-value">{selectedScene.purpose || "-"}</span>
              </div>
              <div className="cb-creator-scene-ro-row">
                <span className="cb-creator-scene-ro-label">source_refs</span>
                <span className="cb-creator-scene-ro-value">
                  {(selectedScene.source_refs?.length ?? 0)}개 근거
                </span>
              </div>
              <div className="cb-creator-scene-ro-row">
                <span className="cb-creator-scene-ro-label">updated_at</span>
                <span className="cb-creator-scene-ro-value">{selectedScene.updated_at || "-"}</span>
              </div>

              {API_MODE === "mock" && (
                <div className="cb-creator-scene-ro-hint">
                  현재는 <b>백엔드 시뮬레이션(Mock)</b> 모드입니다. (GET/PATCH/409/422 데모 가능)
                </div>
              )}
            </div>

            <label className="cb-creator-scene-field">
              <div className="cb-creator-scene-field-label">narration</div>
              <textarea
                className={cx(
                  "cb-reviewer-textarea",
                  "cb-creator-scene-field-textarea",
                  fieldErrorsById[selectedScene.id]?.narration && "is-invalid"
                )}
                value={selectedDraft.narration}
                disabled={hardDisabled}
                onChange={(e) => updateDraft(selectedScene.id, { narration: e.target.value })}
              />
              {fieldErrorsById[selectedScene.id]?.narration && (
                <div className="cb-creator-scene-field-error">
                  {fieldErrorsById[selectedScene.id]?.narration}
                </div>
              )}
            </label>

            <label className="cb-creator-scene-field">
              <div className="cb-creator-scene-field-label">caption</div>
              <textarea
                className={cx(
                  "cb-reviewer-textarea",
                  "cb-creator-scene-field-textarea",
                  fieldErrorsById[selectedScene.id]?.caption && "is-invalid"
                )}
                value={selectedDraft.caption}
                disabled={hardDisabled}
                onChange={(e) => updateDraft(selectedScene.id, { caption: e.target.value })}
              />
              {fieldErrorsById[selectedScene.id]?.caption && (
                <div className="cb-creator-scene-field-error">
                  {fieldErrorsById[selectedScene.id]?.caption}
                </div>
              )}
            </label>

            <label className="cb-creator-scene-field">
              <div className="cb-creator-scene-field-label">duration_sec</div>
              <input
                className={cx(
                  "cb-admin-input",
                  "cb-creator-scene-field-number",
                  fieldErrorsById[selectedScene.id]?.duration_sec && "is-invalid"
                )}
                type="number"
                min={1}
                step={1}
                value={selectedDraft.duration_sec}
                disabled={hardDisabled}
                onChange={(e) =>
                  updateDraft(selectedScene.id, { duration_sec: Number(e.target.value) })
                }
              />
              {fieldErrorsById[selectedScene.id]?.duration_sec && (
                <div className="cb-creator-scene-field-error">
                  {fieldErrorsById[selectedScene.id]?.duration_sec}
                </div>
              )}
            </label>
          </>
        )}
      </div>
    </div>
  );
}
