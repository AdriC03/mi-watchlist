// El "Pique" Cinéfilo: estadísticas resumidas y medallas desbloqueables.
// Se calculan a partir de tus listas y se publican en el perfil compartido.
import { genreStyle } from "./genres.js";

const factKeyOf = (it) => `${it.kind}-${it.tmdbId}`;

// Resumen numérico de tu actividad (factsMap es opcional: afina duraciones)
export function computeCineStats({ watched, following, reviews, factsMap = {} }) {
  const watchedIds = new Set(watched.map((w) => `${w.title}::${w.year}`));

  const minutesOf = (it) => {
    const f = factsMap[factKeyOf(it)] || {};
    if (it.kind === "movie" || it.cat === "movies") return f.runtime || 110;
    const eps = f.episodes || it.episodes || 10;
    const run = f.epRuntime || it.epRuntime || (it.cat === "anime" ? 24 : 40);
    return eps * run;
  };

  let totalMins = 0;
  let episodesSeen = 0;
  const byGenre = {};
  const byCat = { movies: 0, series: 0, anime: 0 };

  for (const w of watched) {
    const m = minutesOf(w);
    totalMins += m;
    byCat[w.cat] = (byCat[w.cat] || 0) + m;
    if (w.genre) byGenre[w.genre] = (byGenre[w.genre] || 0) + 1;
    if (w.kind === "tv") episodesSeen += (factsMap[factKeyOf(w)] || {}).episodes || w.episodes || 10;
  }
  for (const f of following) {
    if (watchedIds.has(`${f.title}::${f.year}`)) continue;
    const run = f.epRuntime || (f.cat === "anime" ? 24 : 40);
    totalMins += (f.ep || 0) * run;
    byCat[f.cat] = (byCat[f.cat] || 0) + (f.ep || 0) * run;
    if (f.genre) byGenre[f.genre] = (byGenre[f.genre] || 0) + 1;
    episodesSeen += f.ep || 0;
  }

  const ratings = Object.values(reviews || {}).map((r) => r.rating).filter(Boolean);
  const isHorror = (g) => /terror|suspense/i.test(g || "");
  const all = [...watched, ...following];

  return {
    totalMins,
    byGenre,
    byCat,
    episodesSeen,
    watchedCount: watched.length,
    followingCount: following.length,
    animeCount: all.filter((it) => it.cat === "anime").length,
    horrorCount: watched.filter((it) => isHorror(it.genre)).length,
    genreCount: Object.keys(byGenre).length,
    ratedCount: ratings.length,
    maxRating: ratings.length ? Math.max(...ratings) : 0,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
  };
}

const MEDAL_DEFS = [
  { id: "otaku", emoji: "⛩️", name: "Medalla Otaku", desc: "5 animes o más entre vistos y en curso", test: (s) => s.animeCount >= 5 },
  { id: "masoca", emoji: "💀", name: "Medalla Masoquista", desc: "3 títulos de terror o suspense vistos", test: (s) => s.horrorCount >= 3 },
  { id: "maraton", emoji: "🍿", name: "Maratonista", desc: "Más de 100 horas de pantalla", test: (s) => s.totalMins >= 6000 },
  { id: "critico", emoji: "🧠", name: "Crítico de élite", desc: "10 títulos puntuados o más", test: (s) => s.ratedCount >= 10 },
  { id: "fan", emoji: "❤️", name: "Fan incondicional", desc: "Has dado algún 10", test: (s) => s.maxRating >= 10 },
  { id: "multi", emoji: "📌", name: "Multitarea", desc: "3 series en curso a la vez", test: (s) => s.followingCount >= 3 },
  { id: "explorador", emoji: "🧭", name: "Explorador", desc: "6 géneros distintos o más", test: (s) => s.genreCount >= 6 },
  { id: "devorador", emoji: "🦉", name: "Devorador de capítulos", desc: "200 capítulos vistos o más", test: (s) => s.episodesSeen >= 200 },
  { id: "duro", emoji: "🪨", name: "Duro de complacer", desc: "Nota media ≤ 6 con al menos 5 notas", test: (s) => s.ratedCount >= 5 && s.avgRating <= 6 },
  { id: "total", emoji: "🎬", name: "Cinéfilo total", desc: "20 títulos vistos", test: (s) => s.watchedCount >= 20 },
];

export function computeMedals(stats) {
  return MEDAL_DEFS.map((m) => ({
    id: m.id,
    emoji: m.emoji,
    name: m.name,
    desc: m.desc,
    unlocked: !!m.test(stats),
  }));
}

// Datos listos para el gráfico de pastel de géneros (top 6 + colores)
export function pieDataFromGenres(byGenre) {
  return Object.entries(byGenre || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([g, n]) => {
      const gs = genreStyle(g);
      return { label: g, value: n, color: gs.text, emoji: gs.emoji };
    });
}
