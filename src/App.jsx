import { useState, useEffect, useCallback } from "react";
import { fetchTrending } from "./trending.js";

// ---------- Config ----------
const CATS = [
  { key: "movies", label: "Películas", emoji: "🎥" },
  { key: "series", label: "Series", emoji: "📺" },
  { key: "anime", label: "Anime", emoji: "⛩️" },
];

const ACCENT = "#FFC24B";
const ACCENT_DIM = "#8a6a2a";

const STORAGE_LISTS = "watchlist-lists-v1";
const STORAGE_TRENDS = "watchlist-trends-v1";

// Persistencia real en localStorage (se conserva entre sesiones del navegador)
const storage = {
  async get(key) {
    try {
      return { value: localStorage.getItem(key) };
    } catch {
      return { value: null };
    }
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
};

const itemId = (it) => `${(it.title || "").toLowerCase().trim()}::${it.year || ""}`;

const timeAgo = (ts) => {
  if (!ts) return "";
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} día(s)`;
};

// Colores de "póster" generados a partir del título
const posterHue = (title) => {
  let h = 0;
  for (let i = 0; i < (title || "").length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return h;
};

// ---------- Componente de tarjeta ----------
function Card({ item, saved, watched, onSave, onWatch, onRemove }) {
  const hue = posterHue(item.title);
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ background: "#151a26", border: "1px solid #232b3d" }}
    >
      <div
        className="h-20 flex items-end px-4 pb-2 relative"
        style={{
          background: `linear-gradient(135deg, hsl(${hue},45%,22%), hsl(${(hue + 40) % 360},55%,12%))`,
        }}
      >
        <span
          className="absolute right-3 top-2 text-5xl font-black select-none"
          style={{ color: `hsla(${hue},60%,70%,0.18)`, fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {(item.title || "?").charAt(0).toUpperCase()}
        </span>
        {item.rating && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#0c0e14", color: ACCENT }}
          >
            ★ {item.rating}
          </span>
        )}
        {watched && (
          <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300">
            ✓ Vista
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3
          className="text-lg leading-tight tracking-wide"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3f4f8", letterSpacing: "0.04em" }}
        >
          {item.title}
        </h3>
        <p className="text-xs" style={{ color: "#8b93a7" }}>
          {[item.year, item.genre, item.platform].filter(Boolean).join(" · ")}
        </p>
        {item.description && (
          <p className="text-sm flex-1" style={{ color: "#b6bdcf" }}>
            {item.description}
          </p>
        )}

        <div className="flex gap-2 mt-2">
          <button
            onClick={onSave}
            className="flex-1 text-sm font-semibold py-1.5 rounded-lg transition-colors"
            style={
              saved
                ? { background: ACCENT, color: "#1a1408" }
                : { background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_DIM}` }
            }
          >
            {saved ? "🔖 Guardada" : "🔖 Guardar"}
          </button>
          <button
            onClick={onWatch}
            className="flex-1 text-sm font-semibold py-1.5 rounded-lg transition-colors"
            style={
              watched
                ? { background: "#134e3a", color: "#6ee7b7" }
                : { background: "transparent", color: "#9aa3b8", border: "1px solid #2b3448" }
            }
          >
            {watched ? "✓ Ya vista" : "Marcar vista"}
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              title="Quitar de la lista"
              className="text-sm py-1.5 px-3 rounded-lg"
              style={{ background: "transparent", color: "#7c8398", border: "1px solid #2b3448" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- App principal ----------
export default function App() {
  const [tab, setTab] = useState("movies");
  const [saved, setSaved] = useState([]);
  const [watched, setWatched] = useState([]);
  const [trends, setTrends] = useState({}); // { movies: {items, ts}, ... }
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [ready, setReady] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCat, setManualCat] = useState("movies");

  // Cargar datos guardados al iniciar
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(STORAGE_LISTS);
        if (r?.value) {
          const d = JSON.parse(r.value);
          setSaved(d.saved || []);
          setWatched(d.watched || []);
        }
      } catch (e) {
        /* no hay datos aún */
      }
      try {
        const r = await storage.get(STORAGE_TRENDS);
        if (r?.value) setTrends(JSON.parse(r.value));
      } catch (e) {
        /* no hay caché aún */
      }
      setReady(true);
    })();
  }, []);

  const persistLists = useCallback(async (nextSaved, nextWatched) => {
    try {
      await storage.set(STORAGE_LISTS, JSON.stringify({ saved: nextSaved, watched: nextWatched }));
    } catch (e) {
      console.error("No se pudo guardar", e);
    }
  }, []);

  const persistTrends = useCallback(async (next) => {
    try {
      await storage.set(STORAGE_TRENDS, JSON.stringify(next));
    } catch (e) {
      console.error("No se pudo guardar la caché", e);
    }
  }, []);

  const refresh = useCallback(
    async (catKey) => {
      setLoading((l) => ({ ...l, [catKey]: true }));
      setErrors((e) => ({ ...e, [catKey]: null }));
      try {
        const raw = await fetchTrending(catKey);
        const items = raw.map((it) => ({ ...it, cat: catKey }));
        setTrends((t) => {
          const next = { ...t, [catKey]: { items, ts: Date.now() } };
          persistTrends(next);
          return next;
        });
      } catch (err) {
        setErrors((e) => ({ ...e, [catKey]: err.message || "No se pudieron cargar las tendencias. Pulsa Actualizar para reintentar." }));
      } finally {
        setLoading((l) => ({ ...l, [catKey]: false }));
      }
    },
    [persistTrends]
  );

  // Auto-cargar la pestaña activa si no hay caché
  useEffect(() => {
    if (!ready) return;
    if (CATS.some((c) => c.key === tab) && !trends[tab] && !loading[tab]) {
      refresh(tab);
    }
  }, [ready, tab]); // eslint-disable-line

  const savedIds = new Set(saved.map(itemId));
  const watchedIds = new Set(watched.map(itemId));

  const toggleSave = (item) => {
    const id = itemId(item);
    const next = savedIds.has(id) ? saved.filter((s) => itemId(s) !== id) : [...saved, item];
    setSaved(next);
    persistLists(next, watched);
  };

  const toggleWatch = (item) => {
    const id = itemId(item);
    const next = watchedIds.has(id) ? watched.filter((w) => itemId(w) !== id) : [...watched, item];
    setWatched(next);
    persistLists(saved, next);
  };

  const addManual = () => {
    const t = manualTitle.trim();
    if (!t) return;
    const item = { title: t, cat: manualCat, year: "", genre: CATS.find((c) => c.key === manualCat)?.label, description: "" };
    if (!savedIds.has(itemId(item))) {
      const next = [...saved, item];
      setSaved(next);
      persistLists(next, watched);
    }
    setManualTitle("");
  };

  const pendingSaved = saved.filter((s) => !watchedIds.has(itemId(s)));

  const TABS = [
    ...CATS,
    { key: "list", label: `Mi Lista (${pendingSaved.length})`, emoji: "🔖" },
    { key: "seen", label: `Vistas (${watched.length})`, emoji: "✅" },
  ];

  const renderGrid = (items, opts = {}) => (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
      {items.map((it) => {
        const id = itemId(it);
        return (
          <Card
            key={id}
            item={it}
            saved={savedIds.has(id)}
            watched={watchedIds.has(id)}
            onSave={() => toggleSave(it)}
            onWatch={() => toggleWatch(it)}
            onRemove={opts.removable ? () => (opts.fromSeen ? toggleWatch(it) : toggleSave(it)) : null}
          />
        );
      })}
    </div>
  );

  const isCatTab = CATS.some((c) => c.key === tab);
  const catData = trends[tab];

  return (
    <div className="min-h-screen" style={{ background: "#0c0e14", color: "#e7eaf2", fontFamily: "system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
        .marquee-dot { width:6px; height:6px; border-radius:50%; background:${ACCENT}; opacity:.35; }
        .spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Cabecera estilo marquesina */}
      <header className="px-5 pt-6 pb-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          {[...Array(14)].map((_, i) => (
            <span key={i} className="marquee-dot" style={{ opacity: i % 2 ? 0.15 : 0.4 }} />
          ))}
        </div>
        <h1
          className="text-4xl sm:text-5xl tracking-widest"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: ACCENT }}
        >
          MI WATCHLIST
        </h1>
        <p className="text-sm" style={{ color: "#8b93a7" }}>
          Tendencias de cine, series y anime · {saved.length} guardadas · {watched.length} vistas
        </p>
      </header>

      {/* Pestañas */}
      <nav className="max-w-6xl mx-auto px-5 flex gap-2 flex-wrap mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            style={
              tab === t.key
                ? { background: ACCENT, color: "#1a1408" }
                : { background: "#151a26", color: "#aab1c4", border: "1px solid #232b3d" }
            }
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-5 pb-16">
        {/* Pestañas de tendencias */}
        {isCatTab && (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-xs" style={{ color: "#7c8398" }}>
                {catData?.ts ? `Última actualización: ${timeAgo(catData.ts)}` : "Sin datos todavía"}
              </p>
              <button
                onClick={() => refresh(tab)}
                disabled={!!loading[tab]}
                className="text-sm font-semibold px-4 py-2 rounded-lg"
                style={{ background: loading[tab] ? "#3a3122" : ACCENT, color: "#1a1408" }}
              >
                {loading[tab] ? "Buscando tendencias…" : "🔄 Actualizar"}
              </button>
            </div>

            {loading[tab] && (
              <div className="flex items-center gap-3 py-10 justify-center" style={{ color: "#8b93a7" }}>
                <span className="spin inline-block text-xl">🎞️</span>
                Consultando lo más popular ahora mismo…
              </div>
            )}

            {errors[tab] && !loading[tab] && (
              <div className="rounded-lg p-4 mb-4 text-sm" style={{ background: "#2a1717", color: "#f3b3b3" }}>
                {errors[tab]}
              </div>
            )}

            {!loading[tab] && catData?.items?.length > 0 && renderGrid(catData.items)}
          </>
        )}

        {/* Mi Lista */}
        {tab === "list" && (
          <>
            <div
              className="rounded-xl p-4 mb-5 flex gap-2 flex-wrap items-center"
              style={{ background: "#151a26", border: "1px solid #232b3d" }}
            >
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
                placeholder="Añadir un título a mano…"
                className="flex-1 min-w-40 bg-transparent text-sm px-3 py-2 rounded-lg outline-none"
                style={{ border: "1px solid #2b3448", color: "#e7eaf2" }}
              />
              <select
                value={manualCat}
                onChange={(e) => setManualCat(e.target.value)}
                className="text-sm px-2 py-2 rounded-lg"
                style={{ background: "#0c0e14", border: "1px solid #2b3448", color: "#aab1c4" }}
              >
                {CATS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
              <button
                onClick={addManual}
                className="text-sm font-semibold px-4 py-2 rounded-lg"
                style={{ background: ACCENT, color: "#1a1408" }}
              >
                + Añadir
              </button>
            </div>

            {pendingSaved.length === 0 ? (
              <p className="text-center py-10 text-sm" style={{ color: "#7c8398" }}>
                Tu lista está vacía. Guarda algo desde Tendencias con el botón 🔖 o añádelo a mano arriba.
              </p>
            ) : (
              renderGrid(pendingSaved, { removable: true })
            )}
          </>
        )}

        {/* Vistas */}
        {tab === "seen" &&
          (watched.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: "#7c8398" }}>
              Aún no has marcado nada como visto. Usa el botón "Marcar vista" en cualquier ficha.
            </p>
          ) : (
            renderGrid(watched, { removable: true, fromSeen: true })
          ))}
      </main>
    </div>
  );
}
