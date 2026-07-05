"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Sparkles, User, Loader2, FileCode, BookText, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { type CogneeMessage, chatQuery } from "@/lib/cognee"
import ChatMessage from "@/components/ChatMessage"
import { useToast } from "@/hooks/use-toast"

interface ChatInterfaceProps {
  project: string
}

function genId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getInitials(content: string): string {
  return content.slice(0, 2).toUpperCase()
}

export default function ChatInterface({ project }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<CogneeMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [rawMode, setRawMode] = useState(false)
  const [sessionId, setSessionId] = useState(genId)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    setSessionId(genId())
  }, [project])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200)
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg: CogneeMessage = { role: "user", content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await chatQuery(project, input, rawMode, sessionId)
      setMessages(prev => [...prev, { ...res, session_id: sessionId }])
    } catch (e: any) {
      const msg = e.message || "Chat request failed"
      toast({ title: "Chat Error", description: msg, variant: "error" })
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${msg}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-semibold">Chat</h2>
        <button
          onClick={() => setRawMode(!rawMode)}
          className={cn("btn-sm btn-outline", rawMode && "border-primary/40 text-primary")}
        >
          {rawMode ? "Raw" : "Synthesized"}
        </button>
      </div>

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 ring-1 ring-inset ring-primary/10">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground/60">Ask about your codebase</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1.5 leading-relaxed">
              Questions traverse the Cognee knowledge graph to find relevant answers from your docs and code.
            </p>
            <div className="flex gap-2 mt-6">
              {["What is this project?", "How do I install dependencies?", "Explain the code structure"].map(hint => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="text-xs px-3 py-1.5 rounded-full border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ring-2 ring-background",
                msg.role === "user"
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                  : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
              )}>
                {msg.role === "user"
                  ? <User className="w-4 h-4" />
                  : <Sparkles className="w-4 h-4" />
                }
              </div>
              {/* Bubble */}
              <div className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[75%] shadow-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border"
              )}>
                {msg.role === "user" ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <ChatMessage content={msg.content} />
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-2.5">
                    {msg.sources.map((s, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                        {s.type === "doc" ? <BookText className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-center gap-3 pl-11">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-dot" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-dot" style={{ animationDelay: "300ms" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-dot" style={{ animationDelay: "600ms" }} />
            </div>
            <span className="text-xs text-muted-foreground">Searching knowledge graph</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 lg:right-12 w-9 h-9 rounded-full bg-card border shadow-elevated flex items-center justify-center hover:bg-surface-raised transition-colors z-10"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Input */}
      <div className="mt-4 shrink-0 relative">
        <div className="flex items-center gap-2 rounded-xl border bg-card p-1.5 pl-4 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-shadow shadow-sm">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask about your docs and code..."
            className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="btn-icon bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
          <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">⌘Enter</kbd> to send
        </p>
      </div>
    </div>
  )
}
