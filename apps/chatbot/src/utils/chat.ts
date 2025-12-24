// src/utils/chat.ts

// 패널 위치 계산에 사용되는 간단한 타입들
export interface Anchor {
  x: number;
  y: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

/**
 * 첫 사용자 메시지에서 세션 제목을 만들어주는 함수
 * - 공백 정리
 * - 너무 길면 잘라서 말줄임표 추가
 */
export function buildSessionTitleFromMessage(content: string): string {
  let title = content.replace(/\s+/g, " ").trim();

  if (!title) {
    return "새 채팅";
  }

  const maxLen = 18;
  if (title.length > maxLen) {
    title = title.slice(0, maxLen).trim() + "…";
  }
  return title;
}

/**
 * 사이드바에 보여줄 마지막 메시지 한 줄 프리뷰
 */
export function buildLastMessagePreview(content: string): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  if (!oneLine) return "";

  const maxLen = 24;
  if (oneLine.length > maxLen) {
    return oneLine.slice(0, maxLen).trimEnd() + "…";
  }
  return oneLine;
}

/**
 * 플로팅 아이콘(anchor) 기준으로 패널의 top/left를 계산하는 함수
 * - 패널이 화면 밖으로 나가지 않도록 클램핑
 * - 아이콘을 너무 가리지 않도록 offset 적용
 */
export function computePanelPosition(
  anchor: Anchor | null | undefined,
  size: PanelSize
): { top: number; left: number } {
  if (typeof window === "undefined") {
    return { top: 0, left: 0 };
  }

  const { innerWidth, innerHeight } = window;
  const margin = 16; // 화면 가장자리 여백
  const visibleMargin = 40; // 아이콘과 패널 사이 최소 거리
  const overlapY = -10; // 아이콘을 어느 정도 가릴지 (음수면 더 위로)

  let left: number;
  let top: number;

  if (anchor) {
    // 세로 위치: 아이콘 바로 위에
    top = anchor.y - size.height + overlapY;

    const isRightSide = anchor.x >= innerWidth / 2;

    if (isRightSide) {
      left = anchor.x - visibleMargin - size.width;
    } else {
      left = anchor.x + visibleMargin;
    }
  } else {
    // anchor 없으면 화면 중앙에 위치
    left = (innerWidth - size.width) / 2;
    top = (innerHeight - size.height) / 2;
  }

  // 화면 밖으로 나가지 않도록 클램핑
  if (left < margin) left = margin;
  if (left + size.width > innerWidth - margin) {
    left = innerWidth - margin - size.width;
  }

  if (top < margin) top = margin;
  if (top + size.height > innerHeight - margin) {
    top = innerHeight - margin - size.height;
  }

  return { top, left };
}
