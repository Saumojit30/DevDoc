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
import ImprovePanel from "@/components/ImprovePanel"
import ProfilePanel from "@/components/ProfilePanel"
import { ToastProvider } from "@/hooks/use-toast"

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")
  const [projectName, setProjectName] = useState("Project Alpha")
  const [projects, setProjects] = useState(["Project Alpha"])
  const [improveOpen, setImproveOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const createProject = () => {
    const name = `Project ${projects.length + 1}`
    setProjects([...projects, name])
    setProjectName(name)
  }

  const switchProject = (name: string) => {
    setProjectName(name)
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-on-surface selection:bg-primary/30">
        <div className="radial-glow pointer-events-none fixed inset-0 z-0"></div>

        <SideNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectName={projectName}
          onProjectChange={setProjectName}
          projects={projects}
          onCreateProject={createProject}
          onSwitchProject={switchProject}
        />

        <TopNavBar activeTab={activeTab} onTabChange={setActiveTab} onOpenImprove={() => setImproveOpen(true)} onOpenProfile={() => setProfileOpen(true)} />

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && <Dashboard key="dashboard" projectName={projectName} onTabChange={setActiveTab} />}
          {activeTab === "chat" && <ChatInterface key="chat" projectName={projectName} onTabChange={setActiveTab} />}
          {activeTab === "ingest" && <IngestionPanel key="ingest" projectName={projectName} />}
          {activeTab === "graph" && <KnowledgeGraph key="graph" projectName={projectName} />}
          {activeTab === "memory" && <MemoryManager key="memory" projectName={projectName} onTabChange={setActiveTab} />}
        </AnimatePresence>

        <ImprovePanel open={improveOpen} onClose={() => setImproveOpen(false)} projectName={projectName} />
        <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />

        {/* FAB */}
        <button
          onClick={() => setActiveTab("chat")}
          className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary-container rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center group hover:scale-110 transition-all z-50"
        >
          <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform">bolt</span>
        </button>

        <ToastContainer />
      </div>
    </ToastProvider>
  )
}
