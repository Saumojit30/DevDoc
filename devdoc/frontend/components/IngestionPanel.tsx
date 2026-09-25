"use client"

import { motion } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { ingestDocs, ingestCode, ingestUrl } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function IngestionPanel({ projectName }: { projectName: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState<"files" | "repo" | "local" | "url">("files")
  const [repoUrl, setRepoUrl] = useState("")
  const [localPath, setLocalPath] = useState("")
  const [docUrl, setDocUrl] = useState("")
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [indexingLocal, setIndexingLocal] = useState(false)
  const [fetching, setFetching] = useState(false)

  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Cognee knowledge graph engine ready.`,
    `[${new Date().toLocaleTimeString()}] Waiting for ingestion source: PDF/Docs, Git Repo, Local Folder, or URL.`,
  ])

  const { toast } = useToast()
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logs])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (isDemo) {
      toast({ title: "Demo Mode Active", description: "Ingestion is disabled in public demo to preserve API quota.", variant: "info" })
      return
    }
    const fileList = Array.from(files)
    const pdfFiles = fileList.filter(f => f.name.toLowerCase().endsWith(".pdf"))

    setUploading(true)
    setIsProcessing(true)
    addLog(`Preparing upload of ${fileList.length} file(s)...`)
    if (pdfFiles.length > 0) {
      addLog(`📄 Detected ${pdfFiles.length} PDF file(s). Will extract text page-by-page before indexing.`)
    }

    try {
      addLog(`Sending files to server for parsing and Cognee memory ingestion...`)
      const res = await ingestDocs(projectName, [], fileList)
      if (res.logs && res.logs.length > 0) {
        res.logs.forEach(l => addLog(`[Server] ${l}`))
      }
      addLog(`✓ ${fileList.length} file(s) processed and indexed successfully into dataset '${res.dataset || projectName}'.`)
      toast({ title: "Ingestion Complete", description: `${fileList.length} file(s) indexed`, variant: "success" })
    } catch (err: any) {
      const msg = err?.message || "File ingestion failed"
      addLog(`✗ Error: ${msg}`)
      toast({ title: "Ingestion Failed", description: msg, variant: "error" })
    } finally {
      setUploading(false)
      setIsProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRepoClone = async () => {
    if (!repoUrl.trim()) return
    if (isDemo) {
      toast({ title: "Demo Mode Active", description: "Repository ingestion is disabled in public demo to preserve API quota.", variant: "info" })
      return
    }
    setCloning(true)
    setIsProcessing(true)
    const url = repoUrl.trim()
    addLog(`Step 1/4: Initializing Git clone for '${url}'...`)
    try {
      addLog(`Step 2/4: Cloning and extracting source tree...`)
      const res = await ingestCode(projectName, url)
      if (res.logs && res.logs.length > 0) {
        res.logs.forEach(l => addLog(`[Server] ${l}`))
      }
      addLog(`✓ Repository clone and CodeGraph indexing complete (${res.files_ingested ?? 0} files indexed).`)
      toast({ title: "Repo Ingested", description: `${res.files_ingested ?? 0} files indexed`, variant: "success" })
      setRepoUrl("")
    } catch (err: any) {
      const msg = err?.message || "Git clone failed"
      addLog(`✗ Error: ${msg}`)
      toast({ title: "Clone Failed", description: msg, variant: "error" })
    } finally {
      setCloning(false)
      setIsProcessing(false)
    }
  }

  const handleLocalFolderIngest = async () => {
    if (!localPath.trim()) return
    if (isDemo) {
      toast({ title: "Demo Mode Active", description: "Local folder ingestion is disabled in public demo to preserve API quota.", variant: "info" })
      return
    }
    setIndexingLocal(true)
    setIsProcessing(true)
    const pathVal = localPath.trim()
    addLog(`Step 1/4: Validating local folder path: '${pathVal}'...`)
    try {
      addLog(`Step 2/4: Scanning files, parsing AST syntax trees and building CodeGraph...`)
      const res = await ingestCode(projectName, pathVal)
      if (res.logs && res.logs.length > 0) {
        res.logs.forEach(l => addLog(`[Server] ${l}`))
      }
      addLog(`✓ Local folder ingested successfully: ${res.files_ingested ?? 0} file(s) indexed.`)
      toast({ title: "Local Folder Ingested", description: `${res.files_ingested ?? 0} files indexed`, variant: "success" })
      setLocalPath("")
    } catch (err: any) {
      const msg = err?.message || "Local folder ingestion failed"
      addLog(`✗ Error: ${msg}`)
      toast({ title: "Local Ingestion Failed", description: msg, variant: "error" })
    } finally {
      setIndexingLocal(false)
      setIsProcessing(false)
    }
  }

  const handleDocFetch = async () => {
    if (!docUrl.trim()) return
    if (isDemo) {
      toast({ title: "Demo Mode Active", description: "URL ingestion is disabled in public demo to preserve API quota.", variant: "info" })
      return
    }
    setFetching(true)
    setIsProcessing(true)
    const url = docUrl.trim()
    addLog(`Step 1/3: Fetching documentation from '${url}'...`)
    try {
      addLog(`Step 2/3: Parsing HTML/Markdown and creating memory embeddings...`)
      const res = await ingestUrl(projectName, url)
      if (res.logs && res.logs.length > 0) {
        res.logs.forEach(l => addLog(`[Server] ${l}`))
      }
      addLog(`✓ Web documentation indexed successfully (${res.chars ?? 0} chars).`)
      toast({ title: "URL Ingested", description: url, variant: "success" })
      setDocUrl("")
    } catch (err: any) {
      const msg = err?.message || "URL fetch failed"
      addLog(`✗ Error: ${msg}`)
      toast({ title: "Fetch Failed", description: msg, variant: "error" })
    } finally {
      setFetching(false)
      setIsProcessing(false)
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
        <header className="mb-8">
          <h1 className="font-display-lg text-primary mb-2">Ingest Workflow</h1>
          <p className="text-on-surface/60 font-body-lg">
            Transform documentation, PDFs, Git repositories, and local codebases into a living Cognee knowledge graph.
          </p>
        </header>

        {/* Ingestion Mode Navigation */}
        <div className="flex flex-wrap gap-2 p-1.5 glass-panel rounded-xl mb-8 border-overlay-10">
          <button
            onClick={() => setActiveTab("files")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-label-caps text-xs transition-all ${
              activeTab === "files"
                ? "bg-primary text-background font-bold shadow-md shadow-primary/20"
                : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Upload Docs & PDFs
          </button>
          <button
            onClick={() => setActiveTab("local")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-label-caps text-xs transition-all ${
              activeTab === "local"
                ? "bg-primary text-background font-bold shadow-md shadow-primary/20"
                : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-base">folder_open</span>
            Local Folder
          </button>
          <button
            onClick={() => setActiveTab("repo")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-label-caps text-xs transition-all ${
              activeTab === "repo"
                ? "bg-primary text-background font-bold shadow-md shadow-primary/20"
                : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-base">terminal</span>
            GitHub / Remote Git
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-label-caps text-xs transition-all ${
              activeTab === "url"
                ? "bg-primary text-background font-bold shadow-md shadow-primary/20"
                : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high/40"
            }`}
          >
            <span className="material-symbols-outlined text-base">language</span>
            Web Documentation
          </button>
        </div>

        {/* Mode 1: File Upload (PDF, MD, Code) */}
        {activeTab === "files" && (
          <div>
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
              <h2 className="font-headline-lg text-on-surface mb-2">Drop your documentation or PDF here</h2>
              <p className="text-on-surface/40 font-code-sm mb-6">
                Supports PDF (page-by-page parsing), Markdown, TXT, and Source files (Max 50MB)
              </p>
              <button
                className="px-8 py-3 bg-primary text-background font-label-caps rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
                disabled={uploading}
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              >
                <span className="material-symbols-outlined text-sm">attach_file</span>
                {uploading ? "Parsing & Uploading..." : "Select Files / PDFs"}
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: Local Folder Ingestion */}
        {activeTab === "local" && (
          <div className="glass-panel p-8 rounded-xl border-primary/20 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">folder_special</span>
              </div>
              <div>
                <h3 className="font-headline-md text-on-surface">Local Folder Ingestion</h3>
                <p className="text-on-surface/40 text-xs">
                  Scan and index a directory on your local filesystem (Windows or Linux paths).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-label-caps text-on-surface/60">Local Directory Path</label>
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-surface-container-low border border-overlay-10 rounded-lg px-4 py-2.5 font-code-sm text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-on-surface/20"
                  placeholder="e.g. F:\Projects\my-service or /home/user/projects/my-service"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLocalFolderIngest() }}
                />
                <button
                  className="px-6 py-2.5 bg-primary text-background font-label-caps text-xs rounded-lg hover:brightness-110 transition-all disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                  disabled={indexingLocal || !localPath.trim()}
                  onClick={handleLocalFolderIngest}
                >
                  <span className="material-symbols-outlined text-sm">account_tree</span>
                  {indexingLocal ? "Indexing Folder..." : "Ingest Folder"}
                </button>
              </div>
            </div>

            <div className="p-4 bg-surface-container-low rounded-lg border border-overlay-5 text-xs text-on-surface/60 space-y-1 font-code-sm">
              <div className="text-primary/80 font-bold mb-1">How Local Ingestion Works:</div>
              <div>• Scans and filters source files using standard code extensions (.py, .ts, .js, .go, .rs, etc.).</div>
              <div>• Builds full AST CodeGraph including functions, classes, and call hierarchies.</div>
              <div>• Tags graph nodes and indexes vector embeddings into Cognee memory.</div>
            </div>
          </div>
        )}

        {/* Mode 3: Remote Git Repo */}
        {activeTab === "repo" && (
          <div className="glass-panel p-8 rounded-xl border-primary/20 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">terminal</span>
              </div>
              <div>
                <h3 className="font-headline-md text-on-surface">Git Repository Ingestion</h3>
                <p className="text-on-surface/40 text-xs">
                  Clone and parse public or accessible GitHub / GitLab repositories.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-label-caps text-on-surface/60">Repository URL</label>
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-surface-container-low border border-overlay-10 rounded-lg px-4 py-2.5 font-code-sm text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-on-surface/20"
                  placeholder="https://github.com/fastapi/fastapi or https://github.com/org/repo/tree/main/src"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRepoClone() }}
                />
                <button
                  className="px-6 py-2.5 bg-primary text-background font-label-caps text-xs rounded-lg hover:brightness-110 transition-all disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                  disabled={cloning || !repoUrl.trim()}
                  onClick={handleRepoClone}
                >
                  <span className="material-symbols-outlined text-sm">cloud_download</span>
                  {cloning ? "Cloning & Ingesting..." : "Clone & Ingest"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mode 4: Web Doc URL */}
        {activeTab === "url" && (
          <div className="glass-panel p-8 rounded-xl border-accent/20 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <span className="material-symbols-outlined text-xl">language</span>
              </div>
              <div>
                <h3 className="font-headline-md text-on-surface">Web Documentation Ingestion</h3>
                <p className="text-on-surface/40 text-xs">
                  Fetch and extract clean Markdown from developer docs, guides, and wikis.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-label-caps text-on-surface/60">Documentation Page URL</label>
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-surface-container-low border border-overlay-10 rounded-lg px-4 py-2.5 font-code-sm text-sm focus:outline-none focus:border-accent/50 transition-all placeholder:text-on-surface/20"
                  placeholder="https://docs.pydantic.dev/latest/concepts/models/"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleDocFetch() }}
                />
                <button
                  className="px-6 py-2.5 bg-accent text-background font-label-caps text-xs rounded-lg hover:brightness-110 transition-all disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                  disabled={fetching || !docUrl.trim()}
                  onClick={handleDocFetch}
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  {fetching ? "Fetching..." : "Fetch & Ingest"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Processing & Ingestion Console */}
        <div className="mt-8 glass-panel p-6 rounded-xl border-primary/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isProcessing ? "bg-primary active-bloom animate-pulse" : "bg-primary/40"}`}></div>
              <span className="font-code-sm text-xs text-primary uppercase tracking-widest font-semibold">
                {isProcessing ? "Active Ingestion Stream" : "Ingestion Activity Log"}
              </span>
            </div>
            <button
              onClick={() => setLogs([`[${new Date().toLocaleTimeString()}] Activity log cleared.`])}
              className="text-[11px] text-on-surface/40 hover:text-on-surface/80 font-code-sm transition-colors"
            >
              Clear Log
            </button>
          </div>

          <div
            ref={logsContainerRef}
            className="bg-surface-container-lowest/70 p-4 rounded-lg font-code-sm text-xs border border-overlay-5 h-44 overflow-y-auto custom-scrollbar space-y-1.5"
          >
            {logs.map((log, i) => {
              const timeMatch = log.match(/\[.*?\]/)
              const timeStr = timeMatch ? timeMatch[0] : ""
              const restStr = log.replace(/\[.*?\]\s*/, "")
              const isError = restStr.includes("✗") || restStr.toLowerCase().includes("error")
              const isSuccess = restStr.includes("✓") || restStr.toLowerCase().includes("complete") || restStr.toLowerCase().includes("success")
              const isStep = restStr.toLowerCase().includes("step ") || restStr.includes("📄")

              return (
                <div key={i} className={`flex items-start gap-2 leading-relaxed ${
                  isError ? "text-error" : isSuccess ? "text-primary" : isStep ? "text-secondary" : "text-on-surface/70"
                }`}>
                  <span className="text-primary/40 shrink-0 select-none">{timeStr}</span>
                  <span className="break-all">{restStr}</span>
                  {i === logs.length - 1 && !isProcessing && <span className="terminal-cursor"></span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.main>
  )
}
