// src/components/chatbot/CreatorTrainingSelect.tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { JobTrainingOption } from "./creatorStudioTypes";

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

type MenuPos = { top: number; left: number; width: number; openUp: boolean };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** 트리거(닫힌 상태)에서 너무 길어지는 텍스트를 “짧게” 보여주기 */
function toTriggerLabel(fullName: string) {
  const m = fullName.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (!m) return fullName;

  const id = m[1].trim();
  let rest = m[2].trim();

  // "공통 ·", "총무팀 ·" 같은 프리픽스가 과하면 제거(트리거에서만)
  rest = rest.replace(/^[^·]+·\s*/, "");

  return `${id} · ${rest}`;
}

function groupLabelById(id: string) {
  if (id.startsWith("JT-COM-")) return "공통";
  if (id.startsWith("JT-ADM-")) return "총무팀";
  if (id.startsWith("JT-PLN-")) return "기획팀";
  if (id.startsWith("JT-MKT-")) return "마케팅팀";
  if (id.startsWith("JT-HR-")) return "인사팀";
  if (id.startsWith("JT-FIN-")) return "재무팀";
  if (id.startsWith("JT-DEV-")) return "개발팀";
  if (id.startsWith("JT-SAL-")) return "영업팀";
  if (id.startsWith("JT-LEG-")) return "법무팀";
  return "기타";
}

interface CreatorTrainingSelectProps {
  value: string;
  options: JobTrainingOption[];
  disabled?: boolean;
  placeholder?: string;
  onChange: (nextId: string) => void;

  /** 외부에서 쓰는 공용 스타일을 그대로 입히기 위함 */
  className?: string;
}

const MENU_MAX_H = 320;
const GAP = 6;
const VIEWPORT_PAD = 8;

export default function CreatorTrainingSelect({
  value,
  options,
  disabled,
  placeholder = "선택",
  onChange,
  className,
}: CreatorTrainingSelectProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // openUp 상태에서 “실제 메뉴 높이” 기준으로 top 재보정을 위해 트리거 rect를 기억
  const triggerRectRef = useRef<DOMRect | null>(null);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<MenuPos | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setPos(null);
    setQ("");
  }, []);

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value]
  );

  function optionName(o: JobTrainingOption): string {
    const anyO = o as unknown as Record<string, unknown>;
    const name =
      typeof anyO.name === "string" && anyO.name.trim()
        ? anyO.name.trim()
        : typeof anyO.label === "string" && anyO.label.trim()
          ? anyO.label.trim()
          : typeof anyO.title === "string" && anyO.title.trim()
            ? anyO.title.trim()
            : o.id;
    return name;
  }

  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = query
      ? options.filter((o) => {
          const name = optionName(o).toLowerCase();
          const id = String(o.id ?? "").toLowerCase();
          const g = groupLabelById(String(o.id ?? "")).toLowerCase();
          return name.includes(query) || id.includes(query) || g.includes(query);
        })
      : options;

    const map = new Map<string, JobTrainingOption[]>();
    for (const o of filtered) {
      const g = groupLabelById(o.id);
      const arr = map.get(g) ?? [];
      arr.push(o);
      map.set(g, arr);
    }

    // 그룹 내부는 ID 오름차순 정도로 정렬(가독성)
    for (const [k, arr] of map.entries()) {
      map.set(
        k,
        arr.slice().sort((a, b) => a.id.localeCompare(b.id))
      );
    }

    const order = [
      "공통",
      "총무팀",
      "기획팀",
      "마케팅팀",
      "인사팀",
      "재무팀",
      "개발팀",
      "영업팀",
      "법무팀",
      "기타",
    ];
    return order
      .filter((k) => map.has(k))
      .map((k) => ({ group: k, items: map.get(k)! }));
  }, [options, q]);

  const computeMenuPos = () => {
    const el = triggerRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    triggerRectRef.current = r;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const width = Math.round(r.width);
    const left = Math.round(clamp(r.left, VIEWPORT_PAD, vw - VIEWPORT_PAD - width));

    const downTop = r.bottom + GAP;
    const wouldOverflowDown = downTop + MENU_MAX_H > vh - VIEWPORT_PAD;

    const openUp = wouldOverflowDown && r.top - GAP - MENU_MAX_H > VIEWPORT_PAD;

    const top = Math.round(
      openUp
        ? r.top - GAP - MENU_MAX_H
        : clamp(downTop, VIEWPORT_PAD, vh - VIEWPORT_PAD - MENU_MAX_H)
    );

    setPos({ top, left, width, openUp });
  };

  const adjustTopToActualHeight = () => {
    const r = triggerRectRef.current;
    const menuEl = menuRef.current;
    if (!r || !menuEl) return;

    const vh = window.innerHeight;
    const menuH = Math.round(menuEl.getBoundingClientRect().height);

    setPos((prev) => {
      if (!prev) return prev;

      const rawTop = prev.openUp ? r.top - GAP - menuH : r.bottom + GAP;
      const top = Math.round(clamp(rawTop, VIEWPORT_PAD, vh - VIEWPORT_PAD - menuH));

      if (Math.abs(prev.top - top) < 1) return prev;
      return { ...prev, top };
    });
  };

  // 열릴 때 위치 계산 + 포커스 + (렌더 후) 실제 높이로 top 재보정
  useLayoutEffect(() => {
    if (!open) return;

    computeMenuPos();

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    requestAnimationFrame(() => {
      adjustTopToActualHeight();
    });
  }, [open]);

  // 검색어(q)로 인해 메뉴 높이가 달라질 수 있으므로 open 상태에서 top 재보정
  useLayoutEffect(() => {
    if (!open) return;

    requestAnimationFrame(() => {
      adjustTopToActualHeight();
    });
  }, [open, q]);

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;

      closeMenu();
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, closeMenu]);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeMenu]);

  // 스크롤/리사이즈 대응:
  // - 메뉴 내부 스크롤이면 무시
  // - 외부 스크롤이면 닫기(위치 어긋남 방지)
  useEffect(() => {
    if (!open) return;

    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && menuRef.current?.contains(t)) return;
      closeMenu();
    };

    const onResize = () => closeMenu();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, closeMenu]);

  const onToggle = () => {
    if (disabled) return;
    if (open) closeMenu();
    else setOpen(true);
  };

  const onPick = (id: string) => {
    onChange(id);
    closeMenu();
  };

  const triggerText = selected ? toTriggerLabel(optionName(selected)) : placeholder;

  return (
    <div className="cb-creator-training-select">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={cx(
          "cb-admin-select",
          "cb-creator-training-trigger",
          open && "cb-creator-training-trigger--open",
          className
        )}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onToggle}
        title={selected ? optionName(selected) : ""}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="cb-creator-training-trigger-value">{triggerText}</span>
        <span className="cb-creator-training-trigger-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              className="cb-creator-training-menu"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              role="listbox"
              onMouseDown={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="cb-creator-training-menu-search">
                <input
                  ref={inputRef}
                  className="cb-creator-training-menu-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="검색: ID/과정명"
                />
              </div>

              <div className="cb-creator-training-menu-list">
                {grouped.length === 0 ? (
                  <div className="cb-creator-training-menu-empty">검색 결과가 없습니다.</div>
                ) : (
                  grouped.map((g) => (
                    <div key={g.group} className="cb-creator-training-group">
                      <div className="cb-creator-training-group-title">{g.group}</div>
                      {g.items.map((o) => {
                        const active = o.id === value;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            className={cx(
                              "cb-creator-training-option",
                              active && "cb-creator-training-option--active"
                            )}
                            onClick={() => onPick(o.id)}
                            title={optionName(o)}
                          >
                            {optionName(o)}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
