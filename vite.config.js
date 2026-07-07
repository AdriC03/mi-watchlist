import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Política de seguridad de contenido (CSP): restringe de qué orígenes puede
// cargar la app recursos y a cuáles puede conectarse. Mitiga XSS e inyección
// de recursos de terceros. Se inyecta solo en el build (no en dev, para no
// romper el HMR de Vite).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' es necesario por el bloque <style> con animaciones + @import de Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://image.tmdb.org https://fonts.gstatic.com",
  "connect-src 'self' https://api.themoviedb.org https://*.supabase.co wss://*.supabase.co",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function securityHeaders() {
  return {
    name: "security-headers",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
          injectTo: "head-prepend",
        },
        {
          tag: "meta",
          attrs: { name: "referrer", content: "strict-origin-when-cross-origin" },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

// "base" debe coincidir con el nombre del repositorio de GitHub
// para que funcione correctamente en GitHub Pages (usuario.github.io/mi-watchlist/).
export default defineConfig({
  plugins: [react(), securityHeaders()],
  base: "/mi-watchlist/",
});
