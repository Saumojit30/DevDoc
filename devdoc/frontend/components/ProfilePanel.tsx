"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { useToast } from "@/hooks/use-toast"

interface ProfilePanelProps {
  open: boolean
  onClose: () => void
}

interface ProfileData {
  name: string
  email: string
  initials: string
}

const PROFILE_KEY = "devdoc_profile"

function loadProfile(): ProfileData {
  if (typeof window === "undefined") return { name: "User", email: "", initials: "JD" }
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { name: "User", email: "", initials: "JD" }
}

function saveProfile(data: ProfileData) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export default function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [initials, setInitials] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      const profile = loadProfile()
      setName(profile.name)
      setEmail(profile.email)
      setInitials(profile.initials)
      setSaved(false)
    }
  }, [open])

  const handleSave = () => {
    saveProfile({ name: name.trim() || "User", email: email.trim(), initials: initials.trim() || name.slice(0, 2).toUpperCase() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <motion.aside
      initial={{ x: "100%" }}
      animate={{ x: open ? "0%" : "100%" }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed right-0 top-0 h-full w-80 glass-panel border-l border-overlay-10 z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-6 border-b border-overlay-10">
        <h3 className="font-headline-md text-headline-md text-primary">Profile</h3>
        <button onClick={onClose} className="text-on-surface/40 hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col items-center mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-2xl mb-3">
            {initials || name.slice(0, 2).toUpperCase() || "U"}
          </div>
          <p className="font-code-sm text-code-sm text-on-surface/40">Click avatar to edit initials</p>
        </div>

        <div>
          <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">DISPLAY NAME</label>
          <input
            className="w-full bg-surface-container-lowest border border-overlay-5 rounded-lg px-4 py-2.5 font-body-md text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">EMAIL</label>
          <input
            className="w-full bg-surface-container-lowest border border-overlay-5 rounded-lg px-4 py-2.5 font-body-md text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            type="email"
          />
        </div>

        <div>
          <label className="font-label-caps text-label-caps text-on-surface/40 block mb-2">INITIALS</label>
          <input
            className="w-full bg-surface-container-lowest border border-overlay-5 rounded-lg px-4 py-2.5 font-body-md text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
            value={initials}
            onChange={(e) => setInitials(e.target.value.slice(0, 4))}
            placeholder="JD"
            maxLength={4}
          />
        </div>

        <div className="border-t border-overlay-10 pt-6">
          <label className="font-label-caps text-label-caps text-on-surface/40 block mb-3">PREFERENCES</label>
          <div className="flex items-center justify-between bg-surface-container-lowest border border-overlay-5 rounded-lg px-4 py-3">
            <span className="font-body-md text-on-surface">Dark Theme</span>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`w-11 h-6 rounded-full transition-colors relative ${theme === "dark" ? "bg-primary" : "bg-overlay-10"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        <div className="border-t border-overlay-10 pt-6">
          <label className="font-label-caps text-label-caps text-on-surface/40 block mb-3">API KEYS</label>
          <div className="bg-surface-container-lowest border border-overlay-5 rounded-lg px-4 py-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-code-sm text-code-sm text-on-surface/60">LLM Provider</span>
              <span className="font-code-sm text-code-sm text-on-surface/30">••••••••••••key1</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-code-sm text-code-sm text-on-surface/60">Embedding</span>
              <span className="font-code-sm text-code-sm text-on-surface/30">••••••••••••key2</span>
            </div>
          </div>
        </div>

        <div className="border-t border-overlay-10 pt-6">
          <label className="font-label-caps text-label-caps text-on-surface/40 block mb-3">SESSION</label>
          <button
            onClick={() => {
              sessionStorage.removeItem("devdoc_session_id")
              toast({ title: "Sessions cleared", description: "Chat sessions have been reset.", variant: "success" })
            }}
            className="w-full bg-surface-container-lowest border border-overlay-5 rounded-lg px-4 py-2.5 text-on-surface/60 hover:text-error font-code-sm text-code-sm transition-colors text-left"
          >
            Clear all chat sessions
          </button>
        </div>
      </div>

      <div className="p-6 border-t border-overlay-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-overlay-10 text-on-surface/60 hover:text-on-surface font-code-sm text-code-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 transition-all"
          >
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
