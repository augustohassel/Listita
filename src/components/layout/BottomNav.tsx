import { Layers, Package, Settings, Trophy } from 'lucide-react'
import type { NavTab } from '../../types'

interface BottomNavProps {
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  listsCount?: number
  itemsCount?: number
  rankingsCount?: number
}

const TABS: { id: NavTab; label: string; icon: typeof Layers }[] = [
  { id: 'lists', label: 'Listados', icon: Layers },
  { id: 'items', label: 'Elementos', icon: Package },
  { id: 'rankings', label: 'Rankings', icon: Trophy },
  { id: 'settings', label: 'Ajustes', icon: Settings },
]

export function BottomNav({
  currentTab,
  onSelectTab,
  listsCount,
  itemsCount,
  rankingsCount,
}: BottomNavProps) {
  function badgeFor(id: NavTab) {
    if (id === 'lists') return listsCount
    if (id === 'items') return itemsCount
    if (id === 'rankings') return rankingsCount
    return undefined
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-slate-800/80 pb-[max(0.5rem,var(--safe-bottom))] pt-1.5 px-2"
    >
      <div className="max-w-lg mx-auto grid grid-cols-4 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id
          const count = badgeFor(tab.id)

          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(tab.id)}
              className={`touch-target relative flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-150 ${
                isActive
                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.4px]' : 'stroke-2'}`} />
                {count !== undefined && count > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none ${
                      isActive
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
