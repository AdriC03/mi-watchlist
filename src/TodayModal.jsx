import { useEffect } from "react";

const ACCENT = "#4DA6FF";

const fmtTime = (mins) => {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
};

export default function TodayModal({ following, onPlusOne, onOpen, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Series en marcha (no terminadas), las tocadas más recientemente primero
  const active = following
    .filter((f) => {
      const total = f.episodes || f.totalEp || null;
      return !total || (f.ep || 0) < total;
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const top = active[0];
  const rest = active.slice(1, 4);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(3,6,14,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="hero-fade w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
        style={{ background: "#0D1729", border: "1px solid #27406E" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-3xl mb-1 tracking-wide"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: ACCENT, letterSpacing: "0.04em" }}
        >
          🎬 ¿Qué toca ver hoy?
        </h2>

        {active.length === 0 ? (
          <p className="text-sm py-6" style={{ color: "#8DA2C0" }}>
            No tienes series en marcha. Sigue alguna con 📌 y aquí te diré exactamente qué capítulo te toca.
          </p>
        ) : (
          <>
            <p className="text-xs mb-4" style={{ color: "#8DA2C0" }}>
              Tus series en marcha, las más recientes primero.
            </p>

            {/* La que toca */}
            <div className="rounded-xl overflow-hidden mb-3 relative" style={{ border: `1px solid ${ACCENT}44` }}>
              {(top.backdrop || top.poster) && (
                <img src={top.backdrop || top.poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(4,8,18,0.95) 30%, rgba(4,8,18,0.7))" }} />
              <div className="relative p-4 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: ACCENT }}>
                    ▶ Te toca ahora
                  </p>
                  <h3
                    className="text-2xl leading-tight cursor-pointer truncate"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#fff", letterSpacing: "0.03em" }}
                    onClick={() => onOpen(top)}
                  >
                    {top.title}
                  </h3>
                  <p className="text-sm" style={{ color: "#C4D0E4" }}>
                    Capítulo <b style={{ color: ACCENT }}>{(top.ep || 0) + 1}</b>
                    {top.episodes ? ` de ${top.episodes}` : ""}
                    {top.epRuntime ? ` · ~${fmtTime(top.epRuntime)}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => onPlusOne(top)}
                  className="text-sm font-bold px-4 py-2.5 rounded-lg flex-shrink-0"
                  style={{ background: ACCENT, color: "#04101F" }}
                  title="Marcar este capítulo como visto"
                >
                  ✓ Visto +1
                </button>
              </div>
            </div>

            {/* Las siguientes en cola */}
            {rest.map((f) => (
              <div
                key={`${f.title}-${f.year}`}
                className="flex items-center gap-3 rounded-xl p-3 mb-2"
                style={{ background: "#0F1B33", border: "1px solid #1D3157" }}
              >
                {f.poster && (
                  <img src={f.poster} alt="" className="w-10 rounded object-cover cursor-pointer" onClick={() => onOpen(f)} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate cursor-pointer" style={{ color: "#E8EEF8" }} onClick={() => onOpen(f)}>
                    {f.title}
                  </p>
                  <p className="text-xs" style={{ color: "#8DA2C0" }}>
                    Siguiente: cap {(f.ep || 0) + 1}
                    {f.episodes ? ` de ${f.episodes}` : ""}
                    {f.epRuntime ? ` · ~${fmtTime(f.epRuntime)}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => onPlusOne(f)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: "#16294A", color: ACCENT, border: `1px solid ${ACCENT}44` }}
                >
                  +1
                </button>
              </div>
            ))}
          </>
        )}

        <button
          onClick={onClose}
          className="w-full text-sm font-semibold py-2.5 rounded-lg mt-2"
          style={{ background: "#16294A", color: "#A9BAD6" }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
