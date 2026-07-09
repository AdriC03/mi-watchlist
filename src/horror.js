// La Cripta: sección exclusiva de terror con criterio MUY exigente.
// Nada de sustos de saldo — solo largometrajes avalados por un consenso
// crítico real (nota alta + miles de votos). Tres niveles de exigencia,
// con filtro opcional por plataforma de streaming en España.
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
    tagline: "El olimpo del género. Muy pocas sobreviven a este corte.",
    rule: "Nota ≥ 7,5 avalada por más de 2.500 votos",
    params: `${BASE}&vote_average.gte=7.5&vote_count.gte=2500&sort_by=vote_average.desc`,
  },
  {
    key: "cult",
    label: "Joyas de culto",
    emoji: "🕯️",
    tagline: "Brillantes, infravaloradas y lejos del gran público.",
    rule: "Nota ≥ 7,2 con respaldo sólido (400–2.500 votos)",
    params: `${BASE}&vote_average.gte=7.2&vote_count.gte=400&vote_count.lte=2500&sort_by=vote_average.desc`,
  },
  {
    key: "modern",
    label: "Terror moderno",
    emoji: "🩸",
    tagline: "Lo mejor que ha parido el género en la última década.",
    rule: "De 2016 en adelante, nota ≥ 7 con más de 1.500 votos",
    params: `${BASE}&vote_average.gte=7&vote_count.gte=1500&primary_release_date.gte=2016-01-01&sort_by=vote_average.desc`,
  },
];

// Plataformas de streaming en España (IDs verificados contra
// /watch/providers/movie?watch_region=ES — incluyen sus variantes con anuncios)
export const PLATFORMS = [
  { key: "netflix", label: "Netflix", ids: "8|1796", color: "#E50914" },
  { key: "hbo", label: "HBO Max", ids: "1899|1825", color: "#8A5CF6" },
  { key: "prime", label: "Prime Video", ids: "119|2100", color: "#00A8E1" },
  { key: "disney", label: "Disney+", ids: "337", color: "#3BA7F0" },
  { key: "movistar", label: "Movistar Plus+", ids: "2241|149", color: "#28BFAF" },
  { key: "filmin", label: "Filmin", ids: "63|64", color: "#7FE06E" },
  { key: "sky", label: "SkyShowtime", ids: "1773", color: "#F2C14E" },
];

// Citas míticas del género para ambientar la sección
export const QUOTES = [
  { text: "¡Aquí está Johnny!", from: "El resplandor (1980)" },
  { text: "En el espacio, nadie puede oír tus gritos.", from: "Alien (1979)" },
  { text: "¿Quieres jugar a un juego?", from: "Saw (2004)" },
  { text: "En ocasiones veo muertos.", from: "El sexto sentido (1999)" },
  { text: "¿Cuál es tu película de miedo favorita?", from: "Scream (1996)" },
  { text: "Ya están aquíííí…", from: "Poltergeist (1982)" },
  { text: "Aquí abajo todos flotamos.", from: "It (2017)" },
  { text: "¡El poder de Cristo te obliga!", from: "El exorcista (1973)" },
  { text: "Uno, dos, Freddy viene a por ti…", from: "Pesadilla en Elm Street (1984)" },
  { text: "Sonríe.", from: "Smile (2022)" },
];

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

async function fetchCriterion(crit, platform, apiKey) {
  const providerFilter = platform
    ? `&watch_region=ES&with_watch_providers=${encodeURIComponent(platform.ids)}`
    : "";

  const pages = await Promise.all(
    PAGES.map(async (page) => {
      const url = `${TMDB}/discover/movie?api_key=${apiKey}&language=es-ES&${crit.params}${providerFilter}&page=${page}`;
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
  return { ...crit, items, avg };
}

// Carga las tres filas de la Cripta (opcionalmente filtradas por plataforma)
export async function fetchCrypt(platformKey = null) {
  const apiKey = getTmdbKey();
  if (!apiKey) throw new Error("Falta configurar VITE_TMDB_API_KEY");
  const platform = PLATFORMS.find((p) => p.key === platformKey) || null;
  return Promise.all(CRITERIA.map((c) => fetchCriterion(c, platform, apiKey)));
}
