// Tendencias 100% gratis, llamadas directas desde el navegador (sin backend).
// Todo viene de TMDB con language=es-ES para que las descripciones estén en español:
// - Películas: trending semanal
// - Series: trending semanal
// - Anime: discover de series de animación japonesas ordenadas por popularidad

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const ITEMS_PER_CATEGORY = 24;

const MOVIE_GENRES = {
  28: "Acción", 12: "Aventura", 16: "Animación", 35: "Comedia", 80: "Crimen",
  99: "Documental", 18: "Drama", 10751: "Familiar", 14: "Fantasía", 36: "Historia",
  27: "Terror", 10402: "Música", 9648: "Misterio", 10749: "Romance",
  878: "Ciencia ficción", 10770: "Película de TV", 53: "Suspense", 10752: "Bélica", 37: "Western",
};

const TV_GENRES = {
  10759: "Acción y aventura", 16: "Animación", 35: "Comedia", 80: "Crimen",
  99: "Documental", 18: "Drama", 10751: "Familiar", 10762: "Infantil",
  9648: "Misterio", 10763: "Noticias", 10764: "Reality", 10765: "Ciencia ficción y fantasía",
  10766: "Telenovela", 10767: "Talk show", 10768: "Guerra y política", 37: "Western",
};

export function getTmdbKey() {
  return import.meta.env.VITE_TMDB_API_KEY;
}

function truncate(text, maxWords = 30) {
  if (!text) return "";
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

function normalizeTMDB(it, kind) {
  const isMovie = kind === "movie";
  const genres = isMovie ? MOVIE_GENRES : TV_GENRES;
  return {
    tmdbId: it.id,
    kind,
    title: isMovie ? it.title : it.name,
    year: (isMovie ? it.release_date : it.first_air_date)?.slice(0, 4) || "",
    genre: genres[it.genre_ids?.[0]] || "",
    description: truncate(it.overview),
    rating: it.vote_average ? it.vote_average.toFixed(1) : "",
    poster: it.poster_path ? `${TMDB_IMG}/w500${it.poster_path}` : null,
    backdrop: it.backdrop_path ? `${TMDB_IMG}/w1280${it.backdrop_path}` : null,
  };
}

async function fetchTMDBPages(pathAndQuery) {
  const apiKey = getTmdbKey();
  if (!apiKey) {
    throw new Error("Falta configurar VITE_TMDB_API_KEY (clave gratuita de themoviedb.org, ver README)");
  }

  const pages = await Promise.all(
    [1, 2].map(async (page) => {
      const url = `${TMDB}${pathAndQuery}&api_key=${apiKey}&language=es-ES&page=${page}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error de TMDB (${response.status})`);
      return response.json();
    })
  );

  const seen = new Set();
  return pages.flatMap((p) => p.results || []).filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
}

export async function fetchTrending(catKey) {
  let results;
  let kind;

  if (catKey === "movies") {
    kind = "movie";
    results = await fetchTMDBPages("/trending/movie/week?");
  } else if (catKey === "series") {
    kind = "tv";
    results = await fetchTMDBPages("/trending/tv/week?");
  } else if (catKey === "anime") {
    kind = "tv";
    results = await fetchTMDBPages(
      "/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc&vote_count.gte=20"
    );
  } else {
    throw new Error("Categoría desconocida");
  }

  return results.slice(0, ITEMS_PER_CATEGORY).map((it) => normalizeTMDB(it, kind));
}
