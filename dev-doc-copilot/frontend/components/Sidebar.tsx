"use client"

import { Sun, Moon, LayoutDashboard, MessageSquare, GitGraph, Network, Settings } from "lucide-react"
import { useTheme } from "next-themes"

export type TabId = "dashboard" | "chat" | "ingest" | "graph" | "memory"

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  projectName: string
  onProjectChange: (name: string) => void
}

const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "ingest", label: "Ingest", icon: GitGraph },
  { id: "graph", label: "Graph", icon: Network },
  { id: "memory", label: "Memory", icon: Settings },
]

export default function Sidebar({ activeTab, onTabChange, projectName, onProjectChange }: SidebarProps) {
  const { theme, setTheme } = useTheme()

  return (
    <aside className="relative w-72 shrink-0 border-r border-border/70 flex flex-col bg-sidebar/95 backdrop-blur-xl shadow-sm">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-3 px-4 h-16 border-b border-border/70 shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
          <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-tight text-sidebar-foreground">Dev-Doc</h1>
          <p className="text-[10px] uppercase tracking-[0.24em] text-sidebar-muted">Copilot</p>
        </div>
      </div>

      <nav className="relative flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-sidebar-muted">
          Workspace
        </div>
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-active={activeTab === tab.id}
              className="nav-item w-full rounded-xl px-3 py-2.5"
            >
              <Icon className="w-4 h-4 shrink-0 text-sidebar-muted" />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-border/70 px-3 py-4 space-y-3 shrink-0">
        <div className="rounded-2xl border border-border/70 bg-surface/70 p-3 space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sidebar-muted">Project</label>
          <input
            value={projectName}
            onChange={e => onProjectChange(e.target.value)}
            placeholder="dev-copilot-demo"
            className="w-full h-9 rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
          />
        </div>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="nav-item w-full justify-between rounded-xl px-3 py-2.5 text-xs"
        >
          <span className="flex items-center gap-3">
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </span>
        </button>
      </div>
    </aside>
  )
}
