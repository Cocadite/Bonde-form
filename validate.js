function sanitizeText(s, max = 300) {
  s = String(s || "").trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

function toInt(v, min = 0, max = 120) {
  const n = Number.parseInt(String(v || "").trim(), 10);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = { sanitizeText, toInt, isValidUrl };
