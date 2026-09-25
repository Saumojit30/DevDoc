"use client"

import { useState } from "react"
import type { CogneeMessage } from "@/lib/api"
import { improveMemory } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ChatMessageProps {
  message: CogneeMessage
  projectName?: string
  sessionId?: string
}

export default function ChatMessage({ message, projectName = "default", sessionId }: ChatMessageProps) {
  const [feedback, setFeedback] = useState<"helpful" | "inaccurate" | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const isUser = message.role === "user"
  const content = typeof message.content === "string" ? message.content : String(message.content ?? "")
  const sid = message.session_id || sessionId

  const handleFeedback = async (type: "helpful" | "inaccurate") => {
    if (submitting) return
    if (feedback === type) return

    setSubmitting(true)
    try {
      const feedbackText = type === "helpful"
        ? `User marked response as helpful/accurate: "${content.slice(0, 120)}"`
        : `User marked response as inaccurate/unhelpful: "${content.slice(0, 120)}"`

      await improveMemory(
        projectName,
        feedbackText,
        sid ? [sid] : undefined,
      )

      setFeedback(type)
      toast({
        title: type === "helpful" ? "Feedback Recorded" : "Feedback Saved",
        description: type === "helpful"
          ? "Thank you! Cognee memory will reinforce this context."
          : "Noted. Memory weights and retrieval context will adjust.",
        variant: type === "helpful" ? "success" : "info",
      })
    } catch (err: any) {
      toast({
        title: "Feedback Submission Failed",
        description: err?.message || "Could not record feedback.",
        variant: "error",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`max-w-3xl mx-auto w-full ${isUser ? "" : ""}`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mt-1 ${
          isUser
            ? "bg-surface-variant"
            : "bg-primary/20 border border-primary/30"
        }`}>
          <span className={`material-symbols-outlined text-sm ${
            isUser ? "text-on-surface/60" : "text-primary"
          } ${!isUser ? "font-variation-settings:'FILL' 1" : ""}`}>
            {isUser ? "person" : "auto_awesome"}
          </span>
        </div>

        <div className="flex-1 space-y-6">
          {isUser ? (
            <>
              <h3 className="font-headline-md text-on-surface mb-2">{content}</h3>
              <div className="flex gap-2">
                <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-label-caps uppercase tracking-widest border border-overlay-5">Local Context</span>
                <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-label-caps uppercase tracking-widest border border-overlay-5">V1.2.4</span>
              </div>
            </>
          ) : (
            <div className="ai-message-glow glass-panel p-6 rounded-xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-secondary/10 blur-[60px]"></div>
              <p className="text-body-lg leading-relaxed text-on-surface/90 mb-4">{content}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-overlay-5 mt-4">
                  <span className="font-label-caps text-[10px] text-on-surface/40 uppercase py-1">Sources:</span>
                  {message.sources.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-high rounded border border-overlay-10 hover:border-primary/40 transition-colors cursor-pointer group"
                      title={`${s.source || s.name}${s.line ? ` (line ${s.line})` : ""}`}
                    >
                      <span className={`material-symbols-outlined text-xs ${
                        s.type === "function" ? "text-[#f59e0b]" :
                        s.type === "class" ? "text-[#10b981]" :
                        s.type === "module" ? "text-[#06b6d4]" :
                        s.type === "code" ? "text-secondary" :
                        s.type === "doc" ? "text-primary" : "text-tertiary"
                      }`}>
                        {s.type === "function" ? "code" :
                         s.type === "class" ? "view_in_ar" :
                         s.type === "module" ? "folder" :
                         s.type === "code" ? "terminal" :
                         s.type === "doc" ? "description" : "hub"}
                      </span>
                      <span className="font-code-sm text-[11px] text-on-surface-variant">{s.name}</span>
                      {s.line && (
                        <span className="font-code-sm text-[10px] text-[#10b981] ml-0.5 font-bold">#L{s.line}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Action bar */}
              <div className="flex items-center gap-4 px-2 mt-4">
                <button
                  onClick={() => handleFeedback("helpful")}
                  disabled={submitting}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-xs font-label-caps ${
                    feedback === "helpful"
                      ? "bg-primary/20 text-primary font-bold border border-primary/40"
                      : "text-on-surface/40 hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  <span className={`material-symbols-outlined text-sm ${feedback === "helpful" ? "font-bold" : ""}`}>thumb_up</span>
                  {feedback === "helpful" ? "Helpful ✓" : "Helpful"}
                </button>
                <button
                  onClick={() => handleFeedback("inaccurate")}
                  disabled={submitting}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-xs font-label-caps ${
                    feedback === "inaccurate"
                      ? "bg-error/20 text-error font-bold border border-error/40"
                      : "text-on-surface/40 hover:text-error hover:bg-error/5"
                  }`}
                >
                  <span className={`material-symbols-outlined text-sm ${feedback === "inaccurate" ? "font-bold" : ""}`}>thumb_down</span>
                  {feedback === "inaccurate" ? "Inaccurate ✓" : "Inaccurate"}
                </button>
                <button
                  onClick={() => toast({ title: "Regenerate", description: "Use the prompt input to re-query with modified parameters.", variant: "info" })}
                  className="flex items-center gap-1 text-on-surface/40 hover:text-on-surface transition-colors text-xs font-label-caps"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
