"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import * as d3 from "d3"
import { getGraphData, downloadGraph, getGraphVisualizationHtml, getSymbolDetails } from "@/lib/api"
import type { GraphNode, GraphEdge, SymbolDetailsResponse } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

// ==========================================
// Types & Interfaces
// ==========================================

export interface ArchTierInfo {
  tier: number
  key: string
  label: string
  shortLabel: string
  sublabel: string
  badgeColor: string
  borderColor: string
  fillColor: string
}

export const ARCH_TIERS: ArchTierInfo[] = [
  {
    tier: 0,
    key: "entry",
    label: "Entry Points & Server Root",
    shortLabel: "Tier 0 • Entry",
    sublabel: "Application bootstrap, server initialization, CLI triggers",
    badgeColor: "#38bdf8",
    borderColor: "rgba(56, 189, 248, 0.45)",
    fillColor: "rgba(56, 189, 248, 0.04)",
  },
  {
    tier: 1,
    key: "routing",
    label: "HTTP Controllers & Routing",
    shortLabel: "Tier 1 • Routing",
    sublabel: "API routes, endpoint controllers, request routing",
    badgeColor: "#818cf8",
    borderColor: "rgba(129, 140, 248, 0.45)",
    fillColor: "rgba(129, 140, 248, 0.04)",
  },
  {
    tier: 2,
    key: "services",
    label: "Core Business Logic & Topology",
    shortLabel: "Tier 2 • Services",
    sublabel: "Graph topology engines, domain services & orchestration",
    badgeColor: "#10b981",
    borderColor: "rgba(16, 185, 129, 0.45)",
    fillColor: "rgba(16, 185, 129, 0.04)",
  },
  {
    tier: 3,
    key: "parsing",
    label: "Parsers, Symbols & Manifests",
    shortLabel: "Tier 3 • Parsing",
    sublabel: "AST parsing, symbol indexing & manifest tracking",
    badgeColor: "#f59e0b",
    borderColor: "rgba(245, 158, 11, 0.45)",
    fillColor: "rgba(245, 158, 11, 0.04)",
  },
  {
    tier: 4,
    key: "config",
    label: "Configuration & State",
    shortLabel: "Tier 4 • Config",
    sublabel: "Environment configuration, settings, schemas & constants",
    badgeColor: "#ec4899",
    borderColor: "rgba(236, 72, 153, 0.45)",
    fillColor: "rgba(236, 72, 153, 0.04)",
  },
]

export const UTILITY_TIER_INFO: ArchTierInfo = {
  tier: -1,
  key: "utility",
  label: "Utility & Non-Code Docs",
  shortLabel: "Utility",
  sublabel: "Documentation, specifications & standalone assets",
  badgeColor: "#94a3b8",
  borderColor: "rgba(148, 163, 184, 0.45)",
  fillColor: "rgba(148, 163, 184, 0.04)",
}

export function getTierInfo(tier: number): ArchTierInfo {
  if (tier >= 0 && tier < ARCH_TIERS.length) {
    return ARCH_TIERS[tier]
  }
  return UTILITY_TIER_INFO
}

export const TIER_SPACING = 210
export const TOP_TIER_Y = 140

interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
  fx?: number | null
  fy?: number | null
  // Layered Architecture DAG Tier properties
  tier: number
  tierKey: string
  tierLabel: string
  tierTargetX?: number
  tierTargetY?: number
  // File Hub & Sub-grid Satellite properties
  isArchFile?: boolean
  isHub?: boolean
  isSatellite?: boolean
  parentHubId?: string
  parentHubLabel?: string
  satelliteIndex?: number
  satelliteTotal?: number
  subGridCol?: number
  subGridRow?: number
  moduleGroup?: string
  symbolCount?: number
  inboundCouplings?: number
  outboundCouplings?: number
  // Topology and community properties
  community_id?: number
  community_name?: string
  is_god_node?: boolean
  degree?: number
  degree_centrality?: number
  betweenness_centrality?: number
}

interface SimLink {
  source: string | SimNode
  target: string | SimNode
  relation: string
  weight: number
  properties: Record<string, any>
  isArchLink?: boolean
  isHighway?: boolean
  isSpoke?: boolean
  isIntraSatellite?: boolean
}

// Enterprise Dark-Mode Palette (Linear / Raycast / GitHub Dependency Graph style)
const PALETTE = {
  bg: "#090d16",
  gridDot: "#1f2937",
  fileCard: {
    fill: "#0f172a",
    stroke: "#334155",
    strokeHover: "#38bdf8",
    text: "#f8fafc",
    subtext: "#64748b",
    badgeBg: "#1e293b",
    badgeText: "#94a3b8",
  },
  roles: {
    Module: { fill: "#1e293b", stroke: "#38bdf8", text: "#f8fafc", badge: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)" },
    CodeFile: { fill: "#1e293b", stroke: "#38bdf8", text: "#f8fafc", badge: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)" },
    File: { fill: "#1e293b", stroke: "#38bdf8", text: "#f8fafc", badge: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)" },
    Class: { fill: "#0f2e22", stroke: "#10b981", text: "#a7f3d0", badge: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
    Struct: { fill: "#0f2e22", stroke: "#10b981", text: "#a7f3d0", badge: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
    Interface: { fill: "#1e1b4b", stroke: "#818cf8", text: "#c7d2fe", badge: "#818cf8", bg: "rgba(129, 140, 248, 0.12)" },
    Trait: { fill: "#1e1b4b", stroke: "#818cf8", text: "#c7d2fe", badge: "#818cf8", bg: "rgba(129, 140, 248, 0.12)" },
    Type: { fill: "#1e1b4b", stroke: "#818cf8", text: "#c7d2fe", badge: "#818cf8", bg: "rgba(129, 140, 248, 0.12)" },
    Function: { fill: "#332208", stroke: "#f59e0b", text: "#fef3c7", badge: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
    Method: { fill: "#332208", stroke: "#f59e0b", text: "#fef3c7", badge: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
    Document: { fill: "#13233a", stroke: "#60a5fa", text: "#dbeafe", badge: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" },
    DocumentChunk: { fill: "#13233a", stroke: "#60a5fa", text: "#dbeafe", badge: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" },
    Documentation: { fill: "#13233a", stroke: "#60a5fa", text: "#dbeafe", badge: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" },
    Spec: { fill: "#13233a", stroke: "#60a5fa", text: "#dbeafe", badge: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" },
    TextSummary: { fill: "#13233a", stroke: "#60a5fa", text: "#dbeafe", badge: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" },
    Entity: { fill: "#1c1917", stroke: "#78716c", text: "#e7e5e4", badge: "#78716c", bg: "rgba(120, 113, 108, 0.12)" },
    default: { fill: "#1e293b", stroke: "#475569", text: "#cbd5e1", badge: "#94a3b8", bg: "rgba(71, 85, 105, 0.12)" },
  },
  links: {
    default: "#475569",
    calls: "#60a5fa",
    imports: "#818cf8",
    extends: "#a78bfa",
    spoke: "rgba(56, 189, 248, 0.35)",
    upstreamActive: "#38bdf8",   // Dependencies (imported by this node)
    downstreamActive: "#fbbf24", // Consumers (imports this node)
    activeUpstream: "#38bdf8",
    activeDownstream: "#fbbf24",
  }
}

function getNodeStyle(type: string) {
  return PALETTE.roles[type as keyof typeof PALETTE.roles] || PALETTE.roles.default
}

function getNodeGlyph(type: string): string {
  switch (type) {
    case "Function":
      return "ƒ"
    case "Method":
      return "m"
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

function getNodeRadius(type: string, node?: any): number {
  let base = 9
  if (type === "Module" || type === "Class" || type === "Document") base = 13
  else if (type === "Function" || type === "Interface" || type === "Struct") base = 11
  else if (type === "Method" || type === "DocumentChunk" || type === "Trait" || type === "Type") base = 10

  if (!node) return base

  const deg = node.properties?.degree ?? node.degree ?? 0
  const isGod = Boolean(node.properties?.is_god_node ?? node.is_god_node ?? (deg >= 12))
  const degBonus = Math.min(8, Math.sqrt(deg) * 1.5)
  return isGod ? base + degBonus + 3 : base + degBonus
}

function getParentFileId(node: GraphNode): string {
  if (node.id.startsWith("file://")) return node.id
  if (node.type === "Module" || node.type === "File" || node.type === "CodeFile") return node.id
  const p = node.properties?.file_path || node.source
  if (p) return p.startsWith("file://") ? p : `file://${p}`
  return node.id
}

function getFileName(filePath: string): string {
  const clean = filePath.replace(/^file:\/\//, "")
  const parts = clean.split(/[/\\]/)
  return parts[parts.length - 1] || clean
}

function getDirName(filePath: string): string {
  const clean = filePath.replace(/^file:\/\//, "").replace(/\\/g, "/")
  const parts = clean.split("/").filter(Boolean)
  if (parts.length <= 1) return "root"
  const parentFolders = parts.slice(0, -1)
  const lastFolders = parentFolders.slice(-2).join("/")
  return lastFolders.length > 18 ? "…" + lastFolders.slice(-17) : lastFolders
}

/**
 * Computes topological tier levels (ranks) for all file nodes:
 * Tier 0: Entry Points & Server Root (main.py, app.py)
 * Tier 1: HTTP Controllers & Routing (graph_routes.py)
 * Tier 2: Core Business Logic & Topology Engines (cognee_service.py, graph_topology.py)
 * Tier 3: Parsers, Symbol Table, Manifest Manager (ast_parser.py, symbol_table.py, manifest_manager.py)
 * Tier 4: Configuration & State (config.py)
 * Tier -1: Side Utility Tier (isolated non-code files e.g. README.md)
 */
function computeNodeTiers(
  fileNodes: GraphNode[],
  couplingEdges: { source: string; target: string; count: number }[]
): Map<string, { tier: number; tierInfo: ArchTierInfo }> {
  const result = new Map<string, { tier: number; tierInfo: ArchTierInfo }>()
  if (fileNodes.length === 0) return result

  // 1. Classify non-code / documentation files to side utility tier
  const nonCodeIds = new Set<string>()
  for (const n of fileNodes) {
    const rawPath = (n.properties?.file_path || n.source || n.label || "").toLowerCase()
    const isDoc = n.type === "Document" || n.type === "DocumentChunk" || n.type === "Documentation" || n.type === "Spec" || n.type === "TextSummary"
    const isNonCodeExt = rawPath.endsWith(".md") || rawPath.endsWith(".txt") || rawPath.endsWith(".rst") || rawPath.endsWith(".json") || rawPath.endsWith(".yml") || rawPath.endsWith(".yaml")
    const isDocName = rawPath.includes("readme") || rawPath.includes("license") || rawPath.includes("task")
    if (isDoc || isNonCodeExt || isDocName) {
      nonCodeIds.add(n.id)
      result.set(n.id, { tier: -1, tierInfo: UTILITY_TIER_INFO })
    }
  }

  // 2. Code files
  const codeNodes = fileNodes.filter(n => !nonCodeIds.has(n.id))
  if (codeNodes.length === 0) return result

  const inDegree = new Map<string, number>()
  const outDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const n of codeNodes) {
    inDegree.set(n.id, 0)
    outDegree.set(n.id, 0)
    adj.set(n.id, [])
  }

  for (const edge of couplingEdges) {
    if (codeNodes.some(n => n.id === edge.source) && codeNodes.some(n => n.id === edge.target)) {
      if (edge.source !== edge.target) {
        adj.get(edge.source)?.push(edge.target)
        outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1)
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
      }
    }
  }

  const getSemanticTier = (node: GraphNode): number => {
    const label = node.label.toLowerCase()
    const path = (node.properties?.file_path || node.source || "").toLowerCase()

    if (label.startsWith("main.") || label.startsWith("app.") || label.startsWith("server.") || label.startsWith("index.") || label.startsWith("cli.")) {
      return 0
    }
    if (label.includes("route") || label.includes("router") || label.includes("controller") || label.includes("endpoint") || label.includes("api") || path.includes("/routes") || path.includes("/api")) {
      return 1
    }
    if (label.includes("service") || label.includes("topology") || label.includes("engine") || label.includes("logic") || label.includes("orchestrat") || (label.includes("manager") && label.includes("graph"))) {
      return 2
    }
    if (label.includes("parser") || label.includes("ast") || label.includes("symbol") || label.includes("manifest") || label.includes("lexer") || label.includes("table")) {
      return 3
    }
    if (label.includes("config") || label.includes("setting") || label.includes("env") || label.includes("constant") || label.includes("schema") || label.includes("type") || label.includes("state")) {
      return 4
    }
    return -99
  }

  // Identify entry point roots (inDegree == 0 or semantic hint 0)
  let roots = codeNodes.filter(n => (inDegree.get(n.id) || 0) === 0 || getSemanticTier(n) === 0)
  if (roots.length === 0) {
    const sorted = [...codeNodes].sort((a, b) => (inDegree.get(a.id) || 0) - (inDegree.get(b.id) || 0))
    roots = [sorted[0]]
  }

  // Calculate topological depth using longest path relaxation
  const depth = new Map<string, number>()
  for (const n of codeNodes) {
    depth.set(n.id, -1)
  }
  for (const r of roots) {
    depth.set(r.id, 0)
  }

  for (let iter = 0; iter < codeNodes.length; iter++) {
    let changed = false
    for (const [u, targets] of adj.entries()) {
      const du = depth.get(u) ?? -1
      if (du >= 0) {
        for (const v of targets) {
          const dv = depth.get(v) ?? -1
          const candidate = Math.min(4, du + 1)
          if (candidate > dv) {
            depth.set(v, candidate)
            changed = true
          }
        }
      }
    }
    if (!changed) break
  }

  // Merge topological depth with semantic architectural priors
  for (const node of codeNodes) {
    const topoDepth = depth.get(node.id) ?? -1
    const semanticHint = getSemanticTier(node)

    let finalTier = 0
    if (semanticHint >= 0) {
      if (semanticHint === 0) {
        finalTier = 0
      } else if (semanticHint === 4) {
        finalTier = 4
      } else {
        finalTier = topoDepth >= 0 ? Math.max(topoDepth, semanticHint) : semanticHint
      }
    } else {
      finalTier = topoDepth >= 0 ? topoDepth : ((inDegree.get(node.id) || 0) === 0 ? 0 : 2)
    }

    finalTier = Math.max(0, Math.min(4, finalTier))
    result.set(node.id, { tier: finalTier, tierInfo: ARCH_TIERS[finalTier] })
  }

  return result
}

// ==========================================
// Main Component
// ==========================================

export default function KnowledgeGraph({ projectName }: { projectName: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const zoomScaleRef = useRef(1.0)
  const fitTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [rawNodes, setRawNodes] = useState<GraphNode[]>([])
  const [rawEdges, setRawEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailNode, setDetailNode] = useState<GraphNode | null>(null)
  const [symbolDetails, setSymbolDetails] = useState<SymbolDetailsResponse | null>(null)
  const [symbolLoading, setSymbolLoading] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 900, height: 700 })
  const [searchQuery, setSearchQuery] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [viewMode, setViewMode] = useState<"d3" | "cognee">("d3")
  const [graphLevel, setGraphLevel] = useState<"architecture" | "symbols">("architecture")
  const [expandedHubIds, setExpandedHubIds] = useState<Set<string>>(new Set())
  const [cogneeHtml, setCogneeHtml] = useState<string | null>(null)
  const [cogneeLoading, setCogneeLoading] = useState(false)

  const { toast } = useToast()

  const loadGraph = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getGraphData(projectName)
      setRawNodes(data.nodes)
      setRawEdges(data.edges)
    } catch {
      setRawNodes([])
      setRawEdges([])
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
      setDimensions({ width: Math.max(width, 700), height: Math.max(height, 550) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Toggle single file card child symbol sub-grid expansion
  const toggleHubExpansion = useCallback((hubId: string) => {
    setExpandedHubIds(prev => {
      const next = new Set(prev)
      if (next.has(hubId)) {
        next.delete(hubId)
      } else {
        next.add(hubId)
      }
      return next
    })
  }, [])

  // ==========================================================
  // Layered Architectural Model Construction & Tier Assignment
  // ==========================================================
  const { displayNodes, displayEdges, allArchNodes } = useMemo(() => {
    if (rawNodes.length === 0) {
      return { displayNodes: [], displayEdges: [], allArchNodes: [] }
    }

    // 1. Group symbols by parent file
    const fileNodeMap = new Map<string, GraphNode>()
    const fileSymbolsCount = new Map<string, number>()
    const fileSymbolsList = new Map<string, GraphNode[]>()

    for (const node of rawNodes) {
      const isFileNode = node.id.startsWith("file://") || node.type === "Module" || node.type === "File" || node.type === "CodeFile"
      if (isFileNode) {
        const fileId = node.id.startsWith("file://") ? node.id : `file://${node.id}`
        fileNodeMap.set(fileId, {
          ...node,
          id: fileId,
          type: "CodeFile",
          label: getFileName(fileId),
          properties: {
            ...node.properties,
            file_path: node.properties?.file_path || fileId.replace(/^file:\/\//, ""),
            moduleGroup: getDirName(fileId),
          }
        })
      }
    }

    for (const node of rawNodes) {
      const isFileNode = node.id.startsWith("file://") || node.type === "Module" || node.type === "File" || node.type === "CodeFile"
      if (isFileNode) continue

      const parentFileId = getParentFileId(node)
      if (node.id === parentFileId) continue

      if (!fileNodeMap.has(parentFileId)) {
        fileNodeMap.set(parentFileId, {
          id: parentFileId,
          label: getFileName(parentFileId),
          type: "CodeFile",
          source: parentFileId.replace(/^file:\/\//, ""),
          properties: {
            file_path: parentFileId.replace(/^file:\/\//, ""),
            moduleGroup: getDirName(parentFileId),
          }
        })
      }
      fileSymbolsCount.set(parentFileId, (fileSymbolsCount.get(parentFileId) || 0) + 1)
      const list = fileSymbolsList.get(parentFileId) || []
      list.push(node)
      fileSymbolsList.set(parentFileId, list)
    }

    // 2. Build Highway Couplings (inter-file caller-to-callee dependencies)
    const nodeLookup = new Map(rawNodes.map(n => [n.id, n]))
    const couplingMap = new Map<string, { source: string; target: string; count: number; relations: Set<string> }>()

    for (const edge of rawEdges) {
      const sNode = nodeLookup.get(edge.source)
      const tNode = nodeLookup.get(edge.target)
      if (!sNode || !tNode) continue

      const sFile = getParentFileId(sNode)
      const tFile = getParentFileId(tNode)

      if (sFile && tFile && sFile !== tFile) {
        const key = `${sFile}--->${tFile}`
        const existing = couplingMap.get(key) || { source: sFile, target: tFile, count: 0, relations: new Set<string>() }
        existing.count += edge.weight || 1
        existing.relations.add(edge.relation)
        couplingMap.set(key, existing)
      }
    }

    const initialArchNodes = Array.from(fileNodeMap.values())
    const nodeTiers = computeNodeTiers(initialArchNodes, Array.from(couplingMap.values()))

    interface TieredHubGraphNode extends GraphNode {
      isHub?: boolean
      tier: number
      tierKey: string
      tierLabel: string
      community_id?: number
      community_name?: string
      is_god_node?: boolean
      symbolCount?: number
    }

    const archNodes: TieredHubGraphNode[] = initialArchNodes.map(fn => {
      const symList = fileSymbolsList.get(fn.id) || []
      const bestSym = symList.length > 0 ? symList.reduce((max, s) => {
        const d1 = s.properties?.degree ?? (s as any).degree ?? 0
        const d2 = max.properties?.degree ?? (max as any).degree ?? 0
        return d1 > d2 ? s : max
      }, symList[0]) : null

      const tInfo = nodeTiers.get(fn.id)?.tierInfo || UTILITY_TIER_INFO
      const tNum = nodeTiers.get(fn.id)?.tier ?? -1

      const commId = fn.properties?.community_id ?? (fn as any).community_id ?? bestSym?.properties?.community_id ?? (bestSym as any)?.community_id ?? 0
      const commName = fn.properties?.community_name || (fn as any).community_name || bestSym?.properties?.community_name || (bestSym as any)?.community_name || fn.label
      const isGod = Boolean(fn.properties?.is_god_node ?? (fn as any).is_god_node ?? bestSym?.properties?.is_god_node ?? (bestSym as any)?.is_god_node)

      return {
        ...fn,
        isHub: true,
        tier: tNum,
        tierKey: tInfo.key,
        tierLabel: tInfo.label,
        community_id: commId,
        community_name: commName,
        is_god_node: isGod,
        properties: {
          ...fn.properties,
          isHub: true,
          tier: tNum,
          tierKey: tInfo.key,
          tierLabel: tInfo.label,
          community_id: commId,
          community_name: commName,
          is_god_node: isGod,
          symbolCount: fileSymbolsCount.get(fn.id) || 1,
          symbols: symList.map(s => ({
            id: s.id,
            label: s.label,
            type: s.type,
            source: s.source,
            properties: s.properties
          })),
        }
      }
    })

    const highwayEdges: GraphEdge[] = Array.from(couplingMap.values()).map(c => ({
      source: c.source,
      target: c.target,
      relation: Array.from(c.relations).join(" / "),
      weight: Math.max(1, Math.min(8, c.count)),
      properties: {
        isHighway: true,
        couplingCount: c.count,
        relations: Array.from(c.relations),
      }
    }))

    // Determine which file cards have expanded child symbol sub-grids
    const activeNodes: GraphNode[] = [...archNodes]
    const activeEdges: GraphEdge[] = [...highwayEdges]

    const hubsToExpand = new Set<string>()
    if (graphLevel === "symbols") {
      archNodes.forEach(h => hubsToExpand.add(h.id))
    } else {
      expandedHubIds.forEach(id => hubsToExpand.add(id))
    }

    // Add child symbols in sub-grid format
    for (const hub of archNodes) {
      if (!hubsToExpand.has(hub.id)) continue
      const symList = fileSymbolsList.get(hub.id) || []
      const sCount = symList.length
      if (sCount === 0) continue

      symList.forEach((sym, sIdx) => {
        const symbolsPerRow = 5
        const row = Math.floor(sIdx / symbolsPerRow)
        const col = sIdx % symbolsPerRow

        const satNode: GraphNode = {
          ...sym,
          properties: {
            ...sym.properties,
            isSatellite: true,
            parentHubId: hub.id,
            parentHubLabel: hub.label,
            satelliteIndex: sIdx,
            satelliteTotal: sCount,
            subGridCol: col,
            subGridRow: row,
            tier: hub.tier,
            tierKey: hub.tierKey,
            tierLabel: hub.tierLabel,
            community_id: hub.community_id,
            community_name: hub.community_name,
          }
        }
        ;(satNode as any).isSatellite = true
        ;(satNode as any).parentHubId = hub.id
        ;(satNode as any).parentHubLabel = hub.label
        ;(satNode as any).satelliteIndex = sIdx
        ;(satNode as any).satelliteTotal = sCount
        ;(satNode as any).subGridCol = col
        ;(satNode as any).subGridRow = row
        ;(satNode as any).tier = hub.tier
        ;(satNode as any).tierKey = hub.tierKey
        ;(satNode as any).tierLabel = hub.tierLabel
        ;(satNode as any).community_id = hub.community_id
        ;(satNode as any).community_name = hub.community_name

        activeNodes.push(satNode)

        // Spoke connector from parent card to child symbol
        activeEdges.push({
          source: hub.id,
          target: sym.id,
          relation: "CONTAINS",
          weight: 1,
          properties: {
            isSpoke: true,
            parentHubId: hub.id,
          }
        })
      })
    }

    // Intra-file symbol calls
    if (hubsToExpand.size > 0) {
      const visibleNodeIds = new Set(activeNodes.map(n => n.id))
      for (const edge of rawEdges) {
        if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
          const sNode = nodeLookup.get(edge.source)
          const tNode = nodeLookup.get(edge.target)
          if (sNode && tNode) {
            const sFile = getParentFileId(sNode)
            const tFile = getParentFileId(tNode)
            if (sFile === tFile) {
              activeEdges.push({
                ...edge,
                isIntraSatellite: true,
                properties: {
                  ...edge.properties,
                  isIntraSatellite: true,
                }
              } as any)
            }
          }
        }
      }
    }

    return { displayNodes: activeNodes, displayEdges: activeEdges, allArchNodes: archNodes }
  }, [graphLevel, rawNodes, rawEdges, expandedHubIds])

  // Toggle expand/collapse all file card sub-grids
  const handleToggleExpandAll = useCallback(() => {
    if (expandedHubIds.size > 0) {
      setExpandedHubIds(new Set())
    } else {
      const allHubIds = new Set(allArchNodes.filter(n => (n.properties?.symbolCount || 0) > 0).map(n => n.id))
      setExpandedHubIds(allHubIds)
    }
  }, [expandedHubIds, allArchNodes])

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

  // ==========================================================
  // Render D3 Simulation with Layered Architectural Top-to-Bottom Flow
  // ==========================================================
  useEffect(() => {
    if (!svgRef.current || displayNodes.length === 0) return

    const { width, height } = dimensions
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("width", width).attr("height", height)

    // Markers for downward dependency routing
    const defs = svg.append("defs")

    const createMarker = (id: string, color: string) => {
      defs.append("marker")
        .attr("id", id)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("markerWidth", 6.5)
        .attr("markerHeight", 6.5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4.5L9,0L0,4.5")
        .attr("fill", color)
    }

    createMarker("arrow-default", PALETTE.links.default)
    createMarker("arrow-calls", PALETTE.links.calls)
    createMarker("arrow-imports", PALETTE.links.imports)
    createMarker("arrow-upstream", PALETTE.links.upstreamActive)
    createMarker("arrow-downstream", PALETTE.links.downstreamActive)

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3.5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
        const k = event.transform.k
        zoomScaleRef.current = k
        svg.selectAll<SVGTextElement, SimNode>("g.nodes text.node-label").style("opacity", function(d) {
          if (!d) return "0"
          const isGod = Boolean(d.properties?.is_god_node || (d as any).is_god_node || (d.properties?.degree || 0) >= 12)
          return (isGod || k >= 1.2) ? "1" : "0"
        })
      })
    svg.call(zoom)
    zoomRef.current = zoom

    svg.on("click", (event) => {
      if (event.target === svgRef.current) {
        setSelectedNodeId(null)
        setDetailsOpen(false)
      }
    })

    const g = svg.append("g")

    const nodeMap = new Map(displayNodes.map((n) => [n.id, n]))
    const filteredEdges = displayEdges.filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))

    // Tier $Y$-coordinates map
    const tierYMap: Record<number, number> = {
      0: TOP_TIER_Y,
      1: TOP_TIER_Y + TIER_SPACING,
      2: TOP_TIER_Y + 2 * TIER_SPACING,
      3: TOP_TIER_Y + 3 * TIER_SPACING,
      4: TOP_TIER_Y + 4 * TIER_SPACING,
    }

    // Calculate initial structured coordinates per tier
    const hubNodes = displayNodes.filter(n => (n as any).isHub)
    const tierTargets = new Map<string, { x: number; y: number }>()

    // Determine max cards in any code tier to establish horizontal width
    const tierCounts = [0, 1, 2, 3, 4].map(t => hubNodes.filter(n => (n as any).tier === t).length)
    const maxTierCardCount = Math.max(1, ...tierCounts)
    const horizontalSpacing = Math.max(220, Math.min(290, 840 / maxTierCardCount))

    for (let t = 0; t <= 4; t++) {
      const nodesInTier = hubNodes.filter(n => (n as any).tier === t)
      const K = nodesInTier.length
      if (K === 0) continue
      const startX = width / 2 - ((K - 1) * horizontalSpacing) / 2
      nodesInTier.forEach((node, idx) => {
        tierTargets.set(node.id, {
          x: startX + idx * horizontalSpacing,
          y: tierYMap[t],
        })
      })
    }

    // Side utility tier docking column
    const utilityNodes = hubNodes.filter(n => (n as any).tier === -1)
    const utilityColumnX = width / 2 + Math.max(380, (maxTierCardCount * horizontalSpacing) / 2 + 150)
    utilityNodes.forEach((node, idx) => {
      tierTargets.set(node.id, {
        x: utilityColumnX,
        y: TOP_TIER_Y + 20 + idx * 75,
      })
    })

    const simNodes: SimNode[] = displayNodes.map((n) => {
      const isHub = Boolean((n as any).isHub ?? n.properties?.isHub ?? false)
      const isSat = Boolean((n as any).isSatellite ?? n.properties?.isSatellite ?? false)
      const tier = (n as any).tier ?? n.properties?.tier ?? -1
      const tierInfo = getTierInfo(tier)

      let initX = width / 2
      let initY = height / 2

      if (isHub) {
        const target = tierTargets.get(n.id) || { x: width / 2, y: TOP_TIER_Y }
        initX = target.x
        initY = target.y
      } else if (isSat) {
        const pHubId = (n as any).parentHubId || n.properties?.parentHubId
        const parentPos = (pHubId && tierTargets.get(pHubId)) || { x: width / 2, y: TOP_TIER_Y }
        const sIdx = (n as any).satelliteIndex ?? 0
        const sTotal = (n as any).satelliteTotal ?? 1
        const symbolsPerRow = 5
        const row = Math.floor(sIdx / symbolsPerRow)
        const col = sIdx % symbolsPerRow
        const countInThisRow = Math.min(symbolsPerRow, sTotal - row * symbolsPerRow)
        initX = parentPos.x + (col - (countInThisRow - 1) / 2) * 32
        initY = parentPos.y + 42 + row * 26
      }

      return {
        ...n,
        x: initX,
        y: initY,
        vx: 0,
        vy: 0,
        tier,
        tierKey: tierInfo.key,
        tierLabel: tierInfo.label,
        tierTargetX: tierTargets.get(n.id)?.x,
        tierTargetY: tierTargets.get(n.id)?.y,
        isArchFile: isHub,
        isHub,
        isSatellite: isSat,
        parentHubId: (n as any).parentHubId || n.properties?.parentHubId,
        parentHubLabel: (n as any).parentHubLabel || n.properties?.parentHubLabel,
        satelliteIndex: (n as any).satelliteIndex,
        satelliteTotal: (n as any).satelliteTotal,
        subGridCol: (n as any).subGridCol,
        subGridRow: (n as any).subGridRow,
        moduleGroup: n.properties?.moduleGroup,
        symbolCount: n.properties?.symbolCount,
        community_id: (n as any).community_id ?? n.properties?.community_id ?? 0,
        community_name: (n as any).community_name || n.properties?.community_name || tierInfo.label,
        is_god_node: Boolean((n as any).is_god_node ?? n.properties?.is_god_node ?? false),
        degree: (n as any).degree ?? n.properties?.degree ?? 0,
        degree_centrality: (n as any).degree_centrality ?? n.properties?.degree_centrality ?? 0,
        betweenness_centrality: (n as any).betweenness_centrality ?? n.properties?.betweenness_centrality ?? 0,
      }
    })

    const simLinks: SimLink[] = filteredEdges.map((e) => ({
      ...e,
      isArchLink: Boolean((e as any).isHighway),
      isHighway: Boolean((e as any).isHighway),
      isSpoke: Boolean((e as any).isSpoke),
      isIntraSatellite: Boolean((e as any).isIntraSatellite),
    }))

    // ==========================================================
    // Visual Tier Indicators & Row Dividers (Background layer)
    // ==========================================================
    const tierGroup = g.append("g").attr("class", "tier-indicators")

    let minX = width / 2 - 400
    let maxX = width / 2 + 400
    if (simNodes.length > 0) {
      const xs = simNodes.map(n => n.x)
      minX = Math.min(...xs) - 260
      maxX = Math.max(...xs) + 260
    }

    // Render 5 Architectural Tiers (0 to 4)
    ARCH_TIERS.forEach(tDef => {
      const y = tierYMap[tDef.tier]

      // Subtle horizontal divider line
      tierGroup.append("line")
        .attr("x1", minX)
        .attr("y1", y - 65)
        .attr("x2", maxX)
        .attr("y2", y - 65)
        .attr("stroke", "rgba(51, 65, 85, 0.28)")
        .attr("stroke-dasharray", "6, 6")
        .attr("pointer-events", "none")

      // Subtle background tier band
      tierGroup.append("rect")
        .attr("x", minX)
        .attr("y", y - 65)
        .attr("width", maxX - minX)
        .attr("height", 195)
        .attr("rx", 10)
        .attr("fill", tDef.fillColor)
        .attr("pointer-events", "none")

      // Left-pinned Tier Pill Badge
      tierGroup.append("rect")
        .attr("x", minX + 16)
        .attr("y", y - 50)
        .attr("width", 72)
        .attr("height", 18)
        .attr("rx", 9)
        .attr("fill", tDef.fillColor)
        .attr("stroke", tDef.borderColor)
        .attr("stroke-width", 1)
        .attr("pointer-events", "none")

      tierGroup.append("text")
        .attr("x", minX + 52)
        .attr("y", y - 37)
        .attr("text-anchor", "middle")
        .attr("fill", tDef.badgeColor)
        .attr("font-size", 9)
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("font-weight", "bold")
        .attr("pointer-events", "none")
        .text(`TIER ${tDef.tier}`)

      // Left-pinned Tier Header Title
      tierGroup.append("text")
        .attr("x", minX + 98)
        .attr("y", y - 37)
        .attr("fill", "#f1f5f9")
        .attr("font-size", 11.5)
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("font-weight", "600")
        .attr("pointer-events", "none")
        .text(tDef.label)

      // Left-pinned Tier Subtitle
      tierGroup.append("text")
        .attr("x", minX + 98)
        .attr("y", y - 22)
        .attr("fill", "#64748b")
        .attr("font-size", 8.5)
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("pointer-events", "none")
        .text(tDef.sublabel)
    })

    // Side Utility Tier Divider (if utility files exist)
    if (utilityNodes.length > 0) {
      tierGroup.append("line")
        .attr("x1", utilityColumnX - 45)
        .attr("y1", TOP_TIER_Y - 65)
        .attr("x2", utilityColumnX - 45)
        .attr("y2", TOP_TIER_Y + 4 * TIER_SPACING + 130)
        .attr("stroke", "rgba(148, 163, 184, 0.25)")
        .attr("stroke-dasharray", "4, 4")
        .attr("pointer-events", "none")

      tierGroup.append("text")
        .attr("x", utilityColumnX - 35)
        .attr("y", TOP_TIER_Y - 40)
        .attr("fill", "#94a3b8")
        .attr("font-size", 10)
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("font-weight", "bold")
        .attr("pointer-events", "none")
        .text("✦ UTILITY & DOCS")
    }

    // ==========================================================
    // Downward Flowing Bézier Edge Routing
    // ==========================================================
    const linkGroup = g.append("g").attr("class", "links")
    const link = linkGroup
      .selectAll<SVGPathElement, SimLink>("path.edge-path")
      .data(simLinks)
      .join("path")
      .attr("class", "edge-path")
      .attr("fill", "none")
      .attr("stroke", (d) => {
        if (d.isSpoke) return "rgba(56, 189, 248, 0.28)"
        if (d.isIntraSatellite) return "rgba(148, 163, 184, 0.2)"
        if (d.relation.includes("IMPORTS")) return PALETTE.links.imports
        if (d.relation.includes("CALLS")) return PALETTE.links.calls
        return PALETTE.links.default
      })
      .attr("stroke-dasharray", (d) => {
        if (d.isSpoke) return "2, 3"
        if (d.relation.includes("IMPORTS")) return "4, 3"
        return "none"
      })
      .attr("marker-end", (d) => d.isSpoke ? "none" : "url(#arrow-default)")
      .attr("stroke-width", (d) => {
        if (d.isSpoke) return 1.2
        if (d.isIntraSatellite) return 1
        if (d.isHighway) return Math.max(2, Math.min(5, Math.sqrt(d.weight || 1) * 2))
        return Math.max(1, Math.min(3, (d.weight || 1) * 1.5))
      })
      .attr("stroke-opacity", (d) => d.isSpoke ? 0.75 : 0.6)

    // Link Labels (coupling weight / relation)
    const linkLabelGroup = g.append("g").attr("class", "link-labels")
    const linkLabel = linkLabelGroup
      .selectAll<SVGTextElement, SimLink>("text")
      .data(simLinks.filter(l => !l.isSpoke))
      .join("text")
      .text((d) => d.isHighway ? `${d.weight > 1 ? `${d.weight}x ` : ""}${d.relation}` : d.relation)
      .attr("fill", "#94a3b8")
      .attr("font-size", 8.5)
      .attr("font-family", "JetBrains Mono, ui-monospace, monospace")
      .attr("text-anchor", "middle")
      .attr("dy", -6)
      .attr("pointer-events", "none")
      .attr("opacity", 0)

    // ==========================================================
    // Node Groups (File Cards & Sub-Grid Satellites)
    // ==========================================================
    const nodeGroup = g.append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        setHoveredNodeId(d.id)
      })
      .on("mouseleave", () => {
        setHoveredNodeId(null)
      })
      .on("click", (event, d) => {
        event.stopPropagation()
        const original = displayNodes.find((n) => n.id === d.id) || allArchNodes.find((n) => n.id === d.id)
        if (original) {
          handleSelectNode(original)
          if (d.isHub && !expandedHubIds.has(d.id)) {
            toggleHubExpansion(d.id)
          }
        }
      })
      .on("dblclick", (event, d) => {
        event.stopPropagation()
        if (d.isHub) {
          toggleHubExpansion(d.id)
        }
      })

    // ARCHITECTURAL FILE CARD
    const CARD_W = 160
    const CARD_H = 48

    const hubGroup = nodeGroup.filter((d) => Boolean(d.isHub))

    hubGroup.append("rect")
      .attr("class", "arch-card")
      .attr("x", -CARD_W / 2)
      .attr("y", -CARD_H / 2)
      .attr("width", CARD_W)
      .attr("height", CARD_H)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", PALETTE.fileCard.fill)
      .attr("stroke", (d) => {
        if (d.properties?.is_god_node || (d as any).is_god_node) return "#38bdf8"
        const tInfo = getTierInfo(d.tier)
        return tInfo.borderColor
      })
      .attr("stroke-width", (d) => (d.properties?.is_god_node || (d as any).is_god_node) ? 2 : 1.5)
      .style("filter", (d) => (d.properties?.is_god_node || (d as any).is_god_node)
        ? "drop-shadow(0 0 12px rgba(56, 189, 248, 0.4)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45))"
        : "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45))")

    // Tier indicator tag on card
    const tierPill = hubGroup.append("g")
      .attr("class", "arch-tier-pill")
      .attr("transform", `translate(${-CARD_W / 2 + 8}, ${-CARD_H / 2 + 6})`)

    tierPill.append("rect")
      .attr("width", 24)
      .attr("height", 13)
      .attr("rx", 6.5)
      .attr("fill", (d) => getTierInfo(d.tier).fillColor)
      .attr("stroke", (d) => getTierInfo(d.tier).borderColor)
      .attr("stroke-width", 0.8)

    tierPill.append("text")
      .text((d) => d.tier === -1 ? "UTIL" : `T${d.tier}`)
      .attr("x", 12)
      .attr("y", 9.5)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => getTierInfo(d.tier).badgeColor)
      .attr("font-size", 7.5)
      .attr("font-weight", "bold")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("pointer-events", "none")

    // Module Directory Subtitle
    hubGroup.append("text")
      .attr("class", "arch-module")
      .text((d) => {
        if (!d.moduleGroup || d.moduleGroup === "root") return ""
        const grp = d.moduleGroup
        return grp.length > 14 ? "…" + grp.slice(-13) + "/" : `${grp}/`
      })
      .attr("x", -CARD_W / 2 + 36)
      .attr("y", -CARD_H / 2 + 16)
      .attr("fill", PALETTE.fileCard.subtext)
      .attr("font-size", 8.5)
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("pointer-events", "none")

    // File Name Title
    hubGroup.append("text")
      .attr("class", "arch-filename")
      .text((d) => {
        const name = d.label
        return name.length > 15 ? name.slice(0, 13) + "…" : name
      })
      .attr("x", -CARD_W / 2 + 10)
      .attr("y", -CARD_H / 2 + 34)
      .attr("fill", PALETTE.fileCard.text)
      .attr("font-size", 10.5)
      .attr("font-weight", 600)
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("pointer-events", "none")

    // Interactive Child Symbols Expand/Collapse Badge
    const badge = hubGroup.append("g")
      .attr("class", "hub-satellites-badge")
      .attr("transform", `translate(${CARD_W / 2 - 42}, ${-CARD_H / 2 + 14})`)
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation()
        toggleHubExpansion(d.id)
      })

    badge.append("rect")
      .attr("width", 34)
      .attr("height", 20)
      .attr("rx", 10)
      .attr("fill", (d) => expandedHubIds.has(d.id) ? "rgba(56, 189, 248, 0.28)" : "rgba(56, 189, 248, 0.1)")
      .attr("stroke", (d) => expandedHubIds.has(d.id) ? "#38bdf8" : "rgba(56, 189, 248, 0.35)")
      .attr("stroke-width", 1)

    badge.append("text")
      .text((d) => {
        const isExp = expandedHubIds.has(d.id)
        const count = d.symbolCount || d.properties?.symbolCount || 1
        return `${isExp ? "−" : "+"} ${count}`
      })
      .attr("x", 17)
      .attr("y", 13.5)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => expandedHubIds.has(d.id) ? "#ffffff" : "#38bdf8")
      .attr("font-size", 9.5)
      .attr("font-weight", "bold")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("pointer-events", "none")

    // SATELLITE SUB-GRID SYMBOLS
    const satGroup = nodeGroup.filter((d) => Boolean(d.isSatellite))

    satGroup.filter((d) => Boolean(d.properties?.is_god_node || (d as any).is_god_node))
      .append("circle")
      .attr("class", "god-halo")
      .attr("r", (d) => getNodeRadius(d.type, d) + 5)
      .attr("fill", "none")
      .attr("stroke", "#38bdf8")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3, 3")
      .style("filter", "drop-shadow(0 0 6px #38bdf8)")
      .attr("pointer-events", "none")

    satGroup.append("circle")
      .attr("r", (d) => getNodeRadius(d.type, d))
      .attr("fill", (d) => getNodeStyle(d.type).fill)
      .attr("stroke", (d) => (d.properties?.is_god_node || (d as any).is_god_node) ? "#38bdf8" : getNodeStyle(d.type).stroke)
      .attr("stroke-width", (d) => (d.properties?.is_god_node || (d as any).is_god_node) ? 2.5 : 1.8)
      .style("filter", (d) => `drop-shadow(0 0 6px ${getNodeStyle(d.type).stroke}40)`)

    satGroup.append("text")
      .attr("class", "node-glyph")
      .text((d) => getNodeGlyph(d.type))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", (d) => getNodeStyle(d.type).text)
      .attr("font-size", 9.5)
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")

    satGroup.append("text")
      .attr("class", "node-label")
      .text((d) => {
        const clean = d.label.includes("::") ? d.label.split("::").pop()! : d.label
        return clean.length > 18 ? clean.slice(0, 16) + "…" : clean
      })
      .attr("dx", (d) => getNodeRadius(d.type, d) + 6)
      .attr("dy", "0.35em")
      .attr("fill", "#cbd5e1")
      .attr("font-size", 9)
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("pointer-events", "none")

    // Drag behavior with simulation wake-up
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

    // ==========================================================
    // D3 Physics Simulation Configuration (Strict Vertical Hierarchy)
    // ==========================================================
    const simNodeMap = new Map<string, SimNode>(simNodes.map(n => [n.id, n]))

    const sim = d3.forceSimulation(simNodes)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance((d) => d.isSpoke ? 35 : 190)
        .strength((d) => d.isSpoke ? 0.95 : 0.08))
      .force("charge", d3.forceManyBody<SimNode>()
        .strength((d) => d.isHub ? -180 : -25)
        .distanceMax(380))
      .force("forceY", d3.forceY<SimNode>((d) => d.tier === -1 ? (d.tierTargetY ?? TOP_TIER_Y) : (tierYMap[d.tier] ?? TOP_TIER_Y)).strength(0.85))
      .force("forceX", d3.forceX<SimNode>((d) => d.tierTargetX ?? width / 2).strength(0.4))
      .force("collision", d3.forceCollide<SimNode>().radius((d) =>
        d.isHub ? 100 : getNodeRadius(d.type, d) + 12
      ).iterations(3))
      .alphaDecay(0.024)

    const enforceSpatialConstraints = () => {
      // 1. Constrain file cards to their assigned tier Y level
      for (const d of simNodes) {
        if (d.isHub) {
          const targetY = d.tier === -1 ? (d.tierTargetY ?? TOP_TIER_Y) : (tierYMap[d.tier] ?? TOP_TIER_Y)
          if (typeof d.y === "number") {
            d.y += (targetY - d.y) * 0.45
          }
        }
      }

      // 2. Constrain child symbols to compact sub-grid directly beneath their parent file card
      for (const d of simNodes) {
        if (d.isSatellite && d.parentHubId && d.fx == null) {
          const hub = simNodeMap.get(d.parentHubId)
          if (hub && typeof hub.x === "number" && typeof hub.y === "number") {
            const sIdx = d.satelliteIndex ?? 0
            const sTotal = d.satelliteTotal ?? 1
            const symbolsPerRow = 5
            const row = Math.floor(sIdx / symbolsPerRow)
            const col = sIdx % symbolsPerRow
            const countInThisRow = Math.min(symbolsPerRow, sTotal - row * symbolsPerRow)
            const subX = hub.x + (col - (countInThisRow - 1) / 2) * 32
            const subY = hub.y + 44 + row * 26

            d.x += (subX - d.x) * 0.5
            d.y += (subY - d.y) * 0.5
          }
        }
      }
    }

    // Zero-Wobble Off-screen Pre-stabilization (settle 130 ticks before canvas paint)
    sim.stop()
    for (let i = 0; i < 130; ++i) {
      sim.tick()
      enforceSpatialConstraints()
    }

    // Auto-fit to viewport
    let boundMinX = Infinity, boundMaxX = -Infinity, boundMinY = Infinity, boundMaxY = -Infinity
    for (const d of simNodes) {
      if (typeof d.x === "number" && typeof d.y === "number") {
        boundMinX = Math.min(boundMinX, d.x - 120)
        boundMaxX = Math.max(boundMaxX, d.x + 120)
        boundMinY = Math.min(boundMinY, d.y - 80)
        boundMaxY = Math.max(boundMaxY, d.y + 80)
      }
    }

    if (isFinite(boundMinX) && isFinite(boundMaxX) && isFinite(boundMinY) && isFinite(boundMaxY)) {
      const gW = Math.max(160, boundMaxX - boundMinX)
      const gH = Math.max(160, boundMaxY - boundMinY)
      const pad = 60
      const scale = Math.min(1.15, Math.max(0.2, Math.min((width - pad * 2) / gW, (height - pad * 2) / gH)))
      const cx = (boundMinX + boundMaxX) / 2
      const cy = (boundMinY + boundMaxY) / 2
      const tx = width / 2 - scale * cx
      const ty = height / 2 - scale * cy

      const fitTransform = d3.zoomIdentity.translate(tx, ty).scale(scale)
      fitTransformRef.current = fitTransform
      svg.call(zoom.transform, fitTransform)
    }

    const updatePositions = () => {
      enforceSpatialConstraints()

      // Update Downward Flowing Bézier Paths
      link.attr("d", (d) => {
        const s = d.source as SimNode
        const t = d.target as SimNode
        if (!s || !t || typeof s.x !== "number" || typeof t.x !== "number") return ""

        if (d.isSpoke) {
          // Direct branch connector from card bottom to child symbol
          return `M ${s.x} ${s.y + 24} L ${t.x} ${t.y}`
        }

        if (d.isIntraSatellite) {
          return `M ${s.x} ${s.y} Q ${(s.x + t.x) / 2} ${(s.y + t.y) / 2 - 14} ${t.x} ${t.y}`
        }

        // Inter-file caller -> callee dependency edge
        const sX = s.x
        const sY = s.y + 24 // Exit from bottom of caller card
        const tX = t.x
        const tY = t.y - 24 // Enter at top of callee card

        if (t.y > s.y) {
          // Smooth vertical cubic Bézier waterfall
          const cp1x = sX
          const cp1y = sY + 60
          const cp2x = tX
          const cp2y = tY - 60
          return `M ${sX} ${sY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tX} ${tY}`
        } else {
          // Sideways or reverse loop
          const offsetX = tX >= sX ? 55 : -55
          const cp1x = sX + offsetX
          const cp1y = sY + 35
          const cp2x = tX + offsetX
          const cp2y = tY - 35
          return `M ${sX} ${sY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tX} ${tY}`
        }
      })

      // Update Link Labels
      linkLabel
        .attr("x", (d) => {
          const s = d.source as SimNode
          const t = d.target as SimNode
          return (s.x + t.x) / 2
        })
        .attr("y", (d) => {
          const s = d.source as SimNode
          const t = d.target as SimNode
          return (s.y + t.y) / 2
        })

      // Update Node Positions
      nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`)
    }

    updatePositions()

    sim.on("tick", updatePositions)
    sim.alpha(0.04).restart()
    simRef.current = sim

    return () => { sim.stop() }
  }, [displayNodes, displayEdges, dimensions, graphLevel, expandedHubIds, handleSelectNode, toggleHubExpansion])

  // Filter & Search & Upstream/Downstream Dependency Path Highlighting
  useEffect(() => {
    if (!svgRef.current || displayNodes.length === 0) return
    const svg = d3.select(svgRef.current)
    const q = searchQuery.toLowerCase()

    const upstreamIds = new Set<string>()
    const downstreamIds = new Set<string>()
    const activeLinkKeys = new Set<string>()

    if (selectedNodeId) {
      const selectedIsHub = Boolean((detailNode as any)?.isHub || detailNode?.type === "CodeFile" || detailNode?.type === "Module")

      if (selectedIsHub) {
        displayEdges.forEach((e) => {
          const s = typeof e.source === "object" ? (e.source as any).id : e.source
          const t = typeof e.target === "object" ? (e.target as any).id : e.target

          if (s === selectedNodeId) {
            upstreamIds.add(t)
            activeLinkKeys.add(`${s}-->${t}`)
          }
          if (t === selectedNodeId) {
            downstreamIds.add(s)
            activeLinkKeys.add(`${s}-->${t}`)
          }
        })
      } else {
        displayEdges.forEach((e) => {
          const s = typeof e.source === "object" ? (e.source as any).id : e.source
          const t = typeof e.target === "object" ? (e.target as any).id : e.target
          if (s === selectedNodeId) upstreamIds.add(t)
          if (t === selectedNodeId) downstreamIds.add(s)
        })

        rawEdges.forEach((e) => {
          if (e.source === selectedNodeId) {
            upstreamIds.add(e.target)
            const tNode = rawNodes.find(n => n.id === e.target)
            if (tNode) upstreamIds.add(getParentFileId(tNode))
          }
          if (e.target === selectedNodeId) {
            downstreamIds.add(e.source)
            const sNode = rawNodes.find(n => n.id === e.source)
            if (sNode) downstreamIds.add(getParentFileId(sNode))
          }
        })
      }
    }

    const hasFocus = Boolean(selectedNodeId)

    // Update Node Highlighting & Opacity
    svg.selectAll<SVGGElement, SimNode>("g.nodes g").each(function(d: any) {
      if (!d || !d.label) return
      const group = d3.select(this)
      const matchesSearch = !q || (d.label as string).toLowerCase().includes(q) || (d.moduleGroup && d.moduleGroup.toLowerCase().includes(q))
      const matchesType = !hiddenTypes.has(d.type)

      const isSelected = d.id === selectedNodeId
      const isUpstream = upstreamIds.has(d.id)
      const isDownstream = downstreamIds.has(d.id)
      const isRelevant = isSelected || isUpstream || isDownstream

      let opacity = 1.0
      if (!matchesSearch || !matchesType) {
        opacity = 0.05
      } else if (hasFocus) {
        opacity = isRelevant ? 1.0 : 0.12
      }

      group.style("opacity", String(opacity))
      group.style("pointer-events", opacity < 0.1 ? "none" : "auto")

      if (d.isHub) {
        const card = group.select<SVGRectElement>("rect.arch-card")
        if (isSelected) {
          card
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2.5)
            .style("filter", "drop-shadow(0 0 16px rgba(56, 189, 248, 0.6)) drop-shadow(0 0 4px #ffffff)")
        } else if (isUpstream) {
          card
            .attr("stroke", PALETTE.links.activeUpstream)
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 12px rgba(56, 189, 248, 0.45))")
        } else if (isDownstream) {
          card
            .attr("stroke", PALETTE.links.activeDownstream)
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 12px rgba(251, 191, 36, 0.45))")
        } else {
          card
            .attr("stroke", (d.properties?.is_god_node || d.is_god_node) ? "#38bdf8" : getTierInfo(d.tier).borderColor)
            .attr("stroke-width", (d.properties?.is_god_node || d.is_god_node) ? 2 : 1.5)
            .style("filter", (d.properties?.is_god_node || d.is_god_node)
              ? "drop-shadow(0 0 12px rgba(56, 189, 248, 0.4)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45))"
              : "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45))")
        }
      } else {
        const circle = group.select<SVGCircleElement>("circle")
        if (isSelected) {
          circle
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 3.5)
            .style("filter", `drop-shadow(0 0 16px ${getNodeStyle(d.type).stroke}) drop-shadow(0 0 4px #ffffff)`)
        } else if (isUpstream) {
          circle
            .attr("stroke", PALETTE.links.activeUpstream)
            .attr("stroke-width", 2.5)
            .style("filter", `drop-shadow(0 0 10px ${PALETTE.links.activeUpstream}80)`)
        } else if (isDownstream) {
          circle
            .attr("stroke", PALETTE.links.activeDownstream)
            .attr("stroke-width", 2.5)
            .style("filter", `drop-shadow(0 0 10px ${PALETTE.links.activeDownstream}80)`)
        } else {
          circle
            .attr("stroke", getNodeStyle(d.type).stroke)
            .attr("stroke-width", 1.8)
            .style("filter", `drop-shadow(0 0 6px ${getNodeStyle(d.type).stroke}40)`)
        }
      }
    })

    // Update Link Highlighting & Colors
    svg.selectAll<SVGPathElement, SimLink>("g.links path.edge-path").each(function(d: any) {
      if (!d || !d.source || !d.target) return
      const sId = typeof d.source === "object" ? d.source.id : d.source
      const tId = typeof d.target === "object" ? d.target.id : d.target
      const sType = typeof d.source === "object" ? d.source.type : ""
      const tType = typeof d.target === "object" ? d.target.type : ""

      const isOutboundFromFocus = sId === selectedNodeId
      const isInboundToFocus = tId === selectedNodeId

      const matchesSearch = !q || (d.source.label?.toLowerCase().includes(q) || d.target.label?.toLowerCase().includes(q))
      const matchesType = !hiddenTypes.has(sType) && !hiddenTypes.has(tType)

      let linkOpacity = d.isSpoke ? 0.75 : 0.6
      let strokeColor = d.isSpoke ? "rgba(56, 189, 248, 0.28)" : (d.isIntraSatellite ? "rgba(148, 163, 184, 0.2)" : PALETTE.links.default)
      let markerEnd = d.isSpoke ? "none" : "url(#arrow-default)"

      if (!matchesSearch || !matchesType) {
        linkOpacity = 0.03
      } else if (hasFocus) {
        if (isOutboundFromFocus) {
          linkOpacity = 1.0
          strokeColor = PALETTE.links.activeUpstream
          markerEnd = d.isSpoke ? "none" : "url(#arrow-upstream)"
        } else if (isInboundToFocus) {
          linkOpacity = 1.0
          strokeColor = PALETTE.links.activeDownstream
          markerEnd = d.isSpoke ? "none" : "url(#arrow-downstream)"
        } else {
          linkOpacity = 0.05
        }
      } else {
        if (d.relation.includes("IMPORTS")) strokeColor = PALETTE.links.imports
        else if (d.relation.includes("CALLS")) strokeColor = PALETTE.links.calls
      }

      d3.select(this)
        .style("opacity", String(linkOpacity))
        .attr("stroke", strokeColor)
        .attr("marker-end", markerEnd)
    })

    // Update Link Labels Opacity
    svg.selectAll<SVGTextElement, SimLink>("g.link-labels text").each(function(d: any) {
      if (!d || !d.source || !d.target) return
      const sId = typeof d.source === "object" ? d.source.id : d.source
      const tId = typeof d.target === "object" ? d.target.id : d.target
      const isConnected = sId === selectedNodeId || tId === selectedNodeId

      let labelOpacity = 0.0
      if (hasFocus) {
        labelOpacity = isConnected ? 1.0 : 0.0
      } else if (q) {
        const matchesSearch = d.source.label?.toLowerCase().includes(q) || d.target.label?.toLowerCase().includes(q)
        labelOpacity = matchesSearch ? 0.8 : 0.0
      }

      d3.select(this).style("opacity", String(labelOpacity))
    })

    // Update Semantic LOD Label Visibility
    svg.selectAll<SVGTextElement, SimNode>("g.nodes text.node-label").style("opacity", function(d: any) {
      if (!d) return "0"
      const isGod = Boolean(d.properties?.is_god_node || d.is_god_node || (d.properties?.degree || 0) >= 12)
      const isSelected = d.id === selectedNodeId
      const isHovered = d.id === hoveredNodeId
      const isUpstream = upstreamIds.has(d.id)
      const isDownstream = downstreamIds.has(d.id)
      const matchesSearch = Boolean(q && d.label?.toLowerCase().includes(q))
      const isZoomed = zoomScaleRef.current >= 1.2

      if (isGod || isSelected || isHovered || isUpstream || isDownstream || matchesSearch || isZoomed) {
        return "1"
      }
      return "0"
    })
  }, [searchQuery, hiddenTypes, selectedNodeId, hoveredNodeId, displayNodes, displayEdges, graphLevel])

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
    d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, fitTransformRef.current)
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
      return
    }
    const cleanPath = rawPath.replace(/\\/g, "/")
    window.location.href = `vscode://file/${cleanPath}:${startLine}`
  }

  // Active node inbound/outbound dependencies for the inspector
  const activeInbound = useMemo(() => {
    if (!detailNode) return []
    const isHub = Boolean((detailNode as any).isHub || detailNode.type === "CodeFile" || detailNode.type === "Module")
    if (isHub) {
      return displayEdges.filter(e => {
        const t = typeof e.target === "object" ? (e.target as any).id : e.target
        return t === detailNode.id && !(e as any).isSpoke && !e.properties?.isSpoke
      })
    }
    return rawEdges.filter(e => e.target === detailNode.id)
  }, [detailNode, displayEdges, rawEdges])

  const activeOutbound = useMemo(() => {
    if (!detailNode) return []
    const isHub = Boolean((detailNode as any).isHub || detailNode.type === "CodeFile" || detailNode.type === "Module")
    if (isHub) {
      return displayEdges.filter(e => {
        const s = typeof e.source === "object" ? (e.source as any).id : e.source
        return s === detailNode.id && !(e as any).isSpoke && !e.properties?.isSpoke
      })
    }
    return rawEdges.filter(e => e.source === detailNode.id)
  }, [detailNode, displayEdges, rawEdges])

  const handleJumpToDependency = useCallback((targetId: string) => {
    const existing = displayNodes.find(n => n.id === targetId) || allArchNodes.find(n => n.id === targetId)
    if (existing) {
      handleSelectNode(existing)
      return
    }
    const rawTarget = rawNodes.find(n => n.id === targetId)
    if (rawTarget) {
      const parentFileId = getParentFileId(rawTarget)
      setExpandedHubIds(prev => new Set([...prev, parentFileId]))
      setTimeout(() => {
        handleSelectNode(rawTarget)
      }, 50)
    }
  }, [displayNodes, allArchNodes, rawNodes, handleSelectNode])

  return (
    <motion.main
      className="md:ml-64 mt-16 flex h-[calc(100vh-64px)] overflow-hidden bg-[#090d16] text-on-surface relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      ref={containerRef}
    >
      {/* Background Subtle Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(#334155 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* GRAPH CANVAS AREA */}
      <div className="flex-1 w-full h-full relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            <p className="font-code-sm text-sm text-on-surface/60 font-mono">Building Knowledge Graph...</p>
          </div>
        ) : viewMode === "cognee" ? (
          cogneeLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
              <p className="font-code-sm text-sm text-on-surface/60 font-mono">Rendering Cognee visualization...</p>
            </div>
          ) : (
            <iframe
              srcDoc={cogneeHtml || "<p style='color:#fff;padding:20px;'>No graph data available.</p>"}
              className="w-full h-full border-0"
              title="Cognee Graph Visualization"
              sandbox="allow-scripts allow-same-origin"
            />
          )
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>

      {/* TOP HEADER CONTROLS (View Mode Toggle & Layered Architecture Metrics) */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#0f172a]/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl">
          <button
            onClick={() => {
              setGraphLevel("architecture")
              setExpandedHubIds(new Set())
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              graphLevel === "architecture"
                ? "bg-primary text-on-primary shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <span className="material-symbols-outlined text-base">layers</span>
            <span>Layered Architecture Flow</span>
          </button>
          <button
            onClick={() => {
              setGraphLevel("symbols")
              const allHubIds = new Set(allArchNodes.map(n => n.id))
              setExpandedHubIds(allHubIds)
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              graphLevel === "symbols"
                ? "bg-primary text-on-primary shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <span className="material-symbols-outlined text-base">view_module</span>
            <span>Sub-Grid Symbol View</span>
          </button>
        </div>

        {/* Right: Architectural Metrics */}
        <div className="flex items-center gap-3 pointer-events-none">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0f172a]/90 backdrop-blur-md border border-slate-800 rounded-full shadow-lg">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span>
            <span className="font-mono text-xs text-slate-300">
              5 Architectural Tiers • {displayNodes.filter(n => (n as any).isHub).length} Files
              {displayNodes.filter(n => (n as any).isSatellite).length > 0 && ` • ${displayNodes.filter(n => (n as any).isSatellite).length} Symbols`}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0f172a]/90 backdrop-blur-md border border-slate-800 rounded-full shadow-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></span>
            <span className="font-mono text-xs text-slate-300">
              {displayEdges.filter(e => (e as any).isHighway).length} Flow Edges
            </span>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION TOOLBAR */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0f172a]/95 backdrop-blur-md border border-slate-800 px-6 py-2.5 rounded-full flex items-center gap-5 shadow-2xl pointer-events-auto z-20">
        <div className="flex items-center gap-2 pr-5 border-r border-slate-800">
          <button
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-base">add</span>
          </button>
          <span className="font-mono text-xs text-slate-400">{displayNodes.length}</span>
          <button
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-base">remove</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-grid Expand/Collapse All Toggle */}
          <button
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition-all ${
              expandedHubIds.size > 0
                ? "bg-sky-950/80 text-sky-300 border border-sky-800/60 shadow-[0_0_8px_rgba(56,189,248,0.25)]"
                : "bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300"
            }`}
            onClick={handleToggleExpandAll}
            title={expandedHubIds.size > 0 ? "Collapse all symbol sub-grids" : "Expand all symbol sub-grids"}
          >
            <span className="material-symbols-outlined text-sm">
              {expandedHubIds.size > 0 ? "unfold_less" : "unfold_more"}
            </span>
            {expandedHubIds.size > 0 ? "Collapse Symbols" : "Expand Symbols"}
          </button>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-md text-slate-300 font-mono text-xs transition-colors"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <span className="material-symbols-outlined text-sm">filter_list</span> Filter
            </button>
            {filterOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-2xl min-w-[200px] z-50">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block mb-3">NODE TYPES</span>
                {[...new Set(displayNodes.map(n => n.type))].map(type => (
                  <label key={type} className="flex items-center gap-2 py-1.5 cursor-pointer font-mono text-xs text-slate-300 hover:text-white">
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
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getNodeStyle(type).stroke }}></span>
                    {type}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setViewMode(viewMode === "d3" ? "cognee" : "d3")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition-all ${
              viewMode === "cognee"
                ? "bg-primary text-on-primary"
                : "bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{viewMode === "cognee" ? "layers" : "schema"}</span>
            {viewMode === "cognee" ? "DAG Canvas" : "Cognee Embed"}
          </button>

          <button
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-md text-slate-300 font-mono text-xs transition-colors disabled:opacity-50"
            onClick={handleDownloadGraph}
            disabled={downloading}
          >
            <span className="material-symbols-outlined text-sm">{downloading ? "hourglass_top" : "download"}</span>
            {downloading ? "Exporting..." : "Export"}
          </button>

          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
            <input
              className="bg-[#0b0f19] border border-slate-800 rounded-md pl-8 pr-7 py-1 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-primary outline-none w-44 transition-all"
              placeholder="Filter file or symbol..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                onClick={() => setSearchQuery("")}
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>

          <button
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors"
            onClick={handleReset}
            title="Reset Graph Zoom & Selection"
          >
            <span className="material-symbols-outlined text-base">center_focus_strong</span>
          </button>
        </div>
      </div>

      {/* DEVELOPER INSPECTOR PANEL */}
      <aside className={`absolute right-0 top-0 h-full w-[420px] bg-[#0d121f]/95 backdrop-blur-xl border-l border-slate-800/80 p-6 overflow-y-auto transition-transform duration-300 ease-in-out z-40 ${detailsOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
          <h3 className="font-mono text-sm font-semibold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">account_tree</span>
            {(detailNode as any)?.isHub ? "Architectural File Inspector" : "Symbol Inspector"}
          </h3>
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-md transition-colors" onClick={handleCloseInspector}>
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {detailNode && (
          <div className="space-y-6">
            {/* Title & Tier Badge */}
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-1">
                {(detailNode as any).isHub ? "ARCHITECTURAL COMPONENT" : (detailNode as any).isSatellite ? "SUB-GRID SYMBOL" : "GRAPH NODE"}
              </div>
              <h4 className="font-mono text-base font-bold text-white break-words">{detailNode.label}</h4>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {/* Architectural Tier Badge */}
                {(detailNode as any).tier !== undefined && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                    style={{
                      borderColor: getTierInfo((detailNode as any).tier).borderColor,
                      color: getTierInfo((detailNode as any).tier).badgeColor,
                      backgroundColor: getTierInfo((detailNode as any).tier).fillColor,
                    }}
                  >
                    <span>{getTierInfo((detailNode as any).tier).shortLabel}</span>
                  </span>
                )}

                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border"
                  style={{
                    backgroundColor: getNodeStyle(detailNode.type).bg,
                    color: getNodeStyle(detailNode.type).stroke,
                    borderColor: `${getNodeStyle(detailNode.type).stroke}40`,
                  }}
                >
                  <span>{getNodeGlyph(detailNode.type)}</span>
                  {detailNode.type}
                </span>

                {(detailNode.properties?.is_god_node || (detailNode as any).is_god_node) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-sky-400 bg-sky-950/70 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.35)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                    GOD NODE
                  </span>
                )}

                {(typeof detailNode.properties?.degree === "number" || typeof (detailNode as any).degree === "number") && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/60">
                    deg: {detailNode.properties?.degree ?? (detailNode as any).degree}
                  </span>
                )}

                {detailNode.properties?.moduleGroup && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60">
                    module: {detailNode.properties.moduleGroup}
                  </span>
                )}
              </div>
            </div>

            {/* When Satellite is selected: Link to Parent Hub */}
            {(detailNode as any).isSatellite && (
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block mb-2">
                  PARENT ARCHITECTURAL FILE
                </label>
                <button
                  onClick={() => {
                    const pHubId = (detailNode as any).parentHubId || detailNode.properties?.parentHubId
                    const parentHub = displayNodes.find(n => n.id === pHubId) || allArchNodes.find(n => n.id === pHubId)
                    if (parentHub) {
                      handleSelectNode(parentHub)
                    }
                  }}
                  className="w-full text-left p-2.5 bg-slate-900/90 hover:bg-slate-800 rounded-lg border border-sky-800/50 text-xs font-mono flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-sm text-sky-400">domain</span>
                    <span className="text-sky-300 font-semibold group-hover:underline truncate">
                      {(detailNode as any).parentHubLabel || detailNode.properties?.parentHubLabel || getFileName((detailNode as any).parentHubId || "")}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Focus File &rarr;</span>
                </button>
              </div>
            )}

            {/* When Hub is selected: Child Symbols Sub-Grid List with Toggle */}
            {(detailNode as any).isHub && detailNode.properties?.symbols && detailNode.properties.symbols.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    CHILD SYMBOLS ({detailNode.properties.symbols.length})
                  </label>
                  <button
                    onClick={() => toggleHubExpansion(detailNode.id)}
                    className="px-2.5 py-0.5 rounded text-[10px] font-mono font-medium bg-sky-950/80 hover:bg-sky-900 border border-sky-800/60 text-sky-300 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {expandedHubIds.has(detailNode.id) ? "unfold_less" : "unfold_more"}
                    </span>
                    {expandedHubIds.has(detailNode.id) ? "Collapse Grid" : "Expand Grid"}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {detailNode.properties.symbols.map((sym: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const found = displayNodes.find(n => n.id === sym.id)
                        if (found) {
                          handleSelectNode(found)
                        } else {
                          toggleHubExpansion(detailNode.id)
                        }
                      }}
                      className="w-full text-left p-2 bg-slate-900/60 hover:bg-slate-800/90 rounded border border-slate-800/80 text-[11px] font-mono flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold"
                          style={{
                            backgroundColor: getNodeStyle(sym.type).bg,
                            color: getNodeStyle(sym.type).stroke,
                          }}
                        >
                          {getNodeGlyph(sym.type)}
                        </span>
                        <span className="text-slate-300 group-hover:text-sky-300 transition-colors truncate">
                          {sym.label.includes("::") ? sym.label.split("::").pop() : sym.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{sym.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Architecture Mode: Outbound Downstream Dependencies */}
            {activeOutbound.length > 0 && (
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block mb-2">
                  DOWNSTREAM DEPENDENCIES (CALLS & IMPORTS) — {activeOutbound.length}
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {activeOutbound.map((edge, idx) => {
                    const targetId = typeof edge.target === "object" ? (edge.target as any).id : edge.target
                    const targetNode = displayNodes.find(n => n.id === targetId) || allArchNodes.find(n => n.id === targetId) || rawNodes.find(n => n.id === targetId)
                    const label = targetNode ? targetNode.label : getFileName(targetId)
                    return (
                      <button
                        key={idx}
                        onClick={() => handleJumpToDependency(targetId)}
                        className="w-full text-left p-2.5 bg-slate-900/80 hover:bg-slate-800/90 rounded-lg border border-slate-800 text-xs font-mono flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                          <span className="text-slate-200 group-hover:text-sky-300 transition-colors truncate">{label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 ml-2">
                          {(edge as any).isHighway ? `${edge.weight}x couplings` : (edge.relation || "DEPENDENCY")}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Inbound Upstream Consumers */}
            {activeInbound.length > 0 && (
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block mb-2">
                  UPSTREAM CONSUMERS (CALLERS & IMPORTERS) — {activeInbound.length}
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {activeInbound.map((edge, idx) => {
                    const sourceId = typeof edge.source === "object" ? (edge.source as any).id : edge.source
                    const sourceNode = displayNodes.find(n => n.id === sourceId) || allArchNodes.find(n => n.id === sourceId) || rawNodes.find(n => n.id === sourceId)
                    const label = sourceNode ? sourceNode.label : getFileName(sourceId)
                    return (
                      <button
                        key={idx}
                        onClick={() => handleJumpToDependency(sourceId)}
                        className="w-full text-left p-2.5 bg-slate-900/80 hover:bg-slate-800/90 rounded-lg border border-slate-800 text-xs font-mono flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span className="text-slate-200 group-hover:text-amber-300 transition-colors truncate">{label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 ml-2">
                          {(edge as any).isHighway ? `${edge.weight}x couplings` : (edge.relation || "CONSUMER")}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Symbol Mode: Code Signature */}
            {detailNode.properties?.signature && (
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block mb-2">CODE SIGNATURE</label>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] leading-relaxed text-amber-300 break-words overflow-x-auto">
                  <code>{detailNode.properties.signature}</code>
                </div>
              </div>
            )}

            {/* File Path & Line Range */}
            {(detailNode.properties?.file_path || detailNode.source) && (
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block mb-2">FILE LOCATION</label>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200 flex items-center justify-between font-mono">
                  <span className="truncate text-sky-400" title={detailNode.properties?.file_path || detailNode.source}>
                    {detailNode.properties?.file_path || detailNode.source}
                  </span>
                  {detailNode.properties?.start_line && (
                    <span className="text-emerald-400 font-bold flex-shrink-0 ml-2 px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-800/40 rounded text-[11px]">
                      #L{detailNode.properties.start_line}
                      {detailNode.properties.end_line && detailNode.properties.end_line !== detailNode.properties.start_line ? `-L${detailNode.properties.end_line}` : ""}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Live Source Snippet */}
            {symbolDetails?.code_snippet && (
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block mb-2">SOURCE CODE</label>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[10px] leading-relaxed text-slate-300 max-h-48 overflow-auto whitespace-pre">
                  <code>{symbolDetails.code_snippet}</code>
                </div>
              </div>
            )}

            {/* Action: Open in VS Code */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleOpenInEditor}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-mono text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span> Open in VS Code
              </button>
            </div>
          </div>
        )}
      </aside>
    </motion.main>
  )
}
