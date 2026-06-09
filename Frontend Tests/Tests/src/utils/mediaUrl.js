const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost";

export function getMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path; // already absolute
  return `${API_BASE}${path}`;
}
