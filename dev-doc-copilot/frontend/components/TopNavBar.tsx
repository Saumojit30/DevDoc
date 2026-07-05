"use client"

import { type TabId } from "./SideNavBar"

interface TopNavBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const navLinks: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "chat", label: "Chat" },
  { id: "graph", label: "Knowledge Graph" },
]

export default function TopNavBar({ activeTab, onTabChange }: TopNavBarProps) {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-gutter h-16 bg-surface/65 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(76,215,246,0.1)]">
      <div className="flex items-center gap-8">
        <span className="font-display-lg text-[24px] text-primary tracking-tighter">Dev-Doc</span>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => onTabChange(link.id)}
              className={`font-headline-md text-[14px] transition-colors duration-300 ease-in-out pb-1 ${
                activeTab === link.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-on-surface/40 hover:text-primary border-b-2 border-transparent"
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-surface-container rounded-lg border border-white/5">
          <span className="material-symbols-outlined text-primary text-sm">connected_tv</span>
          <span className="font-code-sm text-code-sm text-on-surface/60">v2.4.0 Stable</span>
        </div>
        <span className="material-symbols-outlined text-on-surface/60">dark_mode</span>
        <button
          onClick={() => onTabChange("ingest")}
          className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded-lg hover:brightness-110 transition-all"
        >
          Ingest
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-code-sm text-sm font-bold">
            JD
          </div>
        </div>
      </div>
    </header>
  )
}
