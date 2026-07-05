// Tendencias 100% gratis, llamadas directas desde el navegador (sin backend).
// Todo viene de TMDB con language=es-ES para que las descripciones estén en español:
// - Películas: trending semanal
// - Series: trending semanal
// - Anime: discover de series de animación japonesas ordenadas por popularidad

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const PAGES = [1, 2, 3];
const ITEMS_PER_CATEGORY = 60;

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

export function genreName(kind, genreId) {
  return (kind === "movie" ? MOVIE_GENRES : TV_GENRES)[genreId] || "";
}

// Datos rápidos de una serie (para completar items que vienen del buscador)
export async function fetchTvFacts(tmdbId) {
  const apiKey = getTmdbKey();
  const r = await fetch(`${TMDB}/tv/${tmdbId}?api_key=${apiKey}&language=es-ES`);
  if (!r.ok) throw new Error(`Error de TMDB (${r.status})`);
  const d = await r.json();
  return {
    seasons: d.number_of_seasons || null,
    episodes: d.number_of_episodes || null,
    epRuntime: d.last_episode_to_air?.runtime || d.episode_run_time?.[0] || null,
  };
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
    PAGES.map(async (page) => {
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

// Añade temporadas, nº de episodios y duración media de capítulo a las series.
// Se hace en paralelo; si alguna ficha falla, esa serie se queda sin esos datos.
async function enrichTvItems(items) {
  const apiKey = getTmdbKey();
  const enriched = await Promise.all(
    items.map(async (item) => {
      try {
        const r = await fetch(`${TMDB}/tv/${item.tmdbId}?api_key=${apiKey}&language=es-ES`);
        if (!r.ok) return item;
        const d = await r.json();
        return {
          ...item,
          seasons: d.number_of_seasons || null,
          episodes: d.number_of_episodes || null,
          epRuntime: d.last_episode_to_air?.runtime || d.episode_run_time?.[0] || null,
        };
      } catch {
        return item;
      }
    })
  );
  return enriched;
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

  let items = results.slice(0, ITEMS_PER_CATEGORY).map((it) => normalizeTMDB(it, kind));
  if (kind === "tv") items = await enrichTvItems(items);
  return items;
}
