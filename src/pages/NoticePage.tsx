// src/pages/NoticePage.tsx
import React, { useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import "./NoticePage.css";

interface NoticeItem {
  id: number;
  title: string;
  author: string;
  department: string;
  date: string;
  views: number;
}

const NOTICE_DATA: NoticeItem[] = [
  {
    id: 1,
    title: "2025년 상반기 예산 집행 계획서",
    author: "임성현",
    department: "인사팀",
    date: "2025.11.13",
    views: 10,
  },
  {
    id: 2,
    title: "2025년 하반기 예산 집행 계획서",
    author: "임성현",
    department: "인사팀",
    date: "2025.11.13",
    views: 18,
  },
];

const NoticePage: React.FC = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearch();
    }
  };

  const handleSearchClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    applySearch();
  };

  const filteredNotices = NOTICE_DATA.filter((notice) => {
    if (!searchQuery) return true;
    const target = (
      notice.title +
      notice.author +
      notice.department +
      notice.date
    ).toLowerCase();
    return target.includes(searchQuery.toLowerCase());
  });

  return (
    <main className="notice-page-main">
      <div className="notice-page-inner">
        <h1 className="notice-page-title">공지사항</h1>

        <section className="notice-page-card">
          {/* 검색 영역 */}
          <div className="notice-page-search-row">
            <input
              type="text"
              className="notice-page-search-input"
              placeholder="검색어를 입력하세요"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="notice-page-search-button"
              onClick={handleSearchClick}
            >
              검색
            </button>
          </div>

          {/* 리스트 영역 */}
          <div className="notice-page-list">
            {filteredNotices.map((notice) => (
              <article key={notice.id} className="notice-page-item">
                <div className="notice-page-item-main">
                  <div className="notice-page-item-left">
                    <h2 className="notice-page-item-title">{notice.title}</h2>
                    <div className="notice-page-item-meta">
                      <span>{notice.author}</span>
                      <span className="notice-page-meta-dot">·</span>
                      <span>{notice.department}</span>
                      <span className="notice-page-meta-dot">·</span>
                      <span>{notice.date}</span>
                    </div>
                  </div>
                  <div className="notice-page-item-views">
                    <span className="notice-page-views-label">조회수</span>
                    <span className="notice-page-views-value">
                      {notice.views}
                    </span>
                  </div>
                </div>
              </article>
            ))}

            {filteredNotices.length === 0 && (
              <div className="notice-page-empty">검색 결과가 없습니다.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default NoticePage;
