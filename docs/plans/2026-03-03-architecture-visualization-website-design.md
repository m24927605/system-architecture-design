# Architecture Visualization Website — Design Document

## Goal

Build an interactive, dark-themed visualization website that presents the AI Processing Platform's 3-phase evolutionary architecture in a progressive, animated manner. The site includes an embedded AI assistant that can answer architecture-related questions on behalf of the designer.

## Use Cases

1. **Pre-interview:** Send the URL to interviewers for self-guided exploration
2. **During interview:** Screen-share and interactively walk through architecture evolution
3. **Async consultation:** AI assistant answers architecture questions when the designer is unavailable

## Architecture Decision

**Chosen approach:** React + Framer Motion interactive SPA (over Astro static site or reveal.js slides)

**Rationale:**
- Supports both self-guided browsing and presenter-led walkthrough
- Rich animation capabilities for architecture evolution visualization
- Next.js + Vercel = zero-config deployment with global CDN
- next-intl provides mature i18n for Chinese/English support

---

## Site Structure (9 Sections)

| # | Section | Key Feature |
|---|---------|-------------|
| 1 | **Hero** | Full-screen title + particle/grid background animation + CTA |
| 2 | **Architecture Evolution** | Core: 3-Phase interactive architecture diagram with animated transitions (SVG + Framer Motion). Tab-based Phase switching with components animating in/out. Hover for tooltips, side panel shows comparison metrics. |
| 3 | **Task Flow** | Animated sequence diagram with messages flowing along lines. Click steps for detail expansion. |
| 4 | **Capacity Calculator** | Interactive: slider for monthly volume + audio length → auto-calculate GPUs needed, cost, recommended Phase |
| 5 | **Cost Analysis** | Interactive Recharts: managed vs self-hosted cost crossover chart. Toggle between monthly cost and per-task cost views. Hover for precise numbers. |
| 6 | **Technology Selection** | Flip-card layout: front shows chosen tech, back shows alternatives comparison |
| 7 | **Architecture Characteristics** | Hexagonal radar chart (6 dimensions). Click each dimension to expand detailed explanation. |
| 8 | **Deployment & CI/CD** | Dev → Staging → Prod pipeline animation + Canary traffic-shifting visualization |
| 9 | **Live Demo** (optional) | Embedded API call buttons to demonstrate the running prototype |

## Navigation

- **Fixed top navbar:** Dark semi-transparent glassmorphism, current section highlighted on scroll
- **Language switch:** Top-right `EN | 中文` button, instant full-site language toggle
- **Smooth scroll:** Click nav items to smooth-scroll to target section

---

## Visual Design

### Color System

```
Background:       #0A0A0F (near black)
Card/section bg:  #12121A (dark gray-purple)
Border/divider:   #1E1E2E (subtle glow line)
Primary accent:   #6366F1 → #8B5CF6 (indigo → purple gradient)
Secondary accent: #22D3EE (cyan, for highlights and connections)
Success/done:     #10B981 (emerald)
Warning/Phase 2:  #F59E0B (amber)
Text primary:     #E2E8F0 (light gray-white)
Text secondary:   #94A3B8 (gray)
```

### Core Animations

1. **Architecture Evolution (hero feature):**
   - Phase tab switching: components fade out / slide in with staggered timing
   - GPU nodes bounce in from bottom
   - Connection lines redraw with trail animation
   - Metrics panel numbers animate with CountUp
   - Hover any component: glow highlight + tooltip + related connections highlight

2. **Capacity Calculator:**
   - Slider drag → real-time recalculation with smooth number transitions
   - Recommended Phase card animates on change
   - Cost comparison bar chart updates live

3. **Cost Crossover Chart:**
   - Lines draw progressively on scroll-enter
   - Crossover point highlighted with pulsing marker
   - Hover shows precise values at any point

4. **General:**
   - Scroll reveal: each section fades in + slides up on viewport entry
   - Number CountUp animations for all statistics
   - Particle/grid background in Hero section

---

## AI Architecture Assistant

### Concept

A persistent chat widget (bottom-right corner) powered by Claude or OpenAI that has full knowledge of the architecture design and can discuss trade-offs, alternatives, and design reasoning.

### UI

- Expandable chat panel (collapsed = floating button, expanded = chat window)
- Preset quick-question buttons for common topics
- Source references linking back to ARCHITECTURE.md sections
- Supports both Chinese and English based on current site language

### Technical Implementation

```
Frontend Chat Widget → Next.js API Route (/api/chat) → LLM Provider (abstract)
                                                         ├── Claude API
                                                         └── OpenAI API
```

### Knowledge Injection Strategy

**Direct system prompt injection (no RAG needed):**
- ARCHITECTURE.md ~15K tokens
- Notes summaries ~5K tokens
- Total ~20K tokens — well within Claude (200K) and GPT-4 (128K) context windows
- Zero retrieval errors, zero infrastructure complexity

### LLM Provider Abstraction

```typescript
interface LLMProvider {
  chat(messages: Message[], systemPrompt: string): Promise<ReadableStream>
}

class ClaudeProvider implements LLMProvider { ... }
class OpenAIProvider implements LLMProvider { ... }

// Switch via environment variable: LLM_PROVIDER=claude | openai
```

### Preset Quick Questions (6-8 per language)

**English:**
- Why a 3-phase architecture?
- Why Go instead of Python?
- How does fault tolerance work?
- Explain the cost crossover
- What is the Write-then-ACK pattern?
- How does KEDA scaling work?

**Chinese:**
- Why designed as 3-phase architecture?
- Why Go over Python?
- How does fault tolerance work?
- How is the cost crossover calculated?
- What is Write-then-ACK?
- How does KEDA scaling work?

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | Vercel-native, SSG, route-based i18n |
| **Animation** | Framer Motion | Best React animation library, scroll triggers + layout animation |
| **Charts** | Recharts | Lightweight, React-native charting for cost analysis |
| **Architecture Diagrams** | React Flow or custom SVG | Interactive nodes/edges/animations |
| **Styling** | Tailwind CSS v4 | Dark theme native, utility-first, rapid development |
| **i18n** | next-intl | Mature i18n for Next.js App Router |
| **AI Chat** | Vercel AI SDK | Streaming chat UI, multi-provider support (Claude + OpenAI) |
| **Deployment** | Vercel | One-click deploy, global CDN, edge functions for API routes |

---

## i18n Strategy

**Route structure:**
```
/en/  → English version
/zh/  → Chinese version
/     → redirect to /en (default)
```

**Translation files:**
```
messages/
├── en.json
└── zh.json
```

Language switch button in navbar, URL updates synchronously.

---

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts          # AI assistant API endpoint
│   │   └── layout.tsx
│   ├── components/
│   │   ├── sections/
│   │   │   ├── Hero.tsx
│   │   │   ├── ArchitectureEvolution.tsx
│   │   │   ├── TaskFlow.tsx
│   │   │   ├── CapacityCalculator.tsx
│   │   │   ├── CostAnalysis.tsx
│   │   │   ├── TechSelection.tsx
│   │   │   ├── ArchitectureTraits.tsx
│   │   │   ├── DeploymentPipeline.tsx
│   │   │   └── LiveDemo.tsx
│   │   ├── chat/
│   │   │   ├── ChatWidget.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   └── QuickQuestions.tsx
│   │   ├── Navbar.tsx
│   │   ├── LanguageSwitch.tsx
│   │   └── ui/                        # Shared UI primitives
│   ├── lib/
│   │   ├── llm/
│   │   │   ├── provider.ts            # LLM provider interface
│   │   │   ├── claude.ts
│   │   │   └── openai.ts
│   │   └── system-prompt.ts           # Architecture knowledge injection
│   ├── data/
│   │   ├── architecture-nodes.ts      # Phase 1/2/3 diagram data
│   │   ├── costs.ts                   # Cost comparison data
│   │   └── capacity.ts                # Capacity calculation formulas
│   └── messages/
│       ├── en.json
│       └── zh.json
├── public/
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## Deployment

- **Platform:** Vercel (free tier sufficient)
- **Build:** `next build` with static export where possible, API routes for chat
- **Environment variables:**
  - `LLM_PROVIDER`: `claude` or `openai`
  - `ANTHROPIC_API_KEY`: Claude API key (if using Claude)
  - `OPENAI_API_KEY`: OpenAI API key (if using OpenAI)
- **Domain:** Vercel auto-generated URL or custom domain

---

## Success Criteria

1. Interviewer can browse the full architecture without external documents
2. 3-phase architecture evolution is visually clear with animated transitions
3. Capacity calculator produces correct GPU/cost estimates matching ARCHITECTURE.md
4. AI assistant correctly answers architecture questions with source references
5. Chinese/English switch works seamlessly
6. Loads under 3 seconds on Vercel CDN
7. Looks professional and memorable (dark tech theme with smooth animations)
