import { describe, expect, it } from "vitest";
import { APP_VERSION, resolveAppVersion } from "./version";

describe("version", () => {
  it("retorna la versión inyectada cuando es válida", () => {
    expect(resolveAppVersion("0.2.1")).toBe("0.2.1");
  });

  it("retorna el fallback cuando la versión es undefined o cadena vacía", () => {
    expect(resolveAppVersion(undefined)).toBe("0.0.0-dev");
    expect(resolveAppVersion("")).toBe("0.0.0-dev");
    expect(resolveAppVersion("   ")).toBe("0.0.0-dev");
  });

  it("expone APP_VERSION como una cadena no vacía", () => {
    expect(typeof APP_VERSION).toBe("string");
    expect(APP_VERSION.length).toBeGreaterThan(0);
  });
});
