// Buscador de películas, series y anime contra TMDB (en español).
import { getTmdbKey, genreName } from "./trending.js";

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

function truncate(text, maxWords = 30) {
  if (!text) return "";
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

export async function searchTMDB(query) {
  const apiKey = getTmdbKey();
  if (!apiKey) throw new Error("Falta configurar VITE_TMDB_API_KEY");

  const url = `${TMDB}/search/multi?api_key=${apiKey}&language=es-ES&query=${encodeURIComponent(query)}&include_adult=false`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error de TMDB (${response.status})`);
  const data = await response.json();

  return (data.results || [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 18)
    .map((r) => {
      const kind = r.media_type === "movie" ? "movie" : "tv";
      const isMovie = kind === "movie";
      const isAnime = !isMovie && r.genre_ids?.includes(16) && (r.origin_country || []).includes("JP");
      return {
        tmdbId: r.id,
        kind,
        cat: isMovie ? "movies" : isAnime ? "anime" : "series",
        title: isMovie ? r.title : r.name,
        year: (isMovie ? r.release_date : r.first_air_date)?.slice(0, 4) || "",
        genre: genreName(kind, r.genre_ids?.[0]),
        description: truncate(r.overview),
        rating: r.vote_average ? r.vote_average.toFixed(1) : "",
        poster: r.poster_path ? `${TMDB_IMG}/w500${r.poster_path}` : null,
        backdrop: r.backdrop_path ? `${TMDB_IMG}/w1280${r.backdrop_path}` : null,
      };
    });
}
