// apps/chatbot/src/App.tsx
import React from "react";
import type { UserRole } from "./auth/roles";
import FloatingChatbotRoot from "./components/chatbot/FloatingChatbotRoot";

type AppProps = {
  userRole: UserRole;
};

export default function App({ userRole }: AppProps) {
  // 챗봇 단독 실행용: 배경은 비워두고, 플로팅 챗봇(도크)만 렌더
  return (
    <div style={{ minHeight: "100vh" }}>
      <FloatingChatbotRoot userRole={userRole} />
    </div>
  );
}
