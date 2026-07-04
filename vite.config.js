import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// "base" debe coincidir con el nombre del repositorio de GitHub
// para que funcione correctamente en GitHub Pages (usuario.github.io/mi-watchlist/).
export default defineConfig({
  plugins: [react()],
  base: "/mi-watchlist/",
});
