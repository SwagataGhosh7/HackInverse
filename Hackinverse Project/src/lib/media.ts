/** Compute the SHA-256 fingerprint of a file entirely in the browser. */
export async function hashFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  onProgress?.(10);
  const buffer = await file.arrayBuffer();
  onProgress?.(60);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  onProgress?.(100);
  return toHex(new Uint8Array(digest));
}

export function toHex(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function truncateHash(value: string, lead = 10, tail = 8): string {
  if (!value) return "";
  if (value.length <= lead + tail + 3) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

export function kindOf(mime: string | null | undefined): "image" | "video" | "audio" | "file" {
  if (!mime) return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
  }
  return `data:${file.type || "application/octet-stream"};base64,${btoa(binary)}`;
}
