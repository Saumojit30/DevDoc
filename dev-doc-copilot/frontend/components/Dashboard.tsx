"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileText, GitBranch, Network, MessageSquare, Activity, ArrowRight, Zap, Circle, Sparkles } from "lucide-react"

interface DashboardProps {
  project: string
}

interface StatItem {
  label: string
  value: number
  icon: typeof FileText
  gradient: string
  description: string
  trend: number
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0, 1] } },
}

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const duration = 800
    const steps = 20
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <>{display}</>
}

export default function Dashboard({ project }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [backendOk, setBackendOk] = useState(false)

  useEffect(() => {
    let gone = false
    fetch("http://localhost:8000/health")
      .then(r => r.json())
      .then(j => { if (!gone) setBackendOk(j.status === "ok") })
      .catch(() => { if (!gone) setBackendOk(false) })
      .finally(() => { if (!gone) setLoading(false) })
    return () => { gone = true }
  }, [])

  const stats: StatItem[] = [
    { label: "Documents", value: 1247, icon: FileText, gradient: "from-cyan-500 to-blue-600", description: "Markdown, PDFs, API specs", trend: 12 },
    { label: "Code Repos", value: 3, icon: GitBranch, gradient: "from-violet-500 to-purple-600", description: "Python, TypeScript, Go", trend: 0 },
    { label: "Graph Nodes", value: 8420, icon: Network, gradient: "from-amber-500 to-orange-600", description: "Entities across all sources", trend: 8 },
    { label: "Queries", value: 156, icon: MessageSquare, gradient: "from-emerald-500 to-teal-600", description: "Total questions answered", trend: 23 },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Hero */}
      <div className="card-elevated overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-primary-50/40 dark:to-primary-50/10 p-6 lg:p-7 shadow-glow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <Circle className={`w-2 h-2 ${backendOk ? "fill-emerald-500 text-emerald-500" : "fill-destructive text-destructive"}`} />
              {loading ? "Checking backend" : backendOk ? "Backend connected" : "Backend offline"}
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">Dashboard</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                A live command center for your knowledge graph, organized around the active project <span className="font-mono text-foreground">{project}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="skeleton h-10 w-24 rounded-full" />
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 text-xs font-medium shadow-sm">
                <span className={`w-2 h-2 rounded-full ${backendOk ? "bg-emerald-500 animate-pulse-dot" : "bg-destructive"}`} />
                <span className="text-muted-foreground">{backendOk ? "Connected" : "Offline"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} variants={item} className="card-elevated p-5 group hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                {stat.trend > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <ArrowRight className="w-3 h-3 rotate-45" />
                    {stat.trend}%
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold tabular-nums">
                  <AnimatedCounter value={stat.value} />
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Getting Started + Status row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Getting Started */}
        <motion.div variants={item} className="card-elevated p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Getting Started</h3>
              <p className="text-xs text-muted-foreground">Three steps to your first answer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {[
              { step: "1", label: "Ingest docs", icon: FileText, done: false },
              { step: "2", label: "Ingest code", icon: GitBranch, done: false },
              { step: "3", label: "Ask questions", icon: MessageSquare, done: false },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    s.done
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/20 text-muted-foreground bg-card"
                  }`}>
                    {s.step}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-medium">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.done ? "Complete" : "Pending"}</p>
                  </div>
                </div>
                {i < 2 && (
                  <div className="hidden sm:flex flex-1 items-center justify-center">
                    <div className="w-full h-px bg-border relative">
                      <ArrowRight className="w-3 h-3 text-muted-foreground absolute right-0 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Quick Actions</h3>
            </div>
          </div>
          <div className="space-y-2">
            <button className="btn-primary w-full justify-start text-sm h-9">
              <FileText className="w-4 h-4 mr-2" /> Ingest Documentation
            </button>
            <button className="btn-outline w-full justify-start text-sm h-9">
              <GitBranch className="w-4 h-4 mr-2" /> Add Code Repo
            </button>
            <button className="btn-outline w-full justify-start text-sm h-9">
              <Network className="w-4 h-4 mr-2" /> View Knowledge Graph
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
