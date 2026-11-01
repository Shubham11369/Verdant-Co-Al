import axios from "axios";

/**
 * Normalizes and validates the Backend API base URL for all deployment environments:
 * - Local development: "" or http://localhost:3000
 * - AI Studio container: "" (same-origin proxy)
 * - Vercel separated: https://<backend-project>.vercel.app (auto-strips trailing slashes and redundant /api)
 */
export function getBaseUrl(): string {
  let envUrl = (import.meta.env.VITE_API_URL || "").trim();

  // If no VITE_API_URL is configured, use relative path (same domain)
  if (!envUrl) {
    return "";
  }

  // Prepend https:// if protocol was omitted
  if (!envUrl.startsWith("http://") && !envUrl.startsWith("https://")) {
    envUrl = `https://${envUrl}`;
  }

  // Strip trailing slashes
  while (envUrl.endsWith("/")) {
    envUrl = envUrl.slice(0, -1);
  }

  // Strip redundant /api suffix if user entered e.g. https://backend.vercel.app/api
  // because endpoints in code already include the /api prefix
  if (envUrl.endsWith("/api")) {
    envUrl = envUrl.slice(0, -4);
  }

  // In production browser, ignore stale localhost references
  if (typeof window !== "undefined") {
    if (envUrl.includes("localhost") && window.location.hostname !== "localhost") {
      return "";
    }
  }

  return envUrl;
}

export const api = axios.create({
  baseURL: getBaseUrl(),
});

// Diagnostic interceptor to assist debugging deployment misconfigurations
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const contentType = error.response?.headers?.["content-type"] || "";
    if (typeof contentType === "string" && contentType.includes("text/html")) {
      console.warn(
        "[Verdant API] Received HTML instead of JSON from backend. Verify that VITE_API_URL in Vercel points to your deployed backend URL (e.g. https://<backend-app>.vercel.app), not the frontend URL.",
      );
    }
    return Promise.reject(error);
  },
);
