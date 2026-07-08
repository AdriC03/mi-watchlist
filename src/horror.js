// La Cripta: sección exclusiva de terror con criterio MUY exigente.
// Nada de sustos de saldo — solo largometrajes avalados por un consenso
// crítico real (nota alta + miles de votos). Tres niveles de exigencia.
import { getTmdbKey, genreName } from "./trending.js";

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const PAGES = [1, 2];

// Filtros comunes: solo terror (27), largometrajes (≥70 min), sin "familia"
// (fuera Scooby y compañía) y sin documentales.
const BASE = "with_genres=27&with_runtime.gte=70&without_genres=10751,99";

// Cada criterio lleva su umbral. El orden importa: de más a menos exigente.
export const CRITERIA = [
  {
    key: "masterpieces",
    label: "Obras maestras",
    emoji: "👑",
    tagline: "El olimpo del género",
    rule: "Nota ≥ 7,5 avalada por más de 2.500 votos",
    params: `${BASE}&vote_average.gte=7.5&vote_count.gte=2500&sort_by=vote_average.desc`,
    minRating: 7.5,
  },
  {
    key: "cult",
    label: "Joyas de culto",
    emoji: "🕯️",
    tagline: "Brillantes e infravaloradas",
    rule: "Nota ≥ 7,2 con respaldo sólido, pero lejos del gran público",
    params: `${BASE}&vote_average.gte=7.2&vote_count.gte=400&vote_count.lte=2500&sort_by=vote_average.desc`,
    minRating: 7.2,
  },
  {
    key: "modern",
    label: "Terror moderno",
    emoji: "🩸",
    tagline: "Lo mejor de la última década",
    rule: "De 2016 en adelante, nota ≥ 7 con más de 1.500 votos",
    params: `${BASE}&vote_average.gte=7&vote_count.gte=1500&primary_release_date.gte=2016-01-01&sort_by=vote_average.desc`,
    minRating: 7,
  },
];

export const criterionByKey = (k) => CRITERIA.find((c) => c.key === k) || CRITERIA[0];

function normalize(m) {
  return {
    tmdbId: m.id,
    kind: "movie",
    cat: "movies",
    title: m.title,
    year: m.release_date?.slice(0, 4) || "",
    genre: genreName("movie", 27),
    description: m.overview || "",
    rating: m.vote_average ? m.vote_average.toFixed(1) : "",
    ratingNum: m.vote_average || 0,
    votes: m.vote_count || 0,
    poster: m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : null,
    backdrop: m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : null,
  };
}

export async function fetchHorror(criterionKey) {
  const apiKey = getTmdbKey();
  if (!apiKey) throw new Error("Falta configurar VITE_TMDB_API_KEY");
  const crit = criterionByKey(criterionKey);

  const pages = await Promise.all(
    PAGES.map(async (page) => {
      const url = `${TMDB}/discover/movie?api_key=${apiKey}&language=es-ES&${crit.params}&page=${page}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Error de TMDB (${r.status})`);
      return r.json();
    })
  );

  const seen = new Set();
  const items = pages
    .flatMap((p) => p.results || [])
    .filter((m) => {
      if (seen.has(m.id) || !m.poster_path || !m.overview) return false;
      seen.add(m.id);
      return true;
    })
    .map(normalize)
    .sort((a, b) => b.ratingNum - a.ratingNum);

  const avg = items.length ? items.reduce((s, it) => s + it.ratingNum, 0) / items.length : 0;
  return { items, avg };
}
