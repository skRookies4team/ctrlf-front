// apps/groupware/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import keycloak from "./keycloak.ts";
import type { KeycloakInstance } from "keycloak-js";
import "./index.css";

declare global {
  interface Window {
    /**
     * groupware(host)가 chatbot(embedded)에게 Keycloak 인스턴스를 넘겨주기 위한 브릿지
     * - "init/refresh는 host에서만" 원칙을 지키기 위해 사용
     */
    __CTRLF_HOST_KEYCLOAK__?: KeycloakInstance;
  }
}

function mountApp() {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    throw new Error('[groupware] Root element "#root" not found.');
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

// Keycloak 초기화 (Host에서만 수행)
keycloak
  .init({
    onLoad: "login-required",
    pkceMethod: "S256",
    checkLoginIframe: false,
  })
  .then((authenticated) => {
    if (!authenticated) {
      console.error("[groupware] Keycloak not authenticated.");
      return;
    }

    // Host가 Keycloak 인스턴스를 전역으로 주입 (chatbot embedded가 이걸 사용)
    window.__CTRLF_HOST_KEYCLOAK__ = keycloak;

    // 토큰 내용(access token) 출력 금지 (보안)
    console.log("[groupware] Keycloak initialized. authenticated =", authenticated);

    // 렌더링
    mountApp();

    // 토큰 자동 갱신 (만료 60초 전, 30초 주기)
    window.setInterval(() => {
      keycloak
        .updateToken(60)
        .then((refreshed) => {
          if (refreshed) {
            console.log("[groupware] Token refreshed.");
          }
        })
        .catch(() => {
          console.error("[groupware] Failed to refresh token.");
        });
    }, 30_000);
  })
  .catch((err) => {
    console.error("[groupware] Keycloak initialization error", err);
  });
