// Cliente de Supabase para el login y las listas por usuario.
// Si las claves no están configuradas, la app funciona en modo invitado (localStorage).
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

// Columnas jsonb opcionales (añadidas por versiones nuevas de la app).
// Si el proyecto de Supabase aún no las tiene, se degradan con un aviso.
const OPTIONAL_COLUMNS = ["following", "reviews"];

const missingColumn = (error) => {
  const msg = error?.message || "";
  if (!/column|schema/i.test(msg)) return null;
  return OPTIONAL_COLUMNS.find((c) => msg.includes(c)) || null;
};

const alterHint = (col) =>
  `alter table public.watchlists add column if not exists ${col} jsonb not null default '${col === "reviews" ? "{}" : "[]"}';`;

export async function loadCloudLists(userId) {
  let cols = ["saved", "watched", ...OPTIONAL_COLUMNS];
  for (;;) {
    const { data, error } = await supabase
      .from("watchlists")
      .select(cols.join(", "))
      .eq("user_id", userId)
      .maybeSingle();
    if (!error) {
      if (data) {
        for (const c of OPTIONAL_COLUMNS) if (!cols.includes(c)) data[c] = null; // señal de columna ausente
      }
      return data;
    }
    const bad = missingColumn(error);
    if (bad && cols.includes(bad)) {
      cols = cols.filter((c) => c !== bad);
      continue;
    }
    throw error;
  }
}

export async function saveCloudLists(userId, saved, watched, following, reviews) {
  const row = { user_id: userId, saved, watched, following, reviews, updated_at: new Date().toISOString() };
  const dropped = [];
  for (;;) {
    const { error } = await supabase.from("watchlists").upsert(row);
    if (!error) {
      if (dropped.length) {
        throw new Error(
          `Tus listas se guardaron, pero faltan columnas en Supabase. Ejecuta en el SQL Editor: ${dropped.map(alterHint).join(" ")}`
        );
      }
      return;
    }
    const bad = missingColumn(error);
    if (bad && bad in row) {
      delete row[bad];
      dropped.push(bad);
      continue;
    }
    throw error;
  }
}
