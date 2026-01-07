// src/components/chatbot/creatorStudioUtils.ts

/**
 * Creator Studio 공통 유틸
 * - 라벨/포맷
 * - 카테고리 판별
 */

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  SEXUAL_HARASSMENT_PREVENTION: "성희롱 예방",
  PERSONAL_INFO_PROTECTION: "개인정보 보호",
  WORKPLACE_BULLYING: "직장 내 괴롭힘",
  DISABILITY_AWARENESS: "장애인 인식 개선",
  JOB_DUTY: "직무 교육",
  RANSOMWARE: "랜섬웨어 대응",
};

export function categoryLabel(categoryId?: string | null): string {
  if (!categoryId) return "-";
  return CATEGORY_LABEL[categoryId] ?? categoryId;
}

export function deptLabel(deptId?: string | null): string {
  if (!deptId) return "전체";
  return deptId;
}

export function templateLabel(templateId?: string | null): string {
  if (!templateId) return "-";
  return templateId;
}

export function jobTrainingLabel(jobTrainingId?: string | null): string {
  if (!jobTrainingId) return "-";
  return jobTrainingId;
}

export function isJobCategory(categoryId?: string | null): boolean {
  return categoryId === "JOB_DUTY";
}

/**
 * Duration을 포맷팅 (초 단위 → "HH:MM:SS" 또는 "MM:SS")
 */
export function formatDuration(seconds?: number | null): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "-";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}