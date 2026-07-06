import { useState, useEffect, useRef } from "react";
import { buildSwipePool } from "./swipe.js";
import { genreStyle } from "./genres.js";

const ACCENT = "#4DA6FF";
const GOLD = "#FFC24B";
const GIF = (cp) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`;
const NEEDED = 3;

export default function SwipeModal({ watched, following, saved, reviews, trends, savedIds, onSave, onOpen, onClose }) {
  const [pool, setPool] = useState(null);
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState([]);
  const [drag, setDrag] = useState(null); // {dx, dy} mientras arrastras
  const [flying, setFlying] = useState(null); // "left" | "right" al soltar
  const [result, setResult] = useState(null); // la elegida 🎉
  const startRef = useRef(null);

  useEffect(() => {
    buildSwipePool({ watched, following, saved, reviews, trends })
      .then(setPool)
      .catch(() => setPool([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (!result && pool?.[idx] && !flying) {
        if (e.key === "ArrowRight") decide(true);
        if (e.key === "ArrowLeft") decide(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, result, pool, idx, flying, liked]);

  const current = pool?.[idx];
  const next = pool?.[idx + 1];

  const decide = (right) => {
    if (!current || flying) return;
    setFlying(right ? "right" : "left");
    setTimeout(() => {
      if (right) {
        const newLiked = [...liked, current];
        if (newLiked.length >= NEEDED) {
          setResult(newLiked[Math.floor(Math.random() * newLiked.length)]);
        } else {
          setLiked(newLiked);
        }
      }
      setIdx((i) => i + 1);
      setFlying(null);
      setDrag(null);
    }, 300);
  };

  const restart = () => {
    setResult(null);
    setLiked([]);
    setIdx((i) => i + 1);
  };

  // Gestos de arrastre
  const onPointerDown = (e) => {
    if (flying || result) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!startRef.current) return;
    setDrag({ dx: e.clientX - startRef.current.x, dy: e.clientY - startRef.current.y });
  };
  const onPointerUp = () => {
    if (!startRef.current) return;
    const dx = drag?.dx || 0;
    startRef.current = null;
    if (dx > 90) decide(true);
    else if (dx < -90) decide(false);
    else setDrag(null);
  };

  const dx = drag?.dx || 0;
  const cardTransform = flying
    ? `translateX(${flying === "right" ? "160%" : "-160%"}) rotate(${flying === "right" ? 28 : -28}deg)`
    : drag
      ? `translate(${dx}px, ${(drag.dy || 0) * 0.15}px) rotate(${dx * 0.055}deg)`
      : "none";

  const gs = current?.genre ? genreStyle(current.genre) : null;
  const noMore = pool && !current && !result;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(3,6,14,0.9)", backdropFilter: "blur(5px)" }}
      onClick={onClose}
    >
      <div className="w-full max-w-sm select-none" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del juego */}
        {!result && (
          <div className="text-center mb-4">
            <h2 className="text-3xl tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif", color: ACCENT }}>
              🎰 RULETA DE LA INDECISIÓN
            </h2>
            <p className="text-xs" style={{ color: "#8DA2C0" }}>
              Desliza a la derecha lo que te apetezca 👉 Con {NEEDED} elegidas, el destino decide por ti.
            </p>
            <div className="flex justify-center gap-2 mt-2">
              {[...Array(NEEDED)].map((_, i) => (
                <span key={i} className="text-xl" style={{ opacity: i < liked.length ? 1 : 0.25 }}>
                  ❤️
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cargando baraja */}
        {!pool && (
          <div className="flex flex-col items-center gap-3 py-16" style={{ color: "#8DA2C0" }}>
            <img src={GIF("1f52e")} alt="" width={70} height={70} />
            Barajando películas para ti…
          </div>
        )}

        {/* Sin más cartas */}
        {noMore && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <img src={GIF("1f419")} alt="" width={80} height={80} />
            <p className="text-sm max-w-xs" style={{ color: "#8DA2C0" }}>
              ¡Se acabó la baraja! Marca más títulos como vistos o puntúalos para que pueda traerte candidatos nuevos.
            </p>
            <button
              onClick={onClose}
              className="text-sm font-semibold px-5 py-2.5 rounded-lg"
              style={{ background: "#16294A", color: "#A9BAD6" }}
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Carta actual (con la siguiente asomando detrás) */}
        {current && !result && (
          <>
            <div className="relative" style={{ height: 460 }}>
              {next && (
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden"
                  style={{
                    background: "#0F1B33",
                    border: "1px solid #1D3157",
                    transform: "scale(0.94) translateY(14px)",
                    opacity: 0.6,
                  }}
                >
                  {next.poster && <img src={next.poster} alt="" className="w-full h-full object-cover" draggable={false} />}
                </div>
              )}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
                style={{
                  background: "#0F1B33",
                  border: "1px solid #27406E",
                  transform: cardTransform,
                  transition: flying ? "transform 0.3s ease-in, opacity 0.3s" : drag ? "none" : "transform 0.25s",
                  opacity: flying ? 0 : 1,
                  touchAction: "none",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {current.poster && (
                  <img src={current.poster} alt={current.title} className="w-full h-full object-cover" draggable={false} />
                )}
                <div
                  className="absolute inset-x-0 bottom-0 p-4 pt-16"
                  style={{ background: "linear-gradient(to top, rgba(4,8,18,0.97) 30%, transparent)" }}
                >
                  <h3
                    className="text-2xl leading-tight"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#fff", letterSpacing: "0.03em" }}
                  >
                    {current.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {gs && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: gs.bg, color: gs.text }}>
                        {gs.emoji} {current.genre}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "#C4D0E4" }}>
                      {current.year}
                      {current.rating && (
                        <>
                          {" · "}
                          <span style={{ color: GOLD }}>★ {current.rating}</span>
                        </>
                      )}
                    </span>
                  </div>
                  {current.description && (
                    <p className="text-xs mt-1.5 line-clamp-3" style={{ color: "#B9C6DC" }}>
                      {current.description}
                    </p>
                  )}
                </div>

                {/* Sellos al arrastrar */}
                {dx > 40 && !flying && (
                  <span
                    className="absolute left-4 top-6 text-xl font-black px-3 py-1 rounded-lg -rotate-12"
                    style={{ border: "3px solid #34d399", color: "#34d399", background: "rgba(4,8,18,0.6)" }}
                  >
                    ME APETECE 👍
                  </span>
                )}
                {dx < -40 && !flying && (
                  <span
                    className="absolute right-4 top-6 text-xl font-black px-3 py-1 rounded-lg rotate-12"
                    style={{ border: "3px solid #f87171", color: "#f87171", background: "rgba(4,8,18,0.6)" }}
                  >
                    PASO 👎
                  </span>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-center items-center gap-6 mt-5">
              <button
                onClick={() => decide(false)}
                className="w-16 h-16 rounded-full text-2xl transition-transform hover:scale-110"
                style={{ background: "#2a1220", border: "2px solid #f87171" }}
                title="Paso (←)"
              >
                👎
              </button>
              <button
                onClick={onClose}
                className="text-xs font-semibold px-3 py-2 rounded-full"
                style={{ background: "transparent", color: "#7D8BA6", border: "1px solid #27406E" }}
              >
                Salir
              </button>
              <button
                onClick={() => decide(true)}
                className="w-16 h-16 rounded-full text-2xl transition-transform hover:scale-110"
                style={{ background: "#0d2a1e", border: "2px solid #34d399" }}
                title="Me apetece (→)"
              >
                👍
              </button>
            </div>
          </>
        )}

        {/* ¡Decidido! */}
        {result && (
          <div className="gift-reveal text-center">
            <div className="flex justify-center items-center gap-3 mb-3">
              <img src={GIF("1f38a")} alt="" width={46} height={46} />
              <h2 className="text-3xl tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif", color: GOLD }}>
                ¡DECIDIDO, HOY VES ESTO!
              </h2>
              <img src={GIF("1f38a")} alt="" width={46} height={46} />
            </div>
            <div
              className="relative rounded-2xl overflow-hidden mx-auto"
              style={{ maxWidth: 300, border: `2px solid ${GOLD}66`, boxShadow: "0 24px 70px rgba(255,194,75,0.15)" }}
            >
              {result.poster && <img src={result.poster} alt={result.title} className="w-full object-cover" />}
              <div
                className="absolute inset-x-0 bottom-0 p-4 pt-14"
                style={{ background: "linear-gradient(to top, rgba(4,8,18,0.97) 35%, transparent)" }}
              >
                <h3 className="text-2xl" style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#fff" }}>
                  {result.title}
                </h3>
                <p className="text-xs" style={{ color: "#C4D0E4" }}>
                  {result.year}
                  {result.rating && (
                    <>
                      {" · "}
                      <span style={{ color: GOLD }}>★ {result.rating}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              <button
                onClick={() => onOpen(result)}
                className="text-sm font-semibold px-4 py-2.5 rounded-lg"
                style={{ background: ACCENT, color: "#04101F" }}
              >
                Ver ficha
              </button>
              <button
                onClick={() => onSave(result)}
                className="text-sm font-semibold px-4 py-2.5 rounded-lg"
                style={
                  savedIds.has(`${result.title.toLowerCase().trim()}::${result.year}`)
                    ? { background: "rgba(77,166,255,0.25)", color: ACCENT, border: `1px solid ${ACCENT}` }
                    : { background: "transparent", color: ACCENT, border: `1px solid ${ACCENT}66` }
                }
              >
                🔖 Guardar
              </button>
              <button
                onClick={restart}
                className="text-sm font-semibold px-4 py-2.5 rounded-lg"
                style={{ background: "#16294A", color: "#A9BAD6" }}
              >
                🎰 Volver a girar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
