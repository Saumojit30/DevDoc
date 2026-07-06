"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import ChatMessage from "./ChatMessage"
import type { CogneeMessage, SourceNode } from "@/lib/api"
import { chatQuery } from "@/lib/api"
import type { TabId } from "./SideNavBar"

function generateSessionId(): string {
  return "session_" + crypto.randomUUID()
}

export default function ChatInterface({ projectName, onTabChange }: { projectName: string; onTabChange?: (tab: TabId) => void }) {
  const [sessionId, setSessionId] = useState<string>("")
  const [messages, setMessages] = useState<CogneeMessage[]>([])
  const [contextSources, setContextSources] = useState<SourceNode[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let sid = sessionStorage.getItem("devdoc_session_id")
    if (!sid) {
      sid = generateSessionId()
      sessionStorage.setItem("devdoc_session_id", sid)
    }
    setSessionId(sid)
  }, [])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput("")
    const userMsg: CogneeMessage = { role: "user", content: q, session_id: sessionId }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await chatQuery(projectName, q, false, sessionId)
      setMessages(prev => [...prev, res])
      if (res.sources && res.sources.length > 0) {
        setContextSources(prev => {
          const existing = new Set(prev.map(s => s.id))
          const newSources = res.sources!.filter(s => !existing.has(s.id))
          return [...prev, ...newSources].slice(-10)
        })
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error processing your request." }])
    } finally {
      setLoading(false)
    }
  }

  const typeColors: Record<string, { dot: string; shadow: string }> = {
    doc: { dot: "bg-primary", shadow: "shadow-[0_0_6px_#4cd7f6]" },
    code: { dot: "bg-secondary", shadow: "shadow-[0_0_6px_#cebdff]" },
    function: { dot: "bg-tertiary", shadow: "shadow-[0_0_6px_#bcc7de]" },
    class: { dot: "bg-primary", shadow: "shadow-[0_0_6px_#4cd7f6]" },
    module: { dot: "bg-secondary", shadow: "shadow-[0_0_6px_#cebdff]" },
  }

  function getTypeStyle(type: string): { dot: string; shadow: string } {
    return (typeColors as Record<string, { dot: string; shadow: string }>)[type] || typeColors.doc
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="md:ml-64 mt-16 flex h-[calc(100vh-64px)] overflow-hidden"
    >
      <section className="flex-1 flex flex-col relative h-full bg-background">
        <div className="flex-1 overflow-y-auto px-gutter py-10 space-y-12 custom-scrollbar">
          {messages.length === 0 && (
            <div className="max-w-3xl mx-auto w-full mt-32 text-center">
              <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-primary/30">
                <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-3">Ask Dev-Doc anything</h2>
              <p className="text-on-surface/40 font-body-md max-w-md mx-auto">
                Ask technical questions about your codebase and get answers backed by your knowledge graph.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
          {loading && (
            <div className="max-w-3xl mx-auto w-full">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1 border border-primary/30">
                  <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "0.2s" }}></span>
                  <span className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: "0.4s" }}></span>
                </div>
              </div>
            </div>
          )}
          <div className="h-32"></div>
        </div>

        <div className="absolute bottom-0 left-0 w-full px-gutter pb-10 bg-gradient-to-t from-background via-background/90 to-transparent pt-12">
          <div className="max-w-3xl mx-auto">
            <div className="relative glass-panel rounded-2xl shadow-2xl p-1 focus-within:ring-1 focus-within:ring-primary/50 transition-all duration-300">
              <textarea
                className="w-full bg-transparent border-none focus:ring-0 text-on-surface font-body-md min-h-[56px] max-h-48 py-3 px-12 resize-none leading-relaxed"
                placeholder="Ask Dev-Doc anything about your codebase..."
                rows={1}
                value={input}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px" }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              />
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => {
                const files = e.target.files
                if (files?.length) {
                  setMessages(prev => [...prev, { role: "assistant", content: `📎 ${files.length} file(s) attached. Use the Ingest panel to process them.` }])
                  e.target.value = ""
                }
              }} />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 top-3.5 flex items-center justify-center w-8 h-8 rounded-lg text-on-surface/40 hover:text-primary hover:bg-primary/10 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 300" }}>attachment</span>
              </div>
              <div className="absolute right-3 top-2.5 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-overlay-5 rounded-md border border-overlay-5">
                  <span className="material-symbols-outlined text-sm text-on-surface/40">language</span>
                  <span className="font-code-sm text-[10px] text-on-surface/40 uppercase">Search ON</span>
                </div>
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-primary text-on-primary w-9 h-9 rounded-lg flex items-center justify-center hover:brightness-110 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
            </div>
            <div className="flex justify-between mt-3 px-2">
              <p className="text-[11px] font-code-sm text-on-surface/30">Dev-Doc may hallucinate architectural patterns. Always verify critical deployments.</p>
              <div className="flex gap-4">
                <span className="text-[11px] font-code-sm text-on-surface/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_4px_#4cd7f6]"></span> GPU Active
                </span>
                <span className="text-[11px] font-code-sm text-on-surface/40">GPT-4-Engine</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hidden lg:flex w-80 h-full glass-panel border-l border-overlay-10 flex-col">
        <div className="p-6 border-b border-overlay-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-md text-on-surface text-sm uppercase tracking-widest opacity-60">Context Sources</h3>
            <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">{contextSources.length} Sources</span>
          </div>
          <div className="space-y-3">
            {contextSources.length === 0 ? (
              <p className="text-[11px] text-on-surface/40 font-code-sm">No sources referenced yet. Ask a question to populate context.</p>
            ) : (
              contextSources.map((src) => {
                const style = getTypeStyle(src.type)
                return (
                  <div key={src.id} onClick={() => onTabChange?.("graph")} className="group relative bg-surface-container-low p-3 rounded-xl border border-overlay-5 hover:border-primary/40 transition-all cursor-pointer overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl group-hover:bg-primary/10"></div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full ${style.dot} ${style.shadow}`}></div>
                      <span className="font-code-sm text-xs font-bold text-on-surface truncate">{src.name}</span>
                    </div>
                    <p className="text-[11px] text-on-surface/50 line-clamp-2 leading-relaxed">
                      {src.type} &middot; {src.source.slice(0, 40)}{src.source.length > 40 ? "..." : ""}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <h3 className="font-headline-md text-on-surface text-sm uppercase tracking-widest opacity-60 mb-4">Conversation</h3>
          <p className="text-[11px] text-on-surface/40 font-code-sm">{messages.length} messages in this session</p>
        </div>
        <div className="mt-auto p-6 bg-surface-container-high/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-label-caps text-on-surface/40">Session Active</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border border-background bg-secondary/20 flex items-center justify-center text-[8px] font-bold">JD</div>
              <div className="w-6 h-6 rounded-full border border-background bg-primary/20 flex items-center justify-center text-[8px] font-bold">AK</div>
              <div className="w-6 h-6 rounded-full border border-background bg-tertiary/20 flex items-center justify-center text-[8px] font-bold">+2</div>
            </div>
            <span className="text-[10px] font-code-sm text-on-surface/40">Team active</span>
          </div>
        </div>
      </section>
    </motion.main>
  )
}
