"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import SideNavBar, { type TabId } from "@/components/SideNavBar"
import TopNavBar from "@/components/TopNavBar"
import ToastContainer from "@/components/Toast"
import Dashboard from "@/components/Dashboard"
import ChatInterface from "@/components/ChatInterface"
import IngestionPanel from "@/components/IngestionPanel"
import KnowledgeGraph from "@/components/KnowledgeGraph"
import MemoryManager from "@/components/MemoryManager"
import { ToastProvider } from "@/hooks/use-toast"

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  const [projectName, setProjectName] = useState("Project Alpha")

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-on-surface selection:bg-primary/30">
        <div className="radial-glow pointer-events-none fixed inset-0 z-0"></div>

        <SideNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectName={projectName}
          onProjectChange={setProjectName}
        />

        <TopNavBar activeTab={activeTab} onTabChange={setActiveTab} />

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && <Dashboard key="dashboard" projectName={projectName} />}
          {activeTab === "chat" && <ChatInterface key="chat" projectName={projectName} />}
          {activeTab === "ingest" && <IngestionPanel key="ingest" projectName={projectName} />}
          {activeTab === "graph" && <KnowledgeGraph key="graph" projectName={projectName} />}
          {activeTab === "memory" && <MemoryManager key="memory" projectName={projectName} />}
        </AnimatePresence>

        {/* FAB */}
        <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary-container rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center group hover:scale-110 transition-all z-50">
          <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform">bolt</span>
        </button>

        <ToastContainer />
      </div>
    </ToastProvider>
  )
}
