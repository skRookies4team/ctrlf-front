// src/components/chatbot/EduPanel.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import "./chatbot.css";
import {
  computePanelPosition,
  type Anchor,
  type PanelSize,
} from "../../utils/chat";
import {
  listPublishedEduVideosSnapshot,
  subscribePublishedEduVideos,
  type PublishedEduVideo,
} from "./reviewFlowStore";

type Size = PanelSize;
type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type ResizeState = {
  resizing: boolean;
  dir: ResizeDirection | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startTop: number;
  startLeft: number;
};

type DragState = {
  dragging: boolean;
  startX: number;
  startY: number;
  startTop: number;
  startLeft: number;
};

type VideoProgressMap = Record<string, number>;

export interface EduPanelProps {
  anchor?: Anchor | null;
  onClose: () => void;
  onOpenQuizPanel?: (quizId?: string) => void;
  videoProgressMap?: VideoProgressMap;
  onUpdateVideoProgress?: (videoId: string, progress: number) => void;
  onRequestFocus?: () => void;
}

// =======================
// 옵션: 상단 헤더 위로도 패널 이동을 허용할지
// - true  : 헤더 위로 겹침 허용(요청한 동작)
// - false : 헤더 영역 보호(기존 동작)
// =======================
const ALLOW_OVERLAP_APP_HEADER = true;

// 최소 크기
const MIN_WIDTH = 520;
const MIN_HEIGHT = 480;

// 최대 폭 + 화면 여백
const MAX_WIDTH = 1360;
const PANEL_MARGIN = 80;

// 시청 모드 기본 사이즈
const WATCH_DEFAULT_SIZE: Size = { width: 540, height: 480 };

// URL 없는 카드용 fallback 비디오
const SAMPLE_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

// 패널이 화면 밖으로 나가지 않게 잡는 기본 여백
const EDGE_MARGIN = 0;

// 패널이 “완전히” 화면 밖으로 사라지지 않게,
// 최소한 이 정도(px) 영역은 항상 화면 안에 남도록 강제.
// → 이 값이 핵심: 크기가 커져도 오른쪽/아래로 계속 이동 가능해짐.
const KEEP_VISIBLE_X = 120;
const KEEP_VISIBLE_Y = 80;

// Dock 주변 “겹침” 안전 여백 (초기 위치만 영향)
const DOCK_SAFE_RIGHT = 60;
const DOCK_SAFE_BOTTOM = 60;

// z-index는 wrapper 레벨에서 최상단 고정
const EDU_LAYER_Z = 2147483000;

// =======================
// 교육 도메인용 타입/데이터
// =======================

type EduVideoStatusKey = "not-started" | "in-progress" | "completed";

interface EduVideo {
  id: string;
  title: string;
  progress?: number; // 0 ~ 100
  videoUrl?: string;
  quizId?: string;
}

interface EduSection {
  id: string;
  title: string;
  videos: EduVideo[];
}

// 더미 섹션 (Published 없을 때 fallback)
const EDU_SECTIONS: EduSection[] = [
  {
    id: "job",
    title: "직무 교육",
    videos: [
      { id: "job-1", title: "곰", videoUrl: "/videos/test1.mp4" },
      { id: "job-2", title: "직무교육 2차" },
      { id: "job-3", title: "직무교육 3차" },
      { id: "job-4", title: "신입사원 온보딩" },
      { id: "job-5", title: "문서작성 실무" },
      { id: "job-6", title: "리더십 스킬 향상" },
    ],
  },
  {
    id: "sexual-harassment",
    title: "성희롱 예방",
    videos: [
      { id: "sh-1", title: "성희롱 예방 교육 (기본)", quizId: "harassment" },
      { id: "sh-2", title: "성희롱 예방 교육 (심화)", quizId: "harassment" },
      { id: "sh-3", title: "사례로 보는 성희롱", quizId: "harassment" },
      { id: "sh-4", title: "관리자 필수 과정", quizId: "harassment" },
      { id: "sh-5", title: "신고·처리 절차 안내", quizId: "harassment" },
    ],
  },
  {
    id: "privacy",
    title: "개인 정보 보호",
    videos: [
      { id: "pi-1", title: "개인정보보호 기본 교육", quizId: "privacy" },
      { id: "pi-2", title: "개인정보 유출 사례", quizId: "privacy" },
      { id: "pi-3", title: "마케팅·홍보 시 유의사항", quizId: "privacy" },
      { id: "pi-4", title: "업무별 체크리스트", quizId: "privacy" },
      { id: "pi-5", title: "개인정보보호법 개정 사항", quizId: "privacy" },
    ],
  },
  {
    id: "bullying",
    title: "괴롭힘",
    videos: [
      { id: "bully-1", title: "직장 내 괴롭힘 예방교육", quizId: "bullying" },
      { id: "bully-2", title: "실제 사례와 판례", quizId: "bullying" },
      { id: "bully-3", title: "관리자 대응 매뉴얼", quizId: "bullying" },
      { id: "bully-4", title: "동료로서의 대응 방법", quizId: "bullying" },
      { id: "bully-5", title: "피해자 보호 절차", quizId: "bullying" },
    ],
  },
  {
    id: "disability-awareness",
    title: "장애인 인식 개선",
    videos: [
      { id: "da-1", title: "장애인 인식개선 기본 교육", quizId: "disability" },
      { id: "da-2", title: "장애 유형별 이해", quizId: "disability" },
      { id: "da-3", title: "배려가 필요한 상황들", quizId: "disability" },
      { id: "da-4", title: "말·행동 가이드", quizId: "disability" },
      { id: "da-5", title: "사내 사례 모음", quizId: "disability" },
    ],
  },
];

function getVideoStatus(
  progress: number
): { label: string; key: EduVideoStatusKey } {
  if (progress <= 0) return { label: "시청전", key: "not-started" };
  if (progress >= 100) return { label: "시청완료", key: "completed" };
  return { label: "시청중", key: "in-progress" };
}

// 패널 너비에 따라 한 번에 보여줄 카드 개수
function getPageSize(panelWidth: number): number {
  if (panelWidth < 640) return 1;
  if (panelWidth < 920) return 2;
  return 3;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseCssPx(v: string): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const num = Number(s.replace("px", "").trim());
  return Number.isFinite(num) ? num : null;
}

/**
 * 헤더 높이를 “안전 상단 여백”으로 사용
 * - 우선순위:
 *   1) CSS 변수 --app-header-safe-top
 *   2) CSS 변수 --app-header-height
 *   3) DOM header 측정
 *   4) fallback 72px
 */
function readAppHeaderSafeTop(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;

  try {
    const rootStyle = window.getComputedStyle(document.documentElement);

    const v1 = parseCssPx(rootStyle.getPropertyValue("--app-header-safe-top"));
    if (v1 !== null) return clamp(v1, 0, 200);

    const v2 = parseCssPx(rootStyle.getPropertyValue("--app-header-height"));
    if (v2 !== null) return clamp(v2, 0, 200);

    const headerEl =
      document.querySelector<HTMLElement>("[data-app-header]") ??
      document.querySelector<HTMLElement>("header");

    if (headerEl) {
      const h = headerEl.getBoundingClientRect().height;
      if (Number.isFinite(h) && h > 0) return clamp(h, 0, 200);
    }
  } catch {
    // ignore
  }

  return 72;
}

// 상단 최소 top 규칙(헤더 보호 여부에 따라 달라짐)
function getMinTop(topSafe: number) {
  return ALLOW_OVERLAP_APP_HEADER ? 0 : topSafe;
}

/**
 * 핵심 정책 변경:
 * - 기존: 패널 “전체”가 항상 화면 안에 있어야 함 → 오른쪽/아래로 막힘 발생(정상 동작)
 * - 변경: 패널이 화면 밖으로 나가도 되되, 최소 KEEP_VISIBLE_X/Y 만큼은 항상 화면 안에 남게 함
 *   → 패널이 크거나(최대화) 화면이 커도 오른쪽/아래로 계속 밀어서 이동 가능
 */
function clampPanelPos(
  pos: { top: number; left: number },
  size: Size,
  minTop: number
) {
  if (typeof window === "undefined") return pos;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 최소 노출 영역(패널이 완전히 사라지지 않도록)
  const keepX = Math.min(KEEP_VISIBLE_X, Math.max(48, size.width - 48));
  const keepY = Math.min(KEEP_VISIBLE_Y, Math.max(40, size.height - 40));

  // left/top이 이 범위를 벗어나면 “완전 이탈”이므로 clamp
  // - 오른쪽으로 더 가려면 left가 커져야 하는데,
  //   leftMax를 vw - keepX 로 잡아서 “오른쪽으로도 계속 이동” 가능하게 만든다.
  const rawLeftMin = -size.width + keepX;
  const rawLeftMax = vw - keepX;

  // top은 헤더 정책에 따라:
  // - 겹침 허용(true): 위로도 일부 숨길 수 있도록 음수 허용
  // - 겹침 비허용(false): top은 최소 minTop(헤더 아래)부터
  const rawTopMin = ALLOW_OVERLAP_APP_HEADER ? -size.height + keepY : minTop;
  const rawTopMax = vh - keepY;

  // 혹시라도 역전되는 케이스까지 안전하게 정렬
  const leftMin = Math.min(rawLeftMin, rawLeftMax);
  const leftMax = Math.max(rawLeftMin, rawLeftMax);
  const topMin = Math.min(rawTopMin, rawTopMax);
  const topMax = Math.max(rawTopMin, rawTopMax);

  return {
    left: clamp(pos.left, leftMin, leftMax),
    top: clamp(pos.top, topMin, topMax),
  };
}

// 화면 크기에 맞게 처음 크게 띄우는 초기 사이즈 (목록 모드 기본)
function createInitialSize(topSafe: number): Size {
  if (typeof window === "undefined") return { width: 960, height: 600 };

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const desiredWidth = Math.min(MAX_WIDTH, vw - PANEL_MARGIN);
  const maxAllowedWidth = Math.max(MIN_WIDTH, vw - EDGE_MARGIN * 2);
  const width = clamp(desiredWidth, MIN_WIDTH, maxAllowedWidth);

  const desiredHeight = vh - PANEL_MARGIN - topSafe;
  const maxAllowedHeight = Math.max(MIN_HEIGHT, vh - topSafe - EDGE_MARGIN);
  const height = clamp(desiredHeight, MIN_HEIGHT, maxAllowedHeight);

  return { width, height };
}

function computeDockFallbackPos(size: Size) {
  if (typeof window === "undefined") return { top: 80, left: 120 };

  const left = window.innerWidth - EDGE_MARGIN - size.width - DOCK_SAFE_RIGHT;
  const top = window.innerHeight - EDGE_MARGIN - size.height - DOCK_SAFE_BOTTOM;

  return { top, left };
}

function derivePosByBottomRight(
  prevPos: { top: number; left: number },
  prevSize: Size,
  nextSize: Size,
  minTop: number
) {
  const right = prevPos.left + prevSize.width;
  const bottom = prevPos.top + prevSize.height;

  const nextPos = {
    left: right - nextSize.width,
    top: bottom - nextSize.height,
  };

  return clampPanelPos(nextPos, nextSize, minTop);
}

// 부모 progressMap을 섹션 구조에 반영
function buildSectionsWithProgress(
  sourceSections: EduSection[],
  progressMap?: VideoProgressMap
): EduSection[] {
  if (!progressMap) {
    return sourceSections.map((section) => ({
      ...section,
      videos: section.videos.map((v) => ({ ...v })),
    }));
  }

  return sourceSections.map((section) => ({
    ...section,
    videos: section.videos.map((video) => {
      const external = progressMap[video.id];
      if (external === undefined) return { ...video };
      const prev = video.progress ?? 0;
      return { ...video, progress: Math.max(prev, external) };
    }),
  }));
}

function normalizeSectionId(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  const upper = s.toUpperCase();

  const map: Record<string, string> = {
    JOB: "job",
    JOB_TRAINING: "job",
    직무: "job",
    "직무 교육": "job",

    SEXUAL_HARASSMENT: "sexual-harassment",
    HARASSMENT: "sexual-harassment",
    성희롱: "sexual-harassment",
    "성희롱 예방": "sexual-harassment",

    PRIVACY: "privacy",
    PERSONAL_INFO: "privacy",
    개인정보: "privacy",
    "개인 정보 보호": "privacy",

    BULLYING: "bullying",
    WORKPLACE_BULLYING: "bullying",
    괴롭힘: "bullying",

    DISABILITY: "disability-awareness",
    DISABILITY_AWARENESS: "disability-awareness",
    장애: "disability-awareness",
    "장애인 인식 개선": "disability-awareness",
  };

  if (map[upper]) return map[upper];

  if (s.includes("성희롱")) return "sexual-harassment";
  if (s.includes("개인정보") || s.includes("개인 정보")) return "privacy";
  if (s.includes("괴롭힘")) return "bullying";
  if (s.includes("장애")) return "disability-awareness";
  if (s.includes("직무")) return "job";

  return null;
}

function quizIdFromSectionId(sectionId: string | null): string | undefined {
  if (!sectionId) return undefined;
  if (sectionId === "sexual-harassment") return "harassment";
  if (sectionId === "privacy") return "privacy";
  if (sectionId === "bullying") return "bullying";
  if (sectionId === "disability-awareness") return "disability";
  return undefined;
}

function buildSectionsFromPublished(published: PublishedEduVideo[]): EduSection[] {
  const base: EduSection[] = EDU_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    videos: [],
  }));

  const byId = new Map<string, EduSection>(base.map((s) => [s.id, s]));
  const misc: EduSection = { id: "misc", title: "기타", videos: [] };

  for (const v of published) {
    const id = (v.id ?? "").trim();
    if (!id) continue;

    const title = (v.title ?? "").trim() || `교육 영상 ${id}`;
    const videoUrl = (v.videoUrl ?? "").trim() || undefined;

    const sectionId = normalizeSectionId(v.contentCategory) ?? null;
    const quizId = quizIdFromSectionId(sectionId);

    const nextVideo: EduVideo = { id, title, videoUrl, quizId };

    if (sectionId && byId.has(sectionId)) {
      byId.get(sectionId)!.videos.push(nextVideo);
    } else {
      misc.videos.push(nextVideo);
    }
  }

  const result: EduSection[] = [...base];
  if (misc.videos.length > 0) result.push(misc);
  return result;
}

const EduPanel: React.FC<EduPanelProps> = ({
  anchor,
  onClose,
  onOpenQuizPanel,
  videoProgressMap,
  onUpdateVideoProgress,
  onRequestFocus,
}) => {
  const hasDOM = typeof window !== "undefined" && typeof document !== "undefined";

  const initialTopSafe = hasDOM ? readAppHeaderSafeTop() : 0;
  const topSafeRef = useRef<number>(initialTopSafe);

  const published = useSyncExternalStore(
    subscribePublishedEduVideos,
    listPublishedEduVideosSnapshot,
    listPublishedEduVideosSnapshot
  );

  const [size, setSize] = useState<Size>(() => createInitialSize(initialTopSafe));
  const [panelPos, setPanelPos] = useState(() => {
    const initialSize = createInitialSize(initialTopSafe);

    if (!hasDOM) return { top: 80, left: 120 };

    const pos = anchor
      ? computePanelPosition(anchor, initialSize)
      : computeDockFallbackPos(initialSize);

    // 초기 오픈 clamp (겹침 허용 여부는 clampPanelPos 내부 정책으로 처리)
    return clampPanelPos(pos, initialSize, initialTopSafe);
  });

  const sizeRef = useRef<Size>(size);
  const posRef = useRef(panelPos);
  useEffect(() => {
    sizeRef.current = size;
    posRef.current = panelPos;
  }, [size, panelPos]);

  const resizeRef = useRef<ResizeState>({
    resizing: false,
    dir: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startTop: 0,
    startLeft: 0,
  });

  const dragRef = useRef<DragState>({
    dragging: false,
    startX: 0,
    startY: 0,
    startTop: 0,
    startLeft: 0,
  });

  const [sectionPages, setSectionPages] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    EDU_SECTIONS.forEach((section) => (initial[section.id] = 0));
    return initial;
  });

  const sourceSections: EduSection[] = useMemo(() => {
    if (published.length === 0) {
      return EDU_SECTIONS.map((s) => ({
        ...s,
        videos: s.videos.map((v) => ({ ...v })),
      }));
    }
    return buildSectionsFromPublished(published);
  }, [published]);

  const sections = useMemo(
    () => buildSectionsWithProgress(sourceSections, videoProgressMap),
    [sourceSections, videoProgressMap]
  );

  const [selectedVideo, setSelectedVideo] = useState<EduVideo | null>(null);

  const listRestoreRef = useRef<{
    size: Size;
    pos: { top: number; left: number };
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoDurationRef = useRef<number>(0);
  const maxWatchedTimeRef = useRef<number>(0);
  const [watchPercent, setWatchPercent] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const roundedWatchPercent = Math.round(watchPercent);
  const canTakeQuiz = roundedWatchPercent >= 100;

  // topSafe 동기화(헤더 높이 변동 대응)
  useEffect(() => {
    if (!hasDOM) return;

    const updateTopSafe = () => {
      const next = readAppHeaderSafeTop();
      topSafeRef.current = next;

      const minTop = getMinTop(next);
      const curSize = sizeRef.current;
      const curPos = posRef.current;

      const clamped = clampPanelPos(curPos, curSize, minTop);
      if (clamped.top === curPos.top && clamped.left === curPos.left) return;

      window.requestAnimationFrame(() => {
        setPanelPos(clamped);
      });
    };

    updateTopSafe();
    window.addEventListener("resize", updateTopSafe);
    return () => window.removeEventListener("resize", updateTopSafe);
  }, [hasDOM]);

  // 전역 드래그/리사이즈
  useEffect(() => {
    if (!hasDOM) return;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeState = resizeRef.current;
      const dragState = dragRef.current;

      const minTop = getMinTop(topSafeRef.current);

      // 1) 리사이즈
      if (resizeState.resizing && resizeState.dir) {
        const dx = event.clientX - resizeState.startX;
        const dy = event.clientY - resizeState.startY;

        let newWidth = resizeState.startWidth;
        let newHeight = resizeState.startHeight;
        let newTop = resizeState.startTop;
        let newLeft = resizeState.startLeft;

        const maxWidth = Math.max(MIN_WIDTH, window.innerWidth);
        const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - minTop);

        const proposedWidthForW = resizeState.startWidth - dx;
        const proposedHeightForN = resizeState.startHeight - dy;

        if (resizeState.dir.includes("e")) newWidth = resizeState.startWidth + dx;
        if (resizeState.dir.includes("s")) newHeight = resizeState.startHeight + dy;

        if (resizeState.dir.includes("w")) {
          newWidth = proposedWidthForW;
          newLeft = resizeState.startLeft + dx;
        }
        if (resizeState.dir.includes("n")) {
          newHeight = proposedHeightForN;
          newTop = resizeState.startTop + dy;
        }

        const clampedWidth = clamp(newWidth, MIN_WIDTH, maxWidth);
        const clampedHeight = clamp(newHeight, MIN_HEIGHT, maxHeight);

        if (resizeState.dir.includes("w") && clampedWidth !== proposedWidthForW) {
          newLeft = resizeState.startLeft + (resizeState.startWidth - clampedWidth);
        }
        if (resizeState.dir.includes("n") && clampedHeight !== proposedHeightForN) {
          newTop = resizeState.startTop + (resizeState.startHeight - clampedHeight);
        }

        const nextSize = { width: clampedWidth, height: clampedHeight };
        const clampedPos = clampPanelPos(
          { top: newTop, left: newLeft },
          nextSize,
          minTop
        );

        setSize(nextSize);
        setPanelPos(clampedPos);
        return;
      }

      // 2) 드래그
      if (dragState.dragging) {
        const currentSize = sizeRef.current;

        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;

        const nextPos = {
          top: dragState.startTop + dy,
          left: dragState.startLeft + dx,
        };

        const clampedPos = clampPanelPos(nextPos, currentSize, minTop);
        setPanelPos(clampedPos);
      }
    };

    const handleMouseUp = () => {
      if (resizeRef.current.resizing) {
        resizeRef.current.resizing = false;
        resizeRef.current.dir = null;
      }
      if (dragRef.current.dragging) {
        dragRef.current.dragging = false;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [hasDOM]);

  const handleResizeMouseDown =
    (dir: ResizeDirection) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const currentPos = posRef.current;
      const currentSize = sizeRef.current;

      resizeRef.current = {
        resizing: true,
        dir,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: currentSize.width,
        startHeight: currentSize.height,
        startTop: currentPos.top,
        startLeft: currentPos.left,
      };
      dragRef.current.dragging = false;
      onRequestFocus?.();
    };

  const handleDragMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const currentPos = posRef.current;

    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startTop: currentPos.top,
      startLeft: currentPos.left,
    };
    resizeRef.current.resizing = false;
    resizeRef.current.dir = null;
    onRequestFocus?.();
  };

  const syncProgressToParent = (videoId: string, progress: number) => {
    onUpdateVideoProgress?.(videoId, Math.round(progress));
  };

  const handlePrevClick = (sectionId: string) => {
    setSectionPages((prev) => {
      const pageSize = getPageSize(sizeRef.current.width);
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return prev;

      const maxPage = Math.max(0, Math.ceil(section.videos.length / pageSize) - 1);
      const current = Math.min(prev[sectionId] ?? 0, maxPage);
      const nextPage = Math.max(0, current - 1);
      return { ...prev, [sectionId]: nextPage };
    });
  };

  const handleNextClick = (sectionId: string) => {
    setSectionPages((prev) => {
      const pageSize = getPageSize(sizeRef.current.width);
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return prev;

      const maxPage = Math.max(0, Math.ceil(section.videos.length / pageSize) - 1);
      const current = Math.min(prev[sectionId] ?? 0, maxPage);
      const nextPage = Math.min(maxPage, current + 1);
      return { ...prev, [sectionId]: nextPage };
    });
  };

  const handleVideoClick = (video: EduVideo) => {
    const localProgress = video.progress ?? 0;
    const externalProgress =
      videoProgressMap && videoProgressMap[video.id] !== undefined
        ? videoProgressMap[video.id]
        : 0;
    const base = Math.max(localProgress, externalProgress);

    listRestoreRef.current = { size: sizeRef.current, pos: posRef.current };

    setSelectedVideo({ ...video, progress: base });
    setWatchPercent(base);
    maxWatchedTimeRef.current = 0;
    videoDurationRef.current = 0;
    setIsPlaying(false);

    const prevPos = posRef.current;
    const prevSize = sizeRef.current;
    const nextSize = WATCH_DEFAULT_SIZE;

    const minTop = getMinTop(topSafeRef.current);
    setSize(nextSize);
    setPanelPos(derivePosByBottomRight(prevPos, prevSize, nextSize, minTop));
  };

  const handleLoadedMetadata = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const duration = videoEl.duration || 0;
    videoDurationRef.current = duration;

    const basePercent = selectedVideo?.progress ?? 0;
    const startTime = duration * (basePercent / 100);

    try {
      videoEl.currentTime = startTime;
    } catch {
      // ignore
    }
    maxWatchedTimeRef.current = startTime;
    setWatchPercent(basePercent);
  };

  const handleTimeUpdate = () => {
    const videoEl = videoRef.current;
    const duration = videoDurationRef.current;
    if (!videoEl || !duration) return;

    const current = videoEl.currentTime;
    const newMax = Math.max(maxWatchedTimeRef.current, current);
    maxWatchedTimeRef.current = newMax;

    const newPercent = (newMax / duration) * 100;
    setWatchPercent((prev) => (newPercent > prev ? newPercent : prev));
  };

  const handleEnded = () => {
    const duration = videoDurationRef.current || videoRef.current?.duration || 0;
    if (duration > 0) {
      maxWatchedTimeRef.current = duration;
      setWatchPercent(100);
    }
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (videoEl.paused || videoEl.ended) {
      void videoEl.play();
      setIsPlaying(true);
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  };

  const handleGoToQuiz = () => {
    if (!selectedVideo || !canTakeQuiz) return;

    syncProgressToParent(selectedVideo.id, roundedWatchPercent);
    onOpenQuizPanel?.(selectedVideo.quizId);
  };

  const handleBackToList = () => {
    if (selectedVideo) {
      videoRef.current?.pause();
      syncProgressToParent(selectedVideo.id, watchPercent);
    }

    setSelectedVideo(null);
    videoDurationRef.current = 0;
    maxWatchedTimeRef.current = 0;
    setWatchPercent(0);
    setIsPlaying(false);

    const restore = listRestoreRef.current;
    const minTop = getMinTop(topSafeRef.current);

    if (restore) {
      setSize(restore.size);
      setPanelPos(clampPanelPos(restore.pos, restore.size, minTop));
      return;
    }

    const listSize = createInitialSize(topSafeRef.current);
    setSize(listSize);

    if (hasDOM) {
      const pos = anchor
        ? computePanelPosition(anchor, listSize)
        : computeDockFallbackPos(listSize);

      setPanelPos(clampPanelPos(pos, listSize, minTop));
    } else {
      setPanelPos({ top: 80, left: 120 });
    }
  };

  const handleCloseClick = () => {
    if (selectedVideo) {
      videoRef.current?.pause();
      syncProgressToParent(selectedVideo.id, watchPercent);
    }
    onClose();
  };

  const currentVideoSrc = selectedVideo?.videoUrl ?? SAMPLE_VIDEO_URL;

  if (!hasDOM) return null;

  return createPortal(
    <div
      className="cb-edu-wrapper"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: EDU_LAYER_Z,
        pointerEvents: "none",
      }}
    >
      <div
        className="cb-edu-panel-container"
        style={{
          position: "fixed",
          top: panelPos.top,
          left: panelPos.left,
          pointerEvents: "auto",
        }}
      >
        <div
          className="cb-edu-panel cb-chatbot-panel"
          style={{ width: size.width, height: size.height }}
          onMouseDown={() => onRequestFocus?.()}
        >
          <div className="cb-drag-bar" onMouseDown={handleDragMouseDown} />

          <div
            className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-nw"
            onMouseDown={handleResizeMouseDown("nw")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-ne"
            onMouseDown={handleResizeMouseDown("ne")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-sw"
            onMouseDown={handleResizeMouseDown("sw")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-se"
            onMouseDown={handleResizeMouseDown("se")}
          />

          <div
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-n"
            onMouseDown={handleResizeMouseDown("n")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-s"
            onMouseDown={handleResizeMouseDown("s")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-w"
            onMouseDown={handleResizeMouseDown("w")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-e"
            onMouseDown={handleResizeMouseDown("e")}
          />

          <button
            type="button"
            className="cb-panel-close-btn cb-edu-close-btn"
            onClick={handleCloseClick}
            aria-label="교육 영상 창 닫기"
          >
            ✕
          </button>

          <div className="cb-edu-panel-inner">
            {selectedVideo ? (
              <div className="cb-edu-watch-layout">
                <header className="cb-edu-watch-header">
                  <button
                    type="button"
                    className="cb-edu-nav-btn cb-edu-watch-back-btn"
                    onClick={handleBackToList}
                    aria-label="교육 영상 목록으로 돌아가기"
                  >
                    ◀
                  </button>
                  <h2 className="cb-edu-watch-title">{selectedVideo.title}</h2>
                </header>

                <div className="cb-edu-watch-body">
                  <div className="cb-edu-watch-player-wrapper">
                    <video
                      className="cb-edu-watch-video"
                      src={currentVideoSrc}
                      ref={videoRef}
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={handleEnded}
                      onClick={handlePlayPause}
                      controls={false}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      브라우저가 비디오 태그를 지원하지 않습니다.
                    </video>

                    <div className="cb-edu-watch-overlay">
                      <button
                        type="button"
                        className="cb-edu-watch-play-btn"
                        onClick={handlePlayPause}
                        aria-label={isPlaying ? "일시정지" : "재생"}
                      >
                        <span className="cb-edu-watch-play-icon">
                          {isPlaying ? "❚❚" : "▶"}
                        </span>
                      </button>
                      <span className="cb-edu-watch-progress-text">
                        시청률 {roundedWatchPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="cb-edu-watch-footer">
                    <button
                      type="button"
                      className={
                        "cb-edu-watch-quiz-btn" + (canTakeQuiz ? " is-active" : "")
                      }
                      onClick={handleGoToQuiz}
                      disabled={!canTakeQuiz}
                    >
                      퀴즈 풀기
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <header className="cb-edu-header">
                  <h2 className="cb-edu-title">교육 영상</h2>
                </header>

                <div className="cb-edu-body">
                  <div className="cb-edu-sections">
                    {sections.map((section) => {
                      const pageSize = getPageSize(size.width);
                      const maxPage = Math.max(
                        0,
                        Math.ceil(section.videos.length / pageSize) - 1
                      );
                      const currentPage = Math.min(
                        sectionPages[section.id] ?? 0,
                        maxPage
                      );

                      const start = currentPage * pageSize;
                      const visibleVideos = section.videos.slice(start, start + pageSize);

                      const canPrev = currentPage > 0;
                      const canNext = currentPage < maxPage;

                      return (
                        <section key={section.id} className="cb-edu-section">
                          <h3 className="cb-edu-section-title">{section.title}</h3>

                          <div className="cb-edu-section-row">
                            <button
                              type="button"
                              className="cb-edu-nav-btn cb-edu-nav-prev"
                              onClick={() => handlePrevClick(section.id)}
                              disabled={!canPrev}
                              aria-label={`${section.title} 이전 영상`}
                            >
                              ◀
                            </button>

                            <div className="cb-edu-videos-row">
                              {visibleVideos.length === 0 ? (
                                <div className="cb-edu-empty">
                                  <div className="cb-edu-empty-title">
                                    등록된 영상이 없습니다.
                                  </div>
                                  <div className="cb-edu-empty-desc">
                                    제작/검토 승인된 교육 영상이 게시되면 이 섹션에 표시됩니다.
                                  </div>
                                </div>
                              ) : (
                                visibleVideos.map((video) => {
                                  const progress = video.progress ?? 0;
                                  const { label, key } = getVideoStatus(progress);
                                  const thumbnailSrc = video.videoUrl ?? SAMPLE_VIDEO_URL;

                                  return (
                                    <article
                                      key={video.id}
                                      className="cb-edu-video-card"
                                      aria-label={video.title}
                                    >
                                      <button
                                        type="button"
                                        className="cb-edu-video-close"
                                        aria-label="영상 제거"
                                        disabled
                                      >
                                        ✕
                                      </button>

                                      <div
                                        className="cb-edu-video-thumbnail cb-edu-video-thumbnail-clickable"
                                        onClick={() => handleVideoClick(video)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleVideoClick(video);
                                          }
                                        }}
                                      >
                                        <video
                                          className="cb-edu-video-thumbnail-video"
                                          src={thumbnailSrc}
                                          muted
                                          preload="metadata"
                                          playsInline
                                          aria-hidden="true"
                                        />
                                        <div className="cb-edu-video-play-circle">
                                          <span className="cb-edu-video-play-icon">▶</span>
                                        </div>
                                      </div>

                                      <div className="cb-edu-video-progress">
                                        <div className="cb-edu-video-progress-track">
                                          <div
                                            className="cb-edu-video-progress-fill"
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                        <div className="cb-edu-video-meta">
                                          <span className="cb-edu-progress-text">
                                            시청률 {progress}%
                                          </span>
                                          <span className={`cb-edu-status cb-edu-status-${key}`}>
                                            {label}
                                          </span>
                                        </div>
                                      </div>
                                    </article>
                                  );
                                })
                              )}
                            </div>

                            <button
                              type="button"
                              className="cb-edu-nav-btn cb-edu-nav-next"
                              onClick={() => handleNextClick(section.id)}
                              disabled={!canNext}
                              aria-label={`${section.title} 다음 영상`}
                            >
                              ▶
                            </button>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EduPanel;
