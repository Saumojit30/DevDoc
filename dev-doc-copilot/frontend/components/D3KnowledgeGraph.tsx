"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { motion } from "framer-motion"
import { Network, RefreshCw, Search, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  metrics: { num_nodes: number; num_edges: number }
}

interface D3GraphProps {
  project: string
  height?: number
}

const COLOR_MAP: Record<string, string> = {
  doc: "#22d3ee",
  code: "#8b5cf6",
  function: "#a78bfa",
  class: "#c4b5fd",
  module: "#ddd6fe",
  Entity: "#f472b6",
  EntityType: "#fb7185",
  Chunk: "#34d399",
  Summary: "#fbbf24",
}

const LEGEND_ITEMS = ["doc", "code", "function", "class", "module"]

export default function D3KnowledgeGraph({ project, height = 600 }: D3GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [search, setSearch] = useState("")
  const { toast } = useToast()

  const fetchGraph = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/graph/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
      toast({ title: "Graph fetch failed", description: e.message, variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGraph() }, [project])

  useEffect(() => {
    if (!data || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = containerRef.current?.clientWidth || 800
    const h = height

    svg.attr("width", width).attr("height", h).style("background", "transparent")

    const g = svg.append("g")

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => { g.attr("transform", event.transform) })
    svg.call(zoom as any)

    const colorScale = d3.scaleOrdinal<string, string>()
      .domain(Object.keys(COLOR_MAP))
      .range(Object.values(COLOR_MAP))

    const nodes = data.nodes.map(n => ({ ...n }))
    const edges = data.edges.map(e => ({ ...e }))

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(edges as any)
        .id((d: any) => d.id).distance(80)
        .strength((d: any) => d.weight || 0.5))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, h / 2))
      .force("collision", d3.forceCollide().radius(25))

    const link = g.append("g").selectAll("line")
      .data(edges).join("line")
      .attr("stroke", "hsl(var(--muted-foreground) / 0.15)")
      .attr("stroke-width", (d: any) => Math.max(1, d.weight * 2))

    const edgeLabels = g.append("g").selectAll("text")
      .data(edges).join("text")
      .text((d: any) => d.relation)
      .attr("font-size", "7px")
      .attr("fill", "hsl(var(--muted-foreground) / 0.3)")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")

    const node = g.append("g").selectAll("g")
      .data(nodes).join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, any>()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on("drag", (event, d: any) => { d.fx = event.x; d.fy = event.y })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        }) as any)

    node.append("circle")
      .attr("r", (d: any) => d.type === "doc" ? 12 : 8)
      .attr("fill", (d: any) => colorScale(d.type) || "#64748b")
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-width", 2)
      .on("mouseover", function (event, d: any) {
        d3.select(this).attr("r", (d.type === "doc" ? 12 : 8) + 4)
          .attr("stroke", "hsl(var(--primary))")
        setSelectedNode(d)
      })
      .on("mouseout", function (event, d: any) {
        d3.select(this).attr("r", d.type === "doc" ? 12 : 8)
          .attr("stroke", "hsl(var(--border))")
      })

    node.append("text")
      .text((d: any) => d.label)
      .attr("x", 14).attr("y", 4)
      .attr("font-size", "10px")
      .attr("fill", "hsl(var(--foreground) / 0.7)")
      .attr("pointer-events", "none")

    node.filter((d: any) => d.type === "doc")
      .append("circle")
      .attr("r", 16).attr("fill", "none")
      .attr("stroke", "hsl(var(--primary))")
      .attr("stroke-width", 1).attr("opacity", 0.3)

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)
      edgeLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2)
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => { simulation.stop() }
  }, [data, height])

  const filteredNodes = data?.nodes.filter(n =>
    n.label.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <Network className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Knowledge Graph</h2>
            {data && (
              <p className="text-xs text-muted-foreground">{data.metrics.num_nodes} nodes · {data.metrics.num_edges} edges</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchGraph} disabled={loading} className="btn-icon btn-outline">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search nodes..."
          className="input h-9 pl-9 text-sm"
        />
      </div>

      {/* Graph */}
      <div ref={containerRef} className="card relative flex-1 overflow-hidden" style={{ minHeight: height }}>
        {loading && (
          <div className="absolute inset-0 flex flex-col gap-3 p-8 z-10 bg-card/80">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-card/80">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={fetchGraph} className="btn-sm btn-outline">Retry</button>
          </div>
        )}
        {!loading && !error && data && data.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground z-10">
            No nodes found
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" />

        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 right-4 rounded-xl border bg-card p-4 shadow-elevated z-20"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="badge text-[10px] border-primary/30 text-primary bg-primary-50 dark:bg-primary-50">
                {selectedNode.type}
              </span>
            </div>
            <p className="text-sm font-medium">{selectedNode.label}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{selectedNode.source}</p>
          </motion.div>
        )}
      </div>

      {/* Legend */}
      {data && (
        <div className="flex flex-wrap gap-4 mt-3">
          {LEGEND_ITEMS.map(type => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_MAP[type] }} />
              {type}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
