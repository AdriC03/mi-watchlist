# Mi Watchlist

App para guardar y hacer seguimiento de películas, series y anime, con tendencias en tiempo real.

- **Guardar / marcar como vista / añadir a mano**: persiste en `localStorage`, no requiere nada más.
- **Tendencias**: películas y series vía [TMDB](https://www.themoviedb.org) (gratis, requiere API key), anime vía [Jikan](https://jikan.moe) (gratis, sin registro).

## Desarrollo local

```bash
npm install
npm run dev
```

Para que funcionen las tendencias de películas/series, crea un archivo `.env` (copia `.env.example`) con tu API key gratuita de TMDB:

```
VITE_TMDB_API_KEY=tu_key_aqui
```

(Consíguela gratis en [themoviedb.org](https://www.themoviedb.org/signup) → Settings → API.)

## Despliegue en GitHub Pages

El repositorio incluye un workflow de GitHub Actions (`.github/workflows/deploy.yml`) que compila y publica la app automáticamente en cada push a `main`.

Para que las tendencias de películas/series funcionen también en la web publicada, añade tu key como secreto del repositorio: **Settings → Secrets and variables → Actions → New repository secret**, nombre `VITE_TMDB_API_KEY`.

<!-- redeploy trigger -->
