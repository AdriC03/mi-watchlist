import { useState, useEffect } from "react";
import { fetchDetails } from "./details.js";

const ACCENT = "#4DA6FF";
const GOLD = "#FFC24B";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span style={{ color: "#8DA2C0" }}>{label}: </span>
      <span style={{ color: "#D6DEED" }}>{value}</span>
    </p>
  );
}

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n === value ? null : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="text-xl leading-none transition-transform hover:scale-125"
          style={{ color: n <= shown ? GOLD : "#27406E", filter: n <= shown ? "drop-shadow(0 0 4px rgba(255,194,75,0.5))" : "none" }}
          title={`${n}/10`}
        >
          ★
        </button>
      ))}
      {value ? (
        <span className="ml-2 text-sm font-bold" style={{ color: GOLD }}>
          {value}/10
        </span>
      ) : (
        <span className="ml-2 text-xs" style={{ color: "#5D6C88" }}>
          Puntúala
        </span>
      )}
    </div>
  );
}

export default function DetailModal({ item, saved, watched, followed, review, onReview, onSave, onWatch, onFollow, onClose }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(review?.note || "");

  useEffect(() => {
    setNote(review?.note || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

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
      style={{ background: "rgba(3,6,14,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="hero-fade relative w-full max-w-3xl rounded-2xl overflow-hidden my-6"
        style={{ background: "#0D1729", border: "1px solid #27406E" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con imagen */}
        <div className="relative" style={{ minHeight: 200 }}>
          {backdrop && <img src={backdrop} alt="" className="w-full object-cover" style={{ maxHeight: 320 }} />}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, #0D1729 2%, rgba(13,23,41,0.3) 60%, transparent)" }}
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 w-9 h-9 rounded-full text-lg font-bold"
            style={{ background: "rgba(10,12,18,0.8)", color: "#E8EEF8", border: "1px solid #27406E" }}
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
              <p className="text-sm italic" style={{ color: "#A9BAD6" }}>
                {d.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-4">
          {/* Metadatos */}
          <div className="flex flex-wrap gap-2 text-sm items-center">
            {(d?.rating || item.rating) && (
              <span className="font-bold px-2 py-0.5 rounded-full text-xs" style={{ background: "#070D1A", color: GOLD }}>
                ★ {d?.rating || item.rating}
                {d?.votes ? ` (${d.votes.toLocaleString("es-ES")} votos)` : ""}
              </span>
            )}
            {(d?.genres?.length ? d.genres : [item.genre].filter(Boolean)).map((g) => (
              <span key={g} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#16294A", color: "#A9BAD6" }}>
                {g}
              </span>
            ))}
            {duration && (
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#16294A", color: "#A9BAD6" }}>
                {duration}
              </span>
            )}
          </div>

          {/* Sinopsis */}
          {!d && !error && item.tmdbId && (
            <p className="text-sm" style={{ color: "#8DA2C0" }}>
              <span className="spin inline-block mr-2">🎞️</span>Cargando ficha completa…
            </p>
          )}
          {error && (
            <p className="text-sm" style={{ color: "#f3b3b3" }}>
              No se pudo cargar la ficha completa: {error}
            </p>
          )}
          <p className="text-sm leading-relaxed" style={{ color: "#D6DEED" }}>
            {d?.overview || item.description || "Sin descripción disponible."}
          </p>

          <div className="flex flex-col gap-1">
            <Row label="Estreno" value={d?.date && new Date(d.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })} />
          </div>

          {/* Dónde verla */}
          {d?.providers?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#8DA2C0" }}>
                DÓNDE VERLA EN ESPAÑA
              </h3>
              <div className="flex flex-wrap gap-2">
                {d.providers.map((p) => (
                  <span
                    key={p.name}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "#16294A", color: "#E8EEF8" }}
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
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#8DA2C0" }}>
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
                        style={{ background: "#16294A", color: "#5D6C88" }}
                      >
                        👤
                      </div>
                    )}
                    <p className="text-xs leading-tight" style={{ color: "#D6DEED" }}>
                      {c.name}
                    </p>
                    <p className="text-xs leading-tight" style={{ color: "#5D6C88" }}>
                      {c.character}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tu reseña */}
          {onReview && (
            <div className="rounded-xl p-4" style={{ background: "#0A1322", border: "1px solid #1D3157" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#8DA2C0" }}>
                TU RESEÑA
              </h3>
              <StarRating value={review?.rating || null} onChange={(rating) => onReview({ rating })} />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                onBlur={() => onReview({ note: note.trim().slice(0, 500) || null })}
                placeholder="Escribe tu comentario… (se guarda solo)"
                rows={2}
                maxLength={500}
                className="w-full mt-3 text-sm px-3 py-2 rounded-lg outline-none resize-y"
                style={{ background: "#070D1A", border: "1px solid #27406E", color: "#E8EEF8" }}
              />
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
                  ? { background: ACCENT, color: "#04101F" }
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
                  : { background: "transparent", color: "#98A8C4", border: "1px solid #27406E" }
              }
            >
              {watched ? "✓ Ya vista" : "Marcar vista"}
            </button>
            {onFollow && (
              <button
                onClick={onFollow}
                className="text-sm font-semibold px-5 py-2.5 rounded-lg"
                style={
                  followed
                    ? { background: "#155E75", color: "#67E8F9" }
                    : { background: "transparent", color: "#67E8F9", border: "1px solid #27406E" }
                }
              >
                {followed ? "📌 Siguiendo" : "📌 Seguir"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
