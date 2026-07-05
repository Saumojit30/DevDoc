"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, LayoutDashboard, MessageSquare, GitGraph, Network, Settings, Command, ArrowRight } from "lucide-react"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (tab: string) => void
}

const items = [
  { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard },
  { id: "chat", label: "Go to Chat", icon: MessageSquare },
  { id: "ingest", label: "Go to Ingest", icon: GitGraph },
  { id: "graph", label: "Go to Graph", icon: Network },
  { id: "memory", label: "Go to Memory", icon: Settings },
]

export default function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : items

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [query])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === "Enter" && filtered[selected]) {
      onNavigate(filtered[selected].id)
      onOpenChange(false)
    }
    if (e.key === "Escape") onOpenChange(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0, 1] }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg rounded-xl border bg-card shadow-dialog z-[201] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search pages and actions..."
                className="flex-1 h-11 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground font-mono">ESC</kbd>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No results</p>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      data-selected={idx === selected}
                      onClick={() => { onNavigate(item.id); onOpenChange(false) }}
                      onMouseEnter={() => setSelected(idx)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors data-[selected=true]:bg-muted text-foreground"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
