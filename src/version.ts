/** Versión de la aplicación inyectada en compilación desde `package.json`. */
export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0-dev";
