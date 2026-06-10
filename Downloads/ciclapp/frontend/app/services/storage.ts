/**
 * CICLAPP — Capa de almacenamiento
 * services/storage.ts
 *
 * Toda la lógica de AsyncStorage centralizada aquí.
 * Cuando migres a Node.js, solo cambias este archivo.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────────────────────
// TIPOS COMPARTIDOS — importar desde aquí en toda la app
// ─────────────────────────────────────────────────────────────

export interface RouteRecord {
  id: string;           // timestamp como ID único
  date: string;         // ISO 8601: "2025-04-27T14:30:00.000Z"
  distanceKm: number;   // kilómetros recorridos
  durationSeconds: number; // duración total en segundos
  startLocation?: {     // coordenadas de inicio (opcional)
    latitude: number;
    longitude: number;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUri?: string;   // URI local de foto (futura cámara)
}

// ─────────────────────────────────────────────────────────────
// CLAVES DE STORAGE
// ─────────────────────────────────────────────────────────────

const KEYS = {
  ROUTES: "ciclapp:routes",
  PROFILE: "ciclapp:profile",
} as const;

// ─────────────────────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────────────────────

/** Carga todas las rutas guardadas (más nueva primero) */
export async function loadRoutes(): Promise<RouteRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ROUTES);
    if (!raw) return [];
    const parsed: RouteRecord[] = JSON.parse(raw);
    return parsed.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch {
    return [];
  }
}

/** Guarda una nueva ruta al principio de la lista */
export async function saveRoute(route: RouteRecord): Promise<void> {
  const current = await loadRoutes();
  const updated = [route, ...current];
  await AsyncStorage.setItem(KEYS.ROUTES, JSON.stringify(updated));
}

/** Elimina una ruta por su ID */
export async function deleteRoute(id: string): Promise<void> {
  const current = await loadRoutes();
  const updated = current.filter((r) => r.id !== id);
  await AsyncStorage.setItem(KEYS.ROUTES, JSON.stringify(updated));
}

// ─────────────────────────────────────────────────────────────
// PERFIL
// ─────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  name: "Ciclista Bogotano",
  email: "ciclista@ciclapp.co",
};

export async function loadProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

// ─────────────────────────────────────────────────────────────
// ESTADÍSTICAS CALCULADAS
// ─────────────────────────────────────────────────────────────

export interface WeekStats {
  totalKm: number;
  totalRoutes: number;
  totalSeconds: number;
}

/**
 * Calcula estadísticas de la semana actual (lunes–domingo).
 * Se llama desde el Home para "Semana en cifras".
 */
export function calcWeekStats(routes: RouteRecord[]): WeekStats {
  const now = new Date();
  // Inicio de la semana actual (lunes a las 00:00:00)
  const startOfWeek = new Date(now);
  const day = now.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day; // ajuste para semana lunes-domingo
  startOfWeek.setDate(now.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekRoutes = routes.filter(
    (r) => new Date(r.date).getTime() >= startOfWeek.getTime()
  );

  return {
    totalKm: weekRoutes.reduce((sum, r) => sum + r.distanceKm, 0),
    totalRoutes: weekRoutes.length,
    totalSeconds: weekRoutes.reduce((sum, r) => sum + r.durationSeconds, 0),
  };
}

/** Formatea segundos en "1 h 23 min" o "45 min" */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seg`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}