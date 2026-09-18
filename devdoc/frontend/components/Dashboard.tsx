"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { getGraphMetrics, getHealth } from "@/lib/api"
import type { TabId } from "./SideNavBar"

export default function Dashboard({ projectName, onTabChange }: { projectName: string; onTabChange?: (tab: TabId) => void }) {
  const [nodes, setNodes] = useState<number | null>(null)
  const [edges, setEdges] = useState<number | null>(null)
  const [health, setHealth] = useState<string>("checking")
  const [latency, setLatency] = useState<string>("--")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
          const [metricsRes, healthRes] = await Promise.all([
          getGraphMetrics(projectName).catch(() => null),
          getHealth().catch(() => ({ status: "error", version: "unknown", latencyMs: 0 })),
        ])
        if (cancelled) return
        if (metricsRes?.metrics) {
          setNodes(metricsRes.metrics.num_nodes ?? null)
          setEdges(metricsRes.metrics.num_edges ?? null)
        }
        setHealth(healthRes.status === "ok" ? "Connected" : "Disconnected")
        setLatency(healthRes.status === "ok" ? `${healthRes.latencyMs}ms` : "--")
      } catch {
        if (!cancelled) {
          setHealth("Disconnected")
          setLatency("--")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectName])

  const Skeleton = () => <div className="h-8 w-24 skeleton rounded" />

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="md:ml-64 pt-24 px-gutter pb-24 min-h-screen relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <header className="max-w-container-max mx-auto mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-overlay-5 pb-10">
          <div>
            <h1 className="font-display-lg text-[64px] md:text-[84px] text-on-surface tracking-tighter leading-none mb-2">
              Dev-<span className="text-primary glow-text">Doc</span>
            </h1>
            <div className="flex items-center gap-4">
              <span className="font-headline-lg text-headline-lg text-on-surface/60">{projectName}</span>
              <div className="h-6 w-[1px] bg-overlay-10"></div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className={`w-2 h-2 rounded-full ${health === "Connected" ? "bg-primary animate-pulse" : "bg-error"} active-glow`}></span>
                <span className="font-code-sm text-[12px] text-primary">{health}</span>
                <span className="font-code-sm text-[12px] text-on-surface/40 ml-2">Latency: {latency}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => onTabChange?.("graph")}
              className="px-6 py-3 rounded-lg border border-overlay-10 hover:bg-overlay-5 text-on-surface font-label-caps text-label-caps flex items-center gap-2 transition-all group"
            >
              <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">explore</span>
              Explore Graph
            </button>
            <button
              onClick={() => onTabChange?.("chat")}
              className="px-6 py-3 rounded-lg bg-primary text-on-primary-container font-label-caps text-label-caps flex items-center gap-2 hover:brightness-110 shadow-lg shadow-primary/10 transition-all"
            >
              <span className="material-symbols-outlined">add_box</span>
              New Query
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-container-max mx-auto mb-16 grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="glass-card p-8 rounded-xl flex flex-col justify-between h-48 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-[80px]">schema</span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface/40 mb-1">Total Nodes</p>
            {loading ? <Skeleton /> : <h3 className="font-display-lg text-display-lg text-on-surface glow-text">{nodes ?? "—"}</h3>}
          </div>
          <div className="flex items-center gap-2 text-primary font-code-sm text-[12px]">
            <span className="material-symbols-outlined text-[14px]">insights</span>
            <span>{loading ? "..." : nodes !== null ? `${nodes} indexed graph entities` : "No data"}</span>
          </div>
        </div>
        <div className="glass-card p-8 rounded-xl flex flex-col justify-between h-48 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-[80px]">share</span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface/40 mb-1">Connections</p>
            {loading ? <Skeleton /> : <h3 className="font-display-lg text-display-lg text-on-surface glow-text">{edges ?? "—"}</h3>}
          </div>
          <div className="flex items-center gap-2 text-primary font-code-sm text-[12px]">
            <span className="material-symbols-outlined text-[14px]">account_tree</span>
            <span>{loading ? "..." : nodes && edges ? `Density: ${(edges / nodes).toFixed(2)} links/node` : "No data"}</span>
          </div>
        </div>
        <div className="glass-card p-8 rounded-xl flex flex-col justify-between h-48 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-[80px]">history</span>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface/40 mb-1">System Status</p>
            {loading ? <Skeleton /> : <h3 className="font-display-lg text-display-lg text-on-surface glow-text">{health === "Connected" ? "Optimal" : "Offline"}</h3>}
          </div>
          <div className="flex items-center gap-2 text-on-surface/40 font-code-sm text-[12px]">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span>{loading ? "..." : health === "Connected" ? "All systems operational" : "Backend unreachable"}</span>
          </div>
        </div>
      </section>

      <section className="max-w-container-max mx-auto mb-24">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Getting Started</h2>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {[
            {
              step: "01",
              title: "Ingest Docs",
              desc: "Upload your documentation, technical specifications, or markdown repositories to seed the knowledge graph.",
              imageDark: "/images/ingest_docs_dark.png",
              imageLight: "/images/ingest_docs_light.png"
            },
            {
              step: "02",
              title: "Map Code",
              desc: "Connect your GitHub repositories to automatically map relationships between implementation and documentation.",
              imageDark: "/images/map_code_dark.png",
              imageLight: "/images/map_code_light.png"
            },
            {
              step: "03",
              title: "Query Graph",
              desc: "Ask complex technical questions and receive synthesized answers backed by your internal knowledge base.",
              imageDark: "/images/query_graph_dark.png",
              imageLight: "/images/query_graph_light.png"
            },
          ].map((item) => (
            <div key={item.step} className="group cursor-pointer">
              <div className="glass-card aspect-video rounded-xl mb-4 relative overflow-hidden flex items-center justify-center">
                {/* Light Mode Image */}
                <img
                  src={item.imageLight}
                  alt={item.title}
                  className="w-full h-full object-cover block dark:hidden group-hover:scale-105 transition-transform duration-500"
                />
                {/* Dark Mode Image */}
                <img
                  src={item.imageDark}
                  alt={item.title}
                  className="w-full h-full object-cover hidden dark:block group-hover:scale-105 transition-transform duration-500"
                />
                {/* Visual gradient overlay for text readability and theme blending */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent pointer-events-none"></div>
                {/* Step indicator text */}
                <div className="absolute inset-0 flex items-end p-6">
                  <span className="font-display-lg text-display-lg text-on-surface/10 select-none leading-none">{item.step}</span>
                </div>
              </div>
              <h4 className="font-headline-md text-headline-md text-on-surface mb-2 group-hover:text-primary transition-colors">{item.title}</h4>
              <p className="font-body-md text-body-md text-on-surface/60 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-container-max mx-auto">
        <div className="glass-card rounded-2xl p-1 w-full h-[400px] relative overflow-hidden group">
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center p-12 bg-background/20 backdrop-blur-sm">
            <div className="p-4 rounded-full bg-primary/20 border border-primary/40 mb-6 animate-bounce">
              <span className="material-symbols-outlined text-primary text-[32px]">visibility</span>
            </div>
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4">Real-time Context Visualization</h3>
            <p className="font-body-lg text-body-lg text-on-surface/60 max-w-xl mx-auto mb-8">
              Experience your documentation as a living, breathing entity. Switch to the full Graph view to interact with individual nodes and traces.
            </p>
            <button
              onClick={() => onTabChange?.("graph")}
              className="bg-overlay-10 hover:bg-overlay-20 px-8 py-3 rounded-lg font-label-caps text-label-caps border border-overlay-10 transition-all"
            >
              Launch Knowledge Viewer
            </button>
          </div>
        </div>
      </section>
    </motion.main>
  )
}
