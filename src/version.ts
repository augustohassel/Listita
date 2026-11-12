const FALLBACK_APP_VERSION = "0.0.0-dev";

/** Resuelve la versión de la aplicación aplicando fallback seguro si falta o está vacía. */
export function resolveAppVersion(rawVersion: string | undefined): string {
  const trimmed = typeof rawVersion === "string" ? rawVersion.trim() : "";
  return trimmed.length > 0 ? trimmed : FALLBACK_APP_VERSION;
}

/** Versión de la aplicación inyectada en compilación desde `package.json`. */
export const APP_VERSION = resolveAppVersion(
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : undefined,
);
