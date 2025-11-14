// src/pages/LoginPage.tsx
import { useState, type FormEvent } from "react";
import "./LoginPage.css";
import loginLogo from "../assets/login-logo.png";

const LoginPage: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // TODO: 실제 로그인 검증 로직
    console.log("Login attempt:", { userId, password });
    setLoginError(true);
  };

  return (
    <div className="login-page">
      {/* 상단 헤더 */}
      <header className="login-header">
        <div className="header-content">
          <span className="header-title">Group ware</span>
        </div>
      </header>

      {/* 메인 콘텐츠 (브랜드 + 로그인) */}
      <main className="login-main">
        <div className="login-container">
          <div className="login-content">
            {/* 왼쪽 브랜드 섹션 */}
            <section className="brand-section">
              <div className="company-logo">
                <div className="logo-icon">
                  <img
                    src={loginLogo}
                    alt="CTRL Company Hub 로고"
                    className="logo-image"
                  />
                </div>
                <div>
                  <div className="logo-title">CTRL Company Hub</div>
                  <div className="logo-subtitle">통합 업무 관리 시스템</div>
                </div>
              </div>

              <div className="brand-content">
                <h2 className="brand-heading">
                  스마트한 협업으로
                  <br />
                  비즈니스를 성장시키세요
                </h2>
                <p className="brand-description">
                  전자결재, 근태관리, 프로젝트 협업까지
                  <br />
                  하나의 플랫폼에서 모든 업무를 효율적으로 관리하세요
                </p>
              </div>
            </section>

            {/* 가운데 구분선 */}
            <div className="divider" />

            {/* 오른쪽 로그인 섹션 */}
            <section className="form-section">
              <div className="form-container">
                <div className="form-header">
                  <h2 className="form-title">로그인</h2>
                  <p className="form-subtitle">계정 정보를 입력해 주세요</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="userId" className="form-label">
                      아이디
                    </label>
                    <input
                      id="userId"
                      type="text"
                      placeholder="아이디(사번)"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      비밀번호
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="비밀번호"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input"
                    />
                    {loginError && (
                      <p className="error-message">
                        아이디 혹은 비밀번호가 틀렸습니다.
                      </p>
                    )}
                  </div>

                  <button type="submit" className="submit-button">
                    로그인
                  </button>
                </form>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
