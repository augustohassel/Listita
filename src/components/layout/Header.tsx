import { Layers, Moon, ShieldCheck, Sun } from "lucide-react";
import type { ThemeMode } from "../../types";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export function Header({
  title = "Listita",
  subtitle,
  theme = "dark",
  onToggleTheme,
}: HeaderProps) {
  const version =
    typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.2.0";
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-line/20 px-4 py-3 sm:px-6 pt-[max(0.75rem,var(--safe-top))]">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-accent to-accent-2 flex items-center justify-center shadow-md shadow-accent/15">
            <Layers className="w-5 h-5 text-on-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-ink truncate">
                {title}
              </span>
              {subtitle && (
                <span className="text-xs text-accent font-medium truncate">
                  · {subtitle}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>100% Local y Privado</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="touch-target p-2 rounded-xl bg-surface/80 hover:bg-surface text-ink border border-line/20 shadow-sm flex items-center justify-center transition-colors"
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-label={
                isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
              }
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-accent" />
              ) : (
                <Moon className="w-4 h-4 text-accent" />
              )}
            </button>
          )}

          <span
            className="text-[11px] font-mono font-medium text-ink-muted bg-surface/80 px-2.5 py-0.5 rounded-full border border-line/20 shadow-sm"
            title={`Versión instalada: v${version}`}
          >
            v{version}
          </span>
        </div>
      </div>
    </header>
  );
}
