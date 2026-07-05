# STITCH BLUEPRINT — Dev-Doc Copilot Frontend Rebuild

## 1. Backend API Reference

All endpoints live at `http://localhost:8000`. The Next.js catch-all proxy at `app/api/[...proxy]/route.ts` forwards every `/api/*` request transparently.

### 1.1 Health
```
GET /health
→ 200 { "status": "ok", "version": "1.1.0" }
```

### 1.2 Chat
```
POST /api/chat
→ Body: { "project": string, "question": string, "onlyContext"?: bool, "sessionId"?: string }
→ 200 { "role": "assistant", "content": string, "sources": SourceNode[], "raw": bool, "session_id"?: string }
```
```typescript
interface SourceNode { id: string; type: string; name: string; source: string; line?: number }
```

### 1.3 Ingest — Docs
```
POST /api/ingest/docs
→ FormData: project (string), urls (string, newline-separated), files (File[]), sessionId? (string)
→ 200 { "status": "ok", "dataset": "project-{name}", "ingested": { urls: number, files: number }, "session_id"?: string }
```

### 1.4 Ingest — Code
```
POST /api/ingest/code
→ Body: { "project": string, "repoPath": string, "cloneUrl"?: string, "sessionId"?: string }
→ 200 { "status": "ok", "dataset": "project-{name}", "repo": string, "files_ingested": number, "session_id"?: string }
```

### 1.5 Memory — Forget
```
POST /api/memory/forget
→ Body: { "project": string, "source": string, "sessionId"?: string }
→ 200 { "status": "ok", "dataset": "project-{name}", "forgot": string, "session_id"?: string }
```

### 1.6 Memory — Improve
```
POST /api/memory/improve
→ Body: { "project": string, "feedback"?: string, "sessionIds": string[] }
→ 200 { "status": "ok", "dataset": "project-{name}", "session_ids"?: string[] }
```

### 1.7 Graph — Data (D3.js)
```
POST /api/graph/data
→ Body: { "project": string }
→ 200 {
    "dataset": string,
    "nodes": [{ id: string, label: string, type: string, source: string }],
    "edges": [{ source: string, target: string, relation: string, weight: number }],
    "metrics": { num_nodes: number, num_edges: number }
  }
```

### 1.8 Graph — Inventory
```
POST /api/graph/inventory
→ Body: { "project": string, "samples_per_type"?: number }
→ 200 { "inventory": any }
```

### 1.9 Graph — Metrics
```
POST /api/graph/metrics
→ Body: { "project": string }
→ 200 { "dataset": string, "metrics": any }
```

---

## 2. Component Tree — Stitch HTML → React Mapping

### Shell Layer

```
app/layout.tsx                       ← <html class="dark">, fonts, ThemeProvider, radial-glow
├── app/providers.tsx                ← next-themes ThemeProvider wrapper
└── app/globals.css                  ← All stitch CSS classes

app/page.tsx                         ← SPA: useState<tab>, AnimatePresence
├── TopNavBar                        ← stitch: fixed top bar
├── SideNavBar                       ← stitch: fixed left sidebar (desktop) + bottom nav (mobile)
├── <AnimatePresence>                ← Page content with Framer Motion
│   ├── Dashboard                    ← stitch: dashboard/code.html
│   ├── ChatInterface                ← stitch: chat_interface/code.html
│   │   └── ChatMessage              ← react-markdown with stitch syntax colors
│   ├── IngestionPanel               ← stitch: ingest_workflow/code.html
│   ├── KnowledgeGraph               ← stitch: knowledge_graph/code.html
│   └── MemoryManager                ← stitch: memory_manager/code.html
├── CommandPalette                   ← Cmd+K search palette
├── ToastContainer                   ← Glass-styled toast notifications
└── FAB                              ← Floating action button (bottom-right, bolt icon)
```

### Data Flow For Each Page

**Dashboard:**
```
mount → fetch("http://localhost:8000/health") → { status } → connection badge (green/red)
static stats (1,240 / 4,892 / 12) are mock — replace with /api/graph/metrics
```

**ChatInterface:**
```
user types → chatQuery(project, question, rawMode, sessionId) → POST /api/chat
→ response rendered in ChatMessage → react-markdown → stitch-styled code blocks
```

**IngestionPanel:**
```
drop files / paste URLs → ingestDocs(project, urls, files) → FormData → POST /api/ingest/docs
OR repo path → ingestCode(project, repoPath, cloneUrl) → POST /api/ingest/code
```

**KnowledgeGraph:**
```
mount → fetchGraph() → POST /api/graph/data → D3.js force simulation → SVG nodes/edges
hover → setSelectedNode → detail card
```

**MemoryManager:**
```
type source → forgetSource(project, source) → POST /api/memory/forget
type feedback → improveMemory(project, feedback) → POST /api/memory/improve
```

---

## 3. Stitch Design Tokens (Exact)

### Colors
```
background  = #101415
surface     = #101415
primary     = #4cd7f6  (Cyan)
secondary   = #cebdff  (Violet)
tertiary    = #bcc7de
on-surface  = #e0e3e5
on-surface-variant = #bcc9cd

surface-container-lowest  = #0b0f10
surface-container-low     = #191c1e
surface-container         = #1d2022
surface-container-high    = #272a2c
surface-container-highest = #323537
surface-bright            = #363a3b
surface-variant           = #323537

on-primary     = #003640
on-secondary   = #381385
on-error       = #690005
error-container = #93000a
error          = #ffb4ab

outline        = #869397
outline-variant = #3d494c
```

### Glass Effects
```css
.glass-panel {
  background: rgba(16, 20, 21, 0.65);
  backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-card {
  background: rgba(25, 28, 30, 0.65);
  backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
}
.glass-card:hover {
  border-color: rgba(76, 215, 246, 0.3);
  box-shadow: 0 0 20px rgba(76, 215, 246, 0.15);
}
```

### Typography
| Token | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| display-lg | JetBrains Mono | 48px | 700 | 1.1 | -0.04em |
| headline-lg | JetBrains Mono | 32px | 600 | 1.2 | -0.02em |
| headline-md | JetBrains Mono | 20px | 500 | 1.4 | normal |
| body-lg | Hanken Grotesk | 18px | 400 | 1.6 | normal |
| body-md | Hanken Grotesk | 16px | 400 | 1.5 | normal |
| code-sm | JetBrains Mono | 14px | 400 | 1.5 | normal |
| label-caps | JetBrains Mono | 12px | 700 | 1 | 0.1em |

### Spacing
```
unit        = 4px
gutter      = 24px
margin-safe = 40px
container-max = 1280px
stack-gap   = 16px
```

### Border Radius
```
DEFAULT = 0.25rem (4px)
lg      = 0.5rem  (8px)
xl      = 0.75rem (12px)
full    = 9999px
```

### Shadows & Glows
| Name | Value |
|------|-------|
| active-glow | `0 0 8px #4cd7f6` |
| active-bloom | `0 0 15px rgba(76, 215, 246, 0.2)` |
| cyan-glow | `0 0 10px rgba(76, 215, 246, 0.2)` |
| glow-text | `0 0 12px rgba(76, 215, 246, 0.15)` |
| violet glow (nodes) | `drop-shadow(0 0 8px rgba(206, 189, 255, 0.4))` |
| cyan glow (nodes) | `drop-shadow(0 0 8px rgba(76, 215, 246, 0.4))` |
| top nav shadow | `0 0 15px rgba(76, 215, 246, 0.1)` |

---

## 4. Stitch HTML Section-by-Section Component Inventory

### TopNavBar (present on ALL pages)
```
fixed top-0 w-full z-50 h-16
bg-surface/65 backdrop-blur-xl border-b border-white/10
shadow-[0_0_15px_rgba(76,215,246,0.1)]
├── LHS:
│   ├── "Dev-Doc" → font-display-lg text-[24px] text-primary tracking-tighter
│   └── Nav links (hidden md:flex) → font-headline-md text-[14px]
│       ├── Dashboard → active = text-primary border-b-2 border-primary
│       ├── Chat → inactive = text-on-surface/40 hover:text-primary
│       └── Knowledge Graph → inactive = text-on-surface/40 hover:text-primary
├── RHS:
│   ├── [hidden lg:flex] version badge → bg-surface-container rounded-lg border-white/5
│   │   ├── connected_tv icon (text-primary)
│   │   └── "v2.4.0 Stable" (font-code-sm text-on-surface/60)
│   ├── dark_mode icon button → text-on-surface/60 hover:text-primary
│   ├── Ingest CTA → bg-primary text-on-primary font-label-caps px-4 py-2 rounded-lg
│   └── Profile avatar → w-8 h-8 rounded-full border-white/10 (or bg-primary/20 text fallback)
```

### SideNavBar (present on ALL pages)
```
fixed left-0 top-0 h-full w-64
bg-surface/65 backdrop-blur-[40px] border-r border-white/10
z-40 py-margin-safe
├── Brand section (px-6 mb-10 mt-16)
│   ├── Icon box → w-10 h-10 rounded-lg bg-primary/10 border-primary/20 → dataset icon
│   ├── "Project Alpha" → font-headline-md text-[20px] text-primary
│   └── "Active Context" → font-code-sm text-on-surface/40
├── New Node button → w-full bg-primary/10 border-primary/20 text-primary rounded-lg
├── Nav (flex-1 px-4)
│   ├── "Architecture" label → font-label-caps text-[10px] text-on-surface/30 tracking-[0.2em]
│   ├── Dashboard → material-symbol: dashboard
│   ├── Chat → material-symbol: forum
│   ├── Ingest → material-symbol: input
│   ├── Knowledge Graph → material-symbol: hub
│   └── Memory Manager → material-symbol: memory
│   Active state: text-primary font-bold bg-primary/10 active-glow
│   Inactive state: text-on-surface/40 hover:bg-white/5 hover:text-on-surface
├── Footer (border-t border-white/5)
│   ├── Settings → material-symbol: settings
│   └── dark_mode toggle → material-symbol: light_mode/dark_mode
```

### Dashboard Page
```
radial-glow (fixed, mouse-following)
ambient blurs → top-right primary/5, bottom-left secondary/5

Hero header (border-b border-white/5 pb-10):
├── "terminal" / "dashboard" breadcrumb → font-code-sm text-primary / text-on-surface/20 / text-on-surface/40
├── "Dev-Doc" title → font-display-lg text-[64px] md:text-[84px] tracking-tighter
│   └── "Doc" → text-primary glow-text
├── Project name + connection status
│   └── Status badge → bg-primary/10 border-primary/20 rounded-full
│       ├── Dot: w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#4cd7f6]
│       ├── "Connected" → font-code-sm text-[12px] text-primary
│       └── "Latency: 24ms" → font-code-sm text-on-surface/40
└── Action buttons:
    ├── "Explore Graph" → px-6 py-3 rounded-lg border-white/10 hover:bg-white/5
    └── "New Query" → px-6 py-3 rounded-lg bg-primary shadow-lg shadow-primary/10

Stats (grid-cols-3 gap-gutter):
├── 3 x glass-card p-8 rounded-xl h-48
│   ├── Background icon → absolute top-0 right-0 opacity-5 text-[80px]
│   ├── Label → font-label-caps text-on-surface/40
│   ├── Value → font-display-lg glow-text (animated counter)
│   └── Trend → flex items-center gap-2 text-primary font-code-sm text-[12px]
│       ├── material-symbol: trending_up / schedule
│       └── description text

Getting Started (lg:col-span-2):
├── Header → "Getting Started" font-headline-lg + gradient line
├── grid-cols-3 gap-gutter
│   ├── 3 x cards with:
│   │   ├── glass-card aspect-video rounded-xl
│   │   │   └── Icon circle → w-16 h-16 rounded-full bg-primary/10 border-primary/20
│   │   ├── Title → font-headline-md group-hover:text-primary
│   │   └── Description → font-body-md text-on-surface/60
│   │   Steps: 01 Ingest Docs / 02 Map Code / 03 Query Graph
└── Right panel (space-y-gutter):
    ├── Contextual Memory card → glass-card p-8 h-48
    │   ├── "Contextual Memory" font-headline-md text-primary
    │   ├── Description
    │   ├── Index Health row → p-3 rounded-lg bg-surface-container-high/50
    │   └── Live Connections row → text-secondary
    └── Recent Activity card → glass-card p-6
        ├── "Recent Activity" + "View all" link
        └── 2 x activity items with colored dots (bg-secondary / bg-primary)

Real-time Context Visualization:
├── glass-card rounded-2xl p-1 h-[400px]
├── Inner: bg-background/20 backdrop-blur-sm
│   ├── Animated icon → p-4 rounded-full bg-primary/20 border-primary/40 animate-bounce
│   ├── Title → font-headline-lg
│   └── "Launch Knowledge Viewer" button → bg-white/10 hover:bg-white/20
```

### ChatInterface Page
```
flex h-[calc(100vh-8rem)]
├── Main chat area (flex-1)
│   ├── Messages (overflow-y-auto)
│   │   ├── Empty state → icon + "Ask about your codebase" + suggestion chips
│   │   ├── User message:
│   │   │   ├── Avatar → w-8 h-8 rounded bg-surface-variant → person icon
│   │   │   ├── Text → font-headline-md text-on-surface
│   │   │   └── Tag → bg-surface-container text-on-surface-variant px-2 py-0.5 rounded
│   │   ├── AI response:
│   │   │   ├── Avatar → w-8 h-8 rounded bg-primary/20 border-primary/30 → auto_awesome icon
│   │   │   ├── Card → ai-message-glow glass-panel p-6 rounded-xl
│   │   │   │   ├── Violet glow → absolute -top-24 -right-24 w-48 h-48 bg-secondary/10 blur-[60px]
│   │   │   │   ├── Body text → font-body-lg leading-relaxed text-on-surface/90
│   │   │   │   ├── Code block → bg-surface-container-lowest border-white/5 rounded-lg
│   │   │   │   │   ├── Header → bg-surface-container-high border-b-white/5 → lang badge + copy button
│   │   │   │   │   └── Code → p-4 font-code-sm whitespace-pre (syntax-keyword / syntax-string / syntax-comment)
│   │   │   │   └── Sources → flex flex-wrap pt-4 border-t-white/5
│   │   │   └── Action bar → thumb_up / thumb_down / refresh buttons
│   │   └── Typing indicator → pulsing dots + "Searching knowledge graph"
│   │
│   ├── Composer (absolute bottom-0)
│   │   ├── glass-panel rounded-2xl shadow-2xl p-1
│   │   │   ├── Textarea → bg-transparent font-body-md min-h-[56px] px-12
│   │   │   ├── Attachment icon → absolute left-3 top-3.5
│   │   │   ├── "Search ON" badge → bg-white/5 rounded-md px-2 py-1
│   │   │   └── Send button → bg-primary w-9 h-9 rounded-lg shadow-lg shadow-primary/20
│   │   └── Footer → "Dev-Doc may hallucinate..." + "GPU Active" + "GPT-4-Engine"
│   │
│   └── Scroll-to-bottom button → w-9 h-9 rounded-full bg-surface/80 border-white/10

├── Context Panel (hidden lg:flex w-80)
│   ├── "Context Nodes" section (p-6 border-b border-white/10)
│   │   ├── Header → "CONTEXT NODES" + "3 Active" badge
│   │   └── 3 x node cards → bg-surface-container-low rounded-xl border-white/5
│   │       ├── Glowing dot → w-2 h-2 rounded-full shadow-[0_0_6px_#4cd7f6]
│   │       └── Name + description
│   ├── "Snippets" section (flex-1 overflow-y-auto p-6)
│   │   ├── 2 x snippet items with "Updated Xh ago" label
│   │   └── Code preview → bg-surface-container-lowest p-3 rounded border-white/5
│   └── "Documentation Coverage" footer (bg-surface-container-high/30 p-6)
│       ├── Progress label + percent
│       ├── Progress bar → h-1 bg-white/5 rounded-full
│       │   └── Fill → bg-primary shadow-[0_0_4px_#4cd7f6]
│       └── Team avatars → flex -space-x-2 with initials
```

### IngestionPanel Page
```
max-w-[880px] mx-auto
├── Header:
│   ├── "Ingest Workflow" → font-display-lg text-primary
│   └── Subtitle → text-on-surface/60 font-body-lg

├── 3-step Stepper (mb-16):
│   ├── Connecting line → absolute h-px bg-white/10
│   ├── Step 1 (Active): w-10 h-10 rounded-full bg-primary active-bloom → upload_file icon
│   │   └── "01 Upload Docs" → font-label-caps text-primary
│   ├── Step 2 (Inactive): bg-surface-container-high border-white/20 → art_track icon
│   │   └── "02 Connect Repos" → step-inactive
│   └── Step 3 (Inactive): bg-surface-container-high border-white/20 → account_tree icon
│       └── "03 Map Graph" → step-inactive

├── Upload Dropzone (glass-panel p-12 rounded-xl border-dashed border-2 border-primary/20):
│   ├── Icon → w-20 h-20 rounded-full bg-primary/5 → cloud_upload icon
│   ├── "Drop your documentation here" → font-headline-lg
│   ├── "Supports PDF, Markdown, and TXT (Max 50MB)" → font-code-sm
│   └── "Select Files" button → px-8 py-3 bg-primary text-background rounded-lg

├── Integration Cards (grid-cols-2 gap-6):
│   ├── GitHub → glass-panel p-6 rounded-xl
│   │   ├── terminal icon + arrow_forward
│   │   ├── "GitHub Integration" → font-headline-md
│   │   └── "Directly sync documentation..."
│   └── GitLab → glass-panel p-6 rounded-xl
│       ├── webhook icon + arrow_forward
│       ├── "GitLab Support" → font-headline-md
│       └── "Import markdown files..."

├── URL Input (glass-panel p-6 rounded-xl):
│   ├── "Or paste URLs" → font-headline-md
│   ├── textarea → bg-surface-container-lowest border-white/10 rounded-lg p-4
│   └── "Ingest Documentation" button → w-full bg-primary rounded-lg

├── Code Repo (glass-panel p-6 rounded-xl):
│   ├── Local path input → bg-surface-container-lowest border-white/10 rounded-lg
│   ├── "or" divider
│   ├── Git clone URL input
│   └── "Ingest Code" button → border-white/10

└── Processing Logs (glass-panel p-6 rounded-xl border-primary/10):
    ├── Header → pulsing dot + "Processing Node Queue" + "45% Complete"
    ├── Progress bar → h-1 bg-white/5 with w-[45%] bg-primary shadow-[0_0_10px_#4cd7f6]
    └── Log area → bg-surface-container-lowest/50 p-4 rounded-lg h-32 overflow-y-auto
        └── [timestamp] log messages with terminal-cursor on last line
```

### KnowledgeGraph Page
```
ml-64 mt-16 h-[calc(100vh-64px)] relative graph-grid overflow-hidden
├── Ambient glow → primary/5 blur-[120px], secondary/5 blur-[160px]
├── SVG layer (absolute inset-0, pointer-events-none) with edge gradient defs
├── Interactive Nodes (absolute p-12):
│   ├── Node (Cyan) → absolute positioned group cursor-pointer
│   │   ├── w-12 h-12 bg-primary/20 border-primary rounded-full flex items-center justify-center
│   │   │   node-glow-cyan animate-node-cyan group-hover:scale-125
│   │   ├── Tooltip → absolute top-14 bg-surface/80 backdrop-blur-md rounded
│   │   └── (same for Violet / Concept nodes with varied sizes)
│   └── SVG edges connecting nodes

├── Floating Control Bar (absolute bottom-8 left-1/2 -translate-x-1/2):
│   ├── glass-panel px-6 py-3 rounded-full flex items-center gap-6
│   ├── Zoom controls → add / 100% / remove
│   ├── "Filter" button → bg-primary/10 border-primary/20 rounded
│   ├── Search input → bg-surface-container-lowest border-white/5 rounded pl-10
│   └── Center focus button

├── Details Panel (absolute right-0 w-80 glass-panel border-l):
│   ├── → translate-x-full default, slide in on click
│   ├── "Node Details" header + close button
│   ├── IDENTIFIER → name, type tag (bg-primary/20 or bg-secondary/20)
│   ├── Stats grid → CONNECTIONS + DEPTH
│   ├── RELATED ENTITIES list
│   └── Action buttons → "Open Editor" (bg-primary) + "Graph Context Analysis"

└── Status Badges (absolute top-4 right-84):
    ├── "Code Processing" → bg-background/50 backdrop-blur-sm rounded-full
    └── "Docs Synced" → bg-background/50 backdrop-blur-sm rounded-full
```

### MemoryManager Page
```
max-w-container-max mx-auto
├── Header:
│   ├── "Memory Manager" → font-headline-lg
│   ├── Description → font-body-lg text-on-surface/60
│   └── Safe Mode toggle → bg-surface-container-low p-2 rounded-xl

├── Stats Grid (grid-cols-4 gap-6):
│   ├── "INGESTED REPOS" → 12 + "+2 this week"
│   ├── "TOTAL TOKENS" → 4.2M + "82% utilization"
│   └── "SYSTEM HEALTH" (col-span-2)
│       ├── Progress bar → h-2 w-4/5 bg-primary shadow-[0_0_8px_rgba(76,215,246,0.6)]
│       ├── "98.4%"
│       └── "Re-indexing background_worker.py..." with terminal-cursor
│       └── Dot grid background → radial-gradient(#4cd7f6 0.5px, transparent 0.5px)

├── Memory Sources:
│   ├── "Memory Sources" header + Filter/Search buttons
│   └── 3 x glass-card rounded-xl p-5
│       ├── Icon → w-12 h-12 rounded-lg bg-surface-container-high (folder_zip / description / link)
│       ├── Name + Type tag (Repository=bg-primary/10, Document=bg-surface-container-highest, URL=bg-primary/10)
│       ├── URL + time
│       ├── "Re-index" button → border-white/10 hover:border-primary/40
│       └── "Forget" button → destructive-btn hover:bg-error-container

└── Neural Feedback (border-t border-white/5 py-16):
    ├── "NEURAL FEEDBACK" label → font-label-caps tracking-[0.2em]
    ├── "Improve LLM Context" → font-headline-lg
    ├── Description → font-body-lg
    ├── glass-panel p-8 rounded-2xl
    │   ├── ISSUE DESCRIPTION textarea → bg-surface-container-lowest border-white/10
    │   ├── Accuracy Rating buttons → Poor / Perfect
    │   └── "SUBMIT NEURAL REPORT" → bg-primary w-full cyan-glow
```

---

## 5. Build Order

Phase 0: Create this blueprint
Phase 1: Delete current source (keep node_modules, package.json, package-lock.json)
Phase 2: Config files (next.config.js, tsconfig.json, postcss.config.js, tailwind.config.ts)
Phase 3: globals.css with all stitch utility classes
Phase 4: App shell (layout.tsx, providers.tsx, page.tsx, API proxy routes)
Phase 5: lib/ (api.ts, utils.ts) and hooks/ (use-toast.tsx)
Phase 6: Layout components (TopNavBar, SideNavBar, Toast, CommandPalette)
Phase 7: Page components (Dashboard, ChatInterface, ChatMessage, IngestionPanel, KnowledgeGraph, MemoryManager)
Phase 8: Build & verify
