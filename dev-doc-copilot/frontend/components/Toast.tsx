"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, XCircle, Info, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const borders = {
  success: "border-emerald-500/20",
  error: "border-red-500/20",
  info: "border-violet-500/20",
}

const accents = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  info: "bg-violet-500",
}

function ToastProgress({ id }: { id: string }) {
  const [width, setWidth] = useState(100)
  useEffect(() => {
    const start = Date.now()
    const duration = 3900
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setWidth(remaining)
      if (remaining <= 0) clearInterval(timer)
    }, 50)
    return () => clearInterval(timer)
  }, [id])
  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full transition-all duration-100 ease-linear ${accents[id.startsWith("toast") ? "success" : "info"]}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = icons[t.variant || "info"]
          const border = borders[t.variant || "info"]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0, 1] }}
              className={`relative overflow-hidden rounded-xl border ${border} bg-card p-4 shadow-elevated pointer-events-auto`}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 shrink-0 mt-0.5 text-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  )}
                </div>
                <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <ToastProgress id={t.id} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
