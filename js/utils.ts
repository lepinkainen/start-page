export function byId(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function normalize(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}

export function encodeQuery(q: string): string {
  return encodeURIComponent(q.trim());
}