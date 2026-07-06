// Ruleta de la Indecisión: construye una baraja de candidatos para deslizar.
// Mezcla recomendaciones basadas en tus gustos (mejores notas / últimos vistos)
// con tendencias que aún no tienes en ninguna lista.
import { getTmdbKey, genreName } from "./trending.js";

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

const itemId = (it) => `${(it.title || "").toLowerCase().trim()}::${it.year || ""}`;

function truncate(text, maxWords = 24) {
  if (!text) return "";
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

const normalize = (r, kind) => ({
  tmdbId: r.id,
  kind,
  cat:
    kind === "movie"
      ? "movies"
      : r.genre_ids?.includes(16) && (r.origin_country || []).includes("JP")
        ? "anime"
        : "series",
  title: kind === "movie" ? r.title : r.name,
  year: (kind === "movie" ? r.release_date : r.first_air_date)?.slice(0, 4) || "",
  genre: genreName(kind, r.genre_ids?.[0]),
  description: truncate(r.overview),
  rating: r.vote_average ? r.vote_average.toFixed(1) : "",
  poster: r.poster_path ? `${TMDB_IMG}/w500${r.poster_path}` : null,
  backdrop: r.backdrop_path ? `${TMDB_IMG}/w1280${r.backdrop_path}` : null,
});

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function buildSwipePool({ watched, following, saved, reviews, trends }) {
  const apiKey = getTmdbKey();
  const all = [...watched, ...following, ...saved];
  const excludeIds = new Set(all.map(itemId));
  const excludeTmdb = new Set(all.filter((it) => it.tmdbId).map((it) => `${it.kind}-${it.tmdbId}`));

  const pool = new Map();
  const add = (item) => {
    const key = `${item.kind}-${item.tmdbId}`;
    if (excludeTmdb.has(key) || excludeIds.has(itemId(item)) || !item.poster) return;
    if (!pool.has(key)) pool.set(key, item);
  };

  // 1) Recomendaciones según tus gustos
  if (apiKey) {
    const byId = Object.fromEntries(all.map((it) => [itemId(it), it]));
    let seeds = Object.entries(reviews || {})
      .filter(([, r]) => r.rating >= 8)
      .sort((a, b) => b[1].rating - a[1].rating)
      .map(([id]) => byId[id])
      .filter((it) => it?.tmdbId);
    if (seeds.length === 0) seeds = watched.filter((it) => it.tmdbId).slice(-3).reverse();
    seeds = seeds.slice(0, 3);

    await Promise.all(
      seeds.map(async (seed) => {
        try {
          const r = await fetch(
            `${TMDB}/${seed.kind}/${seed.tmdbId}/recommendations?api_key=${apiKey}&language=es-ES&page=1`
          );
          if (!r.ok) return;
          const data = await r.json();
          for (const rec of data.results || []) {
            const kind = rec.media_type === "tv" ? "tv" : rec.media_type === "movie" ? "movie" : seed.kind;
            add(normalize(rec, kind));
          }
        } catch {
          /* semilla fallida */
        }
      })
    );
  }

  // 2) Relleno con tendencias cacheadas que no tengas ya
  const trendItems = ["movies", "series", "anime"].flatMap((k) => trends[k]?.items || []);
  for (const it of shuffle(trendItems)) add(it);

  return shuffle([...pool.values()]).slice(0, 30);
}
