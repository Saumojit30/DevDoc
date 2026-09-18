"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import * as d3 from "d3"
import { getGraphData, downloadGraph, getGraphVisualizationHtml } from "@/lib/api"
import type { GraphNode, GraphEdge } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
  fx?: number | null
  fy?: number | null
}

interface SimLink {
  source: string | SimNode
  target: string | SimNode
  relation: string
  weight: number
  properties: Record<string, any>
}

const TYPE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  Entity: { fill: "#4cd7f6", stroke: "#4cd7f680", text: "#101415" },
  DocumentChunk: { fill: "#cebdff", stroke: "#cebdff80", text: "#101415" },
  Document: { fill: "#f6c84c", stroke: "#f6c84c80", text: "#101415" },
  CodeFile: { fill: "#4cf6a7", stroke: "#4cf6a780", text: "#101415" },
  TextSummary: { fill: "#f6e44c", stroke: "#f6e44c80", text: "#101415" },
  Person: { fill: "#f64c6c", stroke: "#f64c6c80", text: "#101415" },
  Organization: { fill: "#f69c4c", stroke: "#f69c4c80", text: "#101415" },
  Location: { fill: "#6c9cf6", stroke: "#6c9cf680", text: "#101415" },
  Concept: { fill: "#9c4cf6", stroke: "#9c4cf680", text: "#101415" },
  default: { fill: "#889096", stroke: "#88909680", text: "#ffffff" },
}

const TYPE_ICONS: Record<string, string> = {
  Entity: "category",
  DocumentChunk: "description",
  Document: "article",
  CodeFile: "code",
  TextSummary: "summarize",
  default: "circle",
}

function getNodeStyle(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS.default
}

function getNodeRadius(type: string) {
  if (type === "Entity" || type === "Document") return 9
  if (type === "DocumentChunk") return 7
  return 6
}

function getNodeIcon(type: string) {
  return TYPE_ICONS[type] || TYPE_ICONS.default
}

export default function KnowledgeGraph({ projectName }: { projectName: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)

  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailNode, setDetailNode] = useState<GraphNode | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [searchQuery, setSearchQuery] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [viewMode, setViewMode] = useState<"d3" | "cognee">("d3")
  const [cogneeHtml, setCogneeHtml] = useState<string | null>(null)
  const [cogneeLoading, setCogneeLoading] = useState(false)

  const { toast } = useToast()

  const loadGraph = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getGraphData(projectName)
      setNodes(data.nodes)
      setEdges(data.edges)
    } catch {
      setNodes([])
      setEdges([])
    } finally {
      setLoading(false)
    }
  }, [projectName])

  useEffect(() => { loadGraph() }, [loadGraph])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width: Math.max(width, 400), height: Math.max(height, 300) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const { width, height } = dimensions
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("width", width).attr("height", height)

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => { g.attr("transform", event.transform) })
    svg.call(zoom)
    zoomRef.current = zoom

    const g = svg.append("g")

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    const filteredEdges = edges.filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))

    const simNodes: SimNode[] = nodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 60,
      y: height / 2 + (Math.random() - 0.5) * 60,
      vx: 0,
      vy: 0,
    }))

    const simLinks: SimLink[] = filteredEdges.map((e) => ({ ...e }))

    const link = g.append("g")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "var(--d3-link-stroke)")
      .attr("stroke-width", (d) => Math.max(0.5, Math.min(3, (d.weight || 1) * 1.5)))

    const linkLabel = g.append("g")
      .selectAll<SVGTextElement, SimLink>("text")
      .data(simLinks)
      .join("text")
      .text((d) => d.relation)
      .attr("fill", "var(--d3-link-label)")
      .attr("font-size", 8)
      .attr("font-family", "JetBrains Mono")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("pointer-events", "none")

    const nodeGroup = g.append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_event, d) => {
        const original = nodes.find((n) => n.id === d.id)
        if (original) {
          setDetailNode(original)
          setDetailsOpen(true)
          setSelectedNodeId(d.id)
        }
      })

    nodeGroup.append("circle")
      .attr("r", (d) => getNodeRadius(d.type))
      .attr("fill", (d) => getNodeStyle(d.type).fill)
      .attr("stroke", (d) => getNodeStyle(d.type).stroke)
      .attr("stroke-width", 2)
      .style("filter", (d) =>
        d.type === "Entity" || d.type === "Document"
          ? "drop-shadow(0 0 6px rgba(76,215,246,0.3))"
          : "none",
      )

    nodeGroup.append("text")
      .text((d) => (d.label.length > 20 ? d.label.slice(0, 18) + "\u2026" : d.label))
      .attr("dx", (d) => getNodeRadius(d.type) + 6)
      .attr("dy", 4)
      .attr("fill", "var(--d3-node-label)")
      .attr("font-size", 9)
      .attr("font-family", "JetBrains Mono")
      .attr("pointer-events", "none")

    const drag = d3.drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
    nodeGroup.call(drag)

    const sim = d3.forceSimulation(simNodes)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(100)
        .strength(0.25))
      .force("charge", d3.forceManyBody().strength(-150).distanceMax(400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimNode>().radius((d) => getNodeRadius(d.type) + 20))
      .alphaDecay(0.025)
      .on("tick", () => {
        link
          .attr("x1", (d) => (d.source as SimNode).x)
          .attr("y1", (d) => (d.source as SimNode).y)
          .attr("x2", (d) => (d.target as SimNode).x)
          .attr("y2", (d) => (d.target as SimNode).y)
        linkLabel
          .attr("x", (d) => ((d.source as SimNode).x + (d.target as SimNode).x) / 2)
          .attr("y", (d) => ((d.source as SimNode).y + (d.target as SimNode).y) / 2)
        nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`)
      })

    simRef.current = sim

    return () => { sim.stop() }
  }, [nodes, edges, dimensions])

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    const svg = d3.select(svgRef.current)
    const q = searchQuery.toLowerCase()

    svg.selectAll<SVGGElement, SimNode>("g g").each(function(d: any) {
      if (!d || !d.label) return
      const group = d3.select(this)
      const matchesSearch = !q || (d.label as string).toLowerCase().includes(q)
      const matchesType = !hiddenTypes.has(d.type)
      const visible = matchesSearch && matchesType
      group.style("opacity", visible ? "1" : "0.08")
      group.style("pointer-events", visible ? "auto" : "none")
    })
    svg.selectAll<SVGLineElement, SimLink>("line").each(function(d: any) {
      if (!d || !d.source || !d.target) return
      const source = d.source as SimNode
      const target = d.target as SimNode
      const visible = (!q || (source.label?.toLowerCase().includes(q) || target.label?.toLowerCase().includes(q)))
        && !hiddenTypes.has(source.type) && !hiddenTypes.has(target.type)
      d3.select(this).style("opacity", visible ? "1" : "0.05")
    })
    svg.selectAll<SVGTextElement, unknown>("text").each(function(d: any) {
      if (!d || !d.source || !d.target) return
      const source = d.source as SimNode
      const target = d.target as SimNode
      const visible = (!q || (source.label?.toLowerCase().includes(q) || target.label?.toLowerCase().includes(q)))
        && !hiddenTypes.has(source.type) && !hiddenTypes.has(target.type)
      d3.select(this).style("opacity", visible ? "1" : "0")
    })
  }, [searchQuery, hiddenTypes, nodes])

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    const svg = d3.select(svgRef.current)
    svg.selectAll<SVGGElement, SimNode>("g g circle")
      .attr("stroke-width", (d: any) => d.id === selectedNodeId ? 4 : 2)
      .attr("stroke", (d: any) => d.id === selectedNodeId
        ? "#fff"
        : getNodeStyle(d.type).stroke)
      .style("filter", (d: any) => d.id === selectedNodeId
        ? "drop-shadow(0 0 12px rgba(76,215,246,0.8))"
        : d.type === "Entity" || d.type === "Document"
          ? "drop-shadow(0 0 6px rgba(76,215,246,0.3))"
          : "none")
  }, [selectedNodeId, nodes])

  useEffect(() => {
    if (viewMode !== "cognee") return
    if (cogneeHtml) return
    setCogneeLoading(true)
    getGraphVisualizationHtml(projectName)
      .then(setCogneeHtml)
      .catch(() => toast({ title: "Visualization failed", description: "Could not load Cognee graph visualization.", variant: "error" }))
      .finally(() => setCogneeLoading(false))
  }, [viewMode, cogneeHtml, projectName, toast])

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.4)
  }

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7)
  }

  const handleReset = () => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity)
  }

  const handleDownloadGraph = async () => {
    setDownloading(true)
    try {
      const blob = await downloadGraph(projectName)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${projectName.replace(/\s+/g, "_")}_graph.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: "Download failed", description: "Could not download the graph visualization.", variant: "error" })
    } finally {
      setDownloading(false)
    }
  }

  const handleOpenInEditor = () => {
    if (!detailNode) return
    const source = detailNode.source || detailNode.properties?.source || ""
    if (!source) return
    if (source.startsWith("http://") || source.startsWith("https://")) {
      window.open(source, "_blank")
    } else {
      window.open(`vscode://file/${encodeURIComponent(source)}`, "_blank")
    }
  }

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

      <div ref={containerRef} className="absolute inset-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-on-surface/40 font-code-sm">Loading graph data...</div>
        ) : nodes.length === 0 && viewMode === "d3" ? (
          <div className="flex items-center justify-center h-full text-on-surface/40 font-code-sm">No graph data available. Ingest documentation first.</div>
        ) : viewMode === "cognee" ? (
          cogneeLoading ? (
            <div className="flex items-center justify-center h-full text-on-surface/40 font-code-sm">Loading Cognee visualization...</div>
          ) : cogneeHtml ? (
            <iframe srcDoc={cogneeHtml} className="w-full h-full border-0" title="Cognee Graph Visualization" />
          ) : (
            <div className="flex items-center justify-center h-full text-on-surface/40 font-code-sm">No visualization available.</div>
          )
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl pointer-events-auto">
        <div className="flex items-center gap-2 pr-6 border-r border-overlay-10">
          <button
            className="w-8 h-8 flex items-center justify-center hover:bg-overlay-10 rounded-full transition-colors"
            onClick={handleZoomIn}
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          <span className="font-code-sm text-code-sm text-on-surface/60">{nodes.length}</span>
          <button
            className="w-8 h-8 flex items-center justify-center hover:bg-overlay-10 rounded-full transition-colors"
            onClick={handleZoomOut}
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded text-primary font-code-sm text-code-sm"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <span className="material-symbols-outlined text-sm">filter_list</span> Filter
            </button>
            {filterOpen && (
              <div className="absolute bottom-full mb-2 left-0 glass-panel border border-overlay-10 rounded-xl p-4 shadow-2xl min-w-[180px] z-50">
                <label className="font-label-caps text-[10px] text-on-surface/40 block mb-3">NODE TYPES</label>
                {[...new Set(nodes.map(n => n.type))].length === 0 && (
                  <p className="text-[11px] text-on-surface/40">No types available</p>
                )}
                {[...new Set(nodes.map(n => n.type))].map(type => (
                  <label key={type} className="flex items-center gap-2 py-1.5 cursor-pointer font-code-sm text-code-sm text-on-surface/80 hover:text-on-surface">
                    <input
                      type="checkbox"
                      checked={!hiddenTypes.has(type)}
                      onChange={() => {
                        const next = new Set(hiddenTypes)
                        if (next.has(type)) next.delete(type); else next.add(type)
                        setHiddenTypes(next)
                      }}
                      className="accent-primary"
                    />
                    {type}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setViewMode(viewMode === "d3" ? "cognee" : "d3")}
            className={`flex items-center gap-2 px-3 py-1 rounded font-code-sm text-code-sm transition-all ${
              viewMode === "cognee"
                ? "bg-primary/10 border border-primary/20 text-primary"
                : "bg-surface-container-low hover:bg-surface-container-high border border-overlay-10 text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{viewMode === "cognee" ? "hub" : "schema"}</span>
            {viewMode === "cognee" ? "D3 View" : "Cognee View"}
          </button>
          <button
            className="flex items-center gap-2 px-3 py-1 bg-surface-container-low hover:bg-surface-container-high border border-overlay-10 rounded text-on-surface font-code-sm text-code-sm transition-all disabled:opacity-50"
            onClick={handleDownloadGraph}
            disabled={downloading}
          >
            <span className="material-symbols-outlined text-sm">{downloading ? "hourglass_top" : "download"}</span>
            {downloading ? "Downloading..." : "Download"}
          </button>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40 text-sm">search</span>
            <input
              className="bg-surface-container-lowest border border-overlay-5 rounded pl-10 pr-4 py-1.5 font-code-sm text-code-sm focus:border-primary outline-none w-48 transition-all"
              placeholder="Search node..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface/40 hover:text-on-surface"
                onClick={() => setSearchQuery("")}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          <button
            className="w-8 h-8 flex items-center justify-center hover:bg-overlay-10 rounded-full transition-colors"
            onClick={handleReset}
          >
            <span className="material-symbols-outlined">center_focus_strong</span>
          </button>
        </div>
      </div>

      <div className="absolute top-4 left-4 glass-panel border border-overlay-10 rounded-xl p-3 shadow-xl z-30 pointer-events-auto max-w-[200px]">
        <span className="font-label-caps text-[10px] text-on-surface/40 uppercase tracking-wider block mb-2">Node Legend</span>
        <div className="space-y-1.5 font-code-sm text-[11px]">
          {Object.entries(TYPE_COLORS).filter(([k]) => k !== "default").slice(0, 6).map(([type, style]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: style.fill }}></span>
              <span className="text-on-surface/80 truncate">{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 flex gap-4 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm border border-overlay-5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#4cd7f6]"></div>
          <span className="font-code-sm text-[11px] text-on-surface/60 uppercase tracking-tighter">{nodes.length} Nodes</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm border border-overlay-5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#cebdff]"></div>
          <span className="font-code-sm text-[11px] text-on-surface/60 uppercase tracking-tighter">{edges.length} Edges</span>
        </div>
      </div>

      <aside className={`absolute right-0 top-0 h-full w-80 glass-panel border-l border-overlay-10 p-6 transition-transform duration-500 ease-in-out z-40 ${detailsOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-headline-md text-headline-md text-primary">Node Details</h3>
          <button className="text-on-surface/40 hover:text-on-surface" onClick={() => { setDetailsOpen(false); setSelectedNodeId(null) }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {detailNode && (
          <div className="space-y-8">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">IDENTIFIER</label>
              <p className="font-headline-lg text-headline-lg text-on-surface break-words">{detailNode.label}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                detailNode.type?.toLowerCase() === "entity" ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"
              }`}>{detailNode.type}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-overlay-5 p-4 rounded-lg border border-overlay-10">
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-1">CONNECTIONS</label>
                <p className="font-headline-md text-headline-md text-on-surface">{edges.filter(e => e.source === detailNode.id || e.target === detailNode.id).length}</p>
              </div>
              <div className="bg-overlay-5 p-4 rounded-lg border border-overlay-10">
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-1">RANK</label>
                <p className="font-headline-md text-headline-md text-on-surface">{detailNode.properties?.topological_rank ?? "\u2014"}</p>
              </div>
            </div>
            {detailNode.properties?.description && (
              <div>
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-3">DESCRIPTION</label>
                <div className="bg-surface-container-lowest p-3 rounded border border-overlay-5 font-code-sm text-[11px] leading-relaxed text-on-surface-variant break-words">
                  {detailNode.properties.description}
                </div>
              </div>
            )}
            {detailNode.source && (
              <div>
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-3">SOURCE</label>
                <div className="bg-surface-container-lowest p-3 rounded border border-overlay-5 font-code-sm text-[11px] leading-relaxed text-on-surface-variant break-words">
                  {detailNode.source.slice(0, 200)}
                </div>
              </div>
            )}
            <div className="pt-6 border-t border-overlay-10">
              <button
                onClick={handleOpenInEditor}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">edit_note</span> Open in Editor
              </button>
            </div>
          </div>
        )}
      </aside>
    </motion.main>
  )
}
