// apps/chatbot/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import keycloak from "./keycloak";
import type { KeycloakInstance } from "keycloak-js";
import { normalizeRoles, pickPrimaryRole, type UserRole } from "./auth/roles";
import "./index.css";

const CLIENT_ID = "web-app";

declare global {
  interface Window {
    /**
     * groupware(host)가 주입한 Keycloak 인스턴스
     * - 존재하면 chatbot은 init/refresh를 하지 않고 "소비자"로 동작한다.
     */
    __CTRLF_HOST_KEYCLOAK__?: KeycloakInstance;
  }
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/**
 * tokenParsed에서 role 문자열을 최대한 넓게 수집
 * - realm role: tokenParsed.realm_access.roles
 * - client role: tokenParsed.resource_access[clientId].roles
 */
function extractRawRoles(tokenParsed: unknown): string[] {
  if (!tokenParsed || typeof tokenParsed !== "object") return [];

  const tp = tokenParsed as Record<string, unknown>;

  // realm roles
  let realmRoles: string[] = [];
  const realmAccess = tp["realm_access"];
  if (realmAccess && typeof realmAccess === "object") {
    const ra = realmAccess as Record<string, unknown>;
    const roles = ra["roles"];
    if (isStringArray(roles)) realmRoles = roles;
  }

  // client roles
  let clientRoles: string[] = [];
  const resourceAccess = tp["resource_access"];
  if (resourceAccess && typeof resourceAccess === "object") {
    const res = resourceAccess as Record<string, unknown>;
    const client = res[CLIENT_ID];
    if (client && typeof client === "object") {
      const c = client as Record<string, unknown>;
      const roles = c["roles"];
      if (isStringArray(roles)) clientRoles = roles;
    }
  }

  return Array.from(new Set([...realmRoles, ...clientRoles]));
}

function mountChatbot(primaryRole: UserRole) {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    throw new Error('[chatbot] Root element "#root" not found.');
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App userRole={primaryRole} />
    </React.StrictMode>
  );
}

/**
 * Host 주입 Keycloak이 있으면: init/refresh는 host가 담당
 * 없으면(단독 실행): 기존처럼 chatbot이 init/refresh 수행 (플레이그라운드 용도)
 */
const hostKeycloak = window.__CTRLF_HOST_KEYCLOAK__;
const kc: KeycloakInstance = hostKeycloak ?? keycloak;

if (hostKeycloak) {
  // ===== Embedded mode (groupware 안에서 렌더링되는 경우) =====
  if (!kc.authenticated) {
    console.error("[chatbot] Host Keycloak exists but not authenticated.");
  }

  const rawRoles = extractRawRoles(kc.tokenParsed);
  const roleSet = normalizeRoles(rawRoles);
  const primaryRole: UserRole = pickPrimaryRole(roleSet);

  console.log("[chatbot] Embedded mode. primaryRole =", primaryRole);
  mountChatbot(primaryRole);

  // refresh 금지: host가 단일 주기로 갱신한다.
} else {
  // ===== Standalone mode (npm run dev:chatbot) =====
  kc.init({
    onLoad: "login-required",
    pkceMethod: "S256",
    checkLoginIframe: false,
  })
    .then((authenticated) => {
      if (!authenticated) {
        console.error("[chatbot] Keycloak not authenticated.");
        return;
      }

      const rawRoles = extractRawRoles(kc.tokenParsed);
      const roleSet = normalizeRoles(rawRoles);
      const primaryRole: UserRole = pickPrimaryRole(roleSet);

      console.log("[chatbot] Standalone mode. primaryRole =", primaryRole);
      mountChatbot(primaryRole);

      // standalone에서만 토큰 자동 갱신
      window.setInterval(() => {
        kc.updateToken(60)
          .then((refreshed) => {
            if (refreshed) console.log("[chatbot] Token refreshed.");
          })
          .catch(() => {
            console.error("[chatbot] Failed to refresh token.");
          });
      }, 30_000);
    })
    .catch((err) => {
      console.error("[chatbot] Keycloak initialization error", err);
    });
}
