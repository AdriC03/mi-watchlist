// Tendencias 100% gratis, llamadas directas desde el navegador (sin backend):
// - Películas y series: TMDB (requiere una API key gratuita, ver README/.env.example)
// - Anime: Jikan (100% gratis, sin registro ni key)

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

function truncate(text, maxWords = 30) {
  if (!text) return "";
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

// Pide 2 páginas de TMDB (20 resultados cada una) para tener bastante más donde elegir.
async function fetchTMDBTrending(kind) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar VITE_TMDB_API_KEY (clave gratuita de themoviedb.org, ver README)");
  }

  const pages = await Promise.all(
    [1, 2].map(async (page) => {
      const url = `https://api.themoviedb.org/3/trending/${kind}/week?api_key=${apiKey}&language=es-ES&page=${page}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error de TMDB (${response.status})`);
      return response.json();
    })
  );

  const seen = new Set();
  const results = pages.flatMap((p) => p.results || []).filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
  const genres = kind === "movie" ? MOVIE_GENRES : TV_GENRES;

  return results.slice(0, ITEMS_PER_CATEGORY).map((it) => ({
    title: kind === "movie" ? it.title : it.name,
    year: (kind === "movie" ? it.release_date : it.first_air_date)?.slice(0, 4) || "",
    genre: genres[it.genre_ids?.[0]] || "",
    description: truncate(it.overview),
    rating: it.vote_average ? it.vote_average.toFixed(1) : "",
    poster: it.poster_path ? `${TMDB_IMG}/w500${it.poster_path}` : null,
    backdrop: it.backdrop_path ? `${TMDB_IMG}/w1280${it.backdrop_path}` : null,
  }));
}

async function fetchJikanTrendingAnime() {
  const response = await fetch(`https://api.jikan.moe/v4/seasons/now?limit=${ITEMS_PER_CATEGORY}`);
  if (!response.ok) {
    throw new Error(`Error de Jikan (${response.status})`);
  }

  const data = await response.json();
  const seen = new Set();
  const unique = (data.data || []).filter((it) => {
    if (seen.has(it.mal_id)) return false;
    seen.add(it.mal_id);
    return true;
  });

  return unique.slice(0, ITEMS_PER_CATEGORY).map((it) => {
    const img = it.images?.webp?.large_image_url || it.images?.jpg?.large_image_url || null;
    return {
      title: it.title,
      year: it.year || it.aired?.prop?.from?.year || "",
      genre: it.genres?.[0]?.name || "",
      description: truncate(it.synopsis),
      rating: it.score ? String(it.score) : "",
      poster: img,
      backdrop: it.trailer?.images?.maximum_image_url || img,
    };
  });
}

export async function fetchTrending(catKey) {
  if (catKey === "movies") return fetchTMDBTrending("movie");
  if (catKey === "series") return fetchTMDBTrending("tv");
  if (catKey === "anime") return fetchJikanTrendingAnime();
  throw new Error("Categoría desconocida");
}
