// Ficha detallada de un título, obtenida de TMDB en español.
// Incluye reparto, tráiler y plataformas de streaming disponibles en España.

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

import { getTmdbKey } from "./trending.js";
import { assertTmdbTarget } from "./security.js";

function pickTrailer(videos) {
  const list = videos?.results || [];
  const score = (v) =>
    (v.site === "YouTube" ? 4 : 0) +
    (v.type === "Trailer" ? 2 : v.type === "Teaser" ? 1 : 0) +
    (v.iso_639_1 === "es" ? 1 : 0);
  const best = [...list].sort((a, b) => score(b) - score(a))[0];
  return best?.site === "YouTube" ? `https://www.youtube.com/watch?v=${best.key}` : null;
}

export async function fetchDetails(kind, tmdbId) {
  const apiKey = getTmdbKey();
  if (!apiKey) throw new Error("Falta configurar VITE_TMDB_API_KEY");
  const id = assertTmdbTarget(kind, tmdbId);

  const url = `${TMDB}/${kind}/${id}?api_key=${apiKey}&language=es-ES&append_to_response=credits,videos,watch/providers`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error de TMDB (${response.status})`);
  const d = await response.json();

  // Si TMDB no tiene sinopsis en español para este título, usa la versión en inglés
  let overview = d.overview;
  if (!overview) {
    const en = await fetch(`${TMDB}/${kind}/${id}?api_key=${apiKey}&language=en-US`);
    if (en.ok) overview = (await en.json()).overview || "";
  }

  const isMovie = kind === "movie";
  const providers = d["watch/providers"]?.results?.ES;
  const flatrate = (providers?.flatrate || []).map((p) => ({
    name: p.provider_name,
    logo: p.logo_path ? `${TMDB_IMG}/w92${p.logo_path}` : null,
  }));

  return {
    title: isMovie ? d.title : d.name,
    tagline: d.tagline || "",
    overview,
    genres: (d.genres || []).map((g) => g.name),
    year: (isMovie ? d.release_date : d.first_air_date)?.slice(0, 4) || "",
    date: isMovie ? d.release_date : d.first_air_date,
    runtime: isMovie ? d.runtime : null, // minutos
    seasons: isMovie ? null : d.number_of_seasons,
    episodes: isMovie ? null : d.number_of_episodes,
    epRuntime: isMovie ? null : d.last_episode_to_air?.runtime || d.episode_run_time?.[0] || null,
    director: isMovie
      ? d.credits?.crew?.find((c) => c.job === "Director")?.name || null
      : d.created_by?.[0]?.name || null,
    status: d.status,
    rating: d.vote_average ? d.vote_average.toFixed(1) : "",
    votes: d.vote_count,
    poster: d.poster_path ? `${TMDB_IMG}/w500${d.poster_path}` : null,
    backdrop: d.backdrop_path ? `${TMDB_IMG}/w1280${d.backdrop_path}` : null,
    cast: (d.credits?.cast || []).slice(0, 8).map((c) => ({
      name: c.name,
      character: c.character,
      photo: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : null,
    })),
    trailer: pickTrailer(d.videos),
    providers: flatrate,
    providersLink: providers?.link || null,
  };
}
