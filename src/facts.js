// Ficha rápida de un título (duración, director, plataformas de streaming en España),
// con caché de sesión para no repetir peticiones a TMDB.
import { useState, useEffect } from "react";
import { getTmdbKey } from "./trending.js";
import { isValidKind, isValidTmdbId } from "./security.js";

const TMDB = "https://api.themoviedb.org/3";

const cache = new Map();

export const factKey = (it) => `${it.kind}-${it.tmdbId}`;

export async function fetchFacts(item) {
  const key = factKey(item);
  if (cache.has(key)) return cache.get(key);
  const apiKey = getTmdbKey();
  if (!apiKey || !isValidKind(item.kind) || !isValidTmdbId(item.tmdbId)) return {};
  try {
    const r = await fetch(
      `${TMDB}/${item.kind}/${Number(item.tmdbId)}?api_key=${apiKey}&language=es-ES&append_to_response=credits,watch/providers`
    );
    if (!r.ok) throw new Error();
    const d = await r.json();
    const providers = (d["watch/providers"]?.results?.ES?.flatrate || []).map((p) => p.provider_name);
    const facts =
      item.kind === "movie"
        ? {
            runtime: d.runtime || null,
            director: d.credits?.crew?.find((c) => c.job === "Director")?.name || null,
            providers,
          }
        : {
            episodes: d.number_of_episodes || null,
            epRuntime: d.last_episode_to_air?.runtime || d.episode_run_time?.[0] || null,
            director: d.created_by?.[0]?.name || null,
            providers,
          };
    cache.set(key, facts);
    return facts;
  } catch {
    cache.set(key, {});
    return {};
  }
}

// Hook: enriquece una lista de items y devuelve { "kind-id": facts }
export function useFacts(items, enabled = true) {
  const [map, setMap] = useState({});
  const ids = items
    .filter((i) => i.tmdbId)
    .map(factKey)
    .join(",");

  useEffect(() => {
    if (!enabled || !ids) return;
    let cancelled = false;
    const targets = items.filter((i) => i.tmdbId).slice(0, 60);
    (async () => {
      const entries = await Promise.all(targets.map(async (it) => [factKey(it), await fetchFacts(it)]));
      if (!cancelled) setMap(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, enabled]);

  return map;
}

// Duración "efectiva" en minutos: película completa o duración de un capítulo
export function effectiveDuration(item, facts) {
  const f = facts || {};
  if (item.kind === "movie" || item.cat === "movies") return f.runtime || null;
  return f.epRuntime || item.epRuntime || null;
}
