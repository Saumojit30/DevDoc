"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Sidebar, { type TabId } from "@/components/Sidebar"
import CommandPalette from "@/components/CommandPalette"
import Dashboard from "@/components/Dashboard"
import ChatInterface from "@/components/ChatInterface"
import IngestionPanel from "@/components/IngestionPanel"
import D3KnowledgeGraph from "@/components/D3KnowledgeGraph"
import MemoryManager from "@/components/MemoryManager"
import ToastContainer from "@/components/Toast"
import { ToastProvider } from "@/hooks/use-toast"

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: [0.25, 0.1, 0, 1] } },
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  const [projectName, setProjectName] = useState("dev-copilot-demo")
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setPaletteOpen(p => !p)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "5") {
        e.preventDefault()
        const tabs: TabId[] = ["dashboard", "chat", "ingest", "graph", "memory"]
        setActiveTab(tabs[parseInt(e.key) - 1])
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  return (
    <ToastProvider>
      <ToastContainer />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={(id) => setActiveTab(id as TabId)}
      />
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_34%),radial-gradient(circle_at_top_right,hsl(var(--accent)/0.08),transparent_30%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--background)))]" />
        <div className="relative flex min-h-screen">
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            projectName={projectName}
            onProjectChange={setProjectName}
          />
          <main className="flex-1 min-w-0 overflow-hidden">
            <div className="h-full overflow-y-auto scroll-smooth">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8"
                >
                  {activeTab === "dashboard" && <Dashboard project={projectName} />}
                  {activeTab === "chat" && <ChatInterface project={projectName} />}
                  {activeTab === "ingest" && <IngestionPanel project={projectName} />}
                  {activeTab === "graph" && <D3KnowledgeGraph project={projectName} height={600} />}
                  {activeTab === "memory" && <MemoryManager project={projectName} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
