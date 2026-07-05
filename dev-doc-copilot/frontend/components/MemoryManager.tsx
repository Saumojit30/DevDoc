"use client"

import { useState } from "react"
import { Trash2, ThumbsUp, ThumbsDown, BrainCircuit, Loader2, AlertTriangle, X } from "lucide-react"
import { forgetSource, improveMemory } from "@/lib/cognee"
import { useToast } from "@/hooks/use-toast"
import * as Dialog from "@radix-ui/react-dialog"

interface MemoryManagerProps {
  project: string
}

export default function MemoryManager({ project }: MemoryManagerProps) {
  const [forgetInput, setForgetInput] = useState("")
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const handleForget = async () => {
    if (!forgetInput) return
    setLoading(true)
    setDialogOpen(false)
    try {
      await forgetSource(project, forgetInput)
      toast({ title: "Source forgotten", description: forgetInput, variant: "success" })
      setForgetInput("")
    } catch (e: any) {
      toast({ title: "Forget failed", description: e.message, variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleImprove = async (type: "positive" | "negative") => {
    if (!feedback) return
    setLoading(true)
    try {
      await improveMemory(project, `${type}: ${feedback}`)
      toast({ title: "Feedback recorded", description: `Type: ${type}`, variant: "success" })
      setFeedback("")
    } catch (e: any) {
      toast({ title: "Feedback failed", description: e.message, variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Memory Management</h2>
        <p className="text-sm text-muted-foreground mt-1">Remove sources and provide feedback to improve the knowledge graph.</p>
      </div>

      {/* Forget */}
      <div className="card-elevated overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Forget Source</h3>
              <p className="text-xs text-muted-foreground">Remove a document or code source from the knowledge graph.</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <input
            value={forgetInput}
            onChange={e => setForgetInput(e.target.value)}
            placeholder="URL or file path to remove"
            className="input text-sm"
          />
          <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
            <Dialog.Trigger asChild>
              <button
                disabled={loading || !forgetInput}
                className="btn w-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 h-10"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Forget
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl border bg-card p-6 shadow-dialog z-50">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <Dialog.Title className="text-sm font-semibold">Confirm removal</Dialog.Title>
                    <Dialog.Description className="text-xs text-muted-foreground mt-1">
                      Are you sure you want to remove this source from the knowledge graph?
                    </Dialog.Description>
                    <div className="mt-4 flex gap-2 justify-end">
                      <Dialog.Close asChild>
                        <button className="btn-sm btn-outline">Cancel</button>
                      </Dialog.Close>
                      <button onClick={handleForget} className="btn-sm bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Remove
                      </button>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button className="btn-icon btn-ghost shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      {/* Improve */}
      <div className="card-elevated overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Improve Memory</h3>
              <p className="text-xs text-muted-foreground">Feedback enriches the graph via cognee.improve().</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Describe what was correct or incorrect..."
            className="textarea h-20 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleImprove("positive")}
              disabled={loading || !feedback}
              className="btn flex-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-9"
            >
              <ThumbsUp className="w-4 h-4 mr-2" /> Good
            </button>
            <button
              onClick={() => handleImprove("negative")}
              disabled={loading || !feedback}
              className="btn flex-1 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 h-9"
            >
              <ThumbsDown className="w-4 h-4 mr-2" /> Bad
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
