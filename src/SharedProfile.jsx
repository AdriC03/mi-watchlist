import { useState, useEffect } from "react";
import { loadPublicProfile } from "./supabase.js";
import { genreStyle } from "./genres.js";
import { pieDataFromGenres } from "./medals.js";
import PieChart from "./PieChart.jsx";

const ACCENT = "#4DA6FF";
const GOLD = "#FFC24B";

const fmtScreenTime = (mins) => {
  if (!mins) return "0 h";
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days >= 2) return `${days} días y ${hours} h`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};

function MiniCard({ it, big }) {
  const gs = genreStyle(it.genre);
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ background: "#0F1B33", border: big ? `1px solid ${GOLD}55` : "1px solid #1D3157" }}
    >
      <div className="relative" style={{ aspectRatio: "2 / 3" }}>
        {it.poster ? (
          <img src={it.poster} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: "#16294A" }} />
        )}
        <span
          className="absolute right-2 top-2 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: "#070D1A", color: GOLD }}
        >
          ★ {it.rating}/10
        </span>
        {it.genre && (
          <span
            className="absolute left-2 bottom-2 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: gs.bg, color: gs.text }}
          >
            {gs.emoji} {it.genre}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3
          className="text-base leading-tight tracking-wide"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3f4f8", letterSpacing: "0.04em" }}
        >
          {it.title}
        </h3>
        <p className="text-xs" style={{ color: "#8DA2C0" }}>
          {it.year}
        </p>
        {it.note && (
          <p className="text-xs italic mt-1" style={{ color: "#B9C6DC" }}>
            «{it.note}»
          </p>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#0F1B33", border: "1px solid #1D3157" }}>
      <h3 className="text-xl mb-4 tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3f4f8" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function SharedProfile({ userId, onExit }) {
  const [profile, setProfile] = useState(undefined); // undefined=cargando, null=no existe

  useEffect(() => {
    loadPublicProfile(userId)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [userId]);

  // Compatibilidad: instantáneas antiguas eran un array plano de items
  const raw = profile?.items;
  const list = Array.isArray(raw) ? raw : raw?.list || [];
  const stats = Array.isArray(raw) ? null : raw?.stats || null;
  const medals = Array.isArray(raw) ? [] : raw?.medals || [];
  const unlockedMedals = medals.filter((m) => m.unlocked);
  const lockedMedals = medals.filter((m) => !m.unlocked);

  const items = list.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const fiveStars = items.filter((it) => (it.rating || 0) >= 9);
  const rest = items.filter((it) => (it.rating || 0) < 9);
  const pieData = stats ? pieDataFromGenres(stats.byGenre) : [];

  return (
    <div className="min-h-screen" style={{ background: "#070D1A", color: "#E8EEF8", fontFamily: "system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Pacifico&display=swap');`}</style>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-3xl tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif", color: ACCENT }}>
              WATCHNEX
              <span
                className="inline-block"
                style={{
                  fontFamily: "'Pacifico', cursive",
                  fontSize: "0.92em",
                  marginLeft: "3px",
                  transform: "rotate(-8deg) translateY(4px)",
                  background: "linear-gradient(135deg, #4DA6FF 15%, #6366F1 60%, #A78BFA)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                t
              </span>
            </h1>
            {profile && (
              <p className="text-sm" style={{ color: "#8DA2C0" }}>
                El perfil cinéfilo de <b style={{ color: "#E8EEF8" }}>{profile.name || "un cinéfilo anónimo"}</b>
              </p>
            )}
          </div>
          <button
            onClick={onExit}
            className="text-sm font-semibold px-4 py-2 rounded-full"
            style={{ background: ACCENT, color: "#04101F" }}
          >
            ✨ Crear mi propia lista
          </button>
        </div>

        {profile === undefined && (
          <p className="text-center py-16 text-sm" style={{ color: "#8DA2C0" }}>
            <span className="inline-block mr-2">🎞️</span>Cargando el perfil…
          </p>
        )}

        {profile === null && (
          <p className="text-center py-16 text-sm" style={{ color: "#8DA2C0" }}>
            Este perfil no existe o ya no es público. 😕
          </p>
        )}

        {/* El Pique Cinéfilo */}
        {stats && (
          <div className="flex flex-col gap-5 mb-8">
            <h2
              className="text-3xl tracking-wide text-center"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: ACCENT, letterSpacing: "0.05em" }}
            >
              🏆 EL PIQUE CINÉFILO
            </h2>

            <div className="flex gap-3 flex-wrap">
              <div className="rounded-xl p-4 flex-1 min-w-40 text-center" style={{ background: "#0F1B33", border: `1px solid ${ACCENT}44` }}>
                <p className="text-3xl mb-1">⏱️</p>
                <p className="text-2xl font-bold" style={{ color: ACCENT, fontFamily: "'Bebas Neue', sans-serif" }}>
                  {fmtScreenTime(stats.totalMins)}
                </p>
                <p className="text-xs" style={{ color: "#8DA2C0" }}>
                  invertidos en pantallas
                </p>
              </div>
              <div className="rounded-xl p-4 flex-1 min-w-40 text-center" style={{ background: "#0F1B33", border: "1px solid #1D3157" }}>
                <p className="text-3xl mb-1">🍿</p>
                <p className="text-2xl font-bold" style={{ color: "#E8EEF8", fontFamily: "'Bebas Neue', sans-serif" }}>
                  {stats.watchedCount}
                </p>
                <p className="text-xs" style={{ color: "#8DA2C0" }}>
                  títulos vistos
                </p>
              </div>
              <div className="rounded-xl p-4 flex-1 min-w-40 text-center" style={{ background: "#0F1B33", border: "1px solid #1D3157" }}>
                <p className="text-3xl mb-1">🦉</p>
                <p className="text-2xl font-bold" style={{ color: "#E8EEF8", fontFamily: "'Bebas Neue', sans-serif" }}>
                  {stats.episodesSeen || 0}
                </p>
                <p className="text-xs" style={{ color: "#8DA2C0" }}>
                  capítulos devorados
                </p>
              </div>
            </div>

            {pieData.length > 0 && (
              <Panel title="🎭 Sus géneros más vistos">
                <PieChart data={pieData} />
              </Panel>
            )}

            {unlockedMedals.length > 0 && (
              <Panel title={`🎖️ Medallas desbloqueadas (${unlockedMedals.length}/${medals.length})`}>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  {unlockedMedals.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl p-3 flex items-center gap-3"
                      style={{ background: "rgba(255,194,75,0.08)", border: `1px solid ${GOLD}55` }}
                    >
                      <span className="text-3xl">{m.emoji}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: GOLD }}>
                          {m.name}
                        </p>
                        <p className="text-xs" style={{ color: "#A9BAD6" }}>
                          {m.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                  {lockedMedals.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl p-3 flex items-center gap-3"
                      style={{ background: "#0A1322", border: "1px solid #1D3157", opacity: 0.45 }}
                      title="Aún no desbloqueada"
                    >
                      <span className="text-3xl grayscale">🔒</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#7D8BA6" }}>
                          {m.name}
                        </p>
                        <p className="text-xs" style={{ color: "#5D6C88" }}>
                          {m.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {profile && items.length === 0 && (
          <p className="text-center py-10 text-sm" style={{ color: "#8DA2C0" }}>
            Todavía no ha puntuado nada. ¡Vuelve pronto!
          </p>
        )}

        {fiveStars.length > 0 && (
          <>
            <h2 className="text-2xl mb-3 tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif", color: GOLD }}>
              ⭐ Sus imprescindibles (9-10)
            </h2>
            <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
              {fiveStars.map((it) => (
                <MiniCard key={`${it.title}-${it.year}`} it={it} big />
              ))}
            </div>
          </>
        )}

        {rest.length > 0 && (
          <>
            <h2 className="text-2xl mb-3 tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#f3f4f8" }}>
              El resto de sus notas
            </h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
              {rest.map((it) => (
                <MiniCard key={`${it.title}-${it.year}`} it={it} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
