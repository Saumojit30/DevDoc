"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { listSources, forgetSource, improveMemory } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { TabId } from "./SideNavBar"

interface SourceRow {
  id: string
  name: string
  type: string
  status: "indexed" | "stale"
}

export default function MemoryManager({ projectName, onTabChange }: { projectName: string; onTabChange?: (tab: TabId) => void }) {
  const [sources, setSources] = useState<SourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const sourcesData = await listSources(projectName)
        if (cancelled) return
        const rows: SourceRow[] = (sourcesData || []).map((s: any) => ({
          id: s.id || s.name || "unknown",
          name: s.name || s.label || "unknown",
          type: s.type || s.node_type || "document",
          status: "indexed" as const,
        }))
        setSources(rows)
      } catch {
        setSources([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectName])

  const handleDelete = async (id: string, name: string) => {
    try {
      await forgetSource(projectName, id)
      setSources(prev => prev.filter(s => s.id !== id))
      toast({ title: "Source forgotten", description: name, variant: "success" })
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Unknown error", variant: "error" })
    }
  }

  const handleFeedback = async () => {
    if (!feedback.trim()) return
    setSubmitting(true)
    try {
      await improveMemory(projectName, feedback.trim())
      toast({ title: "Feedback submitted", description: "Thank you for helping improve the knowledge graph", variant: "success" })
      setFeedback("")
    } catch (err: any) {
      toast({ title: "Feedback failed", description: err?.message || "Unknown error", variant: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const indexed = sources.filter(s => s.status === "indexed").length
  const stale = sources.filter(s => s.status === "stale").length

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="md:ml-64 pt-24 px-6 md:px-gutter pb-24 min-h-screen"
    >
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[160px] rounded-full pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <header className="max-w-[1200px] mx-auto mb-12">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">memory</span>
          <span className="font-code-sm text-code-sm text-on-surface/40">Memory Manager / Indexed Sources</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface mb-2">
              Memory<span className="text-primary"> Manager</span>
            </h1>
            <p className="text-on-surface/60 max-w-xl">View, manage, and prune the indexed documentation sources in your knowledge graph.</p>
          </div>
          <button
            onClick={() => onTabChange?.("ingest")}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg font-label-caps text-label-caps hover:bg-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Source
          </button>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <div className="glass-card p-4 rounded-xl border border-overlay-10">
          <p className="font-label-caps text-label-caps text-on-surface/40 mb-1">Total Sources</p>
          <h3 className="font-headline-lg text-headline-lg text-on-surface">{loading ? "..." : sources.length}</h3>
        </div>
        <div className="glass-card p-4 rounded-xl border border-overlay-10">
          <p className="font-label-caps text-label-caps text-on-surface/40 mb-1">Indexed</p>
          <h3 className="font-headline-lg text-headline-lg text-primary">{loading ? "..." : indexed}</h3>
        </div>
        <div className="glass-card p-4 rounded-xl border border-overlay-10">
          <p className="font-label-caps text-label-caps text-on-surface/40 mb-1">Stale</p>
          <h3 className="font-headline-lg text-headline-lg text-secondary">{loading ? "..." : stale}</h3>
        </div>
        <div className="glass-card p-4 rounded-xl border border-overlay-10">
          <p className="font-label-caps text-label-caps text-on-surface/40 mb-1">Last Sync</p>
          <h3 className="font-headline-lg text-headline-lg text-on-surface">{loading ? "..." : "Live"}</h3>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto glass-panel rounded-xl border border-overlay-10 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-surface-container-high/50 border-b border-overlay-10 font-label-caps text-label-caps text-on-surface/40 uppercase tracking-widest text-[11px]">
          <span>Name</span>
          <span>Type</span>
          <span>Status</span>
          <span className="col-span-2"></span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-on-surface/40 font-code-sm">Loading sources...</div>
        ) : sources.length === 0 ? (
          <div className="px-6 py-8 text-center text-on-surface/40 font-code-sm">No ingested sources yet. Use the Ingest tab to add documentation.</div>
        ) : (
          sources.map((src) => (
            <div key={src.id} className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-overlay-5 hover:bg-overlay-5 transition-colors items-center group">
              <div className="flex items-center gap-3 col-span-2">
                <span className={`w-2 h-2 rounded-full ${src.status === "indexed" ? "bg-primary" : "bg-error"}`}></span>
                <span className="font-code-sm text-code-sm text-on-surface truncate" title={src.name}>{src.name}</span>
              </div>
              <span className="font-code-sm text-code-sm text-on-surface/60">{src.type}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider inline-block w-fit ${src.status === "indexed" ? "bg-primary/10 text-primary" : "bg-error-container/30 text-error"}`}>{src.status}</span>
              <div className="flex justify-end">
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity destructive-btn p-1.5 rounded text-on-surface/40 hover:bg-error-container hover:text-error"
                  onClick={() => handleDelete(src.id, src.name)}
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="max-w-[1200px] mx-auto mt-12 glass-panel p-6 rounded-xl border border-overlay-10">
        <div className="flex items-center gap-4 mb-4">
          <span className="material-symbols-outlined text-primary">feedback</span>
          <h3 className="font-headline-md text-headline-md text-on-surface">Provide Feedback</h3>
        </div>
        <p className="text-on-surface/60 text-sm mb-4">Help improve the knowledge graph by providing feedback on memory quality.</p>
        <div className="flex gap-4">
          <input
            className="flex-1 bg-surface-container-low border border-overlay-10 rounded-lg px-4 py-2.5 font-code-sm text-code-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-on-surface/20"
            placeholder="Describe what you'd like to improve..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleFeedback() }}
          />
          <button
            className="px-6 py-2.5 bg-primary text-on-primary font-label-caps text-label-caps rounded-lg hover:brightness-110 transition-all disabled:opacity-50 whitespace-nowrap"
            disabled={submitting || !feedback.trim()}
            onClick={handleFeedback}
          >
            {submitting ? "Sending..." : "Submit"}
          </button>
        </div>
      </div>
    </motion.main>
  )
}
