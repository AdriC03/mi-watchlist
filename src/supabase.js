// Cliente de Supabase para el login y las listas por usuario.
// Si las claves no están configuradas, la app funciona en modo invitado (localStorage).
import { createClient } from "@supabase/supabase-js";
import { sanitizePublicSnapshot, safeText, isUuid } from "./security.js";

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

// ---------- Perfil público (modo "compartir lista") ----------
// Publica una instantánea de tus títulos puntuados en una tabla de lectura
// pública, para compartir con un enlace. Requiere la tabla public_profiles.
export async function publishProfile(userId, name, snapshot) {
  // Sanea la instantánea antes de guardarla: recorta tamaños, valida notas
  // y descarta URLs de imagen que no sean de un host de confianza.
  const clean = sanitizePublicSnapshot(snapshot);
  const { error } = await supabase
    .from("public_profiles")
    .upsert({ user_id: userId, name: safeText(name, 60), items: clean, updated_at: new Date().toISOString() });
  if (error) {
    if (/public_profiles/.test(error.message || "") && /find|exist|schema/i.test(error.message || "")) {
      throw new Error(
        "Falta la tabla public_profiles en Supabase. Ejecuta el SQL de 'Compartir lista' del README y vuelve a intentarlo."
      );
    }
    throw error;
  }
}

export async function loadPublicProfile(userId) {
  if (!isUuid(userId)) return null; // id de la URL con formato inesperado
  const { data, error } = await supabase
    .from("public_profiles")
    .select("name, items, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Defensa para quien visualiza: limpia la instantánea también al cargarla,
  // no solo al publicarla (por si el registro se creó con una versión previa).
  const raw = data.items;
  const normalized = Array.isArray(raw) ? { list: raw } : raw;
  return { name: safeText(data.name, 60), items: sanitizePublicSnapshot(normalized), updated_at: data.updated_at };
}
