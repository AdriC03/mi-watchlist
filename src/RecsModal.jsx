import { useState, useEffect } from "react";
import { getRecommendations } from "./recommend.js";
import { genreStyle } from "./genres.js";

const ACCENT = "#4DA6FF";
const GOLD = "#FFC24B";
const GIF = (cp) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`;

export default function RecsModal({ watched, following, saved, reviews, savedIds, onSave, onOpen, onClose }) {
  const [recs, setRecs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRecommendations({ watched, following, saved, reviews })
      .then(setRecs)
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(3,6,14,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="hero-fade w-full max-w-2xl rounded-2xl p-6 max-h-[88vh] overflow-y-auto"
        style={{ background: "#0D1729", border: "1px solid #27406E" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-3xl mb-1 tracking-wide"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: ACCENT, letterSpacing: "0.04em" }}
        >
          🎯 Recomendado para ti
        </h2>
        <p className="text-xs mb-4" style={{ color: "#8DA2C0" }}>
          Basado en tus títulos mejor puntuados y lo último que has visto.
        </p>

        {error && (
          <p className="text-sm rounded-lg p-3 mb-3" style={{ background: "#2a2117", color: "#fbd38d" }}>
            {error}
          </p>
        )}

        {!recs && !error && (
          <div className="flex flex-col items-center gap-3 py-10" style={{ color: "#8DA2C0" }}>
            <img src={GIF("1f52e")} alt="" width={70} height={70} />
            Analizando tus gustos…
          </div>
        )}

        {recs?.map((rec) => {
          const gs = genreStyle(rec.genre);
          const id = `${rec.title.toLowerCase().trim()}::${rec.year}`;
          const isSaved = savedIds.has(id);
          return (
            <div
              key={`${rec.kind}-${rec.tmdbId}`}
              className="flex gap-4 rounded-xl p-3.5 mb-3"
              style={{ background: "#0F1B33", border: "1px solid #1D3157" }}
            >
              {rec.poster && (
                <img
                  src={rec.poster}
                  alt={rec.title}
                  className="w-20 sm:w-24 rounded-lg object-cover cursor-pointer flex-shrink-0 self-start"
                  onClick={() => onOpen(rec)}
                />
              )}
              <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                <h3
                  className="text-xl leading-tight tracking-wide cursor-pointer"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3f4f8", letterSpacing: "0.04em" }}
                  onClick={() => onOpen(rec)}
                >
                  {rec.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {rec.genre && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: gs.bg, color: gs.text }}>
                      {gs.emoji} {rec.genre}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "#8DA2C0" }}>
                    {rec.year} · <span style={{ color: GOLD }}>★ {rec.rating}</span>
                  </span>
                </div>
                <p className="text-xs" style={{ color: ACCENT }}>
                  ✨ Porque te gustó «{rec.because}»
                </p>
                {rec.description && (
                  <p className="text-xs line-clamp-3" style={{ color: "#B9C6DC" }}>
                    {rec.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {rec.providers?.length > 0 &&
                    rec.providers.map((p) => (
                      <span
                        key={p.name}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                        style={{ background: "#16294A", color: "#E8EEF8" }}
                      >
                        {p.logo && <img src={p.logo} alt="" className="w-4 h-4 rounded" />}
                        {p.name}
                      </span>
                    ))}
                  <button
                    onClick={() => onSave(rec)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg ml-auto"
                    style={
                      isSaved
                        ? { background: ACCENT, color: "#04101F" }
                        : { background: "transparent", color: ACCENT, border: `1px solid ${ACCENT}66` }
                    }
                  >
                    {isSaved ? "🔖 Guardada" : "🔖 Guardar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={onClose}
          className="w-full text-sm font-semibold py-2.5 rounded-lg mt-1"
          style={{ background: "#16294A", color: "#A9BAD6" }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
