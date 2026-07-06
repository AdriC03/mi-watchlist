// Nombre de usuario cinéfilo generado automáticamente.
// Es determinista a partir del id de usuario: el mismo usuario obtiene
// siempre el mismo nombre en cualquier dispositivo, sin guardar nada.

const NOUNS = [
  "Cinéfilo", "Otaku", "Espectador", "Crítico", "Coleccionista", "Devorador",
  "Proyeccionista", "Guionista", "Cazapelis", "Serieadicto", "Palomitero", "Maratonista",
];

const ADJS = [
  "Nocturno", "Épico", "DeCulto", "Subtitulado", "Galáctico", "Retro",
  "DeSofá", "Incansable", "Misterioso", "Legendario", "Turbo", "Dramático",
  "Infravalorado", "SinSpoilers", "DeEstreno", "Trasnochador",
];

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function usernameFromId(id) {
  const h = hashString(String(id));
  const noun = NOUNS[h % NOUNS.length];
  const adj = ADJS[Math.floor(h / 31) % ADJS.length];
  const num = h % 100;
  return `${noun}${adj}${String(num).padStart(2, "0")}`;
}

// Para el modo invitado: una semilla aleatoria que se conserva en este navegador
export function guestUsername() {
  const KEY = "watchnext-guest-seed";
  let seed = localStorage.getItem(KEY);
  if (!seed) {
    seed = String(Math.floor(Math.random() * 1e9));
    try {
      localStorage.setItem(KEY, seed);
    } catch {
      /* sin persistencia */
    }
  }
  return usernameFromId(seed);
}
