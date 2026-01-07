// src/components/chatbot/ragDocumentsApi.ts

import { fetchJson } from "../common/api/authHttp";

type EnvLike = Record<string, string | undefined>;
const ENV = import.meta.env as unknown as EnvLike;

const INFRA_BASE = String(ENV.VITE_INFRA_API_BASE ?? "/api-infra").replace(/\/$/, "");

function jsonBody(body: unknown): RequestInit {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function pickId(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

export type RagUploadResponse = { documentId: string };
export type RagDocStatusResponse = {
  status: string; // PENDING/PROCESSING/COMPLETED/FAILED 등
  errorMessage?: string | null;
};

export async function uploadDocument(payload: {
  title: string;
  domain: string;
  fileUrl: string;
  uploaderUuid?: string;
}): Promise<RagUploadResponse> {
  const res: any = await fetchJson(`${INFRA_BASE}/rag/documents/upload`, {
    method: "POST",
    ...jsonBody(payload),
  });

  const documentId =
    pickId(res, ["documentId", "id", "materialId"]) ??
    pickId(res?.data, ["documentId", "id", "materialId"]) ??
    pickId(res?.document, ["documentId", "id", "materialId"]);

  if (!documentId) throw new Error("RAG 문서 업로드 응답에서 documentId를 찾지 못했습니다.");
  return { documentId };
}

export async function getDocumentStatus(documentId: string): Promise<RagDocStatusResponse> {
  const res: any = await fetchJson(
    `${INFRA_BASE}/rag/documents/${encodeURIComponent(documentId)}/status`,
    { method: "GET" }
  );

  // 가능한 응답 키들 모두 흡수
  const status =
    (typeof res?.status === "string" && res.status) ||
    (typeof res?.state === "string" && res.state) ||
    (typeof res?.data?.status === "string" && res.data.status) ||
    "UNKNOWN";

  const errorMessage =
    (typeof res?.errorMessage === "string" && res.errorMessage) ||
    (typeof res?.message === "string" && res.message) ||
    (typeof res?.data?.errorMessage === "string" && res.data.errorMessage) ||
    null;

  return { status, errorMessage };
}
