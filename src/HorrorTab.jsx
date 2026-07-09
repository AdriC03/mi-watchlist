import { useState, useEffect } from "react";
import { fetchCrypt, PLATFORMS, QUOTES } from "./horror.js";

const BLOOD = "#e11d2a";
const GIF = (cp) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`;

const idOf = (it) => `${(it.title || "").toLowerCase().trim()}::${it.year || ""}`;

// ---------- Citas míticas rotando ----------
function QuoteRotator() {
  const [i, setI] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI((n) => (n + 1) % QUOTES.length);
        setVisible(true);
      }, 450);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const q = QUOTES[i];
  return (
    <div
      className="transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0, minHeight: 44 }}
    >
      <p className="text-lg sm:text-xl italic" style={{ color: "#f3e7e8", fontFamily: "Georgia, serif" }}>
        «{q.text}»
      </p>
      <p className="text-xs" style={{ color: "#8f6d70" }}>
        — {q.from}
      </p>
    </div>
  );
}

// ---------- Puerta de la Cripta (una vez por sesión) ----------
function CryptGate({ onEnter }) {
  const [opening, setOpening] = useState(false);

  const enter = () => {
    setOpening(true);
    setTimeout(onEnter, 900);
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center px-6 transition-opacity duration-700"
      style={{
        minHeight: 480,
        background: "radial-gradient(ellipse at center, #1c0507 0%, #0a0203 70%)",
        border: "1px solid #3a0d12",
        opacity: opening ? 0 : 1,
      }}
    >
      <div className="crypt-glow absolute inset-0 pointer-events-none" />
      <img src={GIF("1f480")} alt="" width={110} height={110} className="mb-4 bob" />
      <h2
        className="text-5xl sm:text-7xl mb-2 tracking-wide"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          color: BLOOD,
          letterSpacing: "0.08em",
          textShadow: "0 0 30px rgba(225,29,42,0.7), 0 0 60px rgba(225,29,42,0.3)",
        }}
      >
        LA CRIPTA
      </h2>
      <p className="text-sm mb-1 uppercase tracking-widest font-bold" style={{ color: "#b08a8d" }}>
        Club privado del terror · Solo paladares exigentes
      </p>
      <div className="my-5 max-w-md">
        <QuoteRotator />
      </div>
      <button
        onClick={enter}
        disabled={opening}
        className="crypt-button text-base font-black px-10 py-3.5 rounded-full uppercase tracking-widest"
        style={{ background: BLOOD, color: "#fff", boxShadow: "0 0 30px rgba(225,29,42,0.5)" }}
      >
        {opening ? "Abriendo…" : "🩸 Entra si te atreves"}
      </button>
      <p className="text-xs mt-4" style={{ color: "#5c3a3d" }}>
        Aquí no entra cualquier susto: solo notas altas avaladas por miles de votos.
      </p>
    </div>
  );
}

// ---------- Tarjeta de fila horizontal (estilo Netflix) ----------
function RowCard({ item, rank, saved, watched, onSave, onWatch, onOpen }) {
  return (
    <div className="flex-shrink-0 relative group cursor-pointer" style={{ width: 154 }}>
      {/* Número gigante para el podio, estilo TOP 10 */}
      {rank <= 3 && (
        <span
          className="absolute -left-3 -bottom-2 z-10 text-7xl font-black pointer-events-none select-none"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: "#0a0203",
            WebkitTextStroke: `2.5px ${BLOOD}`,
            textShadow: "0 0 18px rgba(225,29,42,0.4)",
            lineHeight: 1,
          }}
        >
          {rank}
        </span>
      )}
      <div
        className="rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-105 group-hover:z-20"
        style={{ border: "1px solid #2c0d10", aspectRatio: "2 / 3", background: "#150809" }}
        onClick={onOpen}
      >
        {item.poster && (
          <img src={item.poster} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
        )}
        <div
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5"
          style={{ background: "linear-gradient(to top, rgba(8,3,4,0.97) 25%, rgba(8,3,4,0.35))" }}
        >
          <p className="text-sm font-bold leading-tight mb-0.5" style={{ color: "#f3e7e8", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}>
            {item.title}
          </p>
          <p className="text-xs mb-1.5" style={{ color: "#b08a8d" }}>
            {item.year} · <span style={{ color: BLOOD, fontWeight: 700 }}>★ {item.rating}</span> ·{" "}
            {(item.votes / 1000).toFixed(1).replace(".0", "")}K votos
          </p>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              title={saved ? "Guardada" : "Guardar"}
              className="flex-1 text-xs font-bold py-1 rounded"
              style={saved ? { background: BLOOD, color: "#fff" } : { background: "rgba(255,255,255,0.12)", color: "#fff" }}
            >
              {saved ? "🔖" : "+ Lista"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWatch();
              }}
              title={watched ? "Vista" : "Marcar vista"}
              className="flex-1 text-xs font-bold py-1 rounded"
              style={watched ? { background: "#134e3a", color: "#6ee7b7" } : { background: "rgba(255,255,255,0.12)", color: "#fff" }}
            >
              ✓
            </button>
          </div>
        </div>
        {watched && (
          <span
            className="absolute right-1.5 top-1.5 text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(19,78,58,0.9)", color: "#6ee7b7" }}
          >
            ✓
          </span>
        )}
      </div>
    </div>
  );
}

// ---------- Fila horizontal por criterio ----------
function CryptRow({ row, savedIds, watchedIds, onSave, onWatch, onOpen }) {
  return (
    <div className="mb-7">
      <div className="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h3
            className="text-2xl tracking-wide"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3e7e8", letterSpacing: "0.05em" }}
          >
            {row.emoji} {row.label}
          </h3>
          <span className="text-xs hidden sm:inline" style={{ color: "#8f6d70" }}>
            {row.tagline}
          </span>
        </div>
        {row.items.length > 0 && (
          <span className="text-xs font-bold" style={{ color: BLOOD }}>
            ★ {row.avg.toFixed(2)} de media · {row.items.length} elegidas
          </span>
        )}
      </div>
      <p className="text-xs mb-2.5" style={{ color: "#5c3a3d" }}>
        🩸 {row.rule}
      </p>

      {row.items.length === 0 ? (
        <div
          className="rounded-xl p-5 text-sm"
          style={{ background: "#150809", border: "1px dashed #3a1418", color: "#8f6d70" }}
        >
          💀 Ni una sola supera este listón en esa plataforma. La Cripta no rebaja el criterio: cambia de plataforma o
          de nivel.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 pl-4 -ml-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#3a1418 transparent" }}>
          {row.items.map((it, i) => {
            const id = idOf(it);
            return (
              <RowCard
                key={it.tmdbId}
                item={it}
                rank={i + 1}
                saved={savedIds.has(id)}
                watched={watchedIds.has(id)}
                onSave={() => onSave(it)}
                onWatch={() => onWatch(it)}
                onOpen={() => onOpen(it)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Billboard (héroe estilo Netflix) ----------
function Billboard({ item, saved, watched, onSave, onWatch, onOpen }) {
  if (!item) return null;
  return (
    <div className="relative rounded-2xl overflow-hidden mb-7" style={{ minHeight: 380, border: "1px solid #3a0d12" }}>
      {(item.backdrop || item.poster) && (
        <img src={item.backdrop || item.poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(8,2,3,0.98) 8%, rgba(8,2,3,0.55) 55%, rgba(8,2,3,0.25)), linear-gradient(to right, rgba(8,2,3,0.8), transparent 65%)",
        }}
      />
      <div className="relative flex flex-col justify-end p-6 sm:p-10" style={{ minHeight: 380 }}>
        <span
          className="inline-block text-xs font-black tracking-widest uppercase mb-3 px-3 py-1 rounded w-fit"
          style={{ background: BLOOD, color: "#fff" }}
        >
          👑 Nº1 de la Cripta
        </span>
        <h2
          className="text-5xl sm:text-7xl mb-2 cursor-pointer"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: "#fff",
            letterSpacing: "0.04em",
            textShadow: "0 4px 30px rgba(0,0,0,0.8)",
          }}
          onClick={onOpen}
        >
          {item.title}
        </h2>
        <p className="text-sm mb-2" style={{ color: "#e7c9cc" }}>
          {item.year} · <b style={{ color: BLOOD }}>★ {item.rating}</b> avalada por{" "}
          {item.votes.toLocaleString("es-ES")} almas
        </p>
        <p className="text-sm max-w-xl mb-5 line-clamp-3" style={{ color: "#d9c2c4" }}>
          {item.description}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onOpen}
            className="text-sm font-black px-6 py-2.5 rounded uppercase tracking-wide"
            style={{ background: "#fff", color: "#0a0203" }}
          >
            ▶ Ver ficha
          </button>
          <button
            onClick={onSave}
            className="text-sm font-bold px-5 py-2.5 rounded"
            style={
              saved
                ? { background: BLOOD, color: "#fff" }
                : { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)" }
            }
          >
            {saved ? "🔖 En tu lista" : "+ Mi lista"}
          </button>
          <button
            onClick={onWatch}
            className="text-sm font-bold px-5 py-2.5 rounded"
            style={
              watched
                ? { background: "#134e3a", color: "#6ee7b7" }
                : { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)" }
            }
          >
            {watched ? "✓ Vista" : "✓ Marcar vista"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- La Cripta ----------
export default function HorrorTab({ saved, watched, onSave, onWatch, onOpen }) {
  const [entered, setEntered] = useState(() => sessionStorage.getItem("crypt-entered") === "1");
  const [platform, setPlatform] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entered) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCrypt(platform)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [entered, platform]);

  const enter = () => {
    try {
      sessionStorage.setItem("crypt-entered", "1");
    } catch {
      /* sin sesión */
    }
    setEntered(true);
  };

  if (!entered) return <CryptGate onEnter={enter} />;

  const billboardItem = rows?.find((r) => r.items.length > 0)?.items[0] || null;
  const billboardId = billboardItem ? idOf(billboardItem) : null;
  const activePlatform = PLATFORMS.find((p) => p.key === platform);

  return (
    <div className="crypt-enter">
      {/* Cabecera con cita rotando */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <img src={GIF("1f480")} alt="" width={46} height={46} />
          <div>
            <h2
              className="text-3xl tracking-wide leading-none"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                color: BLOOD,
                letterSpacing: "0.07em",
                textShadow: "0 0 18px rgba(225,29,42,0.5)",
              }}
            >
              LA CRIPTA
            </h2>
            <p className="text-xs uppercase tracking-widest" style={{ color: "#8f6d70" }}>
              Club privado del terror
            </p>
          </div>
        </div>
        <div className="max-w-sm text-right hidden md:block">
          <QuoteRotator />
        </div>
      </div>

      {/* Filtro de plataformas */}
      <div className="flex gap-2 flex-wrap items-center mb-6">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8f6d70" }}>
          📡 ¿Dónde pagas tus vicios?
        </span>
        <button
          onClick={() => setPlatform(null)}
          className="text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors"
          style={
            !platform
              ? { background: BLOOD, color: "#fff" }
              : { background: "#150809", color: "#c9b0b2", border: "1px solid #3a1418" }
          }
        >
          Todas
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPlatform(platform === p.key ? null : p.key)}
            className="text-xs font-bold px-3.5 py-1.5 rounded-full transition-all"
            style={
              platform === p.key
                ? { background: p.color, color: "#0a0203", boxShadow: `0 0 14px ${p.color}66` }
                : { background: "#150809", color: p.color, border: `1px solid ${p.color}44` }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {activePlatform && (
        <p className="text-xs mb-4 -mt-3" style={{ color: "#8f6d70" }}>
          Mostrando solo lo que puedes ver <b style={{ color: activePlatform.color }}>hoy en {activePlatform.label}</b>{" "}
          (España). El listón no baja.
        </p>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-4 py-16" style={{ color: "#b08a8d" }}>
          <img src={GIF("1f47b")} alt="" width={70} height={70} className="bob" />
          <QuoteRotator />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg p-4 text-sm" style={{ background: "#2a0d10", color: "#f3b3b3" }}>
          {error}
        </div>
      )}

      {!loading && rows && (
        <>
          <Billboard
            item={billboardItem}
            saved={billboardId ? saved.has(billboardId) : false}
            watched={billboardId ? watched.has(billboardId) : false}
            onSave={() => onSave(billboardItem)}
            onWatch={() => onWatch(billboardItem)}
            onOpen={() => onOpen(billboardItem)}
          />
          {rows.map((row) => (
            <CryptRow
              key={row.key}
              row={row}
              savedIds={saved}
              watchedIds={watched}
              onSave={onSave}
              onWatch={onWatch}
              onOpen={onOpen}
            />
          ))}
          <p className="text-center text-xs mt-2" style={{ color: "#5c3a3d" }}>
            💀 La Cripta no acepta sobornos: si no está aquí, es que no lo merece.
          </p>
        </>
      )}
    </div>
  );
}
