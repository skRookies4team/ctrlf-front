// src/components/chatbot/faqData.ts

// FAQ 카테고리 타입
export type FaqCategory = "account" | "approval" | "education" | "etc";

// 카테고리별 표시용 한글 라벨
export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  account: "계정/로그인",
  approval: "전자결재",
  education: "교육",
  etc: "기타",
};

export type FaqItem = {
  id: number;
  label: string; // 버튼에 보일 텍스트
  question: string; // 채팅창에 user 메시지로 들어갈 질문
  answer: string; // 채팅창에 assistant 메시지로 들어갈 답변
  category: FaqCategory; // 카테고리
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 1,
    label: "자주하는 질문 1",
    question: "자주하는 질문 1",
    answer:
      "자주하는 질문 1에 대한 예시 답변입니다.\n\n나중에 실제 사내 FAQ 내용으로 교체하면 됩니다.",
    category: "account",
  },
  {
    id: 2,
    label: "자주하는 질문 2",
    question: "자주하는 질문 2",
    answer:
      "자주하는 질문 2에 대한 예시 답변입니다.\n\n필요에 따라 세부 절차, 링크 등을 넣을 수 있습니다.",
    category: "approval",
  },
  {
    id: 3,
    label: "자주하는 질문 3",
    question: "자주하는 질문 3",
    answer:
      "자주하는 질문 3에 대한 예시 답변입니다.\n\nFAQ 관리 정책에 맞춰 자유롭게 수정하세요.",
    category: "education",
  },
  {
    id: 4,
    label: "자주하는 질문 4",
    question: "자주하는 질문 4",
    answer:
      "자주하는 질문 4에 대한 예시 답변입니다.\n\n(지금은 더미 데이터이므로 실제 서비스 시 교체가 필요합니다.)",
    category: "etc",
  },
];
