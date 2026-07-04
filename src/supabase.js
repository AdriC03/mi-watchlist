// Cliente de Supabase para el login y las listas por usuario.
// Si las claves no están configuradas, la app funciona en modo invitado (localStorage).
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export async function loadCloudLists(userId) {
  const { data, error } = await supabase
    .from("watchlists")
    .select("saved, watched")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data; // null si el usuario aún no tiene fila
}

export async function saveCloudLists(userId, saved, watched) {
  const { error } = await supabase
    .from("watchlists")
    .upsert({ user_id: userId, saved, watched, updated_at: new Date().toISOString() });
  if (error) throw error;
}
