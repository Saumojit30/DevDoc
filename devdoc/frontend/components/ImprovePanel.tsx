"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { improveMemory } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ImprovePanelProps {
  open: boolean
  onClose: () => void
  projectName: string
}

export default function ImprovePanel({ open, onClose, projectName }: ImprovePanelProps) {
  const [feedback, setFeedback] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    } else {
      setFeedback("")
    }
  }, [open])

  const handleSubmit = async () => {
    if (!feedback.trim() || submitting) return
    setSubmitting(true)
    try {
      await improveMemory(projectName, feedback.trim())
      toast({ title: "Memory improved", description: "Feedback submitted successfully.", variant: "success" })
      setFeedback("")
      onClose()
    } catch {
      toast({ title: "Submission failed", description: "Could not submit improvement feedback.", variant: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="glass-panel border border-overlay-10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-headline-md text-headline-md text-primary">Improve Memory</h3>
                <p className="font-code-sm text-code-sm text-on-surface/40 mt-1">
                  Tell us what to improve for <span className="text-primary">{projectName}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-on-surface/40 hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              className="w-full bg-surface-container-lowest border border-overlay-5 rounded-xl p-4 font-body-md text-on-surface min-h-[140px] resize-none focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Describe what you'd like to improve in the knowledge graph... e.g., 'Better entity extraction for function calls' or 'Improve relationship detection between modules'"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />

            <div className="flex items-center justify-between mt-6">
              <p className="font-code-sm text-[11px] text-on-surface/30">
                Press {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to submit
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-overlay-10 text-on-surface/60 hover:text-on-surface font-code-sm text-code-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!feedback.trim() || submitting}
                  className="px-5 py-2 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">hourglass_top</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      Improve
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
