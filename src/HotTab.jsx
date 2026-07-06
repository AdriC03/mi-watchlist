import { useState, useEffect } from "react";
import { fetchDailyGem, dayNumber } from "./hot.js";
import { genreStyle } from "./genres.js";

const ACCENT = "#4DA6FF";
const GOLD = "#FFC24B";
const GIF = (cp) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`;

const OPENED_KEY = () => `watchnext-hot-opened-${dayNumber()}`;

export default function HotTab({ saved, watched, onSave, onWatch, onOpen }) {
  const [gem, setGem] = useState(null);
  const [error, setError] = useState(null);
  // "closed" → "opening" (animación) → "revealed"
  const [stage, setStage] = useState(() => (localStorage.getItem(OPENED_KEY()) ? "revealed" : "closed"));

  useEffect(() => {
    fetchDailyGem()
      .then(setGem)
      .catch((e) => setError(e.message));
  }, []);

  const open = () => {
    if (stage !== "closed") return;
    setStage("opening");
    setTimeout(() => {
      setStage("revealed");
      try {
        localStorage.setItem(OPENED_KEY(), "1");
      } catch {
        /* nada */
      }
    }, 1600);
  };

  if (error) {
    return (
      <p className="text-center py-12 text-sm" style={{ color: "#f3b3b3" }}>
        {error}
      </p>
    );
  }

  const gs = gem?.genre ? genreStyle(gem.genre) : null;
  const isSaved = gem && saved.has(`${gem.title.toLowerCase().trim()}::${gem.year}`);
  const isWatched = gem && watched.has(`${gem.title.toLowerCase().trim()}::${gem.year}`);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2
          className="text-3xl sm:text-4xl tracking-wide"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#ff6b6b", letterSpacing: "0.05em" }}
        >
          🔥 LA SECCIÓN HOT
        </h2>
        <p className="text-sm" style={{ color: "#8DA2C0" }}>
          Cada día, una joya oculta del cine: películas de culto, infravaloradas y difíciles de encontrar.
        </p>
      </div>

      {/* Regalo cerrado */}
      {stage !== "revealed" && (
        <div className="flex flex-col items-center gap-5 py-8">
          <button
            onClick={open}
            className={stage === "opening" ? "gift-opening" : "gift-idle"}
            style={{ background: "transparent", border: "none", cursor: stage === "closed" ? "pointer" : "default" }}
            title="¡Ábreme!"
          >
            <img src={GIF("1f381")} alt="Regalo sorpresa" width={170} height={170} className="select-none" />
          </button>
          {stage === "opening" ? (
            <div className="flex items-center gap-3 gift-flash">
              <img src={GIF("1f386")} alt="" width={54} height={54} />
              <p className="text-lg font-bold" style={{ color: GOLD }}>
                Desempaquetando la joya de hoy…
              </p>
              <img src={GIF("1f386")} alt="" width={54} height={54} />
            </div>
          ) : (
            <>
              <p className="text-base font-semibold" style={{ color: "#E8EEF8" }}>
                Tu regalo sorpresa de hoy te espera 🎬
              </p>
              <button
                onClick={open}
                className="text-sm font-bold px-8 py-3 rounded-full hero-badge"
                style={{ background: ACCENT, color: "#04101F" }}
              >
                ✨ Abrir el regalo
              </button>
            </>
          )}
        </div>
      )}

      {/* Película revelada */}
      {stage === "revealed" &&
        (gem ? (
          <div className="gift-reveal relative rounded-2xl overflow-hidden" style={{ border: "1px solid #27406E" }}>
            {(gem.backdrop || gem.poster) && (
              <img src={gem.backdrop || gem.poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(4,8,18,0.97) 10%, rgba(4,8,18,0.7) 55%, rgba(4,8,18,0.25) 100%)",
              }}
            />
            <div className="relative flex flex-col sm:flex-row gap-5 p-6 sm:p-8" style={{ minHeight: 340 }}>
              {gem.poster && (
                <img
                  src={gem.poster}
                  alt={gem.title}
                  className="w-36 sm:w-44 rounded-xl self-end shadow-2xl flex-shrink-0"
                  style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                />
              )}
              <div className="flex flex-col justify-end gap-2 min-w-0">
                <span
                  className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full w-fit"
                  style={{ background: "#ff6b6b", color: "#2a0505" }}
                >
                  🎁 La joya oculta de hoy
                </span>
                <h3
                  className="text-3xl sm:text-5xl cursor-pointer"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#fff", letterSpacing: "0.03em" }}
                  onClick={() => onOpen(gem)}
                >
                  {gem.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {gs && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: gs.bg, color: gs.text }}>
                      {gs.emoji} {gem.genre}
                    </span>
                  )}
                  <span className="text-sm" style={{ color: "#C4D0E4" }}>
                    {gem.year} · <span style={{ color: GOLD }}>★ {gem.rating}</span> con solo{" "}
                    {gem.votes?.toLocaleString("es-ES")} votos — poca gente la conoce 🤫
                  </span>
                </div>
                <p className="text-sm max-w-xl" style={{ color: "#D6DEED" }}>
                  {gem.description}
                </p>
                {gem.providers?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-semibold" style={{ color: "#8DA2C0" }}>
                      DÓNDE VERLA:
                    </span>
                    {gem.providers.map((p) => (
                      <span
                        key={p.name}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: "rgba(22,41,74,0.85)", color: "#E8EEF8" }}
                      >
                        {p.logo && <img src={p.logo} alt="" className="w-4 h-4 rounded" />}
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => onOpen(gem)}
                    className="text-sm font-semibold px-4 py-2 rounded-lg"
                    style={{ background: ACCENT, color: "#04101F" }}
                  >
                    Ver ficha completa
                  </button>
                  <button
                    onClick={() => onSave(gem)}
                    className="text-sm font-semibold px-4 py-2 rounded-lg"
                    style={
                      isSaved
                        ? { background: "rgba(77,166,255,0.25)", color: ACCENT, border: `1px solid ${ACCENT}` }
                        : { background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }
                    }
                  >
                    {isSaved ? "🔖 Guardada" : "🔖 Guardar"}
                  </button>
                  <button
                    onClick={() => onWatch(gem)}
                    className="text-sm font-semibold px-4 py-2 rounded-lg"
                    style={
                      isWatched
                        ? { background: "#134e3a", color: "#6ee7b7" }
                        : { background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }
                    }
                  >
                    {isWatched ? "✓ Ya vista" : "Marcar vista"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-10 text-sm" style={{ color: "#8DA2C0" }}>
            <span className="spin inline-block mr-2">🎞️</span>Puliendo la joya de hoy…
          </p>
        ))}

      <p className="text-center text-xs mt-6" style={{ color: "#4D5A75" }}>
        Mañana habrá un regalo nuevo. Vuelve cada día 🎁
      </p>
    </div>
  );
}
