// src/components/chatbot/creatorStudioCatalog.ts

import type {
  CategoryKind,
  CategoryOption,
  CreatorStatus,
  CreatorWorkItem,
  DepartmentOption,
  JobTrainingOption,
  VideoTemplateOption,
} from "./creatorStudioTypes";

/** =========================
 * Catalog (Runtime-injected)
 * ========================= */

export type CreatorCatalog = Readonly<{
  departments: readonly DepartmentOption[];
  categories: readonly CategoryOption[];
  videoTemplates: readonly VideoTemplateOption[];
  jobTrainings: readonly JobTrainingOption[];
}>;

/**
 * Controller가 계속 "상수 import"를 쓰고 있으므로,
 * catalog 주입 방식에서도 동일한 export 이름을 유지해야 한다.
 *
 * 핵심: 배열 reference는 고정하고, setCreatorCatalog에서 splice로 내용을 교체한다.
 * => 다른 모듈에서 import한 배열 참조가 깨지지 않고 최신 값으로 갱신됨.
 */
export const CREATOR_DEPARTMENTS: DepartmentOption[] = [];
export const CREATOR_CATEGORIES: CategoryOption[] = [];
export const CREATOR_VIDEO_TEMPLATES: VideoTemplateOption[] = [];
export const CREATOR_JOB_TRAININGS: JobTrainingOption[] = [];

let _catalog: CreatorCatalog | null = null;

function replaceArrayInPlace<T>(target: T[], next: readonly T[]): void {
  target.splice(0, target.length, ...next);
}

/** =========================
 * Catalog change notification
 * ========================= */

let _catalogVersion = 0;
const _catalogListeners = new Set<() => void>();

export function subscribeCreatorCatalog(listener: () => void): () => void {
  _catalogListeners.add(listener);
  return () => _catalogListeners.delete(listener);
}

export function getCreatorCatalogVersion(): number {
  return _catalogVersion;
}

function notifyCatalogChanged(): void {
  _catalogVersion += 1;
  for (const fn of _catalogListeners) fn();
}

/** =========================
 * Runtime normalizers
 * ========================= */

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null;
}

function pickString(obj: AnyRecord, keys: readonly string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function normalizeId(obj: AnyRecord): string | null {
  return pickString(obj, ["id", "code", "value", "key"]);
}

function normalizeName(obj: AnyRecord, fallbackId: string): string {
  return (
    pickString(obj, ["name", "label", "title", "displayName"]) ?? fallbackId
  );
}

function normalizeCategoryKind(obj: AnyRecord): CategoryKind {
  const raw = pickString(obj, ["kind", "categoryKind", "type"]);
  if (!raw) return "JOB";
  const up = raw.trim().toUpperCase();
  if (up === "MANDATORY" || up === "REQUIRED") return "MANDATORY";
  return "JOB";
}

function normalizeDepartmentOption(raw: unknown): DepartmentOption | null {
  // 문자열 배열도 허용 (ex: "총무팀")
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    return { id: s, name: s };
  }

  if (!isRecord(raw)) return null;
  const id = normalizeId(raw);
  if (!id) return null;
  return { id, name: normalizeName(raw, id) };
}

function normalizeCategoryOption(raw: unknown): CategoryOption | null {
  // 문자열도 허용 (kind는 기본 JOB)
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    return { id: s, name: s, kind: "JOB" };
  }

  if (!isRecord(raw)) return null;
  const id = normalizeId(raw);
  if (!id) return null;
  return { id, name: normalizeName(raw, id), kind: normalizeCategoryKind(raw) };
}

function normalizeVideoTemplateOption(raw: unknown): VideoTemplateOption | null {
  // 문자열도 허용
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    return { id: s, name: s };
  }

  if (!isRecord(raw)) return null;
  const id = normalizeId(raw);
  if (!id) return null;
  const name = normalizeName(raw, id);
  const description =
    pickString(raw, ["description", "desc", "detail"]) ?? undefined;
  return { id, name, description };
}

function normalizeJobTrainingOption(raw: unknown): JobTrainingOption | null {
  // 문자열도 허용
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    return { id: s, name: s };
  }

  if (!isRecord(raw)) return null;
  const id = normalizeId(raw);
  if (!id) return null;
  return { id, name: normalizeName(raw, id) };
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asStringArray(v: unknown): string[] {
  if (typeof v === "string") {
    const s = v.trim();
    return s ? [s] : [];
  }
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function looksLikeEducationWithVideosItem(v: unknown): v is AnyRecord {
  if (!isRecord(v)) return false;
  // with-videos 응답의 핵심 키들
  const hasIdOrTitle = typeof v["id"] === "string" || typeof v["title"] === "string";
  const hasDeptScope = Array.isArray(v["departmentScope"]) || typeof v["departmentScope"] === "string";
  const hasVideos = Array.isArray(v["videos"]);
  return hasIdOrTitle && (hasVideos || hasDeptScope);
}

/**
 * with-videos 응답(배열 or {items/data/list: 배열})을 넣으면
 * - departments: departmentScope union
 * - jobTrainings: education(id,title) 목록으로 채움 (드롭다운 공백 방지)
 * - categories: 기본 2개 (JOB/MANDATORY) 제공 (UI가 비면 안되는 경우 대비)
 * - templates: 비우되, 필요하면 여기서 기본값 1개를 넣어도 됨
 */
function tryDeriveCatalogFromEducationsWithVideos(input: unknown): CreatorCatalog | null {
  const list: unknown[] | null = (() => {
    if (Array.isArray(input)) return input;

    if (isRecord(input)) {
      const obj: AnyRecord = input;
      if (Array.isArray(obj["items"])) return obj["items"] as unknown[];
      if (Array.isArray(obj["data"])) return obj["data"] as unknown[];
      if (Array.isArray(obj["list"])) return obj["list"] as unknown[];
      if (Array.isArray(obj["content"])) return obj["content"] as unknown[];
    }
    return null;
  })();

  if (!list || list.length === 0) return null;

  // “education with videos” 형태가 아니면 파생하지 않음
  const anyMatch = list.some(looksLikeEducationWithVideosItem);
  if (!anyMatch) return null;

  const deptMap = new Map<string, DepartmentOption>();
  const jtMap = new Map<string, JobTrainingOption>();

  // 템플릿 정보가 백엔드에 아직 없더라도 UI가 비지 않게 최소 기본값 제공(1회만 선언)
  const defaultVideoTemplates: VideoTemplateOption[] = [
    { id: "DEFAULT", name: "기본 템플릿" },
  ];

  for (const rawEdu of list) {
    if (!looksLikeEducationWithVideosItem(rawEdu)) continue;

    const eduId = typeof rawEdu["id"] === "string" ? rawEdu["id"].trim() : "";
    const eduTitle =
      (typeof rawEdu["title"] === "string" ? rawEdu["title"].trim() : "") || eduId;

    // jobTrainings: 교육 자체를 옵션으로 제공 (id=educationId)
    if (eduId) {
      jtMap.set(eduId, { id: eduId, name: eduTitle || eduId });
    }

    // departments: education.departmentScope + video.departmentScope 모두 union
    const eduDeptScopes = asStringArray(rawEdu["departmentScope"]);
    for (const d of eduDeptScopes) {
      if (!d) continue;

      // 백엔드에서 전사 대상은 "전체 부서"로 내려오므로, 개별 부서 옵션에서는 제외
      if (d === "전체 부서") continue;

      if (!deptMap.has(d)) deptMap.set(d, { id: d, name: d });
    }

    const videos = asArray(rawEdu["videos"]);
    for (const v of videos) {
      if (!isRecord(v)) continue;

      const vDeptScopes = asStringArray((v as AnyRecord)["departmentScope"]);
      for (const d of vDeptScopes) {
        if (!d) continue;
        if (d === "전체 부서") continue; // 여기에서도 동일 정책 적용(일관성)

        if (!deptMap.has(d)) deptMap.set(d, { id: d, name: d });
      }
    }
  }

  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

  const departments = Array.from(deptMap.values()).sort(byName);
  const jobTrainings = Array.from(jtMap.values()).sort(byName);

  // categories 기본값 (UI 공백 방지용)
  const categories: CategoryOption[] = [
    { id: "JOB", name: "직무 교육", kind: "JOB" },
    { id: "MANDATORY", name: "의무 교육", kind: "MANDATORY" },
  ];

  return {
    departments,
    categories,
    videoTemplates: defaultVideoTemplates,
    jobTrainings,
  };
}

function readCatalogArrays(input: unknown): {
  departments: unknown[];
  categories: unknown[];
  videoTemplates: unknown[];
  jobTrainings: unknown[];
} {
  if (!isRecord(input)) {
    return { departments: [], categories: [], videoTemplates: [], jobTrainings: [] };
  }

  // any 금지 규칙 대응: Record<string, unknown>로 안전하게 접근
  const obj: AnyRecord = input;

  return {
    departments: asArray(obj["departments"] ?? obj["departmentOptions"] ?? obj["depts"]),
    categories: asArray(obj["categories"] ?? obj["categoryOptions"]),
    videoTemplates: asArray(
      obj["videoTemplates"] ??
      obj["templates"] ??
      obj["video_templates"] ??
      obj["videoTemplateOptions"]
    ),
    jobTrainings: asArray(
      obj["jobTrainings"] ??
      obj["trainings"] ??
      obj["jobTrainingOptions"] ??
      obj["job_trainings"]
    ),
  };
}

/**
 * API 등 외부에서 카탈로그를 로딩한 뒤 주입합니다.
 * - null 주입 시 캐시 초기화 + exported 배열도 비움
 * - 런타임에서는 shape 편차(label/title/code 등)를 normalize 해서 UI 공백을 방지합니다.
 */
export function setCreatorCatalog(next: CreatorCatalog | null): void;
export function setCreatorCatalog(next: unknown): void;
export function setCreatorCatalog(next: unknown): void {
  if (next == null) {
    _catalog = null;
    replaceArrayInPlace(CREATOR_DEPARTMENTS, []);
    replaceArrayInPlace(CREATOR_CATEGORIES, []);
    replaceArrayInPlace(CREATOR_VIDEO_TEMPLATES, []);
    replaceArrayInPlace(CREATOR_JOB_TRAININGS, []);
    notifyCatalogChanged();
    return;
  }

  // 1) with-videos 응답(배열)을 그대로 넣어도 자동 파생되게 처리
  const derived = tryDeriveCatalogFromEducationsWithVideos(next);
  if (derived) {
    _catalog = derived;

    replaceArrayInPlace(CREATOR_DEPARTMENTS, derived.departments);
    replaceArrayInPlace(CREATOR_CATEGORIES, derived.categories);
    replaceArrayInPlace(CREATOR_VIDEO_TEMPLATES, derived.videoTemplates);
    replaceArrayInPlace(CREATOR_JOB_TRAININGS, derived.jobTrainings);

    notifyCatalogChanged();
    return;
  }

  // 2) 기존 catalog 형태는 그대로 지원
  const { departments, categories, videoTemplates, jobTrainings } =
    readCatalogArrays(next);

  const normalized: CreatorCatalog = {
    departments: departments
      .map(normalizeDepartmentOption)
      .filter((v): v is DepartmentOption => !!v),
    categories: categories
      .map(normalizeCategoryOption)
      .filter((v): v is CategoryOption => !!v),
    videoTemplates: videoTemplates
      .map(normalizeVideoTemplateOption)
      .filter((v): v is VideoTemplateOption => !!v),
    jobTrainings: jobTrainings
      .map(normalizeJobTrainingOption)
      .filter((v): v is JobTrainingOption => !!v),
  };

  _catalog = normalized;

  replaceArrayInPlace(CREATOR_DEPARTMENTS, normalized.departments);
  replaceArrayInPlace(CREATOR_CATEGORIES, normalized.categories);
  replaceArrayInPlace(CREATOR_VIDEO_TEMPLATES, normalized.videoTemplates);
  replaceArrayInPlace(CREATOR_JOB_TRAININGS, normalized.jobTrainings);

  notifyCatalogChanged();
}

export function getCreatorCatalog(): CreatorCatalog | null {
  return _catalog;
}

/**
 * Getter들은 export된 "상수 배열"을 반환 (항상 최신 상태)
 * - Controller/컴포넌트는 CREATOR_* 상수를 써도 되고,
 *   여기 getter를 써도 된다.
 */
export function getDepartmentOptions(): readonly DepartmentOption[] {
  return CREATOR_DEPARTMENTS;
}

export function getCategoryOptions(): readonly CategoryOption[] {
  return CREATOR_CATEGORIES;
}

export function getVideoTemplateOptions(): readonly VideoTemplateOption[] {
  return CREATOR_VIDEO_TEMPLATES;
}

export function getJobTrainingOptions(): readonly JobTrainingOption[] {
  return CREATOR_JOB_TRAININGS;
}

/** =========================
 * Labels / Kinds
 * ========================= */

export function deptLabel(deptId: string): string {
  return CREATOR_DEPARTMENTS.find((d) => d.id === deptId)?.name ?? deptId;
}

export function categoryLabel(categoryId: string): string {
  return CREATOR_CATEGORIES.find((c) => c.id === categoryId)?.name ?? categoryId;
}

export function templateLabel(templateId: string): string {
  return CREATOR_VIDEO_TEMPLATES.find((t) => t.id === templateId)?.name ?? templateId;
}

export function jobTrainingLabel(jobTrainingId: string): string {
  return CREATOR_JOB_TRAININGS.find((t) => t.id === jobTrainingId)?.name ?? jobTrainingId;
}

/**
 * 카테고리 Kind는 원칙적으로 백엔드가 내려준 categories[].kind를 신뢰합니다.
 * - catalog 미주입/미존재 시 fallback을 명시적으로 선택 가능
 */
export function getCategoryKind(categoryId: string, fallback: CategoryKind = "JOB"): CategoryKind {
  const fromCatalog = CREATOR_CATEGORIES.find((c) => c.id === categoryId)?.kind;
  return fromCatalog ?? fallback;
}

export function isJobCategory(categoryId: string, fallback: CategoryKind = "JOB"): boolean {
  return getCategoryKind(categoryId, fallback) === "JOB";
}

export function isMandatoryCategory(categoryId: string, fallback: CategoryKind = "JOB"): boolean {
  return getCategoryKind(categoryId, fallback) === "MANDATORY";
}

/** =========================
 * Common formatters
 * ========================= */

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function labelStatus(s: CreatorStatus): string {
  switch (s) {
    case "DRAFT":
      return "초안";
    case "GENERATING":
      return "생성 중";
    case "REVIEW_PENDING":
      return "검토 대기";
    case "REJECTED":
      return "반려";
    case "APPROVED":
      return "승인/게시";
    case "FAILED":
      return "생성 실패";
    default:
      return s;
  }
}

/** =========================
 * List display / sort policy
 * ========================= */

export type CreatorListSortMode = "UPDATED_AT_DESC" | "STATUS_THEN_UPDATED_AT_DESC";

export type CreatorListSortPolicy = Readonly<{
  mode?: CreatorListSortMode;

  /**
   * STATUS_THEN_UPDATED_AT_DESC 모드에서 사용.
   * 기본 정책(권장):
   * - 생성 중/수정 필요/오류/대기/완료 순서로 사용자가 “해야 할 일”이 위로 오도록 정렬
   */
  statusOrder?: readonly CreatorStatus[];
}>;

export const DEFAULT_CREATOR_STATUS_ORDER: readonly CreatorStatus[] = [
  // 진행중
  "GENERATING",
  // 수정/조치 필요
  "REJECTED",
  "FAILED",
  "DRAFT",
  // 대기
  "REVIEW_PENDING",
  // 완료
  "APPROVED",
] as const;

export const DEFAULT_CREATOR_LIST_SORT_POLICY: CreatorListSortPolicy = {
  mode: "STATUS_THEN_UPDATED_AT_DESC",
  statusOrder: DEFAULT_CREATOR_STATUS_ORDER,
};

function toFiniteNumberOrNull(v: unknown): number | null {
  if (typeof v !== "number") return null;
  return Number.isFinite(v) ? v : null;
}

function byDescNumber(a: number | null, b: number | null): number {
  // null은 항상 뒤로
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function statusRank(status: CreatorStatus, order: readonly CreatorStatus[]): number {
  const idx = order.indexOf(status);
  return idx >= 0 ? idx : order.length + 1;
}

export function compareCreatorWorkItems(
  a: CreatorWorkItem,
  b: CreatorWorkItem,
  policy: CreatorListSortPolicy = DEFAULT_CREATOR_LIST_SORT_POLICY
): number {
  const mode: CreatorListSortMode =
    policy.mode ?? DEFAULT_CREATOR_LIST_SORT_POLICY.mode ?? "UPDATED_AT_DESC";

  const aUpdated = toFiniteNumberOrNull(a.updatedAt);
  const bUpdated = toFiniteNumberOrNull(b.updatedAt);

  if (mode === "UPDATED_AT_DESC") {
    const c1 = byDescNumber(aUpdated, bUpdated);
    if (c1 !== 0) return c1;

    const aCreated = toFiniteNumberOrNull(a.createdAt);
    const bCreated = toFiniteNumberOrNull(b.createdAt);
    const c2 = byDescNumber(aCreated, bCreated);
    if (c2 !== 0) return c2;

    // 마지막 tie-breaker: id
    return String(a.id).localeCompare(String(b.id));
  }

  // STATUS_THEN_UPDATED_AT_DESC
  const order = policy.statusOrder ?? DEFAULT_CREATOR_STATUS_ORDER;
  const rA = statusRank(a.status, order);
  const rB = statusRank(b.status, order);
  if (rA !== rB) return rA - rB;

  const c1 = byDescNumber(aUpdated, bUpdated);
  if (c1 !== 0) return c1;

  const aCreated = toFiniteNumberOrNull(a.createdAt);
  const bCreated = toFiniteNumberOrNull(b.createdAt);
  const c2 = byDescNumber(aCreated, bCreated);
  if (c2 !== 0) return c2;

  return String(a.id).localeCompare(String(b.id));
}

export function sortCreatorWorkItems(
  items: readonly CreatorWorkItem[],
  policy: CreatorListSortPolicy = DEFAULT_CREATOR_LIST_SORT_POLICY
): CreatorWorkItem[] {
  return [...items].sort((a, b) => compareCreatorWorkItems(a, b, policy));
}

/**
 * (선택) 목록 표시 필터 유틸
 * - 화면 쿼리/상태 탭 등에서 공통으로 사용 가능
 */
export type CreatorListFilter = Readonly<{
  includeStatuses?: readonly CreatorStatus[];
  excludeStatuses?: readonly CreatorStatus[];
  queryText?: string; // title/createdByName 단순 검색
  categoryIds?: readonly string[];
}>;

export function filterCreatorWorkItems(
  items: readonly CreatorWorkItem[],
  filter?: CreatorListFilter
): CreatorWorkItem[] {
  const f = filter ?? {};
  const q = (f.queryText ?? "").trim().toLowerCase();
  const include = f.includeStatuses ? new Set(f.includeStatuses) : null;
  const exclude = f.excludeStatuses ? new Set(f.excludeStatuses) : null;
  const catSet = f.categoryIds ? new Set(f.categoryIds) : null;

  return items.filter((it) => {
    if (include && !include.has(it.status)) return false;
    if (exclude && exclude.has(it.status)) return false;
    if (catSet && !catSet.has(it.categoryId)) return false;

    if (q) {
      const hay = `${it.title ?? ""} ${it.createdByName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * workItems만으로도 “옵션 드롭다운이 비는 문제”를 막기 위한 최소 카탈로그를 만들 수 있습니다.
 * - name이 없으면 id를 name으로 사용 (UI 공백 방지)
 * - category kind는 isMandatory가 하나라도 있으면 MANDATORY 우선
 */
export function deriveAndSetCreatorCatalogFromWorkItems(
  items: readonly CreatorWorkItem[]
): void {
  const deptMap = new Map<string, DepartmentOption>();
  const catMap = new Map<string, CategoryOption>();
  const tplMap = new Map<string, VideoTemplateOption>();
  const jtMap = new Map<string, JobTrainingOption>();

  for (const it of items) {
    for (const d of it.targetDeptIds ?? []) {
      if (!deptMap.has(d)) deptMap.set(d, { id: d, name: d });
    }

    if (it.categoryId) {
      const id = it.categoryId;
      const name = (it.categoryLabel ?? "").trim() || id;
      const kind: CategoryKind = it.isMandatory ? "MANDATORY" : "JOB";

      const prev = catMap.get(id);
      if (!prev) {
        catMap.set(id, { id, name, kind });
      } else {
        // kind는 MANDATORY 우선
        const nextKind: CategoryKind =
          prev.kind === "MANDATORY" || kind === "MANDATORY" ? "MANDATORY" : "JOB";

        // name은 “id만 있던 상태”면 더 좋은 라벨로 교체
        const nextName =
          prev.name === prev.id && name !== id ? name : prev.name;

        if (nextKind !== prev.kind || nextName !== prev.name) {
          catMap.set(id, { ...prev, kind: nextKind, name: nextName });
        }
      }
    }

    if (it.templateId) {
      const id = it.templateId;
      if (!tplMap.has(id)) tplMap.set(id, { id, name: id });
    }

    if (it.jobTrainingId) {
      const id = it.jobTrainingId;
      if (!jtMap.has(id)) jtMap.set(id, { id, name: id });
    }
  }

  const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id);

  setCreatorCatalog({
    departments: Array.from(deptMap.values()).sort(byId),
    categories: Array.from(catMap.values()).sort(byId),
    videoTemplates: Array.from(tplMap.values()).sort(byId),
    jobTrainings: Array.from(jtMap.values()).sort(byId),
  });
}
