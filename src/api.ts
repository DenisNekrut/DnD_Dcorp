const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const SESSION_TOKEN_KEY = "dnd-dcorp-session-token-v1";

export function storeSessionToken(token: string): void {
  try { window.sessionStorage.setItem(SESSION_TOKEN_KEY, token); } catch { /* Storage can be disabled by the browser. */ }
}

export function clearSessionToken(): void {
  try { window.sessionStorage.removeItem(SESSION_TOKEN_KEY); } catch { /* Storage can be disabled by the browser. */ }
}

function readSessionToken(): string | null {
  try { return window.sessionStorage.getItem(SESSION_TOKEN_KEY); } catch { return null; }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isApiConfigured(): boolean {
  return API_BASE_URL.length > 0;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new ApiError("Адрес API не настроен. Добавь VITE_API_URL в переменные окружения сайта.", 0);
  const headers = new Headers(options.headers);
  const sessionToken = readSessionToken();
  if (sessionToken && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${sessionToken}`);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError("Не удалось связаться с сервером. Проверь доступность API и настройки CORS.", 0);
  }
  const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join(". ") : payload?.message;
    throw new ApiError(message || `Ошибка сервера (${response.status}).`, response.status);
  }
  return payload as T;
}
