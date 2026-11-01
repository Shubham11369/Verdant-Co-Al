import axios from "axios";

function getBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL?.trim();

  if (typeof window !== "undefined") {
    // If running on a hosted domain (e.g. *.run.app) or port 3000, never route to localhost:3001
    if (
      !envUrl ||
      envUrl.includes("3001") ||
      (envUrl.includes("localhost") && window.location.hostname !== "localhost")
    ) {
      return "";
    }
  }

  return envUrl && !envUrl.includes("3001") ? envUrl : "";
}

export const api = axios.create({
  baseURL: getBaseUrl(),
});
