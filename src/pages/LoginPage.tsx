// src/pages/LoginPage.tsx
import type { FormEvent } from "react";
import "./LoginPage.css";

const LoginPage: React.FC = () => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: 기능 명세서 기반 로그인 로직 연결
  };

  return (
    <div className="login-root">
      <div className="login-inner">
        {/* 상단 타이틀 */}
        <header className="login-header">
          <span className="login-header-title">Group ware</span>
        </header>

        {/* 가운데 메인 콘텐츠 (로고+텍스트 / 세로선 / 로그인 폼) */}
        <main className="login-main">
          <div className="login-main-content">
            {/* 왼쪽 소개 영역 */}
            <section className="login-left">
              <div className="login-logo">
                <div className="login-logo-circle" />
              </div>

              <div className="login-left-text">
                <p className="login-left-system-label">통합 업무 관리 시스템</p>
                <p className="login-left-system-name">CTRL Company Hub</p>

                <h1 className="login-left-headline">
                  스마트한 협업으로
                  <br />
                  비즈니스를 성장시키세요
                </h1>

                <p className="login-left-description">
                  전자결재, 근태관리, 프로젝트 협업까지
                  <br />
                  하나의 플랫폼에서 모든 업무를 효율적으로 관리하세요
                </p>
              </div>
            </section>

            {/* 가운데 세로 구분선 */}
            <div className="login-divider" />

            {/* 오른쪽 로그인 영역 */}
            <section className="login-right">
              <h2 className="login-panel-title">로그인</h2>
              <p className="login-panel-subtitle">
                계정 정보를 입력해주세요
              </p>

              <form className="login-form" onSubmit={handleSubmit}>
                <label className="login-field">
                  <span className="login-label">아이디</span>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="아이디(사번)"
                  />
                </label>

                <label className="login-field">
                  <span className="login-label">비밀번호</span>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="비밀번호"
                  />
                </label>

                <p className="login-error">
                  아이디 또는 비밀번호가 일치하지 않습니다.
                </p>

                <button type="submit" className="login-button">
                  로그인
                </button>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
