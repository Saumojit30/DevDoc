"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, Link, GitBranch, FileText, X, Loader2, CheckCircle, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { ingestDocs, ingestCode } from "@/lib/cognee"
import { useToast } from "@/hooks/use-toast"

interface IngestionPanelProps {
  project: string
}

interface HistoryItem {
  id: string
  type: "docs" | "code"
  label: string
  time: Date
}

export default function IngestionPanel({ project }: IngestionPanelProps) {
  const [urls, setUrls] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [repoPath, setRepoPath] = useState("")
  const [cloneUrl, setCloneUrl] = useState("")
  const [ingesting, setIngesting] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const { toast } = useToast()

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => [...prev, ...accepted])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/*": [".md", ".txt", ".json", ".yaml", ".yml"], "application/pdf": [".pdf"] },
  })

  const handleDocIngest = async () => {
    setIngesting(true)
    try {
      const urlList = urls.split("\n").filter(Boolean)
      await ingestDocs(project, urlList, files)
      toast({ title: "Docs ingested", description: `${urlList.length} URLs and ${files.length} files processed.`, variant: "success" })
      setHistory(prev => [{ id: Date.now().toString(), type: "docs", label: `${urlList.length} URLs, ${files.length} files`, time: new Date() }, ...prev])
      setUrls("")
      setFiles([])
    } catch (e: any) {
      toast({ title: "Ingest failed", description: e.message, variant: "error" })
    } finally {
      setIngesting(false)
    }
  }

  const handleCodeIngest = async () => {
    setIngesting(true)
    try {
      await ingestCode(project, repoPath || "sample-repo", cloneUrl || undefined)
      toast({ title: "Code ingested", description: "Code pipeline completed.", variant: "success" })
      setHistory(prev => [{ id: Date.now().toString(), type: "code", label: repoPath || cloneUrl || "sample-repo", time: new Date() }, ...prev])
    } catch (e: any) {
      toast({ title: "Code ingest failed", description: e.message, variant: "error" })
    } finally {
      setIngesting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Ingest Sources</h2>
        <p className="text-sm text-muted-foreground mt-1">Add documentation and code to the knowledge graph.</p>
      </div>

      {/* Docs */}
      <div className="card-elevated overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <Link className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Documentation</h3>
              <p className="text-xs text-muted-foreground">Markdown, PDF, OpenAPI specs</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="label text-xs">URLs</label>
            <textarea
              value={urls}
              onChange={e => setUrls(e.target.value)}
              placeholder="Paste URLs, one per line..."
              className="textarea h-20 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="label text-xs">Files</label>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                isDragActive
                  ? "border-primary bg-primary-50 scale-[1.02]"
                  : "border-input hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <input {...getInputProps()} />
              <Upload className={cn("w-6 h-6 mx-auto mb-2 transition-colors", isDragActive ? "text-primary" : "text-muted-foreground")} />
              <p className="text-sm text-muted-foreground">Drop files or click to upload</p>
              <p className="text-xs text-muted-foreground/60 mt-1">.md, .txt, .json, .yaml, .pdf</p>
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border bg-card">
                    <FileText className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <span className="text-muted-foreground/60">({(f.size / 1024).toFixed(0)}KB)</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleDocIngest} disabled={ingesting || (!urls.trim() && files.length === 0)} className="btn-primary w-full h-10">
            {ingesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Ingest Documentation
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="card-elevated overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Code Repository</h3>
              <p className="text-xs text-muted-foreground">Python, TypeScript, Go repos</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="label text-xs">Local path</label>
            <input value={repoPath} onChange={e => setRepoPath(e.target.value)} placeholder="./sample-repo" className="input text-xs" />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>
          <div className="space-y-1.5">
            <label className="label text-xs">Git clone URL</label>
            <input value={cloneUrl} onChange={e => setCloneUrl(e.target.value)} placeholder="https://github.com/user/repo.git" className="input text-xs" />
          </div>
          <button onClick={handleCodeIngest} disabled={ingesting} className="btn-outline w-full h-10">
            {ingesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GitBranch className="w-4 h-4 mr-2" />}
            Ingest Code
          </button>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent</span>
          </div>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs font-medium">{h.type === "docs" ? "Docs" : "Code"}</span>
                <span className="text-xs text-muted-foreground truncate">{h.label}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">
                  {h.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
