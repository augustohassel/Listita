import { useState, type KeyboardEvent, type SubmitEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Package,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trophy,
  X,
} from "lucide-react";
import { BottomNav } from "./components/layout/BottomNav";
import { Header } from "./components/layout/Header";
import { ModalSheet } from "./components/layout/ModalSheet";
import { createList, db, loadDemoData } from "./db";
import { ListDetail } from "./features/ListDetail";
import { Rankings } from "./features/Rankings";
import { SettingsView } from "./features/SettingsView";
import { useTheme } from "./hooks/useTheme";
import type { NavTab, RunAction } from "./types";

export default function App() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const lists = useLiveQuery(() => db.lists.toArray());
  const allItems = useLiveQuery(() => db.items.toArray());
  const allRankings = useLiveQuery(() => db.rankings.toArray());

  const [currentTab, setCurrentTab] = useState<NavTab>("lists");
  const [selectedId, setSelectedId] = useState<number>();
  const [searchQuery, setSearchQuery] = useState("");
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [fieldsInput, setFieldsInput] = useState("");
  const [chipFields, setChipFields] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = lists?.find((list) => list.id === selectedId) ?? lists?.[0];
  const selectedItems = (allItems ?? []).filter(
    (item) => item.listId === selected?.id,
  );
  const selectedRankings = (allRankings ?? []).filter(
    (ranking) => ranking.listId === selected?.id,
  );
  const headerSubtitle =
    (currentTab === "items" || currentTab === "rankings") && selected
      ? selected.name
      : undefined;

  function showToast(message: string) {
    setToast(message);
  }

  const run: RunAction = async (action) => {
    setError("");
    setBusy(true);
    try {
      await action();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar el cambio. Intentá nuevamente.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  function addChipFromInput() {
    const parts = fieldsInput
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setChipFields((prev) => [...prev, ...parts]);
    setFieldsInput("");
  }

  function handleFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && fieldsInput.trim()) {
      event.preventDefault();
      addChipFromInput();
    }
  }

  function removeChip(indexToRemove: number) {
    setChipFields((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  async function submitList(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const extraFields = fieldsInput
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);
    const combinedFields = [...chipFields, ...extraFields];

    let createdId: number | undefined;
    if (
      await run(async () => {
        createdId = await createList(name, category, combinedFields);
      })
    ) {
      setName("");
      setCategory("");
      setFieldsInput("");
      setChipFields([]);
      setIsListModalOpen(false);
      if (createdId !== undefined) {
        setSelectedId(createdId);
        setCurrentTab("items");
      }
      showToast("Listado creado exitosamente.");
    }
  }

  const filteredLists = (lists ?? []).filter((entry) => {
    const q = searchQuery.trim().toLocaleLowerCase("es");
    if (!q) return true;
    return (
      entry.name.toLocaleLowerCase("es").includes(q) ||
      entry.category.toLocaleLowerCase("es").includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-base text-ink flex flex-col transition-colors duration-200">
      <Header
        subtitle={headerSubtitle}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-28 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 dark:border-red-500/40 px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-200 flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Cerrar alerta de error"
              className="p-1 rounded-lg hover:bg-red-500/20 text-red-600 dark:text-red-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <fieldset
          disabled={busy}
          className="border-0 p-0 m-0 min-w-0 space-y-4"
        >
          <legend className="sr-only">Gestionar listados y rankings</legend>

          {currentTab === "lists" && (
            <section className="space-y-4" aria-label="Mis listados">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-extrabold text-ink">
                    Mis listados
                  </h1>
                  <p className="text-xs text-ink-muted">
                    Colecciones personalizadas con atributos propios y rankings
                    manuales.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setIsListModalOpen(true);
                  }}
                  className="touch-target shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-on-accent font-bold text-xs shadow-lg shadow-accent/20 transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo listado</span>
                </button>
              </div>

              {lists === undefined && (
                <p
                  role="status"
                  className="text-center text-sm text-ink-muted py-8"
                >
                  Cargando listados…
                </p>
              )}

              {lists && lists.length > 0 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    aria-label="Buscar listado"
                    placeholder="Filtrar por nombre o categoría…"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-2xl bg-surface/90 border border-line/20 pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}

              {lists?.length === 0 && (
                <div className="glass-card rounded-3xl p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent mx-auto">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-ink">
                      Todo empieza con una buena lista.
                    </h2>
                    <p className="text-xs text-ink-muted">
                      Vinos, bares, comidas… empezá por un listado.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsListModalOpen(true)}
                      className="touch-target w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-on-accent font-bold text-xs shadow-lg shadow-accent/20 focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear primer listado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          const firstId = await loadDemoData();
                          if (firstId !== undefined) setSelectedId(firstId);
                          showToast("Datos de demostración cargados.");
                        })
                      }
                      className="touch-target w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface/90 hover:bg-surface text-accent border border-accent/30 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Cargar datos de demostración</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {filteredLists.map((list) => {
                  const listItemsCount = (allItems ?? []).filter(
                    (item) => item.listId === list.id,
                  ).length;
                  const listRankingsCount = (allRankings ?? []).filter(
                    (r) => r.listId === list.id,
                  ).length;
                  const isSelected = selected?.id === list.id;

                  return (
                    <article
                      key={list.id}
                      className={`glass-card rounded-2xl p-4 space-y-3 transition-all ${
                        isSelected
                          ? "border-accent/40 ring-1 ring-accent/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">
                            {list.category || "Listado personal"}
                          </span>
                          <h2 className="text-base font-bold text-ink truncate">
                            {list.name}
                          </h2>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-surface/90 border border-line/20">
                            {listItemsCount} elem.
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-surface/90 border border-line/20">
                            {listRankingsCount} rank.
                          </span>
                        </div>
                      </div>

                      {list.fields.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {list.fields.map((field) => (
                            <span
                              key={field}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-surface/80 text-ink-muted border border-line/20"
                            >
                              <Tag className="w-2.5 h-2.5 text-accent" />
                              {field}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(list.id);
                            setCurrentTab("items");
                          }}
                          className="touch-target flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Elementos ({listItemsCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(list.id);
                            setCurrentTab("rankings");
                          }}
                          className="touch-target flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface/90 hover:bg-surface text-ink border border-line/20 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <Trophy className="w-3.5 h-3.5 text-accent" />
                          <span>Rankings ({listRankingsCount})</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {currentTab === "items" &&
            (selected ? (
              <ListDetail
                key={selected.id}
                list={selected}
                lists={lists}
                onSelectList={(id) => setSelectedId(id)}
                onOpenRankings={() => setCurrentTab("rankings")}
                run={run}
                onToast={showToast}
              />
            ) : (
              <section className="glass-card rounded-3xl p-6 text-center space-y-3">
                <h2 className="text-base font-bold text-ink">
                  No hay un listado seleccionado
                </h2>
                <p className="text-xs text-ink-muted">
                  Creá un listado primero para empezar a cargar elementos.
                </p>
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(true)}
                  className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-on-accent font-bold text-xs shadow-lg shadow-accent/20 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo listado</span>
                </button>
              </section>
            ))}

          {currentTab === "rankings" &&
            (selected ? (
              <Rankings
                listId={selected.id}
                listName={selected.name}
                lists={lists}
                onSelectList={(id) => setSelectedId(id)}
                items={selectedItems}
                rankings={selectedRankings}
                run={run}
                onToast={showToast}
              />
            ) : (
              <section className="glass-card rounded-3xl p-6 text-center space-y-3">
                <h2 className="text-base font-bold text-ink">
                  Sin listados para armar rankings
                </h2>
                <p className="text-xs text-ink-muted">
                  Creá un listado y agregá elementos para ordenarlos a tu gusto.
                </p>
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(true)}
                  className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-on-accent font-bold text-xs shadow-lg shadow-accent/20 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo listado</span>
                </button>
              </section>
            ))}

          {currentTab === "settings" && (
            <SettingsView
              run={run}
              onToast={showToast}
              onDataLoaded={(firstListId) => {
                setSelectedId(firstListId);
              }}
              theme={theme}
              onSelectTheme={setTheme}
            />
          )}
        </fieldset>
      </main>

      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto glass-panel rounded-2xl border border-emerald-500/35 px-4 py-3 shadow-2xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast("")}
            aria-label="Cerrar notificación"
            className="p-1 rounded-lg hover:bg-surface text-ink-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isListModalOpen && (
        <ModalSheet
          title="Nuevo listado"
          subtitle="Definí hasta 12 atributos personalizados para tus elementos."
          icon={Layers}
          closeLabel="Cerrar modal de nuevo listado"
          onClose={() => setIsListModalOpen(false)}
          onSubmit={submitList}
        >
          <label className="block space-y-1.5 text-xs font-semibold text-ink-muted">
            <span>Nombre del listado</span>
            <input
              required
              maxLength={120}
              placeholder="Vinos para volver a probar"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl bg-surface/90 border border-line/25 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          <label className="block space-y-1.5 text-xs font-semibold text-ink-muted">
            <span>Categoría</span>
            <input
              maxLength={120}
              placeholder="Vinos, bares, comidas…"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl bg-surface/90 border border-line/25 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <label className="flex-1 block space-y-1.5 text-xs font-semibold text-ink-muted">
                <span>Atributos del listado</span>
                <input
                  placeholder="Bodega, Cepa, Año"
                  value={fieldsInput}
                  onChange={(event) => setFieldsInput(event.target.value)}
                  onKeyDown={handleFieldKeyDown}
                  aria-describedby="fields-help"
                  className="w-full rounded-xl bg-surface/90 border border-line/25 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </label>
              <button
                type="button"
                onClick={addChipFromInput}
                className="touch-target px-3.5 py-2.5 rounded-xl bg-surface hover:bg-surface-2 text-accent border border-line/30 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent"
              >
                + Chip
              </button>
            </div>

            {chipFields.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {chipFields.map((chip, index) => (
                  <span
                    key={`${chip}-${index}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-semibold"
                  >
                    <span>{chip}</span>
                    <button
                      type="button"
                      onClick={() => removeChip(index)}
                      aria-label={`Quitar atributo ${chip}`}
                      className="hover:text-ink"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <small
              id="fields-help"
              className="block text-[11px] text-ink-muted"
            >
              Agregá chips o separá con comas hasta 12 atributos distintos.
            </small>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsListModalOpen(false)}
              className="touch-target px-4 py-2.5 rounded-xl bg-surface/90 hover:bg-surface text-ink text-xs font-semibold border border-line/25 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="touch-target px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-on-accent font-bold text-xs shadow-lg shadow-accent/20 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Crear listado
            </button>
          </div>
        </ModalSheet>
      )}

      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        listsCount={lists?.length}
        itemsCount={selectedItems.length}
        rankingsCount={selectedRankings.length}
      />
    </div>
  );
}
