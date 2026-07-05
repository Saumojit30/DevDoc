"use client"

export type TabId = "dashboard" | "chat" | "ingest" | "graph" | "memory"

interface SideNavBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  projectName: string
  onProjectChange: (name: string) => void
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "chat", label: "Chat", icon: "forum" },
  { id: "ingest", label: "Ingest", icon: "input" },
  { id: "graph", label: "Knowledge Graph", icon: "hub" },
  { id: "memory", label: "Memory Manager", icon: "memory" },
]

export default function SideNavBar({ activeTab, onTabChange, projectName, onProjectChange }: SideNavBarProps) {
  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface/80 backdrop-blur-xl border-t border-white/10 flex justify-around items-center h-16 z-50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
              activeTab === tab.id ? "text-primary" : "text-on-surface/40"
            }`}
          >
            <span className={`material-symbols-outlined text-xl ${activeTab === tab.id ? "fill" : ""}`}>{tab.icon}</span>
            <span className="text-[10px] font-label-caps">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 hidden md:flex flex-col bg-surface/65 backdrop-blur-[40px] border-r border-white/10 z-40 py-margin-safe transition-all duration-200">
        {/* Brand section */}
        <div className="px-6 mb-10 mt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
            </div>
            <div>
              <input
                className="font-headline-md text-[20px] text-primary tracking-tighter leading-none bg-transparent border-none focus:outline-none focus:border-b focus:border-primary/50 p-0 w-full"
                value={projectName}
                onChange={(e) => onProjectChange(e.target.value)}
                placeholder="Project name"
              />
              <p className="font-code-sm text-code-sm text-on-surface/40">Active Context</p>
            </div>
          </div>
          <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 font-label-caps text-label-caps">
            <span className="material-symbols-outlined text-lg">add</span>
            New Node
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-2 mb-4">
            <span className="font-label-caps text-[10px] text-on-surface/30 tracking-[0.2em] uppercase">Architecture</span>
          </div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 font-code-sm text-code-sm ${
                activeTab === tab.id
                  ? "text-primary font-bold bg-primary/10 active-glow"
                  : "text-on-surface/40 hover:bg-white/5 hover:text-on-surface"
              }`}
            >
              <span className={`material-symbols-outlined text-lg ${activeTab === tab.id ? "text-primary" : ""}`}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 pt-4 mt-auto border-t border-white/5 space-y-1">
          <button
            onClick={() => onTabChange("memory")}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200 font-code-sm text-code-sm ${
              activeTab === "memory" ? "text-primary font-bold bg-primary/10" : "text-on-surface/40 hover:bg-white/5 hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            Settings
          </button>
          <button className="flex items-center w-full px-3 py-2 rounded-lg transition-all duration-200 font-code-sm text-code-sm text-on-surface/40 hover:bg-white/5 hover:text-on-surface">
            <span className="material-symbols-outlined text-lg mr-3">help</span>
            Support
          </button>
        </div>
      </aside>
    </>
  )
}
