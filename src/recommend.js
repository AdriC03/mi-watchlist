// "Recomiéndame algo": mira tus títulos mejor puntuados (o los últimos vistos si
// aún no puntúas) y pide a TMDB títulos similares, excluyendo lo que ya tienes.
import { getTmdbKey, genreName } from "./trending.js";

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

function truncate(text, maxWords = 28) {
  if (!text) return "";
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

const normalize = (r, kind, because) => ({
  tmdbId: r.id,
  kind,
  cat: kind === "movie" ? "movies" : (r.genre_ids?.includes(16) && (r.origin_country || []).includes("JP") ? "anime" : "series"),
  title: kind === "movie" ? r.title : r.name,
  year: (kind === "movie" ? r.release_date : r.first_air_date)?.slice(0, 4) || "",
  genre: genreName(kind, r.genre_ids?.[0]),
  description: truncate(r.overview),
  rating: r.vote_average ? r.vote_average.toFixed(1) : "",
  poster: r.poster_path ? `${TMDB_IMG}/w500${r.poster_path}` : null,
  backdrop: r.backdrop_path ? `${TMDB_IMG}/w1280${r.backdrop_path}` : null,
  because,
});

export async function getRecommendations({ watched, following, saved, reviews }) {
  const apiKey = getTmdbKey();
  if (!apiKey) throw new Error("Falta configurar VITE_TMDB_API_KEY");

  const all = [...watched, ...following, ...saved];
  const byId = Object.fromEntries(all.map((it) => [`${(it.title || "").toLowerCase().trim()}::${it.year || ""}`, it]));

  // Semillas: lo mejor puntuado (nota ≥ 8); si no hay notas, lo último visto
  let seeds = Object.entries(reviews || {})
    .filter(([, r]) => r.rating >= 8)
    .sort((a, b) => b[1].rating - a[1].rating)
    .map(([id]) => byId[id])
    .filter((it) => it?.tmdbId);
  if (seeds.length === 0) seeds = watched.filter((it) => it.tmdbId).slice(-4).reverse();
  if (seeds.length === 0) seeds = following.filter((it) => it.tmdbId).slice(0, 3);
  if (seeds.length === 0) throw new Error("Marca algo como visto o puntúa títulos para que sepa tus gustos.");

  seeds = seeds.slice(0, 4);

  const excluded = new Set(all.map((it) => `${it.kind}-${it.tmdbId}`));
  const pool = new Map();

  await Promise.all(
    seeds.map(async (seed) => {
      const r = await fetch(
        `${TMDB}/${seed.kind}/${seed.tmdbId}/recommendations?api_key=${apiKey}&language=es-ES&page=1`
      );
      if (!r.ok) return;
      const data = await r.json();
      for (const rec of (data.results || []).slice(0, 10)) {
        const kind = rec.media_type === "movie" || seed.kind === "movie" ? (rec.media_type || seed.kind) : "tv";
        if (kind !== "movie" && kind !== "tv") continue;
        const key = `${kind}-${rec.id}`;
        if (excluded.has(key) || !rec.poster_path) continue;
        const score = (rec.vote_average || 0) * Math.min(1, (rec.vote_count || 0) / 300);
        if (!pool.has(key) || pool.get(key).score < score) {
          pool.set(key, { score, item: normalize(rec, kind, seed.title) });
        }
      }
    })
  );

  const recs = [...pool.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.item);

  if (recs.length === 0) throw new Error("No he encontrado recomendaciones nuevas. ¡Puntúa más títulos!");

  // Plataformas de cada recomendación (para saber dónde verlas)
  await Promise.all(
    recs.map(async (rec) => {
      try {
        const r = await fetch(`${TMDB}/${rec.kind}/${rec.tmdbId}/watch/providers?api_key=${apiKey}`);
        if (!r.ok) return;
        const data = await r.json();
        rec.providers = (data.results?.ES?.flatrate || []).slice(0, 4).map((p) => ({
          name: p.provider_name,
          logo: p.logo_path ? `${TMDB_IMG}/w92${p.logo_path}` : null,
        }));
      } catch {
        /* sin plataformas */
      }
    })
  );

  return recs;
}
