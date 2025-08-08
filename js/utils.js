export function byId(id) {
  return document.getElementById(id);
}

export function normalize(s) {
  return (s || "").trim().toLowerCase();
}

export function encodeQuery(q) {
  return encodeURIComponent(q.trim());
}
