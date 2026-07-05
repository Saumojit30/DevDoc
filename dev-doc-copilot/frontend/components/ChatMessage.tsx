"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Copy, Check, FileCode } from "lucide-react"

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = String(children || "").replace(/\n$/, "")
  const lang = (className || "").replace("language-", "") || "text"

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-xl border overflow-hidden bg-card">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">{lang}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy</>
          )}
        </button>
      </div>
      <pre className={className}>
        <code>{children}</code>
      </pre>
    </div>
  )
}

export default function ChatMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        },
        ul({ children }) {
          return <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
        },
        ol({ children }) {
          return <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-primary/30 pl-4 py-1 my-2 text-muted-foreground italic">
              {children}
            </blockquote>
          )
        },
        code({ className, children, ...props }) {
          const isInline = !className
          if (isInline) {
            return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
          }
          return <CodeBlock className={className}>{children}</CodeBlock>
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:no-underline">
              {children}
            </a>
          )
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3 rounded-xl border">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          )
        },
        th({ children }) {
          return <th className="border-b border-border px-4 py-2.5 bg-muted/50 font-medium text-left text-xs uppercase tracking-wider text-muted-foreground">{children}</th>
        },
        td({ children }) {
          return <td className="border-b border-border px-4 py-2.5">{children}</td>
        },
        img({ src, alt }) {
          return <img src={src} alt={alt} className="max-w-full rounded-lg my-2" loading="lazy" />
        },
        hr() {
          return <hr className="my-4 border-border" />
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
