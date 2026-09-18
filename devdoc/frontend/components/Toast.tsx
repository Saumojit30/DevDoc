"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="glass-panel rounded-xl p-4 shadow-xl cursor-pointer"
            onClick={() => dismiss(t.id)}
          >
            <div className="flex items-start gap-3">
              <span className={`material-symbols-outlined text-lg mt-0.5 ${
                t.variant === "error" ? "text-error" : t.variant === "success" ? "text-primary" : "text-on-surface/60"
              }`}>
                {t.variant === "error" ? "error" : t.variant === "success" ? "check_circle" : "info"}
              </span>
              <div className="flex-1">
                <p className="font-code-sm text-sm text-on-surface font-bold">{t.title}</p>
                {t.description && <p className="font-code-sm text-xs text-on-surface/60 mt-1">{t.description}</p>}
              </div>
              <button className="text-on-surface/40 hover:text-on-surface">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
