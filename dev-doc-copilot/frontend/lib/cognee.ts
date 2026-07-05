export interface CogneeMessage {
  role: "user" | "assistant" | "system"
  content: string
  sources?: SourceNode[]
  session_id?: string
}

export interface SourceNode {
  id: string
  type: "doc" | "code" | "function" | "class" | "module"
  name: string
  source: string
  line?: number
}

export interface Project {
  id: string
  name: string
  datasets: string[]
  sources: IngestedSource[]
}

export interface IngestedSource {
  id: string
  type: "url" | "file" | "repo"
  name: string
  status: "pending" | "ingested" | "error"
  createdAt: string
}

const API_BASE = "/api"

export async function chatQuery(
  project: string,
  question: string,
  onlyContext = false,
  sessionId?: string,
): Promise<CogneeMessage> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, question, onlyContext, sessionId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function ingestDocs(
  project: string,
  urls: string[],
  files: File[],
  sessionId?: string,
): Promise<void> {
  const formData = new FormData()
  formData.append("project", project)
  urls.forEach(u => formData.append("urls", u))
  files.forEach(f => formData.append("files", f))
  if (sessionId) formData.append("sessionId", sessionId)

  const res = await fetch(`${API_BASE}/ingest/docs`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function ingestCode(
  project: string,
  repoPath: string,
  cloneUrl?: string,
  sessionId?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/ingest/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, repoPath, cloneUrl, sessionId }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function forgetSource(
  project: string,
  source: string,
  sessionId?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/memory/forget`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, source, sessionId }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function improveMemory(
  project: string,
  feedback: string,
  sessionIds?: string[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/memory/improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, feedback, sessionIds }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function getGraphData(project: string): Promise<{ nodes: any[]; edges: any[]; metrics: any }> {
  const res = await fetch("/api/graph/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getGraphInventory(project: string, samplesPerType = 5): Promise<any> {
  const res = await fetch("/api/graph/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, samples_per_type: samplesPerType }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
