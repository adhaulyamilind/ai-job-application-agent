import { API_CONFIG } from "@/lib/config/api";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  method: HttpMethod;
  body?: unknown;
}

export async function httpRequest<T>(
  endpoint: string,
  options: RequestOptions
): Promise<T> {
  const res = await fetch(
    `${API_CONFIG.baseUrl}${endpoint}`,
    {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_CONFIG.apiKey
      },
      body: options.body
        ? JSON.stringify(options.body)
        : undefined
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `HTTP ${res.status}: ${text}`
    );
  }

  return res.json() as Promise<T>;
}
