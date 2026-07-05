// Comprueba si las series que sigues tienen episodios nuevos desde la última vez.
// Compara el nº total de episodios actual de TMDB con el que la app tenía guardado.
import { getTmdbKey } from "./trending.js";

const TMDB = "https://api.themoviedb.org/3";

export async function checkNewEpisodes(following) {
  const apiKey = getTmdbKey();
  const tvItems = following.filter((f) => f.kind === "tv" && f.tmdbId);
  if (!apiKey || tvItems.length === 0) return { notifications: [], updates: [] };

  const results = await Promise.all(
    tvItems.map(async (f) => {
      try {
        const r = await fetch(`${TMDB}/tv/${f.tmdbId}?api_key=${apiKey}&language=es-ES`);
        if (!r.ok) return null;
        const d = await r.json();
        const nowEpisodes = d.number_of_episodes || 0;
        const knownEpisodes = f.episodes || 0;
        const update = {
          tmdbId: f.tmdbId,
          seasons: d.number_of_seasons || f.seasons || null,
          episodes: nowEpisodes || f.episodes || null,
          epRuntime: d.last_episode_to_air?.runtime || d.episode_run_time?.[0] || f.epRuntime || null,
        };
        if (knownEpisodes && nowEpisodes > knownEpisodes) {
          const last = d.last_episode_to_air;
          return {
            update,
            notification: {
              id: `${f.tmdbId}-${nowEpisodes}`,
              title: f.title,
              poster: f.poster,
              newCount: nowEpisodes - knownEpisodes,
              lastLabel: last
                ? `T${last.season_number} · Cap ${last.episode_number}${last.name ? ` — «${last.name}»` : ""}`
                : null,
              airDate: last?.air_date || null,
            },
          };
        }
        return { update, notification: null };
      } catch {
        return null;
      }
    })
  );

  const valid = results.filter(Boolean);
  return {
    notifications: valid.map((r) => r.notification).filter(Boolean),
    updates: valid.map((r) => r.update),
  };
}
