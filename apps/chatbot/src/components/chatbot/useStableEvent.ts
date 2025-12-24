// src/components/chatbot/useStableEvent.ts
import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * React 18에서 이벤트 핸들러 identity가 바뀌어도
 * window listener는 “한 번만” 붙이고, 내부에서 최신 handler를 호출하게 만든다.
 *
 * - any 금지(no-explicit-any) 대응: Args 튜플 + Return 타입으로 시그니처 보존
 * - react-hooks/use-memo 규칙 대응: useCallback 첫 인자는 "인라인 함수"로 유지
 */
export function useStableEvent<Args extends unknown[], R>(handler: (...args: Args) => R) {
  const ref = useRef(handler);

  useLayoutEffect(() => {
    ref.current = handler;
  }, [handler]);

  return useCallback((...args: Args): R => {
    return ref.current(...args);
  }, []);
}
