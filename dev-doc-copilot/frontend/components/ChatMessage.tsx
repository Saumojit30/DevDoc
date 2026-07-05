"use client"

import type { CogneeMessage } from "@/lib/api"

interface ChatMessageProps {
  message: CogneeMessage
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

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
              <h3 className="font-headline-md text-on-surface mb-2">{message.content}</h3>
              <div className="flex gap-2">
                <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-label-caps uppercase tracking-widest border border-white/5">Local Context</span>
                <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-label-caps uppercase tracking-widest border border-white/5">V1.2.4</span>
              </div>
            </>
          ) : (
            <div className="ai-message-glow glass-panel p-6 rounded-xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-secondary/10 blur-[60px]"></div>
              <p className="text-body-lg leading-relaxed text-on-surface/90 mb-4">{message.content}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 mt-4">
                  <span className="font-label-caps text-[10px] text-on-surface/40 uppercase py-1">Sources:</span>
                  {message.sources.map((s) => (
                    <div key={s.id} className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-high rounded border border-white/10 hover:border-primary/40 transition-colors cursor-pointer group">
                      <span className={`material-symbols-outlined text-xs ${
                        s.type === "code" ? "text-secondary" : s.type === "doc" ? "text-primary" : "text-tertiary"
                      }`}>
                        {s.type === "code" ? "code" : s.type === "doc" ? "description" : "hub"}
                      </span>
                      <span className="font-code-sm text-[11px] text-on-surface-variant">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Action bar */}
              <div className="flex items-center gap-4 px-2 mt-4">
                <button className="flex items-center gap-1 text-on-surface/40 hover:text-primary transition-colors text-xs font-label-caps">
                  <span className="material-symbols-outlined text-sm">thumb_up</span>
                  Helpful
                </button>
                <button className="flex items-center gap-1 text-on-surface/40 hover:text-error transition-colors text-xs font-label-caps">
                  <span className="material-symbols-outlined text-sm">thumb_down</span>
                  Inaccurate
                </button>
                <button className="flex items-center gap-1 text-on-surface/40 hover:text-on-surface transition-colors text-xs font-label-caps">
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
