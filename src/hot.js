// La Sección Hot: una joya oculta del cine cada día.
// Busca en TMDB películas muy bien valoradas pero con pocos votos (culto /
// infravaloradas, nada de blockbusters) y elige una de forma determinista
// según el día — cambia sola cada 24 h y es la misma para todo el mundo.
import { getTmdbKey, genreName } from "./trending.js";

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

export const dayNumber = () => Math.floor(Date.now() / 86400000);

export async function fetchDailyGem() {
  const apiKey = getTmdbKey();
  if (!apiKey) throw new Error("Falta configurar VITE_TMDB_API_KEY");

  const day = dayNumber();
  const page = (day % 40) + 1;

  const url =
    `${TMDB}/discover/movie?api_key=${apiKey}&language=es-ES&sort_by=vote_average.desc` +
    `&vote_count.gte=250&vote_count.lte=2200&vote_average.gte=7.4&page=${page}` +
    `&without_genres=99,10770`; // sin documentales ni películas de TV

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Error de TMDB (${r.status})`);
  const data = await r.json();
  const list = (data.results || []).filter((m) => m.poster_path && m.overview);
  if (list.length === 0) throw new Error("No hay joya hoy, vuelve mañana 🎬");

  const pick = list[day % list.length];

  // Plataformas donde verla
  let providers = [];
  try {
    const pr = await fetch(`${TMDB}/movie/${pick.id}/watch/providers?api_key=${apiKey}`);
    if (pr.ok) {
      const pd = await pr.json();
      providers = (pd.results?.ES?.flatrate || []).slice(0, 4).map((p) => ({
        name: p.provider_name,
        logo: p.logo_path ? `${TMDB_IMG}/w92${p.logo_path}` : null,
      }));
    }
  } catch {
    /* sin plataformas */
  }

  return {
    tmdbId: pick.id,
    kind: "movie",
    cat: "movies",
    title: pick.title,
    year: pick.release_date?.slice(0, 4) || "",
    genre: genreName("movie", pick.genre_ids?.[0]),
    description: pick.overview,
    rating: pick.vote_average ? pick.vote_average.toFixed(1) : "",
    votes: pick.vote_count,
    poster: pick.poster_path ? `${TMDB_IMG}/w500${pick.poster_path}` : null,
    backdrop: pick.backdrop_path ? `${TMDB_IMG}/w1280${pick.backdrop_path}` : null,
    providers,
  };
}
