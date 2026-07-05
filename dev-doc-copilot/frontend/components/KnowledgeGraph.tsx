"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { getGraphData } from "@/lib/api"

interface GraphNode {
  id: string
  label: string
  type: string
  source: string
}

interface GraphEdge {
  source: string
  target: string
  relation: string
  weight: number
}

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  code: { bg: "bg-primary/20", border: "border-primary", text: "text-primary", glow: "node-glow-cyan" },
  doc: { bg: "bg-secondary/20", border: "border-secondary", text: "text-secondary", glow: "node-glow-violet" },
  default: { bg: "bg-on-surface/10", border: "border-on-surface/20", text: "text-on-surface/60", glow: "" },
}

const NODE_ICONS: Record<string, string> = {
  code: "terminal",
  doc: "description",
  function: "code",
  class: "dataset",
  module: "folder",
}

function getNodeColor(type: string) {
  const key = type?.toLowerCase() || "default"
  return NODE_COLORS[key] || NODE_COLORS.default
}

function getNodeIcon(type: string) {
  const key = type?.toLowerCase() || "default"
  return NODE_ICONS[key] || "hub"
}

export default function KnowledgeGraph({ projectName }: { projectName: string }) {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailNode, setDetailNode] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getGraphData(projectName)
        if (cancelled) return
        if (data.nodes) setNodes(data.nodes.slice(0, 20))
        if (data.edges) setEdges(data.edges.slice(0, 30))
      } catch {
        // leave empty — graph will show empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const openDetails = useCallback((node: GraphNode) => {
    setDetailNode(node)
    setDetailsOpen(true)
  }, [])

  // Position nodes in a circle layout
  const nodePositions = nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI
    const cx = 500
    const cy = 300
    const radius = Math.min(cx, cy) * 0.5
    return {
      x: cx + radius * Math.cos(angle) - 20,
      y: cy + radius * Math.sin(angle) - 20,
    }
  })

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="ml-64 mt-16 h-[calc(100vh-64px)] relative graph-grid overflow-hidden"
    >
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[160px]"></div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="eg" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#4cd7f6" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#cebdff" stopOpacity={0.15} />
          </linearGradient>
        </defs>
        {edges.map((edge, i) => {
          const srcIdx = nodes.findIndex(n => n.id === edge.source)
          const tgtIdx = nodes.findIndex(n => n.id === edge.target)
          if (srcIdx === -1 || tgtIdx === -1) return null
          const s = nodePositions[srcIdx]
          const t = nodePositions[tgtIdx]
          return (
            <line key={i} stroke="url(#eg)" strokeWidth={1} x1={s.x + 20} x2={t.x + 20} y1={s.y + 20} y2={t.y + 20} />
          )
        })}
      </svg>

      <div className="absolute inset-0 p-12">
        {loading ? (
          <div className="flex items-center justify-center h-full text-on-surface/40 font-code-sm">Loading graph data...</div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-on-surface/40 font-code-sm">No graph data available. Ingest documentation first.</div>
        ) : (
          nodes.map((node, i) => {
            const pos = nodePositions[i]
            const colors = getNodeColor(node.type)
            return (
              <div
                key={node.id}
                className="absolute group cursor-pointer"
                style={{ left: pos.x, top: pos.y }}
                onClick={() => openDetails(node)}
              >
                <div className="relative flex items-center justify-center">
                  <div className={`w-10 h-10 ${colors.bg} ${colors.border} border rounded-full flex items-center justify-center ${colors.glow} transition-transform group-hover:scale-125`}>
                    <span className={`material-symbols-outlined ${colors.text}`}>{getNodeIcon(node.type)}</span>
                  </div>
                  <div className="absolute top-12 bg-surface/80 px-2 py-1 border border-white/10 rounded backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    <span className={`font-code-sm text-code-sm ${colors.text}`}>{node.label}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl">
        <div className="flex items-center gap-2 pr-6 border-r border-white/10">
          <button className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined">add</span>
          </button>
          <span className="font-code-sm text-code-sm text-on-surface/60">{nodes.length}</span>
          <button className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined">remove</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded text-primary font-code-sm text-code-sm">
            <span className="material-symbols-outlined text-sm">filter_list</span> Filter
          </button>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40 text-sm">search</span>
            <input className="bg-surface-container-lowest border border-white/5 rounded pl-10 pr-4 py-1.5 font-code-sm text-code-sm focus:border-primary outline-none w-48 transition-all" placeholder="Search node..." type="text" />
          </div>
          <button className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined">center_focus_strong</span>
          </button>
        </div>
      </div>

      <div className="absolute top-4 right-4 flex gap-4 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm border border-white/5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#4cd7f6]"></div>
          <span className="font-code-sm text-[11px] text-on-surface/60 uppercase tracking-tighter">{nodes.length} Nodes</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm border border-white/5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#cebdff]"></div>
          <span className="font-code-sm text-[11px] text-on-surface/60 uppercase tracking-tighter">{edges.length} Edges</span>
        </div>
      </div>

      <aside className={`absolute right-0 top-0 h-full w-80 glass-panel border-l border-white/10 p-6 transition-transform duration-500 ease-in-out z-40 ${detailsOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-headline-md text-headline-md text-primary">Node Details</h3>
          <button className="text-on-surface/40 hover:text-on-surface" onClick={() => setDetailsOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {detailNode && (
          <div className="space-y-8">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">IDENTIFIER</label>
              <p className="font-headline-lg text-headline-lg text-on-surface break-words">{detailNode.label}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                detailNode.type?.toLowerCase() === "code" ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"
              }`}>{detailNode.type}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-1">CONNECTIONS</label>
                <p className="font-headline-md text-headline-md text-on-surface">{edges.filter(e => e.source === detailNode.id || e.target === detailNode.id).length}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-1">SOURCE</label>
                <p className="font-code-sm text-code-sm text-on-surface truncate">{detailNode.source.slice(0, 24) || "—"}</p>
              </div>
            </div>
            {detailNode.source && (
              <div>
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-3">SOURCE PATH</label>
                <div className="bg-surface-container-lowest p-3 rounded border border-white/5 font-code-sm text-[11px] leading-relaxed text-on-surface-variant break-words">
                  {detailNode.source}
                </div>
              </div>
            )}
            <div className="pt-6 border-t border-white/10">
              <button className="w-full py-3 bg-primary text-on-primary-container font-bold rounded hover:brightness-110 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">edit_note</span> Open Editor
              </button>
              <button className="w-full mt-3 py-3 border border-white/10 text-on-surface hover:bg-white/5 font-bold rounded transition-all">
                Graph Context Analysis
              </button>
            </div>
          </div>
        )}
      </aside>
    </motion.main>
  )
}
