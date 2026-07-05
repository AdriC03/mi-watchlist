import { useState, useEffect, useCallback, useRef } from "react";
import { fetchTrending } from "./trending.js";
import { genreStyle } from "./genres.js";
import DetailModal from "./DetailModal.jsx";
import AuthModal from "./AuthModal.jsx";
import { supabase, loadCloudLists, saveCloudLists } from "./supabase.js";

// ---------- Config ----------
const CATS = [
  { key: "movies", label: "Películas", emoji: "🎥" },
  { key: "series", label: "Series", emoji: "📺" },
  { key: "anime", label: "Anime", emoji: "⛩️" },
];

const ACCENT = "#FFC24B";
const ACCENT_DIM = "#8a6a2a";

const STORAGE_LISTS = "watchlist-lists-v1";
// v3: los items de series/anime llevan temporadas/episodios
const STORAGE_TRENDS = "watchlist-trends-v3";

// GIFs animados (emoji animados de Google, CDN estable)
const GIF = (cp) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`;
const GIFS = {
  bailaora: GIF("1f483"),
  fantasma: GIF("1f47b"),
  robot: GIF("1f916"),
  pulpo: GIF("1f419"),
  pinguino: GIF("1f427"),
  fiesta: GIF("1f973"),
  confeti: GIF("1f38a"),
  palomitas: GIF("1f37f"),
};

const readLocalLists = () => {
  try {
    const raw = localStorage.getItem(STORAGE_LISTS);
    if (raw) {
      const d = JSON.parse(raw);
      return { saved: d.saved || [], watched: d.watched || [], following: d.following || [] };
    }
  } catch {
    /* sin datos */
  }
  return { saved: [], watched: [], following: [] };
};

const itemId = (it) => `${(it.title || "").toLowerCase().trim()}::${it.year || ""}`;

const isSeries = (it) => it.kind === "tv" || it.cat === "series" || it.cat === "anime";

const timeAgo = (ts) => {
  if (!ts) return "";
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} día(s)`;
};

const fmtTime = (mins) => {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
};

// Colores de "póster" generados a partir del título
const posterHue = (title) => {
  let h = 0;
  for (let i = 0; i < (title || "").length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return h;
};

// ---------- Distintivo de temática ----------
function GenreBadge({ genre, className = "" }) {
  if (!genre) return null;
  const gs = genreStyle(genre);
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
      style={{ background: gs.bg, color: gs.text }}
    >
      {gs.emoji} {genre}
    </span>
  );
}

// ---------- GIF bailongo ----------
function Dancer({ src, size = 36, className = "", style }) {
  return <img src={src} alt="" width={size} height={size} className={`select-none ${className}`} style={style} loading="lazy" />;
}

function EmptyState({ gif, children }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <Dancer src={gif} size={90} />
      <p className="text-center text-sm max-w-md" style={{ color: "#7c8398" }}>
        {children}
      </p>
    </div>
  );
}

// ---------- Póster (imagen real con degradado de respaldo) ----------
function Poster({ item, className }) {
  const hue = posterHue(item.title);
  const [failed, setFailed] = useState(false);
  if (item.poster && !failed) {
    return (
      <img
        src={item.poster}
        alt={item.title}
        loading="lazy"
        onError={() => setFailed(true)}
        className={className}
      />
    );
  }
  return (
    <div
      className={`${className} flex items-center justify-center`}
      style={{ background: `linear-gradient(135deg, hsl(${hue},45%,22%), hsl(${(hue + 40) % 360},55%,12%))` }}
    >
      <span
        className="text-6xl font-black select-none"
        style={{ color: `hsla(${hue},60%,70%,0.22)`, fontFamily: "'Bebas Neue', sans-serif" }}
      >
        {(item.title || "?").charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// ---------- Componente de tarjeta ----------
function Card({ item, saved, watched, followed, onSave, onWatch, onFollow, onRemove, onOpen }) {
  const meta = [
    item.year,
    item.seasons && `${item.seasons} temporada${item.seasons > 1 ? "s" : ""}`,
    item.episodes && `${item.episodes} caps`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="group rounded-xl overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
      style={{ background: "#151a26", border: "1px solid #232b3d" }}
    >
      <div className="relative overflow-hidden cursor-pointer" style={{ aspectRatio: "2 / 3" }} onClick={onOpen}>
        <Poster item={item} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(12,14,20,0.95), transparent)" }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(8,9,13,0.45)" }}
        >
          <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: ACCENT, color: "#1a1408" }}>
            Ver ficha
          </span>
        </div>
        {item.rating && (
          <span
            className="absolute right-2 top-2 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#0c0e14", color: ACCENT }}
          >
            ★ {item.rating}
          </span>
        )}
        {watched && (
          <span className="absolute left-2 top-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300">
            ✓ Vista
          </span>
        )}
        {item.genre && <GenreBadge genre={item.genre} className="absolute left-2 bottom-2 pointer-events-none" />}
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3
          className="text-base leading-tight tracking-wide cursor-pointer"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3f4f8", letterSpacing: "0.04em" }}
          onClick={onOpen}
        >
          {item.title}
        </h3>
        {meta && (
          <p className="text-xs" style={{ color: "#8b93a7" }}>
            {meta}
          </p>
        )}
        {item.description && (
          <p className="text-xs flex-1 line-clamp-3" style={{ color: "#b6bdcf" }}>
            {item.description}
          </p>
        )}

        <div className="flex gap-1.5 mt-2">
          <button
            onClick={onSave}
            className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors"
            style={
              saved
                ? { background: ACCENT, color: "#1a1408" }
                : { background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_DIM}` }
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
                : { background: "transparent", color: "#9aa3b8", border: "1px solid #2b3448" }
            }
          >
            {watched ? "✓" : "✓ Vista"}
          </button>
          {isSeries(item) && (
            <button
              onClick={onFollow}
              title={followed ? "Dejar de seguir" : "Seguir esta serie (lleva la cuenta de capítulos)"}
              className="text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-colors"
              style={
                followed
                  ? { background: "#1e3a8a", color: "#93c5fd" }
                  : { background: "transparent", color: "#93c5fd", border: "1px solid #2b3448" }
              }
            >
              📌
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              title="Quitar de la lista"
              className="text-xs py-1.5 px-2.5 rounded-lg"
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

// ---------- Apartado visual destacado: el Nº1 del momento a toda pantalla ----------
function Hero({ item, saved, watched, followed, onSave, onWatch, onFollow, onOpen }) {
  if (!item) return null;
  const bg = item.backdrop || item.poster;

  return (
    <div className="hero-fade relative rounded-2xl overflow-hidden mb-6" style={{ minHeight: 360 }}>
      {bg ? (
        <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, hsl(${posterHue(item.title)},45%,18%), #0c0e14)` }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(8,9,13,0.97) 8%, rgba(8,9,13,0.65) 50%, rgba(8,9,13,0.15) 100%), linear-gradient(to right, rgba(8,9,13,0.55), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col justify-end p-6 sm:p-10" style={{ minHeight: 360 }}>
        <span
          className="hero-badge inline-block text-xs font-bold tracking-widest uppercase mb-3 px-3 py-1 rounded-full w-fit"
          style={{ background: ACCENT, color: "#1a1408" }}
        >
          🔥 Nº1 en tendencias ahora mismo
        </span>
        <h2
          className="text-4xl sm:text-6xl mb-2 cursor-pointer"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em", color: "#fff" }}
          onClick={onOpen}
        >
          {item.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {item.genre && <GenreBadge genre={item.genre} />}
          <span className="text-sm" style={{ color: "#c7cbe0" }}>
            {[
              item.year,
              item.seasons && `${item.seasons} temporada${item.seasons > 1 ? "s" : ""}`,
              item.rating && `★ ${item.rating}`,
            ]
              .filter(Boolean)
              .join("   ·   ")}
          </span>
        </div>
        {item.description && (
          <p className="text-sm max-w-2xl mb-5" style={{ color: "#d7dae6" }}>
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onOpen}
            className="text-sm font-semibold px-5 py-2.5 rounded-lg"
            style={{ background: ACCENT, color: "#1a1408" }}
          >
            Ver ficha completa
          </button>
          <button
            onClick={onSave}
            className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            style={
              saved
                ? { background: "rgba(255,194,75,0.25)", color: ACCENT, border: `1px solid ${ACCENT}` }
                : { background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }
            }
          >
            {saved ? "🔖 Guardada" : "🔖 Guardar"}
          </button>
          <button
            onClick={onWatch}
            className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            style={
              watched
                ? { background: "#134e3a", color: "#6ee7b7" }
                : { background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }
            }
          >
            {watched ? "✓ Ya vista" : "Marcar vista"}
          </button>
          {isSeries(item) && (
            <button
              onClick={onFollow}
              className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              style={
                followed
                  ? { background: "#1e3a8a", color: "#93c5fd" }
                  : { background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }
              }
            >
              {followed ? "📌 Siguiendo" : "📌 Seguir"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Fila de "Siguiendo": progreso de capítulos ----------
function FollowRow({ item, onUpdate, onRemove, onWatch, watched, onOpen }) {
  const total = item.episodes || item.totalEp || null;
  const ep = Math.max(0, item.ep || 0);
  const runtime = item.epRuntime || (item.cat === "anime" ? 24 : 45);
  const remaining = total ? Math.max(0, total - ep) : null;
  const pct = total ? Math.min(100, Math.round((ep / total) * 100)) : 0;
  const done = total && ep >= total;

  const setEp = (n) => {
    const v = Math.max(0, total ? Math.min(total, n) : n);
    onUpdate({ ep: v });
  };

  return (
    <div
      className="rounded-xl overflow-hidden flex gap-4 p-4"
      style={{ background: "#151a26", border: `1px solid ${done ? "#134e3a" : "#232b3d"}` }}
    >
      <div className="flex-shrink-0 w-20 sm:w-24 cursor-pointer" onClick={onOpen}>
        <Poster item={item} className="w-full rounded-lg object-cover" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className="text-lg leading-tight tracking-wide cursor-pointer truncate"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3f4f8", letterSpacing: "0.04em" }}
              onClick={onOpen}
            >
              {item.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {item.genre && <GenreBadge genre={item.genre} />}
              <span className="text-xs" style={{ color: "#8b93a7" }}>
                {[
                  item.seasons && `${item.seasons} temporada${item.seasons > 1 ? "s" : ""}`,
                  total && `${total} capítulos`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
          <button
            onClick={onRemove}
            title="Dejar de seguir"
            className="text-xs py-1 px-2 rounded-lg flex-shrink-0"
            style={{ background: "transparent", color: "#7c8398", border: "1px solid #2b3448" }}
          >
            ✕
          </button>
        </div>

        {/* Control de capítulo actual */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: "#8b93a7" }}>
            Voy por el capítulo
          </span>
          <button
            onClick={() => setEp(ep - 1)}
            className="w-7 h-7 rounded-lg text-sm font-bold"
            style={{ background: "#1c2333", color: "#aab1c4", border: "1px solid #2b3448" }}
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={total || undefined}
            value={ep}
            onChange={(e) => setEp(parseInt(e.target.value || "0", 10))}
            className="w-16 text-center text-sm font-bold py-1 rounded-lg outline-none"
            style={{ background: "#0c0e14", border: "1px solid #2b3448", color: ACCENT }}
          />
          <button
            onClick={() => setEp(ep + 1)}
            className="w-7 h-7 rounded-lg text-sm font-bold"
            style={{ background: ACCENT, color: "#1a1408" }}
          >
            +
          </button>
          {total ? (
            <span className="text-xs" style={{ color: "#8b93a7" }}>
              de {total}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "#8b93a7" }}>
              de
              <input
                type="number"
                min={1}
                placeholder="¿total?"
                value={item.totalEp || ""}
                onChange={(e) => onUpdate({ totalEp: parseInt(e.target.value || "0", 10) || null })}
                className="w-16 text-center text-sm py-1 rounded-lg outline-none"
                style={{ background: "#0c0e14", border: "1px solid #2b3448", color: "#e7eaf2" }}
              />
              capítulos
            </span>
          )}
        </div>

        {/* Barra de progreso */}
        {total && (
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#0c0e14" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: done ? "#10b981" : ACCENT }}
            />
          </div>
        )}

        {/* Qué te queda */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {done ? (
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#6ee7b7" }}>
              <Dancer src={GIFS.confeti} size={24} /> ¡Serie terminada!
            </span>
          ) : total ? (
            <span className="text-xs" style={{ color: "#aab1c4" }}>
              Te quedan <b style={{ color: ACCENT }}>{remaining} capítulos</b>
              {" · "}≈ <b style={{ color: ACCENT }}>{fmtTime(remaining * runtime)}</b> para terminarla ({pct}%)
            </span>
          ) : (
            <span className="text-xs" style={{ color: "#7c8398" }}>
              Indica el total de capítulos para calcular cuánto te queda.
            </span>
          )}
          {done && !watched && (
            <button
              onClick={onWatch}
              className="text-xs font-semibold py-1.5 px-3 rounded-lg"
              style={{ background: "#134e3a", color: "#6ee7b7" }}
            >
              ✓ Marcar como vista
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
  const [following, setFollowing] = useState([]);
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [ready, setReady] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCat, setManualCat] = useState("movies");
  const [detailItem, setDetailItem] = useState(null);
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [listCat, setListCat] = useState("all");
  const [listGenre, setListGenre] = useState(null);

  // Sesión de Supabase (si está configurado)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cargar caché de tendencias al iniciar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_TRENDS);
      if (raw) setTrends(JSON.parse(raw));
    } catch {
      /* sin caché */
    }
    setReady(true);
  }, []);

  // Cargar listas: de la nube si hay sesión, de localStorage si no.
  // Solo recarga cuando cambia el USUARIO (los refrescos de token de Supabase
  // emiten nuevos objetos de sesión que no deben machacar el estado actual).
  const loadedUserRef = useRef(undefined);
  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (loadedUserRef.current === uid) return;
    loadedUserRef.current = uid;

    (async () => {
      setSyncError(null);
      if (session?.user && supabase) {
        try {
          const cloud = await loadCloudLists(session.user.id);
          if (loadedUserRef.current !== uid) return; // cambió el usuario mientras cargaba
          if (cloud) {
            setSaved(cloud.saved || []);
            setWatched(cloud.watched || []);
            setFollowing(cloud.following || []);
            if (cloud.following === null) {
              setSyncError(
                'Para sincronizar "Siguiendo" en la nube, ejecuta en el SQL Editor de Supabase: alter table public.watchlists add column if not exists following jsonb not null default \'[]\';'
              );
            }
          } else {
            const local = readLocalLists();
            setSaved(local.saved);
            setWatched(local.watched);
            setFollowing(local.following);
            await saveCloudLists(session.user.id, local.saved, local.watched, local.following);
          }
        } catch (e) {
          if (loadedUserRef.current === uid) setSyncError("Aviso de sincronización: " + (e.message || e));
        }
      } else {
        const local = readLocalLists();
        setSaved(local.saved);
        setWatched(local.watched);
        setFollowing(local.following);
      }
    })();
  }, [session]);

  const persistAll = useCallback(
    (nextSaved, nextWatched, nextFollowing) => {
      if (session?.user && supabase) {
        saveCloudLists(session.user.id, nextSaved, nextWatched, nextFollowing).catch((e) =>
          setSyncError("Aviso de sincronización: " + (e.message || e))
        );
      } else {
        try {
          localStorage.setItem(
            STORAGE_LISTS,
            JSON.stringify({ saved: nextSaved, watched: nextWatched, following: nextFollowing })
          );
        } catch (e) {
          console.error("No se pudo guardar", e);
        }
      }
    },
    [session]
  );

  const persistTrends = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_TRENDS, JSON.stringify(next));
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
  const followingIds = new Set(following.map(itemId));

  const toggleSave = (item) => {
    const id = itemId(item);
    const next = savedIds.has(id) ? saved.filter((s) => itemId(s) !== id) : [...saved, item];
    setSaved(next);
    persistAll(next, watched, following);
  };

  const toggleWatch = (item) => {
    const id = itemId(item);
    const next = watchedIds.has(id) ? watched.filter((w) => itemId(w) !== id) : [...watched, item];
    setWatched(next);
    persistAll(saved, next, following);
  };

  const toggleFollow = (item) => {
    const id = itemId(item);
    const next = followingIds.has(id)
      ? following.filter((f) => itemId(f) !== id)
      : [...following, { ...item, ep: 0 }];
    setFollowing(next);
    persistAll(saved, watched, next);
  };

  const updateFollow = (item, patch) => {
    const id = itemId(item);
    const next = following.map((f) => (itemId(f) === id ? { ...f, ...patch } : f));
    setFollowing(next);
    persistAll(saved, watched, next);
  };

  const addManual = () => {
    const t = manualTitle.trim();
    if (!t) return;
    const item = { title: t, cat: manualCat, year: "", genre: "", description: "" };
    if (!savedIds.has(itemId(item))) {
      const next = [...saved, item];
      setSaved(next);
      persistAll(next, watched, following);
    }
    setManualTitle("");
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const pendingSaved = saved.filter((s) => !watchedIds.has(itemId(s)));

  // Filtros de Mi Lista
  const filteredSaved = pendingSaved.filter((s) => {
    if (listCat !== "all" && s.cat !== listCat) return false;
    if (listGenre && s.genre !== listGenre) return false;
    return true;
  });
  const listGenres = [...new Set(pendingSaved.map((s) => s.genre).filter(Boolean))].sort();

  const TABS = [
    ...CATS,
    { key: "following", label: `Siguiendo (${following.length})`, emoji: "📌" },
    { key: "list", label: `Mi Lista (${pendingSaved.length})`, emoji: "🔖" },
    { key: "seen", label: `Vistas (${watched.length})`, emoji: "✅" },
  ];

  const renderGrid = (items, opts = {}) => (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
      {items.map((it) => {
        const id = itemId(it);
        return (
          <Card
            key={id}
            item={it}
            saved={savedIds.has(id)}
            watched={watchedIds.has(id)}
            followed={followingIds.has(id)}
            onSave={() => toggleSave(it)}
            onWatch={() => toggleWatch(it)}
            onFollow={() => toggleFollow(it)}
            onOpen={() => setDetailItem(it)}
            onRemove={opts.removable ? () => (opts.fromSeen ? toggleWatch(it) : toggleSave(it)) : null}
          />
        );
      })}
    </div>
  );

  const isCatTab = CATS.some((c) => c.key === tab);
  const catData = trends[tab];

  const filterChip = (active, label, onClick) => (
    <button
      key={label}
      onClick={onClick}
      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
      style={
        active
          ? { background: ACCENT, color: "#1a1408" }
          : { background: "#151a26", color: "#aab1c4", border: "1px solid #232b3d" }
      }
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0c0e14", color: "#e7eaf2", fontFamily: "system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
        .marquee-dot { width:6px; height:6px; border-radius:50%; background:${ACCENT}; opacity:.35; }
        .spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes heroFade { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: scale(1); } }
        @keyframes heroBadgePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,194,75,0.5); } 50% { box-shadow: 0 0 0 8px rgba(255,194,75,0); } }
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .hero-fade { animation: heroFade 0.7s ease-out; }
        .hero-badge { animation: heroBadgePulse 2.2s ease-out infinite; }
        .bob { animation: bob 2.4s ease-in-out infinite; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }`}</style>

      {/* Cabecera estilo marquesina */}
      <header className="px-5 pt-6 pb-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-1">
          {[...Array(14)].map((_, i) => (
            <span key={i} className="marquee-dot" style={{ opacity: i % 2 ? 0.15 : 0.4 }} />
          ))}
        </div>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="flex items-end gap-3">
            <div>
              <h1
                className="text-4xl sm:text-5xl tracking-widest"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: ACCENT }}
              >
                MI WATCHLIST
              </h1>
              <p className="text-sm" style={{ color: "#8b93a7" }}>
                Tendencias de cine, series y anime · {saved.length} guardadas · {watched.length} vistas
              </p>
            </div>
            <Dancer src={GIFS.bailaora} size={44} className="bob hidden sm:block" />
            <Dancer src={GIFS.robot} size={44} className="bob hidden sm:block" style={{ animationDelay: "0.4s" }} />
          </div>

          {supabase &&
            (session?.user ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: "#151a26", color: "#aab1c4", border: "1px solid #232b3d" }}
                >
                  👤 {session.user.email}
                </span>
                <button
                  onClick={logout}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: "transparent", color: "#9aa3b8", border: "1px solid #2b3448" }}
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="text-sm font-semibold px-4 py-2 rounded-full"
                style={{ background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_DIM}` }}
              >
                👤 Iniciar sesión
              </button>
            ))}
        </div>
      </header>

      {/* Pestañas */}
      <nav className="max-w-7xl mx-auto w-full px-5 flex gap-2 flex-wrap mb-5">
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

      <main className="max-w-7xl mx-auto w-full px-5 pb-16 flex-1">
        {syncError && (
          <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: "#2a2117", color: "#fbd38d" }}>
            {syncError}
          </div>
        )}

        {/* Pestañas de tendencias */}
        {isCatTab && (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-xs" style={{ color: "#7c8398" }}>
                {catData?.ts
                  ? `${catData.items?.length || 0} títulos · Última actualización: ${timeAgo(catData.ts)}`
                  : "Sin datos todavía"}
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
              <div className="flex flex-col items-center gap-3 py-10 justify-center" style={{ color: "#8b93a7" }}>
                <Dancer src={GIFS.palomitas} size={70} className="bob" />
                Consultando lo más popular ahora mismo…
              </div>
            )}

            {errors[tab] && !loading[tab] && (
              <div className="rounded-lg p-4 mb-4 text-sm" style={{ background: "#2a1717", color: "#f3b3b3" }}>
                {errors[tab]}
              </div>
            )}

            {!loading[tab] && catData?.items?.length > 0 && (
              <>
                <Hero
                  item={catData.items[0]}
                  saved={savedIds.has(itemId(catData.items[0]))}
                  watched={watchedIds.has(itemId(catData.items[0]))}
                  followed={followingIds.has(itemId(catData.items[0]))}
                  onSave={() => toggleSave(catData.items[0])}
                  onWatch={() => toggleWatch(catData.items[0])}
                  onFollow={() => toggleFollow(catData.items[0])}
                  onOpen={() => setDetailItem(catData.items[0])}
                />
                {renderGrid(catData.items.slice(1))}
              </>
            )}
          </>
        )}

        {/* Siguiendo */}
        {tab === "following" &&
          (following.length === 0 ? (
            <EmptyState gif={GIFS.fiesta}>
              No sigues ninguna serie todavía. Pulsa <b style={{ color: "#93c5fd" }}>📌</b> en cualquier serie o anime
              para llevar la cuenta de por qué capítulo vas y saber cuánto te queda para terminarla.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-4 max-w-3xl">
              {following.map((f) => {
                const id = itemId(f);
                return (
                  <FollowRow
                    key={id}
                    item={f}
                    watched={watchedIds.has(id)}
                    onUpdate={(patch) => updateFollow(f, patch)}
                    onRemove={() => toggleFollow(f)}
                    onWatch={() => toggleWatch(f)}
                    onOpen={() => setDetailItem(f)}
                  />
                );
              })}
            </div>
          ))}

        {/* Mi Lista */}
        {tab === "list" && (
          <>
            <div
              className="rounded-xl p-4 mb-4 flex gap-2 flex-wrap items-center"
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

            {/* Filtros por categoría */}
            {pendingSaved.length > 0 && (
              <div className="flex flex-col gap-2 mb-5">
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-xs font-semibold" style={{ color: "#7c8398" }}>
                    CATEGORÍA:
                  </span>
                  {filterChip(listCat === "all", "Todas", () => setListCat("all"))}
                  {CATS.map((c) => filterChip(listCat === c.key, `${c.emoji} Solo ${c.label.toLowerCase()}`, () => setListCat(c.key)))}
                </div>
                {listGenres.length > 0 && (
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-xs font-semibold" style={{ color: "#7c8398" }}>
                      TEMÁTICA:
                    </span>
                    {filterChip(listGenre === null, "Todas", () => setListGenre(null))}
                    {listGenres.map((g) => {
                      const gs = genreStyle(g);
                      return (
                        <button
                          key={g}
                          onClick={() => setListGenre(listGenre === g ? null : g)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                          style={
                            listGenre === g
                              ? { background: gs.text, color: gs.bg }
                              : { background: gs.bg, color: gs.text, border: "1px solid #232b3d" }
                          }
                        >
                          {gs.emoji} {g}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {pendingSaved.length === 0 ? (
              <EmptyState gif={GIFS.pinguino}>
                Tu lista está vacía. Guarda algo desde Tendencias con el botón 🔖 o añádelo a mano arriba.
              </EmptyState>
            ) : filteredSaved.length === 0 ? (
              <EmptyState gif={GIFS.pulpo}>No hay nada en tu lista con esos filtros.</EmptyState>
            ) : (
              renderGrid(filteredSaved, { removable: true })
            )}
          </>
        )}

        {/* Vistas */}
        {tab === "seen" &&
          (watched.length === 0 ? (
            <EmptyState gif={GIFS.fantasma}>
              Aún no has marcado nada como visto. Usa el botón "✓ Vista" en cualquier ficha.
            </EmptyState>
          ) : (
            renderGrid(watched, { removable: true, fromSeen: true })
          ))}
      </main>

      {/* Pie con bailarines */}
      <footer className="py-6 flex flex-col items-center gap-2" style={{ borderTop: "1px solid #171c29" }}>
        <div className="flex items-end gap-4">
          <Dancer src={GIFS.fantasma} size={34} className="bob" />
          <Dancer src={GIFS.bailaora} size={40} className="bob" style={{ animationDelay: "0.3s" }} />
          <Dancer src={GIFS.pulpo} size={34} className="bob" style={{ animationDelay: "0.6s" }} />
          <Dancer src={GIFS.robot} size={40} className="bob" style={{ animationDelay: "0.9s" }} />
          <Dancer src={GIFS.pinguino} size={34} className="bob" style={{ animationDelay: "1.2s" }} />
        </div>
        <p className="text-xs" style={{ color: "#4b5266" }}>
          Hecho con 🍿 · Datos de TMDB
        </p>
      </footer>

      {/* Modal de detalle */}
      {detailItem && (
        <DetailModal
          item={detailItem}
          saved={savedIds.has(itemId(detailItem))}
          watched={watchedIds.has(itemId(detailItem))}
          followed={followingIds.has(itemId(detailItem))}
          onSave={() => toggleSave(detailItem)}
          onWatch={() => toggleWatch(detailItem)}
          onFollow={isSeries(detailItem) ? () => toggleFollow(detailItem) : null}
          onClose={() => setDetailItem(null)}
        />
      )}

      {/* Modal de login */}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
