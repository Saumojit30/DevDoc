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

export interface GraphNode {
  id: string
  label: string
  type: string
  source: string
  properties: Record<string, any>
}

export interface GraphEdge {
  source: string
  target: string
  relation: string
  weight: number
  properties: Record<string, any>
}

export interface GraphData {
  dataset: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  metrics: {
    num_nodes: number
    num_edges: number
  }
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

export async function ingestUrl(
  project: string,
  url: string,
  sessionId?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/ingest/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, url, sessionId }),
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

export async function getGraphData(project: string): Promise<GraphData> {
  const res = await fetch("/api/graph/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getGraphMetrics(project: string): Promise<any> {
  const res = await fetch("/api/graph/metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function downloadGraph(project: string): Promise<Blob> {
  const res = await fetch(`/api/graph/visualize?project=${encodeURIComponent(project)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.blob()
}

export async function getGraphVisualizationHtml(project: string): Promise<string> {
  const res = await fetch("/api/graph/visualize-html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.html
}

export async function getHealth(): Promise<{ status: string; version: string; latencyMs: number }> {
  const start = performance.now()
  const res = await fetch("/api/health")
  const data = await res.json()
  const end = performance.now()
  return { ...data, latencyMs: Math.round(end - start) }
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

export async function listSources(project: string): Promise<any[]> {
  const res = await fetch("/api/memory/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.sources || []
}
