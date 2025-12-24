// src/pages/EducationPage.tsx
import React, { useState } from "react";
import "./EducationPage.css";

type EducationVideo = {
  id: string;
  title: string;
};

type EducationCategory = {
  id: string;
  label: string;
  videos: EducationVideo[];
};

const CATEGORIES: EducationCategory[] = [
  {
    id: "job",
    label: "직무",
    videos: [
      { id: "job-1", title: "직무 교육 1" },
      { id: "job-2", title: "직무 교육 2" },
      { id: "job-3", title: "직무 교육 3" },
      { id: "job-4", title: "직무 교육 4" },
    ],
  },
  {
    id: "harassment",
    label: "성희롱예방",
    videos: [
      { id: "harassment-1", title: "성희롱예방 교육 1" },
      { id: "harassment-2", title: "성희롱예방 교육 2" },
      { id: "harassment-3", title: "성희롱예방 교육 3" },
      { id: "harassment-4", title: "성희롱예방 교육 4" },
    ],
  },
  {
    id: "privacy",
    label: "개인정보보호",
    videos: [
      { id: "privacy-1", title: "개인정보보호 교육 1" },
      { id: "privacy-2", title: "개인정보보호 교육 2" },
      { id: "privacy-3", title: "개인정보보호 교육 3" },
      { id: "privacy-4", title: "개인정보보호 교육 4" },
    ],
  },
  {
    id: "bullying",
    label: "괴롭힘",
    videos: [
      { id: "bullying-1", title: "괴롭힘 예방 교육 1" },
      { id: "bullying-2", title: "괴롭힘 예방 교육 2" },
      { id: "bullying-3", title: "괴롭힘 예방 교육 3" },
      { id: "bullying-4", title: "괴롭힘 예방 교육 4" },
    ],
  },
  {
    id: "disability",
    label: "장애인 인식개선",
    videos: [
      { id: "disability-1", title: "장애인 인식개선 교육 1" },
      { id: "disability-2", title: "장애인 인식개선 교육 2" },
      { id: "disability-3", title: "장애인 인식개선 교육 3" },
      { id: "disability-4", title: "장애인 인식개선 교육 4" },
    ],
  },
];

const VISIBLE_COUNT = 3;

const EducationPage: React.FC = () => {
  const [positions, setPositions] = useState<Record<string, number>>({});

  const handlePrev = (categoryId: string) => {
    setPositions((prev) => {
      const current = prev[categoryId] ?? 0;
      const next = Math.max(0, current - 1);
      return { ...prev, [categoryId]: next };
    });
  };

  const handleNext = (categoryId: string, total: number) => {
    setPositions((prev) => {
      const current = prev[categoryId] ?? 0;
      const maxStart = Math.max(0, total - VISIBLE_COUNT);
      const next = Math.min(maxStart, current + 1);
      return { ...prev, [categoryId]: next };
    });
  };

  return (
    <div className="education-wrapper">
      {/* 타이틀 + 카드 영역을 하나로 묶어서 가운데 정렬 */}
      <div className="education-inner">
        <h1 className="education-title">교육</h1>

        <div className="education-main-card">
          <div className="education-scrollable">
            {CATEGORIES.map((category) => {
              const start = positions[category.id] ?? 0;
              const end = start + VISIBLE_COUNT;
              const visibleVideos = category.videos.slice(start, end);

              const canPrev = start > 0;
              const canNext = end < category.videos.length;

              return (
                <section
                  key={category.id}
                  className="education-section"
                  aria-label={category.label}
                >
                  <div className="education-section-row">
                    {/* 왼쪽 화살표 */}
                    <button
                      type="button"
                      className={`education-carousel-arrow left ${
                        canPrev ? "active" : "disabled"
                      }`}
                      onClick={() => canPrev && handlePrev(category.id)}
                      disabled={!canPrev}
                      aria-label={`${category.label} 이전 영상`}
                    >
                      <span className="education-carousel-arrow-icon">◀</span>
                    </button>

                    <div className="education-section-body">
                      <h2 className="education-section-title">
                        {category.label}
                      </h2>

                      <div className="education-video-row">
                        {visibleVideos.map((video) => (
                          <article
                            key={video.id}
                            className="education-video-card"
                            aria-label={video.title}
                          >
                            <button
                              type="button"
                              className="education-video-close"
                              aria-label="영상 제거"
                            >
                              ×
                            </button>
                            <div className="education-video-thumbnail">
                              <button
                                type="button"
                                className="education-play-button"
                                aria-label={`${video.title} 재생`}
                              >
                                <span className="education-play-icon" />
                              </button>
                            </div>
                            <p className="education-video-title">
                              {video.title}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>

                    {/* 오른쪽 화살표 */}
                    <button
                      type="button"
                      className={`education-carousel-arrow right ${
                        canNext ? "active" : "disabled"
                      }`}
                      onClick={() =>
                        canNext &&
                        handleNext(category.id, category.videos.length)
                      }
                      disabled={!canNext}
                      aria-label={`${category.label} 다음 영상`}
                    >
                      <span className="education-carousel-arrow-icon">▶</span>
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationPage;
