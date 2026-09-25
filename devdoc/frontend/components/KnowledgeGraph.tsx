"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import * as d3 from "d3"
import { getGraphData, downloadGraph, getGraphVisualizationHtml, getSymbolDetails } from "@/lib/api"
import type { GraphNode, GraphEdge, SymbolDetailsResponse } from "@/lib/api"
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

// IDE-standard semantic color palette
const TYPE_COLORS: Record<string, { fill: string; stroke: string; text: string; bg: string }> = {
  Module: { fill: "#06b6d4", stroke: "#0891b2", text: "#ffffff", bg: "rgba(6, 182, 212, 0.15)" },
  CodeFile: { fill: "#06b6d4", stroke: "#0891b2", text: "#ffffff", bg: "rgba(6, 182, 212, 0.15)" },
  File: { fill: "#06b6d4", stroke: "#0891b2", text: "#ffffff", bg: "rgba(6, 182, 212, 0.15)" },
  Class: { fill: "#10b981", stroke: "#059669", text: "#ffffff", bg: "rgba(16, 185, 129, 0.15)" },
  Struct: { fill: "#10b981", stroke: "#059669", text: "#ffffff", bg: "rgba(16, 185, 129, 0.15)" },
  Interface: { fill: "#8b5cf6", stroke: "#7c3aed", text: "#ffffff", bg: "rgba(139, 92, 246, 0.15)" },
  Trait: { fill: "#8b5cf6", stroke: "#7c3aed", text: "#ffffff", bg: "rgba(139, 92, 246, 0.15)" },
  Type: { fill: "#8b5cf6", stroke: "#7c3aed", text: "#ffffff", bg: "rgba(139, 92, 246, 0.15)" },
  Function: { fill: "#f59e0b", stroke: "#d97706", text: "#0f172a", bg: "rgba(245, 158, 11, 0.15)" },
  Method: { fill: "#f59e0b", stroke: "#d97706", text: "#0f172a", bg: "rgba(245, 158, 11, 0.15)" },
  Document: { fill: "#3b82f6", stroke: "#2563eb", text: "#ffffff", bg: "rgba(59, 130, 246, 0.15)" },
  DocumentChunk: { fill: "#3b82f6", stroke: "#2563eb", text: "#ffffff", bg: "rgba(59, 130, 246, 0.15)" },
  Documentation: { fill: "#3b82f6", stroke: "#2563eb", text: "#ffffff", bg: "rgba(59, 130, 246, 0.15)" },
  Spec: { fill: "#3b82f6", stroke: "#2563eb", text: "#ffffff", bg: "rgba(59, 130, 246, 0.15)" },
  TextSummary: { fill: "#3b82f6", stroke: "#2563eb", text: "#ffffff", bg: "rgba(59, 130, 246, 0.15)" },
  Entity: { fill: "#64748b", stroke: "#475569", text: "#ffffff", bg: "rgba(100, 116, 139, 0.15)" },
  default: { fill: "#64748b", stroke: "#475569", text: "#ffffff", bg: "rgba(100, 116, 139, 0.15)" },
}

function getNodeStyle(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS.default
}

function getNodeGlyph(type: string): string {
  switch (type) {
    case "Function":
    case "Method":
      return "ƒ"
    case "Class":
    case "Struct":
      return "C"
    case "Interface":
    case "Trait":
    case "Type":
      return "I"
    case "Module":
    case "CodeFile":
    case "File":
      return "📁"
    case "Document":
    case "DocumentChunk":
    case "Documentation":
    case "Spec":
    case "TextSummary":
      return "📄"
    default:
      return "•"
  }
}

function getNodeRadius(type: string) {
  if (type === "Module" || type === "Class" || type === "Document") return 14
  if (type === "Function" || type === "Interface" || type === "Struct") return 12
  if (type === "Method" || type === "DocumentChunk" || type === "Trait" || type === "Type") return 11
  return 10
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
  const [symbolDetails, setSymbolDetails] = useState<SymbolDetailsResponse | null>(null)
  const [symbolLoading, setSymbolLoading] = useState(false)
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

  const handleSelectNode = useCallback(async (node: GraphNode) => {
    setDetailNode(node)
    setSelectedNodeId(node.id)
    setDetailsOpen(true)
    setSymbolDetails(null)

    if (node.properties?.file_path || node.properties?.symbol_type) {
      setSymbolLoading(true)
      try {
        const details = await getSymbolDetails(projectName, node.id)
        setSymbolDetails(details)
      } catch {
        setSymbolDetails(null)
      } finally {
        setSymbolLoading(false)
      }
    }
  }, [projectName])

  const handleCloseInspector = useCallback(() => {
    setDetailsOpen(false)
    setSelectedNodeId(null)
  }, [])

  // Render D3 Simulation and SVGs
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const { width, height } = dimensions
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("width", width).attr("height", height)

    // Arrowhead markers definitions
    const defs = svg.append("defs")

    const createMarker = (id: string, color: string) => {
      defs.append("marker")
        .attr("id", id)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color)
    }

    createMarker("arrow-calls", "#f59e0b")
    createMarker("arrow-imports", "#06b6d4")
    createMarker("arrow-extends", "#8b5cf6")
    createMarker("arrow-default", "#64748b")

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => { g.attr("transform", event.transform) })
    svg.call(zoom)
    zoomRef.current = zoom

    // Canvas background click clears selection & subgraph focus
    svg.on("click", (event) => {
      if (event.target === svgRef.current) {
        setSelectedNodeId(null)
        setDetailsOpen(false)
      }
    })

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

    // 1. Semantic Links Rendering
    const linkGroup = g.append("g").attr("class", "links")
    const link = linkGroup
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d) => {
        if (d.relation === "CALLS" || d.relation === "INVOKES") return "#f59e0b"
        if (d.relation === "IMPORTS" || d.relation === "DEPENDS_ON") return "#06b6d4"
        if (d.relation === "EXTENDS" || d.relation === "IMPLEMENTS") return "#8b5cf6"
        if (d.relation === "DEFINES" || d.relation === "CONTAINS") return "#64748b"
        return "var(--d3-link-stroke)"
      })
      .attr("stroke-dasharray", (d) => {
        if (d.relation === "IMPORTS" || d.relation === "DEPENDS_ON") return "6, 4"
        if (d.relation === "EXTENDS" || d.relation === "IMPLEMENTS") return "2, 4"
        return "none"
      })
      .attr("marker-end", (d) => {
        if (d.relation === "CALLS" || d.relation === "INVOKES") return "url(#arrow-calls)"
        if (d.relation === "IMPORTS" || d.relation === "DEPENDS_ON") return "url(#arrow-imports)"
        if (d.relation === "EXTENDS" || d.relation === "IMPLEMENTS") return "url(#arrow-extends)"
        return null
      })
      .attr("stroke-width", (d) => Math.max(1, Math.min(3, (d.weight || 1) * 1.5)))
      .attr("stroke-opacity", 0.75)

    // 2. Link Labels
    const linkLabelGroup = g.append("g").attr("class", "link-labels")
    const linkLabel = linkLabelGroup
      .selectAll<SVGTextElement, SimLink>("text")
      .data(simLinks)
      .join("text")
      .text((d) => d.relation)
      .attr("fill", "var(--d3-link-label)")
      .attr("font-size", 8)
      .attr("font-family", "JetBrains Mono, ui-monospace, monospace")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("pointer-events", "none")
      .attr("opacity", 0.7)

    // 3. Node Groups with Badges & Labels
    const nodeGroup = g.append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation()
        const original = nodes.find((n) => n.id === d.id)
        if (original) {
          handleSelectNode(original)
        }
      })

    // Outer Circle
    nodeGroup.append("circle")
      .attr("r", (d) => getNodeRadius(d.type))
      .attr("fill", (d) => getNodeStyle(d.type).fill)
      .attr("stroke", (d) => getNodeStyle(d.type).stroke)
      .attr("stroke-width", 2)
      .style("filter", (d) =>
        d.type === "Module" || d.type === "Class"
          ? `drop-shadow(0 0 8px ${getNodeStyle(d.type).fill}50)`
          : `drop-shadow(0 0 4px ${getNodeStyle(d.type).fill}30)`,
      )

    // Glyph Badge inside Circle
    nodeGroup.append("text")
      .attr("class", "node-glyph")
      .text((d) => getNodeGlyph(d.type))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", (d) => getNodeStyle(d.type).text)
      .attr("font-size", (d) => (d.type === "Module" || d.type === "Document" ? 10 : 11))
      .attr("font-family", "JetBrains Mono, ui-monospace, monospace")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")

    // Label beside Circle
    nodeGroup.append("text")
      .attr("class", "node-label")
      .text((d) => (d.label.length > 24 ? d.label.slice(0, 22) + "\u2026" : d.label))
      .attr("dx", (d) => getNodeRadius(d.type) + 8)
      .attr("dy", "0.35em")
      .attr("fill", "var(--d3-node-label)")
      .attr("font-size", 9.5)
      .attr("font-family", "JetBrains Mono, ui-monospace, monospace")
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
        .distance(115)
        .strength(0.25))
      .force("charge", d3.forceManyBody().strength(-170).distanceMax(480))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimNode>().radius((d) => getNodeRadius(d.type) + 24))
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
  }, [nodes, edges, dimensions, handleSelectNode])

  // Filter & Search & Subgraph Focus Mode handling
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    const svg = d3.select(svgRef.current)
    const q = searchQuery.toLowerCase()

    // 1. Calculate 1st-degree Subgraph Neighbors if a node is selected
    let focusNeighbors: Set<string> | null = null
    if (selectedNodeId) {
      focusNeighbors = new Set<string>([selectedNodeId])
      edges.forEach((e) => {
        const s = typeof e.source === "object" ? (e.source as any).id : e.source
        const t = typeof e.target === "object" ? (e.target as any).id : e.target
        if (s === selectedNodeId) focusNeighbors?.add(t)
        if (t === selectedNodeId) focusNeighbors?.add(s)
      })
    }

    // 2. Update Node Opacity & Highlight
    svg.selectAll<SVGGElement, SimNode>("g.nodes g").each(function(d: any) {
      if (!d || !d.label) return
      const group = d3.select(this)
      const matchesSearch = !q || (d.label as string).toLowerCase().includes(q)
      const matchesType = !hiddenTypes.has(d.type)
      const matchesFocus = !focusNeighbors || focusNeighbors.has(d.id)

      const isFocused = d.id === selectedNodeId
      const isNeighbor = focusNeighbors ? focusNeighbors.has(d.id) : false

      let opacity = 1.0
      if (!matchesSearch || !matchesType) {
        opacity = 0.06
      } else if (focusNeighbors) {
        opacity = matchesFocus ? 1.0 : 0.12
      }

      group.style("opacity", String(opacity))
      group.style("pointer-events", opacity < 0.1 ? "none" : "auto")

      const circle = group.select<SVGCircleElement>("circle")
      if (isFocused) {
        circle
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 3.5)
          .style("filter", `drop-shadow(0 0 16px ${getNodeStyle(d.type).fill}) drop-shadow(0 0 4px #ffffff)`)
      } else if (isNeighbor) {
        circle
          .attr("stroke", getNodeStyle(d.type).fill)
          .attr("stroke-width", 2.5)
          .style("filter", `drop-shadow(0 0 10px ${getNodeStyle(d.type).fill}80)`)
      } else {
        circle
          .attr("stroke", getNodeStyle(d.type).stroke)
          .attr("stroke-width", 2)
          .style("filter", d.type === "Module" || d.type === "Class"
            ? `drop-shadow(0 0 8px ${getNodeStyle(d.type).fill}50)`
            : `drop-shadow(0 0 4px ${getNodeStyle(d.type).fill}30)`)
      }
    })

    // 3. Update Link Opacity & Highlight
    svg.selectAll<SVGLineElement, SimLink>("g.links line").each(function(d: any) {
      if (!d || !d.source || !d.target) return
      const sId = typeof d.source === "object" ? d.source.id : d.source
      const tId = typeof d.target === "object" ? d.target.id : d.target
      const sType = typeof d.source === "object" ? d.source.type : ""
      const tType = typeof d.target === "object" ? d.target.type : ""

      const isConnectedToFocus = focusNeighbors ? (sId === selectedNodeId || tId === selectedNodeId) : false
      const matchesSearch = (!q || (d.source.label?.toLowerCase().includes(q) || d.target.label?.toLowerCase().includes(q)))
      const matchesType = !hiddenTypes.has(sType) && !hiddenTypes.has(tType)

      let linkOpacity = 0.75
      let strokeWidth = Math.max(1, Math.min(3, (d.weight || 1) * 1.5))

      if (!matchesSearch || !matchesType) {
        linkOpacity = 0.03
      } else if (focusNeighbors) {
        if (isConnectedToFocus) {
          linkOpacity = 1.0
          strokeWidth = 2.5
        } else {
          linkOpacity = 0.04
        }
      }

      d3.select(this)
        .style("opacity", String(linkOpacity))
        .attr("stroke-width", strokeWidth)
    })

    // 4. Update Link Labels Opacity
    svg.selectAll<SVGTextElement, SimLink>("g.link-labels text").each(function(d: any) {
      if (!d || !d.source || !d.target) return
      const sId = typeof d.source === "object" ? d.source.id : d.source
      const tId = typeof d.target === "object" ? d.target.id : d.target

      const isConnectedToFocus = focusNeighbors ? (sId === selectedNodeId || tId === selectedNodeId) : false
      let labelOpacity = 0.7

      if (focusNeighbors) {
        labelOpacity = isConnectedToFocus ? 1.0 : 0.0
      } else if (q) {
        const matchesSearch = d.source.label?.toLowerCase().includes(q) || d.target.label?.toLowerCase().includes(q)
        labelOpacity = matchesSearch ? 0.8 : 0.0
      }

      d3.select(this).style("opacity", String(labelOpacity))
    })
  }, [searchQuery, hiddenTypes, selectedNodeId, nodes, edges])

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
    setSelectedNodeId(null)
    setDetailsOpen(false)
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
    const rawPath = detailNode.properties?.file_path || detailNode.source || ""
    const startLine = detailNode.properties?.start_line || 1
    if (!rawPath) return
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      window.open(rawPath, "_blank")
    } else {
      const cleanPath = rawPath.replace(/\\/g, "/").replace(/^file:\/\//, "")
      window.open(`vscode://file/${encodeURI(cleanPath)}:${startLine}`, "_blank")
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
          <div className="flex items-center justify-center h-full text-on-surface/40 font-code-sm">Loading deep graph data...</div>
        ) : nodes.length === 0 && viewMode === "d3" ? (
          <div className="flex items-center justify-center h-full text-on-surface/40 font-code-sm">No graph data available. Ingest code or docs first.</div>
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

      {/* FLOATING ACTION TOOLBAR */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl pointer-events-auto z-20">
        <div className="flex items-center gap-2 pr-6 border-r border-overlay-10">
          <button
            className="w-8 h-8 flex items-center justify-center hover:bg-overlay-10 rounded-full transition-colors"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          <span className="font-code-sm text-code-sm text-on-surface/60">{nodes.length}</span>
          <button
            className="w-8 h-8 flex items-center justify-center hover:bg-overlay-10 rounded-full transition-colors"
            onClick={handleZoomOut}
            title="Zoom Out"
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
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getNodeStyle(type).fill }}></span>
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
              placeholder="Search symbol/module..."
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
            title="Reset Graph & Selection"
          >
            <span className="material-symbols-outlined">center_focus_strong</span>
          </button>
        </div>
      </div>

      {/* SEMANTIC AST LEGEND PANEL */}
      <div className="absolute top-4 left-4 glass-panel border border-overlay-10 rounded-xl p-3 shadow-xl z-30 pointer-events-auto max-w-[240px]">
        <span className="font-label-caps text-[10px] text-on-surface/40 uppercase tracking-wider block mb-2">AST Node Semantic Palette</span>
        <div className="space-y-1.5 font-code-sm text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[#06b6d4]">📁</span>
            <span className="text-on-surface/90">Module / File</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[#10b981]">C</span>
            <span className="text-on-surface/90">Class / Struct</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[#8b5cf6]">I</span>
            <span className="text-on-surface/90">Interface / Type</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900 bg-[#f59e0b]">ƒ</span>
            <span className="text-on-surface/90">Function / Method</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[#3b82f6]">📄</span>
            <span className="text-on-surface/90">Doc / Spec</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-overlay-10">
          <span className="font-label-caps text-[9px] text-on-surface/40 uppercase tracking-wider block mb-1.5">Edge Types</span>
          <div className="space-y-1 text-[10px] font-code-sm text-on-surface/70">
            <div className="flex items-center gap-2">
              <span className="w-3 border-b-2 border-dashed border-[#06b6d4]"></span>
              <span>IMPORTS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 border-b-2 border-solid border-[#f59e0b]"></span>
              <span>CALLS ➔</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 border-b-2 border-solid border-[#64748b]"></span>
              <span>DEFINES</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 border-b-2 border-dotted border-[#8b5cf6]"></span>
              <span>EXTENDS ➔</span>
            </div>
          </div>
        </div>
      </div>

      {/* METRICS BADGES */}
      <div className="absolute top-4 right-4 flex gap-4 pointer-events-none z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm border border-overlay-5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-[#06b6d4] shadow-[0_0_8px_#06b6d4]"></div>
          <span className="font-code-sm text-[11px] text-on-surface/60 uppercase tracking-tighter">{nodes.length} Nodes</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm border border-overlay-5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_#8b5cf6]"></div>
          <span className="font-code-sm text-[11px] text-on-surface/60 uppercase tracking-tighter">{edges.length} Edges</span>
        </div>
      </div>

      {/* DEVELOPER-CENTRIC INSPECTOR PANEL */}
      <aside className={`absolute right-0 top-0 h-full w-[420px] glass-panel border-l border-overlay-10 p-6 overflow-y-auto transition-transform duration-500 ease-in-out z-40 ${detailsOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-overlay-10">
          <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">code</span> AST Inspector
          </h3>
          <button className="text-on-surface/40 hover:text-on-surface p-1 hover:bg-overlay-10 rounded transition-colors" onClick={handleCloseInspector}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {detailNode && (
          <div className="space-y-6">
            {/* Symbol Title & Badges */}
            <div>
              <label className="font-label-caps text-label-caps text-on-surface/40 block mb-1">SYMBOL</label>
              <p className="font-headline-lg text-headline-lg text-on-surface font-mono break-words font-bold">{detailNode.label}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                  style={{
                    backgroundColor: getNodeStyle(detailNode.type).bg,
                    color: getNodeStyle(detailNode.type).fill,
                    borderColor: `${getNodeStyle(detailNode.type).fill}40`,
                  }}
                >
                  <span>{getNodeGlyph(detailNode.type)}</span>
                  {detailNode.type || detailNode.properties?.symbol_type || "Symbol"}
                </span>
                {detailNode.properties?.visibility && (
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono text-on-surface/60 bg-overlay-5 border border-overlay-10">
                    {detailNode.properties.visibility}
                  </span>
                )}
                {detailNode.properties?.parent && (
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono text-[#8b5cf6] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
                    in {detailNode.properties.parent}
                  </span>
                )}
              </div>
            </div>

            {/* Signature Block */}
            {detailNode.properties?.signature && (
              <div>
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">CODE SIGNATURE</label>
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-overlay-10 font-mono text-[11px] leading-relaxed text-[#f59e0b] break-words overflow-x-auto shadow-inner">
                  <code>{detailNode.properties.signature}</code>
                </div>
              </div>
            )}

            {/* File Path & Line Range */}
            {(detailNode.properties?.file_path || detailNode.source) && (
              <div>
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">FILE & LINE RANGE</label>
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-overlay-10 text-[11px] text-on-surface/90 flex items-center justify-between font-mono">
                  <span className="truncate text-primary" title={detailNode.properties?.file_path || detailNode.source}>
                    {detailNode.properties?.file_path || detailNode.source}
                  </span>
                  {detailNode.properties?.start_line && (
                    <span className="text-[#10b981] font-bold flex-shrink-0 ml-2 px-1.5 py-0.5 bg-[#10b981]/10 rounded border border-[#10b981]/20">
                      #L{detailNode.properties.start_line}
                      {detailNode.properties.end_line && detailNode.properties.end_line !== detailNode.properties.start_line ? `-L${detailNode.properties.end_line}` : ""}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Docstring / Documentation */}
            {detailNode.properties?.docstring && (
              <div>
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">DOCSTRING / SPEC</label>
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-overlay-10 font-mono text-[11px] leading-relaxed text-on-surface-variant whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {detailNode.properties.docstring}
                </div>
              </div>
            )}

            {/* Callers Navigation */}
            {((symbolDetails?.callers && symbolDetails.callers.length > 0) || (detailNode.properties?.callers && detailNode.properties.callers.length > 0)) && (
              <div>
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">CALLERS (INVOKED BY)</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(symbolDetails?.callers || detailNode.properties.callers).map((caller: any, idx: number) => {
                    const cId = typeof caller === "string" ? caller : caller.id
                    const cLabel = typeof caller === "string" ? caller.split("::").pop() : caller.label
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          const target = nodes.find(n => n.id === cId)
                          if (target) handleSelectNode(target)
                        }}
                        className="w-full text-left p-2 bg-overlay-5 hover:bg-overlay-10 rounded border border-overlay-10 text-[11px] font-mono flex items-center justify-between transition-colors group"
                      >
                        <span className="text-[#06b6d4] truncate group-hover:text-primary transition-colors">{cLabel}</span>
                        <span className="material-symbols-outlined text-xs text-on-surface/40 group-hover:text-primary transition-colors">arrow_forward</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Callees Navigation */}
            {((symbolDetails?.callees && symbolDetails.callees.length > 0) || (detailNode.properties?.callees && detailNode.properties.callees.length > 0)) && (
              <div>
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">CALLEES (INVOKES)</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(symbolDetails?.callees || detailNode.properties.callees).map((callee: any, idx: number) => {
                    const cId = typeof callee === "string" ? callee : callee.id
                    const cLabel = typeof callee === "string" ? callee.split("::").pop() : callee.label
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          const target = nodes.find(n => n.id === cId)
                          if (target) handleSelectNode(target)
                        }}
                        className="w-full text-left p-2 bg-overlay-5 hover:bg-overlay-10 rounded border border-overlay-10 text-[11px] font-mono flex items-center justify-between transition-colors group"
                      >
                        <span className="text-[#f59e0b] truncate group-hover:text-amber-300 transition-colors">{cLabel}</span>
                        <span className="material-symbols-outlined text-xs text-on-surface/40 group-hover:text-[#f59e0b] transition-colors">arrow_forward</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Live Source Snippet */}
            {symbolDetails?.code_snippet && (
              <div>
                <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">SOURCE CODE</label>
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-overlay-10 font-mono text-[10px] leading-relaxed text-on-surface/90 max-h-48 overflow-auto whitespace-pre">
                  <code>{symbolDetails.code_snippet}</code>
                </div>
              </div>
            )}

            {/* Subgraph Degree Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-overlay-5 p-3 rounded-lg border border-overlay-10">
                <label className="font-label-caps text-[10px] text-on-surface/40 block mb-1">CONNECTED EDGES</label>
                <p className="font-headline-md text-headline-md text-on-surface font-mono">
                  {edges.filter(e => {
                    const s = typeof e.source === "object" ? (e.source as any).id : e.source
                    const t = typeof e.target === "object" ? (e.target as any).id : e.target
                    return s === detailNode.id || t === detailNode.id
                  }).length}
                </p>
              </div>
              <div className="bg-overlay-5 p-3 rounded-lg border border-overlay-10">
                <label className="font-label-caps text-[10px] text-on-surface/40 block mb-1">CALL SITES</label>
                <p className="font-headline-md text-headline-md text-on-surface font-mono">
                  {(detailNode.properties?.calls?.length || 0)}
                </p>
              </div>
            </div>

            {/* Open in Editor Action */}
            <div className="pt-4 border-t border-overlay-10">
              <button
                onClick={handleOpenInEditor}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined text-lg">open_in_new</span> Open in Editor (VS Code)
              </button>
            </div>
          </div>
        )}
      </aside>
    </motion.main>
  )
}
