// src/components/chatbot/creatorSceneMockApi.ts
import type { CreatorScriptScene, CreatorScriptScenePatchErrors } from "./creatorStudioTypes";

type PatchPayload = {
  narration: string;
  caption: string;
  duration_sec: number;
  expected_updated_at?: string;
};

export class MockApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Mock 저장소 (메모리)
 * - scriptId 단위로 scenes 보관
 * - 프론트-only 데모에서 “백엔드 연결 시 동작”을 시뮬레이션
 */
type StoreValue = { scenes: CreatorScriptScene[] };
const storeByScriptId = new Map<string, StoreValue>();

function nowIso() {
  return new Date().toISOString();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function splitIntoBlocks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // 1) 빈 줄 기준 블록 분리
  const blocks = trimmed
    .split(/\n\s*\n+/g)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length >= 2) return blocks.slice(0, 12);

  // 2) 문장 기준 분리(보조)
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 2) return [trimmed];

  // 2문장씩 묶기
  const grouped: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    grouped.push([sentences[i], sentences[i + 1]].filter(Boolean).join(" "));
  }
  return grouped.slice(0, 12);
}

function purposeFor(idx: number) {
  const pool = ["도입", "핵심", "사례", "주의", "정리"];
  return pool[idx % pool.length];
}

function estimateDurationSec(text: string) {
  const len = text.trim().length;
  const approx = Math.round(len / 10); // 데모용 러프 추정
  return clamp(approx, 15, 90);
}

function buildDefaultScenes(): CreatorScriptScene[] {
  const updated_at = nowIso();
  const base = [
    "정보자산의 정의와 예시를 빠르게 정리합니다.",
    "문서 반출 시 흔히 발생하는 위반 사례를 확인합니다.",
    "반출 전 체크리스트로 안전하게 마무리합니다.",
  ];
  return base.map((narration, i) => {
    const scene_order = i + 1;
    const chapter_id = "chapter-1";
    const chapter_title = "챕터 1";
    return {
      id: `scene-${scene_order}`,
      chapter_id,
      chapter_title,
      chapter_order: 1,
      scene_order,
      purpose: purposeFor(i),
      duration_sec: estimateDurationSec(narration),
      narration,
      caption: "",
      source_refs: ["근거-1"],
      updated_at,
    };
  });
}

function buildScenesFromScriptText(scriptText?: string): CreatorScriptScene[] {
  const blocks = splitIntoBlocks(scriptText ?? "");
  if (blocks.length === 0) return buildDefaultScenes();

  const scenes: CreatorScriptScene[] = [];
  const updated_at = nowIso();

  for (let i = 0; i < blocks.length; i++) {
    const narration = blocks[i];
    const scene_order = i + 1;

    // 3개 단위로 챕터 구성
    const chapterIndex = Math.floor(i / 3) + 1;
    const chapter_id = `chapter-${chapterIndex}`;
    const chapter_title = `챕터 ${chapterIndex}`;
    const chapter_order = chapterIndex;

    scenes.push({
      id: `scene-${scene_order}`,
      chapter_id,
      chapter_title,
      chapter_order,
      scene_order,
      purpose: purposeFor(i),
      duration_sec: estimateDurationSec(narration),
      narration,
      caption: "",
      source_refs: ["근거-1", "근거-2"].slice(0, 1 + (i % 2)),
      updated_at,
    });
  }

  return scenes;
}

function ensureStore(scriptId: string, scriptText?: string) {
  const existing = storeByScriptId.get(scriptId);
  if (existing) return existing;

  const initial = buildScenesFromScriptText(scriptText);
  const value: StoreValue = { scenes: initial };
  storeByScriptId.set(scriptId, value);
  return value;
}

export function mockGetScenes(args: { scriptId: string; scriptText?: string }): CreatorScriptScene[] {
  const store = ensureStore(args.scriptId, args.scriptText);
  return store.scenes.map((s) => ({ ...s, source_refs: [...(s.source_refs ?? [])] }));
}

function validatePatch(patch: PatchPayload): CreatorScriptScenePatchErrors {
  const errs: CreatorScriptScenePatchErrors = {};

  if (typeof patch.narration !== "string" || patch.narration.trim().length === 0) {
    errs.narration = "narration은 필수입니다.";
  } else if (patch.narration.length > 2000) {
    errs.narration = "narration은 2000자 이하여야 합니다.";
  }

  if (typeof patch.caption !== "string") {
    errs.caption = "caption 형식이 올바르지 않습니다.";
  } else if (patch.caption.length > 500) {
    errs.caption = "caption은 500자 이하여야 합니다.";
  }

  const d = Number(patch.duration_sec);
  if (!Number.isFinite(d) || d < 1) {
    errs.duration_sec = "duration_sec은 1 이상의 숫자여야 합니다.";
  } else if (d > 600) {
    errs.duration_sec = "duration_sec은 600 이하로 입력해 주세요.";
  }

  return errs;
}

export function mockPatchScene(args: {
  scriptId: string;
  sceneId: string;
  patch: PatchPayload;
}): CreatorScriptScene {
  const store = ensureStore(args.scriptId);

  const errs = validatePatch(args.patch);
  if (Object.keys(errs).length > 0) {
    throw new MockApiError(422, "Validation error", { errors: errs });
  }

  const idx = store.scenes.findIndex((s) => s.id === args.sceneId);
  if (idx < 0) {
    throw new MockApiError(404, "Not found");
  }

  const current = store.scenes[idx];
  const expected = String(args.patch.expected_updated_at ?? "");

  // 낙관적 락(409) 시뮬레이션
  if (expected && current.updated_at && current.updated_at !== expected) {
    throw new MockApiError(409, "Conflict");
  }

  const next: CreatorScriptScene = {
    ...current,
    narration: args.patch.narration,
    caption: args.patch.caption,
    duration_sec: Number(args.patch.duration_sec),
    updated_at: nowIso(),
  };

  store.scenes[idx] = next;
  return { ...next, source_refs: [...(next.source_refs ?? [])] };
}

/**
 * 409 데모용: “다른 사용자가 먼저 수정”한 것처럼 updated_at만 바꾼다.
 */
export function mockSimulateExternalUpdate(args: { scriptId: string; sceneId: string }) {
  const store = ensureStore(args.scriptId);
  const idx = store.scenes.findIndex((s) => s.id === args.sceneId);
  if (idx < 0) return;
  store.scenes[idx] = { ...store.scenes[idx], updated_at: nowIso() };
}

/**
 * 데모 리셋용: scriptText 기준으로 scenes 재생성
 */
export function mockResetScript(args: { scriptId: string; scriptText?: string }) {
  const scenes = buildScenesFromScriptText(args.scriptText);
  storeByScriptId.set(args.scriptId, { scenes });
}
