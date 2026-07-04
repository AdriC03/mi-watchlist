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

## Login con cuentas (opcional, Supabase)

Sin configurar nada, la app funciona en "modo invitado": las listas se guardan en el navegador. Para activar cuentas reales con sincronización entre dispositivos:

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En el **SQL Editor** del proyecto, ejecuta:

   ```sql
   create table public.watchlists (
     user_id uuid primary key references auth.users(id) on delete cascade,
     saved jsonb not null default '[]',
     watched jsonb not null default '[]',
     updated_at timestamptz not null default now()
   );

   alter table public.watchlists enable row level security;

   create policy "Cada usuario accede solo a su fila"
     on public.watchlists for all
     using (auth.uid() = user_id)
     with check (auth.uid() = user_id);
   ```

3. Copia de **Project Settings → API** la *Project URL* y la *anon public key*, y ponlas en `.env`:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. (Recomendado) En **Authentication → Sign In / Up → Email**, desactiva "Confirm email" para que el registro entre directamente sin correo de confirmación.

## Despliegue en GitHub Pages

El repositorio incluye un workflow de GitHub Actions (`.github/workflows/deploy.yml`) que compila y publica la app automáticamente en cada push a `main`.

Para que todo funcione también en la web publicada, añade estos secretos del repositorio (**Settings → Secrets and variables → Actions**): `VITE_TMDB_API_KEY`, y si activaste el login, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

<!-- redeploy trigger -->
