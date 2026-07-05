// Cliente de Supabase para el login y las listas por usuario.
// Si las claves no están configuradas, la app funciona en modo invitado (localStorage).
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

const isMissingFollowingColumn = (error) =>
  /following/.test(error?.message || "") && /column|schema/i.test(error?.message || "");

export async function loadCloudLists(userId) {
  let { data, error } = await supabase
    .from("watchlists")
    .select("saved, watched, following")
    .eq("user_id", userId)
    .maybeSingle();

  // Compatibilidad: si la columna "following" aún no se ha creado en Supabase
  if (error && isMissingFollowingColumn(error)) {
    ({ data, error } = await supabase
      .from("watchlists")
      .select("saved, watched")
      .eq("user_id", userId)
      .maybeSingle());
    if (data) data.following = null; // señal de que falta la columna
  }
  if (error) throw error;
  return data; // null si el usuario aún no tiene fila
}

export async function saveCloudLists(userId, saved, watched, following) {
  const row = { user_id: userId, saved, watched, following, updated_at: new Date().toISOString() };
  let { error } = await supabase.from("watchlists").upsert(row);

  if (error && isMissingFollowingColumn(error)) {
    delete row.following;
    ({ error } = await supabase.from("watchlists").upsert(row));
    if (!error) {
      throw new Error(
        'Tus listas se guardaron, pero falta la columna "following" en Supabase. Ejecuta en el SQL Editor: alter table public.watchlists add column if not exists following jsonb not null default \'[]\';'
      );
    }
  }
  if (error) throw error;
}
