// Estilo visual por temática: emoji + colores para que se vea de un vistazo
// de qué va cada película/serie/anime.

const GENRE_STYLES = [
  { match: ["terror"], emoji: "👻", bg: "#3b0d0d", text: "#fda4af" },
  { match: ["suspense"], emoji: "😱", bg: "#2e1065", text: "#d8b4fe" },
  { match: ["misterio"], emoji: "🕵️", bg: "#1e1b4b", text: "#a5b4fc" },
  { match: ["comedia"], emoji: "😂", bg: "#422006", text: "#fde047" },
  { match: ["acción", "accion"], emoji: "💥", bg: "#431407", text: "#fdba74" },
  { match: ["romance", "telenovela"], emoji: "💖", bg: "#500724", text: "#f9a8d4" },
  { match: ["ciencia ficción", "ciencia ficcion"], emoji: "🚀", bg: "#083344", text: "#67e8f9" },
  { match: ["fantasía", "fantasia"], emoji: "🐉", bg: "#2e1065", text: "#c4b5fd" },
  { match: ["drama"], emoji: "🎭", bg: "#172554", text: "#93c5fd" },
  { match: ["animación", "animacion"], emoji: "✨", bg: "#312e81", text: "#c7d2fe" },
  { match: ["aventura"], emoji: "🗺️", bg: "#052e16", text: "#86efac" },
  { match: ["crimen"], emoji: "🔪", bg: "#450a0a", text: "#fca5a5" },
  { match: ["documental"], emoji: "🎬", bg: "#1c1917", text: "#d6d3d1" },
  { match: ["familiar", "infantil"], emoji: "🧸", bg: "#431407", text: "#fed7aa" },
  { match: ["música", "musica"], emoji: "🎵", bg: "#3b0764", text: "#e9d5ff" },
  { match: ["bélica", "belica", "guerra"], emoji: "⚔️", bg: "#292524", text: "#d6d3d1" },
  { match: ["western"], emoji: "🤠", bg: "#451a03", text: "#fcd34d" },
  { match: ["historia"], emoji: "🏛️", bg: "#1c1917", text: "#e7e5e4" },
  { match: ["reality", "talk"], emoji: "📣", bg: "#164e63", text: "#a5f3fc" },
  { match: ["noticias"], emoji: "📰", bg: "#1c1917", text: "#d6d3d1" },
];

const DEFAULT_STYLE = { emoji: "🎞️", bg: "#1c2333", text: "#aab1c4" };

export function genreStyle(genre) {
  if (!genre) return DEFAULT_STYLE;
  const g = genre.toLowerCase();
  return GENRE_STYLES.find((s) => s.match.some((m) => g.includes(m))) || DEFAULT_STYLE;
}
