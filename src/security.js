// Utilidades de seguridad centralizadas.
// La app es una SPA estática (sin backend propio): la defensa vive en el
// cliente. Estas funciones validan y sanean todo dato que no controlamos
// nosotros — identificadores que se interpolan en URLs, y el contenido de
// perfiles públicos que un usuario publica y otros visualizan.

// ---- Hosts de confianza para imágenes remotas ----
const IMG_HOSTS = new Set(["image.tmdb.org", "fonts.gstatic.com"]);

// ---- Validadores de identificadores de TMDB ----
export const isValidKind = (k) => k === "movie" || k === "tv";

export const isValidTmdbId = (id) => {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 && n < 1e12;
};

// Lanza si el par kind/id no es válido; devuelve el id numérico saneado.
export function assertTmdbTarget(kind, id) {
  if (!isValidKind(kind)) throw new Error("Tipo de contenido no válido");
  if (!isValidTmdbId(id)) throw new Error("Identificador de TMDB no válido");
  return Number(id);
}

// ---- UUID (para el id de usuario que llega por la URL) ----
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s) => typeof s === "string" && UUID_RE.test(s);

// ---- Saneado de una URL de imagen remota ----
// Solo se permiten https y hosts de confianza. Cualquier otra cosa (http,
// javascript:, data:, un tracker de terceros…) se descarta devolviendo null,
// evitando que un perfil público malicioso espíe a quien lo abre.
export function safeImageUrl(url) {
  if (typeof url !== "string" || url.length > 500) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (!IMG_HOSTS.has(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

// ---- Texto plano acotado ----
export function safeText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLen);
}

const clampRating = (r) => {
  const n = Number(r);
  return Number.isFinite(n) ? Math.min(10, Math.max(0, Math.round(n * 10) / 10)) : null;
};

const CATS = new Set(["movies", "series", "anime"]);

// ---- Saneado de la instantánea de perfil público ----
// Se aplica tanto al publicar (no guardar basura) como al cargar (defensa
// para quien visualiza, por si el registro se manipuló de otra forma).
const MAX_LIST = 300;
const MAX_GENRE_KEYS = 30;
const MAX_MEDALS = 40;

function sanitizeListItem(it) {
  if (!it || typeof it !== "object") return null;
  const rating = clampRating(it.rating);
  return {
    title: safeText(it.title, 200),
    year: safeText(String(it.year ?? ""), 4),
    rating,
    note: it.note ? safeText(it.note, 500) : null,
    poster: safeImageUrl(it.poster),
    genre: safeText(it.genre, 60),
    cat: CATS.has(it.cat) ? it.cat : "",
  };
}

function sanitizeCountMap(obj, maxKeys) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (n >= maxKeys) break;
    const num = Number(v);
    if (Number.isFinite(num) && num >= 0) {
      out[safeText(k, 60)] = Math.min(1e7, Math.round(num));
      n++;
    }
  }
  return out;
}

const safeInt = (v, max = 1e9) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(max, Math.round(n)) : 0;
};

export function sanitizePublicSnapshot(snapshot) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const list = Array.isArray(s.list) ? s.list.slice(0, MAX_LIST).map(sanitizeListItem).filter(Boolean) : [];

  const rawStats = s.stats && typeof s.stats === "object" ? s.stats : null;
  const stats = rawStats
    ? {
        totalMins: safeInt(rawStats.totalMins),
        byGenre: sanitizeCountMap(rawStats.byGenre, MAX_GENRE_KEYS),
        byCat: sanitizeCountMap(rawStats.byCat, 3),
        watchedCount: safeInt(rawStats.watchedCount),
        followingCount: safeInt(rawStats.followingCount),
        episodesSeen: safeInt(rawStats.episodesSeen),
        ratedCount: safeInt(rawStats.ratedCount),
      }
    : null;

  const medals = Array.isArray(s.medals)
    ? s.medals.slice(0, MAX_MEDALS).map((m) => ({
        id: safeText(m?.id, 40),
        emoji: safeText(m?.emoji, 8),
        name: safeText(m?.name, 80),
        desc: safeText(m?.desc, 160),
        unlocked: !!m?.unlocked,
      }))
    : [];

  return { list, stats, medals };
}
