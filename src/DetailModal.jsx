import { useState, useEffect } from "react";
import { fetchDetails } from "./details.js";

const ACCENT = "#FFC24B";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span style={{ color: "#8b93a7" }}>{label}: </span>
      <span style={{ color: "#d7dae6" }}>{value}</span>
    </p>
  );
}

export default function DetailModal({ item, saved, watched, onSave, onWatch, onClose }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDetails(null);
    setError(null);
    if (!item?.tmdbId) return;
    let cancelled = false;
    fetchDetails(item.kind, item.tmdbId)
      .then((d) => !cancelled && setDetails(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!item) return null;

  const d = details;
  const backdrop = d?.backdrop || item.backdrop || d?.poster || item.poster;
  const duration = d?.runtime
    ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}min`
    : d?.seasons
      ? `${d.seasons} temporada${d.seasons > 1 ? "s" : ""} · ${d.episodes} episodios`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "rgba(5,6,10,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="hero-fade relative w-full max-w-3xl rounded-2xl overflow-hidden my-6"
        style={{ background: "#12161f", border: "1px solid #2b3448" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con imagen */}
        <div className="relative" style={{ minHeight: 200 }}>
          {backdrop && <img src={backdrop} alt="" className="w-full object-cover" style={{ maxHeight: 320 }} />}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, #12161f 2%, rgba(18,22,31,0.3) 60%, transparent)" }}
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 w-9 h-9 rounded-full text-lg font-bold"
            style={{ background: "rgba(10,12,18,0.8)", color: "#e7eaf2", border: "1px solid #2b3448" }}
            title="Cerrar"
          >
            ✕
          </button>
          <div className="absolute bottom-3 left-5 right-5">
            <h2
              className="text-3xl sm:text-5xl"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em", color: "#fff" }}
            >
              {d?.title || item.title}
            </h2>
            {d?.tagline && (
              <p className="text-sm italic" style={{ color: "#aab1c4" }}>
                {d.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-4">
          {/* Metadatos */}
          <div className="flex flex-wrap gap-2 text-sm items-center">
            {(d?.rating || item.rating) && (
              <span className="font-bold px-2 py-0.5 rounded-full text-xs" style={{ background: "#0c0e14", color: ACCENT }}>
                ★ {d?.rating || item.rating}
                {d?.votes ? ` (${d.votes.toLocaleString("es-ES")} votos)` : ""}
              </span>
            )}
            {(d?.genres?.length ? d.genres : [item.genre].filter(Boolean)).map((g) => (
              <span key={g} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#1c2333", color: "#aab1c4" }}>
                {g}
              </span>
            ))}
            {duration && (
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#1c2333", color: "#aab1c4" }}>
                {duration}
              </span>
            )}
          </div>

          {/* Sinopsis */}
          {!d && !error && item.tmdbId && (
            <p className="text-sm" style={{ color: "#8b93a7" }}>
              <span className="spin inline-block mr-2">🎞️</span>Cargando ficha completa…
            </p>
          )}
          {error && (
            <p className="text-sm" style={{ color: "#f3b3b3" }}>
              No se pudo cargar la ficha completa: {error}
            </p>
          )}
          <p className="text-sm leading-relaxed" style={{ color: "#d7dae6" }}>
            {d?.overview || item.description || "Sin descripción disponible."}
          </p>

          <div className="flex flex-col gap-1">
            <Row label="Estreno" value={d?.date && new Date(d.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })} />
          </div>

          {/* Dónde verla */}
          {d?.providers?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#8b93a7" }}>
                DÓNDE VERLA EN ESPAÑA
              </h3>
              <div className="flex flex-wrap gap-2">
                {d.providers.map((p) => (
                  <span
                    key={p.name}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "#1c2333", color: "#e7eaf2" }}
                  >
                    {p.logo && <img src={p.logo} alt="" className="w-5 h-5 rounded" />}
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reparto */}
          {d?.cast?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#8b93a7" }}>
                REPARTO
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {d.cast.map((c) => (
                  <div key={c.name} className="flex-shrink-0 w-20 text-center">
                    {c.photo ? (
                      <img src={c.photo} alt={c.name} className="w-20 h-20 rounded-full object-cover mb-1" />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-full mb-1 flex items-center justify-center text-2xl"
                        style={{ background: "#1c2333", color: "#5b6478" }}
                      >
                        👤
                      </div>
                    )}
                    <p className="text-xs leading-tight" style={{ color: "#d7dae6" }}>
                      {c.name}
                    </p>
                    <p className="text-xs leading-tight" style={{ color: "#5b6478" }}>
                      {c.character}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-3 pt-1">
            {d?.trailer && (
              <a
                href={d.trailer}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold px-5 py-2.5 rounded-lg"
                style={{ background: "#e33", color: "#fff" }}
              >
                ▶ Ver tráiler
              </a>
            )}
            <button
              onClick={onSave}
              className="text-sm font-semibold px-5 py-2.5 rounded-lg"
              style={
                saved
                  ? { background: ACCENT, color: "#1a1408" }
                  : { background: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }
              }
            >
              {saved ? "🔖 Guardada" : "🔖 Guardar"}
            </button>
            <button
              onClick={onWatch}
              className="text-sm font-semibold px-5 py-2.5 rounded-lg"
              style={
                watched
                  ? { background: "#134e3a", color: "#6ee7b7" }
                  : { background: "transparent", color: "#9aa3b8", border: "1px solid #2b3448" }
              }
            >
              {watched ? "✓ Ya vista" : "Marcar vista"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
