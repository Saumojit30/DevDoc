"use client"

import { motion } from "framer-motion"
import { useState, useRef } from "react"
import { ingestDocs, ingestCode, ingestUrl } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function IngestionPanel({ projectName }: { projectName: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [repoUrl, setRepoUrl] = useState("")
  const [showRepoInput, setShowRepoInput] = useState(false)
  const [docUrl, setDocUrl] = useState("")
  const [showDocUrlInput, setShowDocUrlInput] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [logs, setLogs] = useState<string[]>([
    "[14:20:11] Initializing parser engine...",
    "[14:20:13] Scanning local buffer for .md extensions",
    "[14:20:15] Parsing auth_service.ts...",
    "[14:20:18] Identifying vector dependencies in /src/middleware/logger.v2",
  ])
  const [uploading, setUploading] = useState(false)
  const [cloning, setCloning] = useState(false)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Uploading ${files.length} file(s)...`])
    try {
      await ingestDocs(projectName, [], Array.from(files))
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✓ ${files.length} file(s) ingested successfully`])
      toast({ title: "Ingestion complete", description: `${files.length} file(s) processed`, variant: "success" })
    } catch (err: any) {
      const msg = err?.message || "Upload failed"
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✗ ${msg}`])
      toast({ title: "Ingestion failed", description: msg, variant: "error" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRepoClone = async () => {
    if (!repoUrl.trim()) return
    setCloning(true)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Cloning ${repoUrl}...`])
    try {
      await ingestCode(projectName, repoUrl.trim())
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✓ Repository cloned and ingested`])
      toast({ title: "Repo ingested", description: repoUrl.trim(), variant: "success" })
      setRepoUrl("")
      setShowRepoInput(false)
    } catch (err: any) {
      const msg = err?.message || "Clone failed"
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✗ ${msg}`])
      toast({ title: "Clone failed", description: msg, variant: "error" })
    } finally {
      setCloning(false)
    }
  }

  const handleDocFetch = async () => {
    if (!docUrl.trim()) return
    setFetching(true)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Fetching ${docUrl}...`])
    try {
      await ingestUrl(projectName, docUrl.trim())
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✓ Page fetched and ingested`])
      toast({ title: "URL ingested", description: docUrl.trim(), variant: "success" })
      setDocUrl("")
      setShowDocUrlInput(false)
    } catch (err: any) {
      const msg = err?.message || "Fetch failed"
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✗ ${msg}`])
      toast({ title: "Fetch failed", description: msg, variant: "error" })
    } finally {
      setFetching(false)
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="md:ml-64 pt-24 pb-12 px-6 md:px-gutter min-h-screen gradient-mesh"
    >
      <div className="max-w-[880px] mx-auto">
        <header className="mb-12">
          <h1 className="font-display-lg text-primary mb-2">Ingest Workflow</h1>
          <p className="text-on-surface/60 font-body-lg">Transform static documentation into a living knowledge graph.</p>
        </header>

        <div className="flex items-center justify-between mb-16 relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2 z-0"></div>
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center active-bloom">
              <span className="material-symbols-outlined text-background text-lg font-bold">upload_file</span>
            </div>
            <span className="font-label-caps text-[10px] text-primary">01 Upload Docs</span>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3 step-inactive">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface/60 text-lg">art_track</span>
            </div>
            <span className="font-label-caps text-[10px] text-on-surface/60">02 Connect Repos</span>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3 step-inactive">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface/60 text-lg">account_tree</span>
            </div>
            <span className="font-label-caps text-[10px] text-on-surface/60">03 Map Graph</span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.md,.txt,.js,.ts,.py,.json,.yaml,.yml,.toml,.rs,.go,.java"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div
          className="glass-panel p-12 rounded-xl flex flex-col items-center text-center border-dashed border-2 border-primary/20 hover:border-primary/40 transition-all cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-20 h-20 mb-6 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
          </div>
          <h2 className="font-headline-lg text-on-surface mb-2">Drop your documentation here</h2>
          <p className="text-on-surface/40 font-code-sm mb-8">Supports PDF, Markdown, and TXT (Max 50MB)</p>
          <button
            className="px-8 py-3 bg-primary text-background font-label-caps rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
            disabled={uploading}
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
          >
            {uploading ? "Uploading..." : "Select Files"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div
            className="glass-panel p-6 rounded-xl group hover:border-primary/30 transition-all cursor-pointer"
            onClick={() => setShowRepoInput(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">terminal</span>
              <span className="material-symbols-outlined text-on-surface/20 group-hover:text-primary transition-colors">arrow_forward</span>
            </div>
            <h3 className="font-headline-md text-on-surface mb-2">GitHub Integration</h3>
            <p className="text-on-surface/40 text-sm">Directly sync documentation from your GitHub repositories and wikis.</p>
          </div>
          <div
            className="glass-panel p-6 rounded-xl group hover:border-secondary/30 transition-all cursor-pointer"
            onClick={() => setShowRepoInput(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="material-symbols-outlined text-secondary text-3xl">webhook</span>
              <span className="material-symbols-outlined text-on-surface/20 group-hover:text-secondary transition-colors">arrow_forward</span>
            </div>
            <h3 className="font-headline-md text-on-surface mb-2">GitLab Support</h3>
            <p className="text-on-surface/40 text-sm">Import markdown files from private GitLab projects with OAuth2.</p>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <button
            className="flex items-center gap-2 text-on-surface/40 hover:text-accent transition-colors font-code-sm text-xs group"
            onClick={() => setShowDocUrlInput(true)}
          >
            <span className="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">language</span>
            Fetch documentation URL
          </button>
        </div>

        {showRepoInput && (
          <div className="mt-6 glass-panel p-4 rounded-xl border-primary/30">
            <div className="flex gap-4">
              <input
                className="flex-1 bg-surface-container-low border border-white/10 rounded-lg px-4 py-2.5 font-code-sm text-code-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-on-surface/20"
                placeholder="Enter repo URL or local path..."
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRepoClone() }}
              />
              <button
                className="px-6 py-2.5 bg-primary text-on-primary font-label-caps text-label-caps rounded-lg hover:brightness-110 transition-all disabled:opacity-50 whitespace-nowrap"
                disabled={cloning || !repoUrl.trim()}
                onClick={handleRepoClone}
              >
                {cloning ? "Cloning..." : "Clone & Ingest"}
              </button>
              <button
                className="px-3 py-2.5 text-on-surface/40 hover:text-on-surface transition-colors"
                onClick={() => { setShowRepoInput(false); setRepoUrl("") }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
        )}

        {showDocUrlInput && (
          <div className="mt-6 glass-panel p-4 rounded-xl border-accent/30">
            <div className="flex gap-4">
              <input
                className="flex-1 bg-surface-container-low border border-white/10 rounded-lg px-4 py-2.5 font-code-sm text-code-sm focus:outline-none focus:border-accent/50 transition-all placeholder:text-on-surface/20"
                placeholder="https://docs.example.com/page"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleDocFetch() }}
              />
              <button
                className="px-6 py-2.5 bg-accent text-background font-label-caps text-label-caps rounded-lg hover:brightness-110 transition-all disabled:opacity-50 whitespace-nowrap"
                disabled={fetching || !docUrl.trim()}
                onClick={handleDocFetch}
              >
                {fetching ? "Fetching..." : "Fetch & Ingest"}
              </button>
              <button
                className="px-3 py-2.5 text-on-surface/40 hover:text-on-surface transition-colors"
                onClick={() => { setShowDocUrlInput(false); setDocUrl("") }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 glass-panel p-6 rounded-xl border-primary/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary active-bloom animate-pulse"></div>
              <span className="font-code-sm text-xs text-primary uppercase tracking-widest">
                {uploading || cloning || fetching ? "Processing..." : "Processing Node Queue"}
              </span>
            </div>
          </div>
          <div className="bg-surface-container-lowest/50 p-4 rounded-lg font-code-sm text-sm border border-white/5 h-32 overflow-y-auto custom-scrollbar">
            {logs.map((log, i) => (
              <div key={i} className="text-on-surface/60 mb-1 flex items-center gap-2">
                <span className="text-primary/40 shrink-0">{log.match(/\[.*?\]/)?.[0]}</span>
                {log.replace(/\[.*?\]\s*/, "")}
                {i === logs.length - 1 && !uploading && !cloning && !fetching && <span className="terminal-cursor"></span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.main>
  )
}
