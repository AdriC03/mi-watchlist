import { useState, useEffect, useCallback, useRef } from "react";
import { fetchTrending, fetchTvFacts } from "./trending.js";
import { searchTMDB } from "./search.js";
import { checkNewEpisodes } from "./notifications.js";
import { genreStyle } from "./genres.js";
import DetailModal from "./DetailModal.jsx";
import AuthModal from "./AuthModal.jsx";
import StatsTab from "./StatsTab.jsx";
import HotTab from "./HotTab.jsx";
import HorrorTab from "./HorrorTab.jsx";
import TodayModal from "./TodayModal.jsx";
import RecsModal from "./RecsModal.jsx";
import SwipeModal from "./SwipeModal.jsx";
import SharedProfile from "./SharedProfile.jsx";
import { useFacts, effectiveDuration, factKey, fetchFacts } from "./facts.js";
import { usernameFromId, guestUsername } from "./username.js";
import { computeCineStats, computeMedals } from "./medals.js";
import { supabase, loadCloudLists, saveCloudLists, publishProfile } from "./supabase.js";

// ---------- Config ----------
const CATS = [
  { key: "movies", label: "Películas", emoji: "🎥" },
  { key: "series", label: "Series", emoji: "📺" },
  { key: "anime", label: "Anime", emoji: "⛩️" },
];
const CAT_EMOJI = { movies: "🎥", series: "📺", anime: "⛩️" };

const ACCENT = "#4DA6FF";
const GOLD = "#FFC24B";
const ACCENT_DIM = "#2A5C99";

const STORAGE_LISTS = "watchlist-lists-v1";
const STORAGE_TRENDS = "watchlist-trends-v3";
const STORAGE_NOTIFS = "watchnext-notifs-v1";

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
      return { saved: d.saved || [], watched: d.watched || [], following: d.following || [], reviews: d.reviews || {} };
    }
  } catch {
    /* sin datos */
  }
  return { saved: [], watched: [], following: [], reviews: {} };
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

// ---------- Logo ----------
function Logo() {
  return (
    <h1 className="text-4xl sm:text-5xl tracking-widest select-none" style={{ fontFamily: "'Bebas Neue', sans-serif", color: ACCENT }}>
      WATCHNEX
      <span
        className="inline-block"
        style={{
          fontFamily: "'Pacifico', cursive",
          fontSize: "0.92em",
          letterSpacing: 0,
          marginLeft: "3px",
          transform: "rotate(-8deg) translateY(5px)",
          background: "linear-gradient(135deg, #4DA6FF 15%, #6366F1 60%, #A78BFA)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textTransform: "lowercase",
          filter: "drop-shadow(0 2px 8px rgba(99,102,241,0.55))",
        }}
      >
        t
      </span>
    </h1>
  );
}

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
      <p className="text-center text-sm max-w-md" style={{ color: "#7D8BA6" }}>
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
function Card({ item, saved, watched, followed, userRating, onSave, onWatch, onFollow, onRemove, onOpen }) {
  const meta = [
    CAT_EMOJI[item.cat],
    item.year,
    item.seasons && `${item.seasons} temporada${item.seasons > 1 ? "s" : ""}`,
    item.episodes && `${item.episodes} caps`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="group rounded-xl overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
      style={{ background: "#0F1B33", border: "1px solid #1D3157" }}
    >
      <div className="relative overflow-hidden cursor-pointer" style={{ aspectRatio: "2 / 3" }} onClick={onOpen}>
        <Poster item={item} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(7,13,26,0.95), transparent)" }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(4,8,18,0.45)" }}
        >
          <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: ACCENT, color: "#04101F" }}>
            Ver ficha
          </span>
        </div>
        {item.rating && (
          <span
            className="absolute right-2 top-2 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#070D1A", color: GOLD }}
          >
            ★ {item.rating}
          </span>
        )}
        {userRating && (
          <span
            className="absolute right-2 top-9 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#070D1A", color: "#f9a8d4" }}
            title="Tu nota"
          >
            Tú: ★ {userRating}
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
          <p className="text-xs" style={{ color: "#8DA2C0" }}>
            {meta}
          </p>
        )}
        {item.description && (
          <p className="text-xs flex-1 line-clamp-3" style={{ color: "#B9C6DC" }}>
            {item.description}
          </p>
        )}

        <div className="flex gap-1.5 mt-2">
          <button
            onClick={onSave}
            className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors"
            style={
              saved
                ? { background: ACCENT, color: "#04101F" }
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
                : { background: "transparent", color: "#98A8C4", border: "1px solid #27406E" }
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
                  ? { background: "#155E75", color: "#67E8F9" }
                  : { background: "transparent", color: "#67E8F9", border: "1px solid #27406E" }
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
              style={{ background: "transparent", color: "#7D8BA6", border: "1px solid #27406E" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Apartado visual destacado ----------
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
          style={{ background: `linear-gradient(135deg, hsl(${posterHue(item.title)},45%,18%), #070D1A)` }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(4,8,18,0.97) 8%, rgba(4,8,18,0.65) 50%, rgba(4,8,18,0.15) 100%), linear-gradient(to right, rgba(4,8,18,0.55), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col justify-end p-6 sm:p-10" style={{ minHeight: 360 }}>
        <span
          className="hero-badge inline-block text-xs font-bold tracking-widest uppercase mb-3 px-3 py-1 rounded-full w-fit"
          style={{ background: ACCENT, color: "#04101F" }}
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
          <span className="text-sm" style={{ color: "#C4D0E4" }}>
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
          <p className="text-sm max-w-2xl mb-5" style={{ color: "#D6DEED" }}>
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onOpen}
            className="text-sm font-semibold px-5 py-2.5 rounded-lg"
            style={{ background: ACCENT, color: "#04101F" }}
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
                  ? { background: "#155E75", color: "#67E8F9" }
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

// ---------- Fila de "Siguiendo" ----------
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
      style={{ background: "#0F1B33", border: `1px solid ${done ? "#134e3a" : "#1D3157"}` }}
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
              <span className="text-xs" style={{ color: "#8DA2C0" }}>
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
            style={{ background: "transparent", color: "#7D8BA6", border: "1px solid #27406E" }}
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: "#8DA2C0" }}>
            Voy por el capítulo
          </span>
          <button
            onClick={() => setEp(ep - 1)}
            className="w-7 h-7 rounded-lg text-sm font-bold"
            style={{ background: "#16294A", color: "#A9BAD6", border: "1px solid #27406E" }}
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
            style={{ background: "#070D1A", border: "1px solid #27406E", color: ACCENT }}
          />
          <button
            onClick={() => setEp(ep + 1)}
            className="w-7 h-7 rounded-lg text-sm font-bold"
            style={{ background: ACCENT, color: "#04101F" }}
          >
            +
          </button>
          {total ? (
            <span className="text-xs" style={{ color: "#8DA2C0" }}>
              de {total}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "#8DA2C0" }}>
              de
              <input
                type="number"
                min={1}
                placeholder="¿total?"
                value={item.totalEp || ""}
                onChange={(e) => onUpdate({ totalEp: parseInt(e.target.value || "0", 10) || null })}
                className="w-16 text-center text-sm py-1 rounded-lg outline-none"
                style={{ background: "#070D1A", border: "1px solid #27406E", color: "#E8EEF8" }}
              />
              capítulos
            </span>
          )}
        </div>

        {total && (
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#070D1A" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: done ? "#10b981" : ACCENT }}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {done ? (
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#6ee7b7" }}>
              <Dancer src={GIFS.confeti} size={24} /> ¡Serie terminada!
            </span>
          ) : total ? (
            <span className="text-xs" style={{ color: "#A9BAD6" }}>
              Te quedan <b style={{ color: ACCENT }}>{remaining} capítulos</b>
              {" · "}≈ <b style={{ color: ACCENT }}>{fmtTime(remaining * runtime)}</b> para terminarla ({pct}%)
            </span>
          ) : (
            <span className="text-xs" style={{ color: "#7D8BA6" }}>
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

// ---------- Modal de compartir ----------
function ShareModal({ info, onClose }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bloqueado */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(3,6,14,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="hero-fade w-full max-w-md rounded-2xl p-6"
        style={{ background: "#0D1729", border: "1px solid #27406E" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl mb-1 tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif", color: ACCENT }}>
          🔗 Tu lista pública
        </h2>
        <p className="text-xs mb-4" style={{ color: "#8DA2C0" }}>
          Cualquiera con este enlace verá tus {info.count} títulos puntuados, con tus imprescindibles (9-10) destacados.
          Se actualiza cada vez que pulsas Compartir.
        </p>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-3"
          style={{ background: "#070D1A", border: "1px solid #27406E" }}
        >
          <span className="text-xs truncate flex-1" style={{ color: "#A9BAD6" }}>
            {info.link}
          </span>
          <button
            onClick={copy}
            className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: copied ? "#134e3a" : ACCENT, color: copied ? "#6ee7b7" : "#04101F" }}
          >
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent("Mira mi watchlist de pelis y series 🍿 " + info.link)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm font-semibold py-2.5 rounded-lg mb-2"
          style={{ background: "#128C7E", color: "#fff" }}
        >
          💬 Compartir por WhatsApp
        </a>
        <button
          onClick={onClose}
          className="w-full text-sm font-semibold py-2.5 rounded-lg"
          style={{ background: "#16294A", color: "#A9BAD6" }}
        >
          Cerrar
        </button>
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
  const [reviews, setReviews] = useState({});
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [ready, setReady] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [listCat, setListCat] = useState("all");
  const [listGenre, setListGenre] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notifs, setNotifs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_NOTIFS)) || [];
    } catch {
      return [];
    }
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);
  const [swipeOpen, setSwipeOpen] = useState(false);
  const [shareInfo, setShareInfo] = useState(null);
  const [listDuration, setListDuration] = useState(null);
  const [listPlatform, setListPlatform] = useState(null);
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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
            setReviews(cloud.reviews || {});
            const missing = ["following", "reviews"].filter((c) => cloud[c] === null);
            if (missing.length) {
              setSyncError(
                `Para sincronizarlo todo en la nube, ejecuta en el SQL Editor de Supabase: ${missing
                  .map((c) => `alter table public.watchlists add column if not exists ${c} jsonb not null default '${c === "reviews" ? "{}" : "[]"}';`)
                  .join(" ")}`
              );
            }
          } else {
            const local = readLocalLists();
            setSaved(local.saved);
            setWatched(local.watched);
            setFollowing(local.following);
            setReviews(local.reviews);
            await saveCloudLists(session.user.id, local.saved, local.watched, local.following, local.reviews);
          }
        } catch (e) {
          if (loadedUserRef.current === uid) setSyncError("Aviso de sincronización: " + (e.message || e));
        }
      } else {
        const local = readLocalLists();
        setSaved(local.saved);
        setWatched(local.watched);
        setFollowing(local.following);
        setReviews(local.reviews);
      }
    })();
  }, [session]);

  const persistAll = useCallback(
    (nextSaved, nextWatched, nextFollowing, nextReviews) => {
      if (session?.user && supabase) {
        saveCloudLists(session.user.id, nextSaved, nextWatched, nextFollowing, nextReviews).catch((e) =>
          setSyncError("Aviso de sincronización: " + (e.message || e))
        );
      } else {
        try {
          localStorage.setItem(
            STORAGE_LISTS,
            JSON.stringify({ saved: nextSaved, watched: nextWatched, following: nextFollowing, reviews: nextReviews })
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

  // Buscador con debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchTMDB(q)
        .then((r) => setSearchResults(r))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // Comprobar episodios nuevos de las series seguidas (una vez por carga)
  const notifCheckedRef = useRef(false);
  useEffect(() => {
    if (notifCheckedRef.current || following.length === 0) return;
    notifCheckedRef.current = true;
    checkNewEpisodes(following)
      .then(({ notifications, updates }) => {
        if (updates.length) {
          // Actualiza temporadas/episodios en memoria (se persiste al pulsar
          // "marcar leídas" o con el siguiente cambio que hagas)
          setFollowing((prev) =>
            prev.map((f) => {
              const u = updates.find((x) => x.tmdbId === f.tmdbId);
              return u ? { ...f, ...u } : f;
            })
          );
        }
        if (notifications.length) {
          setNotifs((prev) => {
            const ids = new Set(prev.map((n) => n.id));
            const merged = [...notifications.filter((n) => !ids.has(n.id)), ...prev].slice(0, 20);
            try {
              localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(merged));
            } catch {
              /* sin espacio */
            }
            return merged;
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following]);

  const clearNotifs = () => {
    setNotifs([]);
    setNotifOpen(false);
    try {
      localStorage.setItem(STORAGE_NOTIFS, "[]");
    } catch {
      /* nada */
    }
    persistAll(saved, watched, following, reviews);
  };

  const savedIds = new Set(saved.map(itemId));
  const watchedIds = new Set(watched.map(itemId));
  const followingIds = new Set(following.map(itemId));

  const toggleSave = (item) => {
    const id = itemId(item);
    const next = savedIds.has(id) ? saved.filter((s) => itemId(s) !== id) : [...saved, item];
    setSaved(next);
    persistAll(next, watched, following, reviews);
  };

  const toggleWatch = (item) => {
    const id = itemId(item);
    const next = watchedIds.has(id) ? watched.filter((w) => itemId(w) !== id) : [...watched, item];
    setWatched(next);
    persistAll(saved, next, following, reviews);
  };

  const toggleFollow = (item) => {
    const id = itemId(item);
    if (followingIds.has(id)) {
      const next = following.filter((f) => itemId(f) !== id);
      setFollowing(next);
      persistAll(saved, watched, next, reviews);
      return;
    }
    const next = [...following, { ...item, ep: 0, updatedAt: Date.now() }];
    setFollowing(next);
    persistAll(saved, watched, next, reviews);
    // Si viene del buscador y no trae nº de capítulos, complétalo de TMDB
    if (item.kind === "tv" && item.tmdbId && !item.episodes) {
      fetchTvFacts(item.tmdbId)
        .then((facts) => {
          setFollowing((prev) => {
            const upd = prev.map((f) => (itemId(f) === id ? { ...f, ...facts } : f));
            persistAll(saved, watched, upd, reviews);
            return upd;
          });
        })
        .catch(() => {});
    }
  };

  const updateFollow = (item, patch) => {
    const id = itemId(item);
    const next = following.map((f) => (itemId(f) === id ? { ...f, ...patch, updatedAt: Date.now() } : f));
    setFollowing(next);
    persistAll(saved, watched, next, reviews);
  };

  const setReview = (item, patch) => {
    const id = itemId(item);
    const merged = { ...(reviews[id] || {}), ...patch, title: item.title, year: item.year };
    const next = { ...reviews };
    if (!merged.rating && !merged.note) delete next[id];
    else next[id] = merged;
    setReviews(next);
    persistAll(saved, watched, following, next);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const shareList = async () => {
    if (!session?.user) return;
    try {
      const all = [...watched, ...saved, ...following];
      const items = Object.entries(reviews)
        .filter(([, r]) => r.rating)
        .map(([id, r]) => {
          const src = all.find((it) => itemId(it) === id);
          return {
            title: r.title,
            year: r.year || "",
            rating: r.rating,
            note: r.note || null,
            poster: src?.poster || null,
            genre: src?.genre || "",
            cat: src?.cat || "",
          };
        });
      // Afina duraciones con las fichas de TMDB antes de calcular el "pique"
      const targets = watched.filter((w) => w.tmdbId).slice(0, 40);
      const entries = await Promise.all(targets.map(async (w) => [factKey(w), await fetchFacts(w)]));
      const factsMap = Object.fromEntries(entries);
      const stats = computeCineStats({ watched, following, reviews, factsMap });
      const medals = computeMedals(stats);

      await publishProfile(session.user.id, username, {
        list: items,
        stats: {
          totalMins: stats.totalMins,
          byGenre: stats.byGenre,
          byCat: stats.byCat,
          watchedCount: stats.watchedCount,
          followingCount: stats.followingCount,
          episodesSeen: stats.episodesSeen,
          ratedCount: stats.ratedCount,
        },
        medals,
      });
      const link = `${window.location.origin}${window.location.pathname}#/u/${session.user.id}`;
      setShareInfo({ link, count: items.length });
    } catch (e) {
      setSyncError("No se pudo publicar tu lista: " + (e.message || e));
    }
  };

  const username = session?.user ? usernameFromId(session.user.id) : guestUsername();

  const pendingSaved = saved.filter((s) => !watchedIds.has(itemId(s)));
  const listFacts = useFacts(pendingSaved, tab === "list");

  const filteredSaved = pendingSaved.filter((s) => {
    if (listCat !== "all" && s.cat !== listCat) return false;
    if (listGenre && s.genre !== listGenre) return false;
    if (listDuration) {
      const dur = effectiveDuration(s, listFacts[factKey(s)]);
      if (!dur || dur > listDuration) return false;
    }
    if (listPlatform) {
      const provs = listFacts[factKey(s)]?.providers || [];
      if (!provs.includes(listPlatform)) return false;
    }
    return true;
  });
  const listPlatforms = [...new Set(pendingSaved.flatMap((s) => listFacts[factKey(s)]?.providers || []))].sort().slice(0, 10);
  const listGenres = [...new Set(pendingSaved.map((s) => s.genre).filter(Boolean))].sort();

  const TABS = [
    ...CATS,
    { key: "hot", label: "Hot", emoji: "🔥" },
    { key: "horror", label: "La Cripta", emoji: "🔪" },
    { key: "following", label: `Siguiendo (${following.length})`, emoji: "📌" },
    { key: "list", label: `Mi Lista (${pendingSaved.length})`, emoji: "🔖" },
    { key: "seen", label: `Vistas (${watched.length})`, emoji: "✅" },
    { key: "stats", label: "Estadísticas", emoji: "📊" },
  ];

  const renderGrid = (items, opts = {}) => (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
      {items.map((it) => {
        const id = itemId(it);
        return (
          <Card
            key={`${id}-${it.tmdbId || ""}`}
            item={it}
            saved={savedIds.has(id)}
            watched={watchedIds.has(id)}
            followed={followingIds.has(id)}
            userRating={reviews[id]?.rating || null}
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
  const searchActive = query.trim().length >= 2;

  const sharedMatch = route.match(/^#\/u\/(.+)$/);
  if (sharedMatch) {
    return (
      <SharedProfile
        userId={sharedMatch[1]}
        onExit={() => {
          window.location.hash = "";
        }}
      />
    );
  }

  const filterChip = (active, label, onClick) => (
    <button
      key={label}
      onClick={onClick}
      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
      style={
        active
          ? { background: ACCENT, color: "#04101F" }
          : { background: "#0F1B33", color: "#A9BAD6", border: "1px solid #1D3157" }
      }
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#070D1A", color: "#E8EEF8", fontFamily: "system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Pacifico&display=swap');
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
        .marquee-dot { width:6px; height:6px; border-radius:50%; background:${ACCENT}; opacity:.35; }
        .spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes heroFade { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: scale(1); } }
        @keyframes heroBadgePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(77,166,255,0.5); } 50% { box-shadow: 0 0 0 8px rgba(77,166,255,0); } }
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .hero-fade { animation: heroFade 0.7s ease-out; }
        .hero-badge { animation: heroBadgePulse 2.2s ease-out infinite; }
        .bob { animation: bob 2.4s ease-in-out infinite; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes giftShake { 0%,100%{transform:rotate(0) scale(1);} 20%{transform:rotate(-8deg) scale(1.05);} 40%{transform:rotate(8deg) scale(1.1);} 60%{transform:rotate(-10deg) scale(1.15);} 80%{transform:rotate(10deg) scale(1.2);} }
        @keyframes giftBurst { 0%{transform:scale(1.2); opacity:1; filter:brightness(1.2);} 70%{transform:scale(1.9); opacity:0.9; filter:brightness(2.4);} 100%{transform:scale(2.6); opacity:0; filter:brightness(3.5);} }
        @keyframes revealIn { from{opacity:0; transform:scale(0.9) translateY(18px);} to{opacity:1; transform:scale(1) translateY(0);} }
        .gift-idle { animation: bob 2s ease-in-out infinite; transition: transform 0.2s; }
        .gift-idle:hover { transform: scale(1.08); }
        .gift-opening { animation: giftShake 0.45s ease-in-out 2, giftBurst 0.7s ease-in 0.9s forwards; }
        .gift-reveal { animation: revealIn 0.8s cubic-bezier(0.2, 0.9, 0.3, 1.25); }
        .gift-flash { animation: heroFade 0.4s ease-out; }`}</style>

      {/* Cabecera */}
      <header className="px-5 pt-6 pb-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-1">
          {[...Array(14)].map((_, i) => (
            <span key={i} className="marquee-dot" style={{ opacity: i % 2 ? 0.15 : 0.4 }} />
          ))}
        </div>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="flex items-end gap-3">
            <div>
              <Logo />
              <p className="text-sm" style={{ color: "#8DA2C0" }}>
                Tu próxima peli, serie o anime · {saved.length} guardadas · {watched.length} vistas
              </p>
            </div>
            <Dancer src={GIFS.bailaora} size={44} className="bob hidden sm:block" />
            <Dancer src={GIFS.robot} size={44} className="bob hidden sm:block" style={{ animationDelay: "0.4s" }} />
          </div>

          <div className="flex items-center gap-2">
            {/* Campana de notificaciones */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                title="Nuevos episodios de tus series"
                className="relative text-lg px-3 py-1.5 rounded-full"
                style={{ background: "#0F1B33", border: "1px solid #1D3157" }}
              >
                🔔
                {notifs.length > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#e33", color: "#fff" }}
                  >
                    {notifs.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  className="absolute right-0 top-12 w-80 max-w-[90vw] rounded-xl p-3 z-40 flex flex-col gap-2"
                  style={{ background: "#0D1729", border: "1px solid #27406E", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}
                >
                  <p className="text-xs font-semibold px-1" style={{ color: "#8DA2C0" }}>
                    NUEVOS EPISODIOS
                  </p>
                  {notifs.length === 0 ? (
                    <p className="text-xs px-1 py-3" style={{ color: "#7D8BA6" }}>
                      Nada nuevo por ahora. Cuando alguna serie que sigues estrene un episodio, te avisaré aquí. 🍿
                    </p>
                  ) : (
                    <>
                      {notifs.map((n) => (
                        <div key={n.id} className="flex gap-2.5 items-center rounded-lg p-2" style={{ background: "#0F1B33" }}>
                          {n.poster && <img src={n.poster} alt="" className="w-9 h-13 rounded object-cover" style={{ height: 52 }} />}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "#E8EEF8" }}>
                              {n.title}
                            </p>
                            <p className="text-xs" style={{ color: ACCENT }}>
                              ¡{n.newCount} episodio{n.newCount > 1 ? "s" : ""} nuevo{n.newCount > 1 ? "s" : ""}!
                            </p>
                            {n.lastLabel && (
                              <p className="text-xs truncate" style={{ color: "#8DA2C0" }}>
                                {n.lastLabel}
                                {n.airDate ? ` · ${new Date(n.airDate).toLocaleDateString("es-ES")}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={clearNotifs}
                        className="text-xs font-semibold py-2 rounded-lg"
                        style={{ background: "#16294A", color: "#A9BAD6" }}
                      >
                        Marcar todo como leído
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {supabase &&
              (session?.user ? (
                <>
                  <span
                    className="text-xs px-3 py-1.5 rounded-full hidden sm:inline"
                    style={{ background: "#0F1B33", color: "#A9BAD6", border: "1px solid #1D3157" }}
                    title={session.user.email}
                  >
                    👤 {username}
                  </span>
                  <button
                    onClick={shareList}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_DIM}` }}
                    title="Genera un enlace público con tus mejores notas"
                  >
                    🔗 Compartir
                  </button>
                  <button
                    onClick={logout}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: "transparent", color: "#98A8C4", border: "1px solid #27406E" }}
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="text-xs px-3 py-1.5 rounded-full hidden sm:inline"
                    style={{ background: "#0F1B33", color: "#A9BAD6", border: "1px solid #1D3157" }}
                    title="Tu nombre de invitado en este navegador"
                  >
                    👤 {username}
                  </span>
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="text-sm font-semibold px-4 py-2 rounded-full"
                    style={{ background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_DIM}` }}
                  >
                    Iniciar sesión
                  </button>
                </>
              ))}
          </div>
        </div>
      </header>

      {/* Buscador */}
      <div className="max-w-7xl mx-auto w-full px-5 mb-4">
        <div
          className="flex items-center gap-3 rounded-full px-5 py-3"
          style={{ background: "#0F1B33", border: `1px solid ${searchActive ? ACCENT_DIM : "#1D3157"}` }}
        >
          <span className="text-lg">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca cualquier película, serie o anime y añádela con un clic…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "#E8EEF8" }}
          />
          {searching && <span className="spin text-sm">🎞️</span>}
          {query && (
            <button onClick={() => setQuery("")} className="text-sm" style={{ color: "#7D8BA6" }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Pestañas */}
      {!searchActive && (
        <nav className="max-w-7xl mx-auto w-full px-5 flex gap-2 flex-wrap mb-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="text-sm font-semibold px-4 py-2 rounded-full transition-colors"
              style={
                tab === t.key
                  ? { background: ACCENT, color: "#04101F" }
                  : { background: "#0F1B33", color: "#A9BAD6", border: "1px solid #1D3157" }
              }
            >
              {t.emoji} {t.label}
            </button>
          ))}
          <div className="sm:ml-auto flex gap-2">
            <button
              onClick={() => setTodayOpen(true)}
              className="text-sm font-semibold px-4 py-2 rounded-full"
              style={{ background: "rgba(77,166,255,0.12)", color: ACCENT, border: `1px solid ${ACCENT_DIM}` }}
            >
              🎬 ¿Qué toca hoy?
            </button>
            <button
              onClick={() => setRecsOpen(true)}
              className="text-sm font-semibold px-4 py-2 rounded-full"
              style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA", border: "1px solid #4C3B8A" }}
            >
              🎯 Recomiéndame algo
            </button>
            <button
              onClick={() => setSwipeOpen(true)}
              className="text-sm font-semibold px-4 py-2 rounded-full"
              style={{ background: "rgba(255,194,75,0.1)", color: GOLD, border: "1px solid #6b5322" }}
            >
              🎰 Ruleta
            </button>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto w-full px-5 pb-16 flex-1">
        {syncError && (
          <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: "#2a2117", color: "#fbd38d" }}>
            {syncError}
          </div>
        )}

        {/* Resultados de búsqueda */}
        {searchActive && (
          <>
            <p className="text-sm mb-4" style={{ color: "#8DA2C0" }}>
              Resultados para <b style={{ color: "#E8EEF8" }}>«{query.trim()}»</b> — guarda 🔖, marca vista ✓ o sigue 📌 con un clic.
            </p>
            {searchResults === null || searching ? (
              <div className="flex flex-col items-center gap-3 py-10" style={{ color: "#8DA2C0" }}>
                <Dancer src={GIFS.palomitas} size={60} className="bob" />
                Buscando…
              </div>
            ) : searchResults.length === 0 ? (
              <EmptyState gif={GIFS.pulpo}>No he encontrado nada con ese nombre. Prueba con otro título.</EmptyState>
            ) : (
              renderGrid(searchResults)
            )}
          </>
        )}

        {/* Pestañas de tendencias */}
        {!searchActive && isCatTab && (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-xs" style={{ color: "#7D8BA6" }}>
                {catData?.ts
                  ? `${catData.items?.length || 0} títulos · Última actualización: ${timeAgo(catData.ts)}`
                  : "Sin datos todavía"}
              </p>
              <button
                onClick={() => refresh(tab)}
                disabled={!!loading[tab]}
                className="text-sm font-semibold px-4 py-2 rounded-lg"
                style={{ background: loading[tab] ? "#1D3252" : ACCENT, color: "#04101F" }}
              >
                {loading[tab] ? "Buscando tendencias…" : "🔄 Actualizar"}
              </button>
            </div>

            {loading[tab] && (
              <div className="flex flex-col items-center gap-3 py-10 justify-center" style={{ color: "#8DA2C0" }}>
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

        {/* La Sección Hot */}
        {!searchActive && tab === "hot" && (
          <HotTab saved={savedIds} watched={watchedIds} onSave={toggleSave} onWatch={toggleWatch} onOpen={setDetailItem} />
        )}

        {/* La Cripta (terror con criterio crítico) */}
        {!searchActive && tab === "horror" && (
          <HorrorTab saved={savedIds} watched={watchedIds} onSave={toggleSave} onWatch={toggleWatch} onOpen={setDetailItem} />
        )}

        {/* Siguiendo */}
        {!searchActive &&
          tab === "following" &&
          (following.length === 0 ? (
            <EmptyState gif={GIFS.fiesta}>
              No sigues ninguna serie todavía. Pulsa <b style={{ color: "#67E8F9" }}>📌</b> en cualquier serie o anime
              para llevar la cuenta de por qué capítulo vas y saber cuánto te queda para terminarla.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-4 max-w-3xl">
              {[...following].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map((f) => {
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
        {!searchActive && tab === "list" && (
          <>
            {pendingSaved.length > 0 && (
              <div className="flex flex-col gap-2 mb-5">
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-xs font-semibold" style={{ color: "#7D8BA6" }}>
                    CATEGORÍA:
                  </span>
                  {filterChip(listCat === "all", "Todas", () => setListCat("all"))}
                  {CATS.map((c) => filterChip(listCat === c.key, `${c.emoji} Solo ${c.label.toLowerCase()}`, () => setListCat(c.key)))}
                </div>
                {listGenres.length > 0 && (
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-xs font-semibold" style={{ color: "#7D8BA6" }}>
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
                              : { background: gs.bg, color: gs.text, border: "1px solid #1D3157" }
                          }
                        >
                          {gs.emoji} {g}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-xs font-semibold" style={{ color: "#7D8BA6" }}>
                    ⏱️ TIEMPO (por capítulo o película):
                  </span>
                  {filterChip(listDuration === null, "Cualquiera", () => setListDuration(null))}
                  {filterChip(listDuration === 25, "≤ 25 min", () => setListDuration(listDuration === 25 ? null : 25))}
                  {filterChip(listDuration === 45, "≤ 45 min", () => setListDuration(listDuration === 45 ? null : 45))}
                  {filterChip(listDuration === 120, "≤ 2 h", () => setListDuration(listDuration === 120 ? null : 120))}
                </div>
                {listPlatforms.length > 0 && (
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-xs font-semibold" style={{ color: "#7D8BA6" }}>
                      📡 PLATAFORMA:
                    </span>
                    {filterChip(listPlatform === null, "Todas", () => setListPlatform(null))}
                    {listPlatforms.map((p) =>
                      filterChip(listPlatform === p, p, () => setListPlatform(listPlatform === p ? null : p))
                    )}
                  </div>
                )}
              </div>
            )}

            {pendingSaved.length === 0 ? (
              <EmptyState gif={GIFS.pinguino}>
                Tu lista está vacía. Usa el buscador 🔍 de arriba o guarda algo desde Tendencias con el botón 🔖.
              </EmptyState>
            ) : filteredSaved.length === 0 ? (
              <EmptyState gif={GIFS.pulpo}>No hay nada en tu lista con esos filtros.</EmptyState>
            ) : (
              renderGrid(filteredSaved, { removable: true })
            )}
          </>
        )}

        {/* Vistas */}
        {!searchActive &&
          tab === "seen" &&
          (watched.length === 0 ? (
            <EmptyState gif={GIFS.fantasma}>
              Aún no has marcado nada como visto. Usa el botón "✓ Vista" en cualquier ficha.
            </EmptyState>
          ) : (
            renderGrid(watched, { removable: true, fromSeen: true })
          ))}

        {/* Estadísticas */}
        {!searchActive && tab === "stats" && <StatsTab watched={watched} following={following} reviews={reviews} />}
      </main>

      {/* Pie con bailarines */}
      <footer className="py-6 flex flex-col items-center gap-2" style={{ borderTop: "1px solid #12213E" }}>
        <div className="flex items-end gap-4">
          <Dancer src={GIFS.fantasma} size={34} className="bob" />
          <Dancer src={GIFS.bailaora} size={40} className="bob" style={{ animationDelay: "0.3s" }} />
          <Dancer src={GIFS.pulpo} size={34} className="bob" style={{ animationDelay: "0.6s" }} />
          <Dancer src={GIFS.robot} size={40} className="bob" style={{ animationDelay: "0.9s" }} />
          <Dancer src={GIFS.pinguino} size={34} className="bob" style={{ animationDelay: "1.2s" }} />
        </div>
        <p className="text-xs" style={{ color: "#4D5A75" }}>
          WatchNext · Hecho con 🍿 · Datos de TMDB
        </p>
      </footer>

      {/* Modal de detalle */}
      {detailItem && (
        <DetailModal
          item={detailItem}
          saved={savedIds.has(itemId(detailItem))}
          watched={watchedIds.has(itemId(detailItem))}
          followed={followingIds.has(itemId(detailItem))}
          review={reviews[itemId(detailItem)] || null}
          onReview={(patch) => setReview(detailItem, patch)}
          onSave={() => toggleSave(detailItem)}
          onWatch={() => toggleWatch(detailItem)}
          onFollow={isSeries(detailItem) ? () => toggleFollow(detailItem) : null}
          onClose={() => setDetailItem(null)}
        />
      )}

      {/* Modal de login */}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {/* ¿Qué toca ver hoy? */}
      {todayOpen && (
        <TodayModal
          following={following}
          onPlusOne={(f) => updateFollow(f, { ep: (f.ep || 0) + 1 })}
          onOpen={(it) => setDetailItem(it)}
          onClose={() => setTodayOpen(false)}
        />
      )}

      {/* Recomendaciones */}
      {recsOpen && (
        <RecsModal
          watched={watched}
          following={following}
          saved={saved}
          reviews={reviews}
          savedIds={savedIds}
          onSave={toggleSave}
          onOpen={setDetailItem}
          onClose={() => setRecsOpen(false)}
        />
      )}

      {/* Compartir lista */}
      {shareInfo && <ShareModal info={shareInfo} onClose={() => setShareInfo(null)} />}

      {/* Ruleta de la Indecisión */}
      {swipeOpen && (
        <SwipeModal
          watched={watched}
          following={following}
          saved={saved}
          reviews={reviews}
          trends={trends}
          savedIds={savedIds}
          onSave={toggleSave}
          onOpen={setDetailItem}
          onClose={() => setSwipeOpen(false)}
        />
      )}
    </div>
  );
}
