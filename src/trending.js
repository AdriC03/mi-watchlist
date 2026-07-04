// Tendencias 100% gratis, llamadas directas desde el navegador (sin backend):
// - Películas y series: TMDB (requiere una API key gratuita, ver README/.env.example)
// - Anime: Jikan (100% gratis, sin registro ni key)

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

function truncate(text, maxWords = 30) {
  if (!text) return "";
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

async function fetchTMDBTrending(kind) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar VITE_TMDB_API_KEY (clave gratuita de themoviedb.org, ver README)");
  }

  const url = `https://api.themoviedb.org/3/trending/${kind}/week?api_key=${apiKey}&language=es-ES`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error de TMDB (${response.status})`);
  }

  const data = await response.json();
  const genres = kind === "movie" ? MOVIE_GENRES : TV_GENRES;

  return (data.results || []).slice(0, 10).map((it) => ({
    title: kind === "movie" ? it.title : it.name,
    year: (kind === "movie" ? it.release_date : it.first_air_date)?.slice(0, 4) || "",
    genre: genres[it.genre_ids?.[0]] || "",
    description: truncate(it.overview),
    rating: it.vote_average ? it.vote_average.toFixed(1) : "",
  }));
}

async function fetchJikanTrendingAnime() {
  const response = await fetch("https://api.jikan.moe/v4/seasons/now?limit=10");
  if (!response.ok) {
    throw new Error(`Error de Jikan (${response.status})`);
  }

  const data = await response.json();
  return (data.data || []).slice(0, 10).map((it) => ({
    title: it.title,
    year: it.year || it.aired?.prop?.from?.year || "",
    genre: it.genres?.[0]?.name || "",
    description: truncate(it.synopsis),
    rating: it.score ? String(it.score) : "",
  }));
}

export async function fetchTrending(catKey) {
  if (catKey === "movies") return fetchTMDBTrending("movie");
  if (catKey === "series") return fetchTMDBTrending("tv");
  if (catKey === "anime") return fetchJikanTrendingAnime();
  throw new Error("Categoría desconocida");
}
