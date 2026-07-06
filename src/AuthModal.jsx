import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

const ACCENT = "#4DA6FF";
const GOLD = "#FFC24B";

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          onClose(); // registrado y logueado
        } else {
          setNotice("Cuenta creada. Revisa tu correo y confirma la dirección para poder entrar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      }
    } catch (err) {
      const msg = err.message || "Error desconocido";
      if (/invalid login credentials/i.test(msg)) setError("Email o contraseña incorrectos.");
      else if (/already registered/i.test(msg)) setError("Ese email ya tiene una cuenta. Prueba a iniciar sesión.");
      else if (/at least 6 characters/i.test(msg)) setError("La contraseña debe tener al menos 6 caracteres.");
      else if (/email not confirmed/i.test(msg)) setError("Tu email aún no está confirmado. Revisa tu bandeja de entrada.");
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    background: "#070D1A",
    border: "1px solid #27406E",
    color: "#E8EEF8",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(3,6,14,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="hero-fade w-full max-w-sm rounded-2xl p-6"
        style={{ background: "#0D1729", border: "1px solid #27406E" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-3xl mb-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em", color: ACCENT }}
        >
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h2>
        <p className="text-xs mb-5" style={{ color: "#8DA2C0" }}>
          Tus listas se guardarán en tu cuenta y estarán disponibles en cualquier dispositivo.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="text-sm px-3 py-2.5 rounded-lg outline-none"
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (mín. 6 caracteres)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="text-sm px-3 py-2.5 rounded-lg outline-none"
            style={inputStyle}
          />

          {error && (
            <p className="text-xs rounded-lg p-2.5" style={{ background: "#2a1717", color: "#f3b3b3" }}>
              {error}
            </p>
          )}
          {notice && (
            <p className="text-xs rounded-lg p-2.5" style={{ background: "#12291c", color: "#8fe6b5" }}>
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="text-sm font-semibold py-2.5 rounded-lg mt-1"
            style={{ background: busy ? "#1D3252" : ACCENT, color: "#04101F" }}
          >
            {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Registrarme"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setNotice(null);
          }}
          className="text-xs mt-4 w-full text-center"
          style={{ color: "#8DA2C0" }}
        >
          {mode === "login" ? (
            <>¿No tienes cuenta? <span style={{ color: ACCENT }}>Regístrate</span></>
          ) : (
            <>¿Ya tienes cuenta? <span style={{ color: ACCENT }}>Inicia sesión</span></>
          )}
        </button>
      </div>
    </div>
  );
}
