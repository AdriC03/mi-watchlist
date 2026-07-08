import { useState, useEffect } from "react";
import { fetchHorror, CRITERIA, criterionByKey } from "./horror.js";

const BLOOD = "#e11d2a";
const GIF = (cp) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`;

const idOf = (it) => `${(it.title || "").toLowerCase().trim()}::${it.year || ""}`;

function HorrorCard({ item, rank, saved, watched, onSave, onWatch, onOpen }) {
  const medal = ["🥇", "🥈", "🥉"][rank - 1];
  return (
    <div
      className="group rounded-xl overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1.5"
      style={{ background: "#150809", border: `1px solid ${rank <= 3 ? "#5a121a" : "#2c0d10"}` }}
    >
      <div className="relative overflow-hidden cursor-pointer" style={{ aspectRatio: "2 / 3" }} onClick={onOpen}>
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full" style={{ background: "#2c0d10" }} />
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(8,3,4,0.96), transparent)" }}
        />
        {/* Puesto en el ranking */}
        <span
          className="absolute left-2 top-2 flex items-center gap-1 text-sm font-black px-2 py-0.5 rounded-lg"
          style={{ background: "rgba(8,3,4,0.85)", color: rank <= 3 ? "#fca5a5" : "#e7c9cc", fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {medal || `#${rank}`}
        </span>
        <span
          className="absolute right-2 top-2 text-xs font-black px-2 py-0.5 rounded-full"
          style={{ background: "rgba(8,3,4,0.9)", color: BLOOD }}
        >
          ★ {item.rating}
        </span>
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(8,3,4,0.5)" }}
        >
          <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: BLOOD, color: "#fff" }}>
            Abrir ficha
          </span>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3
          className="text-base leading-tight tracking-wide cursor-pointer"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3e7e8", letterSpacing: "0.04em" }}
          onClick={onOpen}
        >
          {item.title}
        </h3>
        <p className="text-xs" style={{ color: "#b08a8d" }}>
          🎬 {item.year} · avalada por {item.votes.toLocaleString("es-ES")} votos
        </p>
        {item.description && (
          <p className="text-xs flex-1 line-clamp-3" style={{ color: "#c9b0b2" }}>
            {item.description}
          </p>
        )}
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={onSave}
            className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors"
            style={
              saved
                ? { background: BLOOD, color: "#fff" }
                : { background: "transparent", color: "#fca5a5", border: "1px solid #5a121a" }
            }
          >
            {saved ? "🔖" : "🔖 Guardar"}
          </button>
          <button
            onClick={onWatch}
            className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors"
            style={
              watched
                ? { background: "#134e3a", color: "#6ee7b7" }
                : { background: "transparent", color: "#c9b0b2", border: "1px solid #3a1418" }
            }
          >
            {watched ? "✓" : "✓ Vista"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HorrorTab({ saved, watched, onSave, onWatch, onOpen }) {
  const [criterion, setCriterion] = useState("masterpieces");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetchHorror(criterion)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [criterion]);

  const crit = criterionByKey(criterion);
  const top = data?.items?.[0];

  return (
    <div>
      {/* Cabecera de la sección */}
      <div className="relative rounded-2xl overflow-hidden mb-5" style={{ border: "1px solid #3a0d12" }}>
        {top?.backdrop && <img src={top.backdrop} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, #150304 40%, rgba(21,3,4,0.65))" }} />
        <div className="relative p-6 sm:p-8 flex items-center gap-4">
          <img src={GIF("1f480")} alt="" width={64} height={64} className="hidden sm:block" />
          <div>
            <h2
              className="text-4xl sm:text-5xl tracking-wide"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: BLOOD, letterSpacing: "0.05em", textShadow: "0 0 18px rgba(225,29,42,0.55)" }}
            >
              LA CRIPTA
            </h2>
            <p className="text-sm max-w-xl" style={{ color: "#c9b0b2" }}>
              Terror para paladares exigentes. Aquí no entra cualquier susto: solo largometrajes con nota alta{" "}
              <b style={{ color: "#f3e7e8" }}>avalada por miles de votos</b>. Criterio despiadado.
            </p>
          </div>
        </div>
      </div>

      {/* Selector de nivel de exigencia */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CRITERIA.map((c) => (
          <button
            key={c.key}
            onClick={() => setCriterion(c.key)}
            className="text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            style={
              criterion === c.key
                ? { background: BLOOD, color: "#fff" }
                : { background: "#150809", color: "#c9b0b2", border: "1px solid #3a1418" }
            }
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Banner del criterio activo */}
      <div className="rounded-xl p-4 mb-5 flex items-center justify-between gap-3 flex-wrap" style={{ background: "#150809", border: "1px solid #2c0d10" }}>
        <div>
          <p className="text-sm font-bold" style={{ color: "#f3e7e8" }}>
            {crit.emoji} {crit.label} — <span style={{ color: "#b08a8d", fontWeight: 400 }}>{crit.tagline}</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#8f6d70" }}>
            🩸 Filtro: {crit.rule}
          </p>
        </div>
        {data?.items?.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-black" style={{ color: BLOOD, fontFamily: "'Bebas Neue', sans-serif" }}>
              ★ {data.avg.toFixed(2)}
            </p>
            <p className="text-xs" style={{ color: "#8f6d70" }}>
              nota media · {data.items.length} títulos
            </p>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-12" style={{ color: "#b08a8d" }}>
          <img src={GIF("1f47b")} alt="" width={64} height={64} className="bob" />
          Bajando a la cripta…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg p-4 text-sm" style={{ background: "#2a0d10", color: "#f3b3b3" }}>
          {error}
        </div>
      )}

      {!loading && data?.items?.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
          {data.items.map((it, i) => {
            const id = idOf(it);
            return (
              <HorrorCard
                key={`${it.tmdbId}`}
                item={it}
                rank={i + 1}
                saved={saved.has(id)}
                watched={watched.has(id)}
                onSave={() => onSave(it)}
                onWatch={() => onWatch(it)}
                onOpen={() => onOpen(it)}
              />
            );
          })}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <p className="text-center py-10 text-sm" style={{ color: "#b08a8d" }}>
          Ni una sola película supera este criterio ahora mismo. La cripta exige mucho. 💀
        </p>
      )}
    </div>
  );
}
