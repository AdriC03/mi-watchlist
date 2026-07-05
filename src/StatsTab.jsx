import { useState, useEffect } from "react";
import { getTmdbKey } from "./trending.js";
import { genreStyle } from "./genres.js";

const TMDB = "https://api.themoviedb.org/3";
const ACCENT = "#FFC24B";
const CAT_LABEL = { movies: "Películas", series: "Series", anime: "Anime" };
const CAT_EMOJI = { movies: "🎥", series: "📺", anime: "⛩️" };

// Caché de fichas para no repetir peticiones dentro de la sesión
const factsCache = new Map();

async function fetchFacts(item) {
  const key = `${item.kind}-${item.tmdbId}`;
  if (factsCache.has(key)) return factsCache.get(key);
  const apiKey = getTmdbKey();
  try {
    const r = await fetch(
      `${TMDB}/${item.kind}/${item.tmdbId}?api_key=${apiKey}&language=es-ES&append_to_response=credits`
    );
    if (!r.ok) throw new Error();
    const d = await r.json();
    const facts =
      item.kind === "movie"
        ? {
            runtime: d.runtime || null,
            director: d.credits?.crew?.find((c) => c.job === "Director")?.name || null,
          }
        : {
            episodes: d.number_of_episodes || null,
            epRuntime: d.last_episode_to_air?.runtime || d.episode_run_time?.[0] || null,
            director: d.created_by?.[0]?.name || null,
          };
    factsCache.set(key, facts);
    return facts;
  } catch {
    factsCache.set(key, {});
    return {};
  }
}

const fmtHours = (mins) => {
  if (!mins) return "0 h";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h >= 100) return `${h} h`;
  return h ? `${h} h ${m} min` : `${m} min`;
};

function BigNumber({ emoji, value, label }) {
  return (
    <div className="rounded-xl p-4 flex-1 min-w-36" style={{ background: "#151a26", border: "1px solid #232b3d" }}>
      <p className="text-3xl mb-1">{emoji}</p>
      <p className="text-2xl font-bold" style={{ color: ACCENT, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "#8b93a7" }}>
        {label}
      </p>
    </div>
  );
}

function BarChart({ rows }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-40 sm:w-48 text-xs text-right truncate" style={{ color: "#aab1c4" }}>
            {r.emoji} {r.label}
          </span>
          <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "#0e1119" }}>
            <div
              className="h-full rounded-full flex items-center justify-end px-2 transition-all duration-700"
              style={{ width: `${Math.max(8, (r.value / max) * 100)}%`, background: r.color || ACCENT }}
            >
              <span className="text-xs font-bold" style={{ color: "#0c0e14" }}>
                {r.display ?? r.value}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#151a26", border: "1px solid #232b3d" }}>
      <h3
        className="text-xl mb-4 tracking-wide"
        style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3f4f8", letterSpacing: "0.05em" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function StatsTab({ watched, following, reviews }) {
  const [facts, setFacts] = useState({}); // { "kind-id": {runtime,...} }
  const [loadingFacts, setLoadingFacts] = useState(false);

  // Completa duraciones y directores de lo que has visto (máx. 50 títulos)
  useEffect(() => {
    const targets = watched.filter((w) => w.tmdbId).slice(0, 50);
    if (targets.length === 0) return;
    let cancelled = false;
    setLoadingFacts(true);
    (async () => {
      const entries = await Promise.all(
        targets.map(async (w) => [`${w.kind}-${w.tmdbId}`, await fetchFacts(w)])
      );
      if (!cancelled) {
        setFacts(Object.fromEntries(entries));
        setLoadingFacts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [watched]);

  const factOf = (it) => facts[`${it.kind}-${it.tmdbId}`] || {};

  // --- Minutos vistos ---
  const minutesOf = (it) => {
    const f = factOf(it);
    if (it.kind === "movie" || it.cat === "movies") return f.runtime || 110;
    const eps = f.episodes || it.episodes || 10;
    const run = f.epRuntime || it.epRuntime || (it.cat === "anime" ? 24 : 40);
    return eps * run;
  };

  const watchedIds = new Set(watched.map((w) => `${w.title}::${w.year}`));
  const byCat = { movies: 0, series: 0, anime: 0 };
  let totalMins = 0;
  for (const w of watched) {
    const m = minutesOf(w);
    totalMins += m;
    byCat[w.cat] = (byCat[w.cat] || 0) + m;
  }
  // Series en curso: suma solo los capítulos ya vistos
  for (const f of following) {
    if (watchedIds.has(`${f.title}::${f.year}`)) continue;
    const run = f.epRuntime || (f.cat === "anime" ? 24 : 40);
    const m = (f.ep || 0) * run;
    totalMins += m;
    byCat[f.cat] = (byCat[f.cat] || 0) + m;
  }

  // --- Géneros más vistos ---
  const genreCount = {};
  for (const it of [...watched, ...following]) {
    if (it.genre) genreCount[it.genre] = (genreCount[it.genre] || 0) + 1;
  }
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([g, n]) => {
      const gs = genreStyle(g);
      return { label: g, emoji: gs.emoji, value: n, display: `${n}`, color: gs.text };
    });

  // --- Directores / creadores favoritos ---
  const dirCount = {};
  for (const w of watched) {
    const d = factOf(w).director;
    if (d) dirCount[d] = (dirCount[d] || 0) + 1;
  }
  const topDirectors = Object.entries(dirCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // --- Tus mejores notas ---
  const topRated = Object.values(reviews || {})
    .filter((r) => r.rating)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const catRows = ["movies", "series", "anime"]
    .filter((c) => byCat[c] > 0)
    .map((c) => ({
      label: CAT_LABEL[c],
      emoji: CAT_EMOJI[c],
      value: byCat[c],
      display: fmtHours(byCat[c]),
      color: c === "movies" ? "#fdba74" : c === "series" ? "#93c5fd" : "#f9a8d4",
    }));

  const empty = watched.length === 0 && following.length === 0;

  if (empty) {
    return (
      <p className="text-center py-12 text-sm" style={{ color: "#7c8398" }}>
        Todavía no hay datos. Marca títulos como vistos ✓ o sigue series 📌 y aquí aparecerán tus estadísticas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div className="flex gap-3 flex-wrap">
        <BigNumber emoji="🍿" value={watched.length} label="títulos vistos" />
        <BigNumber emoji="⏱️" value={fmtHours(totalMins)} label={`de tu vida viendo contenido${loadingFacts ? " (calculando…)" : ""}`} />
        <BigNumber emoji="📌" value={following.length} label="series en curso" />
        <BigNumber
          emoji="⭐"
          value={topRated.length ? (topRated.reduce((s, r) => s + r.rating, 0) / topRated.length).toFixed(1) : "—"}
          label="tu nota media"
        />
      </div>

      {catRows.length > 0 && (
        <Section title="⏱️ Tiempo por categoría">
          <BarChart rows={catRows} />
        </Section>
      )}

      {topGenres.length > 0 && (
        <Section title="🎭 Tus temáticas más consumidas">
          <BarChart rows={topGenres} />
        </Section>
      )}

      {topDirectors.length > 0 && (
        <Section title="🎬 Directores y creadores favoritos">
          <div className="flex flex-col gap-2">
            {topDirectors.map(([name, n], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-2xl w-8">{["🥇", "🥈", "🥉", "🎖️", "🎖️"][i]}</span>
                <span className="text-sm font-semibold flex-1" style={{ color: "#e7eaf2" }}>
                  {name}
                </span>
                <span className="text-xs" style={{ color: "#8b93a7" }}>
                  {n} título{n > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {topRated.length > 0 && (
        <Section title="⭐ Tus mejores notas">
          <div className="flex flex-col gap-2">
            {topRated.map((r) => (
              <div key={r.title} className="flex items-center gap-3">
                <span className="text-sm font-bold w-14" style={{ color: ACCENT }}>
                  ★ {r.rating}/10
                </span>
                <span className="text-sm flex-1 truncate" style={{ color: "#e7eaf2" }}>
                  {r.title}
                </span>
                {r.note && (
                  <span className="text-xs italic truncate max-w-64 hidden sm:block" style={{ color: "#8b93a7" }}>
                    «{r.note}»
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
