# Architecture Visualization Website — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive dark-themed website showcasing the AI Processing Platform's 3-phase architecture with an embedded AI assistant.

**Architecture:** Next.js 15 App Router SPA with Framer Motion animations, React Flow for architecture diagrams, Recharts for cost analysis, next-intl for i18n, and Vercel AI SDK for the chat assistant. All sections are client components rendered in a single scrollable page.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Framer Motion, React Flow, Recharts, next-intl, Vercel AI SDK, @anthropic-ai/sdk, openai

---

### Task 1: Project Scaffolding

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.ts`
- Create: `web/tailwind.config.ts`
- Create: `web/src/app/layout.tsx`
- Create: `web/src/app/globals.css`

**Step 1: Initialize Next.js project**

```bash
cd "/Users/sin-chengchen/office-project/Heph-AI/interview/System Architecture Design"
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

Accept defaults. This creates the `web/` directory with Next.js 15 + Tailwind CSS + App Router.

**Step 2: Install all dependencies**

```bash
cd web
npm install framer-motion @xyflow/react recharts next-intl ai @ai-sdk/anthropic @ai-sdk/openai
```

**Step 3: Configure Tailwind dark theme colors**

Replace `web/src/app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --color-bg-primary: #0A0A0F;
  --color-bg-card: #12121A;
  --color-border: #1E1E2E;
  --color-accent-start: #6366F1;
  --color-accent-end: #8B5CF6;
  --color-cyan: #22D3EE;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-text-primary: #E2E8F0;
  --color-text-secondary: #94A3B8;
}

body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}
```

**Step 4: Update root layout**

Replace `web/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Processing Platform — Architecture Design",
  description:
    "Interactive 3-phase architecture visualization for an AI Processing Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

**Step 5: Verify dev server starts**

```bash
cd web && npm run dev
```

Open http://localhost:3000 — should see default Next.js page with dark background.

**Step 6: Commit**

```bash
git add web/
git commit -m "feat(web): scaffold Next.js 15 project with dependencies"
```

---

### Task 2: i18n Setup with next-intl

**Files:**
- Create: `web/src/i18n/request.ts`
- Create: `web/src/i18n/routing.ts`
- Create: `web/src/i18n/navigation.ts`
- Create: `web/src/messages/en.json`
- Create: `web/src/messages/zh.json`
- Create: `web/src/app/[locale]/layout.tsx`
- Create: `web/src/app/[locale]/page.tsx`
- Create: `web/src/middleware.ts`
- Modify: `web/next.config.ts`
- Modify: `web/src/app/layout.tsx`

**Step 1: Create routing config**

Create `web/src/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "en",
});
```

**Step 2: Create request config**

Create `web/src/i18n/request.ts`:

```ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "zh")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

**Step 3: Create navigation helpers**

Create `web/src/i18n/navigation.ts`:

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
```

**Step 4: Create middleware**

Create `web/src/middleware.ts`:

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

**Step 5: Update next.config.ts**

Replace `web/next.config.ts` with:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

**Step 6: Create translation files**

Create `web/src/messages/en.json`:

```json
{
  "nav": {
    "overview": "Overview",
    "architecture": "Architecture",
    "taskFlow": "Task Flow",
    "capacity": "Capacity",
    "cost": "Cost Analysis",
    "tech": "Technology",
    "traits": "Characteristics",
    "deploy": "Deployment",
    "demo": "Demo"
  },
  "hero": {
    "title": "AI Processing Platform",
    "subtitle": "A 3-phase evolutionary architecture for scalable AI task processing",
    "cta": "Explore Architecture"
  },
  "architecture": {
    "title": "Architecture Evolution",
    "subtitle": "From MVP to Scale — infrastructure grows with business demand",
    "phase1": "Phase 1: MVP",
    "phase2": "Phase 2: Growth",
    "phase3": "Phase 3: Scale",
    "monthlyCost": "Monthly Cost",
    "throughput": "Throughput",
    "compute": "Compute",
    "aiModels": "AI Models",
    "deployment": "Deployment"
  },
  "taskFlow": {
    "title": "Task Processing Flow",
    "subtitle": "From audio upload to summarized result — fully async pipeline"
  },
  "capacity": {
    "title": "Capacity Planner",
    "subtitle": "Calculate GPU requirements and costs for your workload",
    "monthlyVolume": "Monthly Task Volume",
    "audioLength": "Average Audio Length (min)",
    "recommended": "Recommended Phase",
    "sttGpus": "STT GPUs Needed",
    "llmGpus": "LLM GPUs Needed",
    "estimatedCost": "Estimated Monthly Cost",
    "managedCost": "vs Managed Service Cost",
    "savings": "Savings"
  },
  "cost": {
    "title": "Cost Crossover Analysis",
    "subtitle": "When does self-hosting GPU become cheaper than managed services?",
    "managed": "Managed (AWS Transcribe + Bedrock)",
    "selfHosted": "Self-Hosted (GPU)",
    "monthlyCost": "Monthly Cost ($)",
    "perTaskCost": "Per-Task Cost ($)",
    "tasksPerMonth": "Tasks / Month",
    "crossoverPoint": "Crossover: ~30-50K tasks/month"
  },
  "tech": {
    "title": "Technology Selection",
    "subtitle": "Every choice has a trade-off — here's why we chose what we did",
    "chosen": "Chosen",
    "alternatives": "Alternatives Considered",
    "rationale": "Rationale"
  },
  "traits": {
    "title": "Architecture Characteristics",
    "subtitle": "Six dimensions of system quality",
    "scalability": "Scalability",
    "faultTolerance": "Fault Tolerance",
    "consistency": "Data Consistency",
    "latency": "Latency & Performance",
    "security": "Security",
    "observability": "Observability"
  },
  "deploy": {
    "title": "Deployment & Operations",
    "subtitle": "From local development to production with zero-downtime canary releases",
    "dev": "Dev",
    "staging": "Staging",
    "prod": "Production",
    "cicd": "CI/CD Pipeline",
    "canary": "Canary Deployment"
  },
  "chat": {
    "title": "Architecture Assistant",
    "placeholder": "Ask about the architecture...",
    "thinking": "Thinking..."
  }
}
```

Create `web/src/messages/zh.json`:

```json
{
  "nav": {
    "overview": "總覽",
    "architecture": "架構設計",
    "taskFlow": "任務流程",
    "capacity": "容量規劃",
    "cost": "成本分析",
    "tech": "技術選型",
    "traits": "架構特性",
    "deploy": "維運部署",
    "demo": "即時展示"
  },
  "hero": {
    "title": "AI 處理平台",
    "subtitle": "三階段演進式架構，讓基礎設施隨業務規模成長",
    "cta": "探索架構設計"
  },
  "architecture": {
    "title": "架構演進",
    "subtitle": "從 MVP 到 Scale — 基礎設施隨業務需求成長",
    "phase1": "Phase 1: MVP",
    "phase2": "Phase 2: Growth",
    "phase3": "Phase 3: Scale",
    "monthlyCost": "月成本",
    "throughput": "處理吞吐量",
    "compute": "運算平台",
    "aiModels": "AI 模型",
    "deployment": "部署策略"
  },
  "taskFlow": {
    "title": "任務處理流程",
    "subtitle": "從音檔上傳到摘要結果 — 完全非同步管線"
  },
  "capacity": {
    "title": "容量規劃計算器",
    "subtitle": "根據工作量計算 GPU 需求與成本",
    "monthlyVolume": "月任務量",
    "audioLength": "平均音檔長度（分鐘）",
    "recommended": "建議階段",
    "sttGpus": "STT GPU 數量",
    "llmGpus": "LLM GPU 數量",
    "estimatedCost": "預估月成本",
    "managedCost": "vs 託管服務成本",
    "savings": "節省"
  },
  "cost": {
    "title": "成本交叉分析",
    "subtitle": "自建 GPU 何時比託管服務便宜？",
    "managed": "託管服務 (AWS Transcribe + Bedrock)",
    "selfHosted": "自建 GPU",
    "monthlyCost": "月成本 ($)",
    "perTaskCost": "單任務成本 ($)",
    "tasksPerMonth": "月任務量",
    "crossoverPoint": "交叉點：~30-50K 任務/月"
  },
  "tech": {
    "title": "技術選型",
    "subtitle": "每個選擇都有取捨 — 以下是我們的決策理由",
    "chosen": "選擇",
    "alternatives": "候選方案比較",
    "rationale": "決策理由"
  },
  "traits": {
    "title": "架構特性",
    "subtitle": "系統品質的六個維度",
    "scalability": "擴展性",
    "faultTolerance": "容錯機制",
    "consistency": "資料一致性",
    "latency": "延遲與效能",
    "security": "安全性",
    "observability": "可觀測性"
  },
  "deploy": {
    "title": "維運與部署",
    "subtitle": "從本地開發到生產環境的零停機 Canary 發布",
    "dev": "Dev",
    "staging": "Staging",
    "prod": "Production",
    "cicd": "CI/CD 管線",
    "canary": "Canary 部署"
  },
  "chat": {
    "title": "架構諮詢助理",
    "placeholder": "詢問架構相關問題...",
    "thinking": "思考中..."
  }
}
```

**Step 7: Create locale layout and page**

Replace `web/src/app/layout.tsx` — make it a simple pass-through:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Processing Platform — Architecture Design",
  description:
    "Interactive 3-phase architecture visualization for an AI Processing Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

Create `web/src/app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <html lang={locale} className="dark">
      <body className="antialiased bg-bg-primary text-text-primary">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Create `web/src/app/[locale]/page.tsx`:

```tsx
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("hero");
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
    </main>
  );
}
```

**Step 8: Verify i18n works**

```bash
cd web && npm run dev
```

Visit http://localhost:3000/en — should see "AI Processing Platform"
Visit http://localhost:3000/zh — should see "AI 處理平台"
Visit http://localhost:3000 — should redirect to /en

**Step 9: Commit**

```bash
git add web/
git commit -m "feat(web): setup next-intl i18n with en/zh translations"
```

---

### Task 3: Navbar + Language Switch + Shared UI

**Files:**
- Create: `web/src/components/Navbar.tsx`
- Create: `web/src/components/LanguageSwitch.tsx`
- Create: `web/src/components/ui/SectionWrapper.tsx`
- Create: `web/src/components/ui/GradientText.tsx`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Create Navbar**

Create `web/src/components/Navbar.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import LanguageSwitch from "./LanguageSwitch";

const NAV_ITEMS = [
  { key: "overview", href: "#hero" },
  { key: "architecture", href: "#architecture" },
  { key: "taskFlow", href: "#task-flow" },
  { key: "capacity", href: "#capacity" },
  { key: "cost", href: "#cost" },
  { key: "tech", href: "#tech" },
  { key: "traits", href: "#traits" },
  { key: "deploy", href: "#deploy" },
] as const;

export default function Navbar() {
  const t = useTranslations("nav");
  const [activeSection, setActiveSection] = useState("hero");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      const sections = NAV_ITEMS.map((item) => item.href.slice(1));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.getBoundingClientRect().top <= 100) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    const el = document.getElementById(href.slice(1));
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-bg-primary/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wider text-accent-start">
          HEPH-AI
        </span>
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => scrollTo(item.href)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeSection === item.href.slice(1)
                  ? "text-cyan bg-cyan/10"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t(item.key)}
            </button>
          ))}
        </div>
        <LanguageSwitch />
      </div>
    </motion.nav>
  );
}
```

**Step 2: Create LanguageSwitch**

Create `web/src/components/LanguageSwitch.tsx`:

```tsx
"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export default function LanguageSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const next = locale === "en" ? "zh" : "en";
    router.replace(pathname, { locale: next });
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-cyan transition-colors"
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}
```

**Step 3: Create shared UI components**

Create `web/src/components/ui/SectionWrapper.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  id: string;
  children: ReactNode;
  className?: string;
}

export default function SectionWrapper({ id, children, className = "" }: Props) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`py-24 px-4 max-w-7xl mx-auto ${className}`}
    >
      {children}
    </motion.section>
  );
}
```

Create `web/src/components/ui/GradientText.tsx`:

```tsx
import { ReactNode } from "react";

export default function GradientText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`bg-gradient-to-r from-accent-start to-accent-end bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  );
}
```

**Step 4: Wire up page with Navbar**

Replace `web/src/app/[locale]/page.tsx`:

```tsx
import Navbar from "@/components/Navbar";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations();

  return (
    <>
      <Navbar />
      <main>
        <SectionWrapper id="hero" className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-4">
              <GradientText>{t("hero.title")}</GradientText>
            </h1>
            <p className="text-xl text-text-secondary">{t("hero.subtitle")}</p>
          </div>
        </SectionWrapper>

        {/* Placeholder sections — replaced in subsequent tasks */}
        <SectionWrapper id="architecture">
          <h2 className="text-3xl font-bold"><GradientText>{t("architecture.title")}</GradientText></h2>
        </SectionWrapper>
        <SectionWrapper id="task-flow">
          <h2 className="text-3xl font-bold"><GradientText>{t("taskFlow.title")}</GradientText></h2>
        </SectionWrapper>
        <SectionWrapper id="capacity">
          <h2 className="text-3xl font-bold"><GradientText>{t("capacity.title")}</GradientText></h2>
        </SectionWrapper>
        <SectionWrapper id="cost">
          <h2 className="text-3xl font-bold"><GradientText>{t("cost.title")}</GradientText></h2>
        </SectionWrapper>
        <SectionWrapper id="tech">
          <h2 className="text-3xl font-bold"><GradientText>{t("tech.title")}</GradientText></h2>
        </SectionWrapper>
        <SectionWrapper id="traits">
          <h2 className="text-3xl font-bold"><GradientText>{t("traits.title")}</GradientText></h2>
        </SectionWrapper>
        <SectionWrapper id="deploy">
          <h2 className="text-3xl font-bold"><GradientText>{t("deploy.title")}</GradientText></h2>
        </SectionWrapper>
      </main>
    </>
  );
}
```

**Step 5: Verify navbar and scroll work**

```bash
cd web && npm run dev
```

- Navbar visible at top with glassmorphism
- Language switch toggles EN/中文
- Scrolling highlights active section
- Click nav items smooth-scrolls

**Step 6: Commit**

```bash
git add web/src/
git commit -m "feat(web): add navbar, language switch, section scaffolding"
```

---

### Task 4: Hero Section with Particle Background

**Files:**
- Create: `web/src/components/sections/Hero.tsx`
- Create: `web/src/components/ui/ParticleGrid.tsx`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Create ParticleGrid background**

Create `web/src/components/ui/ParticleGrid.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

export default function ParticleGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; vx: number; vy: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - dist / 200)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw & move particles
      for (const p of particles) {
        ctx.fillStyle = "rgba(99, 102, 241, 0.5)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
```

**Step 2: Create Hero section**

Create `web/src/components/sections/Hero.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import ParticleGrid from "../ui/ParticleGrid";
import GradientText from "../ui/GradientText";

export default function Hero() {
  const t = useTranslations("hero");

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ParticleGrid />
      <div className="relative z-10 text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold mb-6"
        >
          <GradientText>{t("title")}</GradientText>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto"
        >
          {t("subtitle")}
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          onClick={() =>
            document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" })
          }
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white font-medium hover:shadow-lg hover:shadow-accent-start/25 transition-shadow"
        >
          {t("cta")} ↓
        </motion.button>
      </div>
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-primary to-transparent" />
    </section>
  );
}
```

**Step 3: Wire Hero into page**

Update `web/src/app/[locale]/page.tsx` — replace the hero SectionWrapper with the Hero component import. Keep other placeholder sections.

**Step 4: Verify Hero renders**

```bash
cd web && npm run dev
```

- Particle animation visible on dark background
- Title with gradient text
- CTA button scrolls to architecture section

**Step 5: Commit**

```bash
git add web/src/
git commit -m "feat(web): add Hero section with particle grid animation"
```

---

### Task 5: Architecture Evolution Section (Core Feature)

**Files:**
- Create: `web/src/data/architecture-nodes.ts`
- Create: `web/src/components/sections/ArchitectureEvolution.tsx`
- Create: `web/src/components/architecture/PhaseTab.tsx`
- Create: `web/src/components/architecture/ArchitectureDiagram.tsx`
- Create: `web/src/components/architecture/MetricsPanel.tsx`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Create architecture data**

Create `web/src/data/architecture-nodes.ts` with node and edge definitions for all three phases. Each node has: id, label, type (service/queue/db/gpu/cache/cdn), position. Each edge has: source, target, label. Phases share some nodes but add/remove others.

This file should define the 3 phases with their components and connections based on ARCHITECTURE.md sections 2.2, 2.3, 2.4. Approximately 150-200 lines of typed data.

**Step 2: Create PhaseTab component**

A tab bar with 3 tabs (Phase 1/2/3), animated active indicator, shows phase subtitle and key metrics.

**Step 3: Create ArchitectureDiagram component**

Uses React Flow (`@xyflow/react`) with custom node types for each service kind (color-coded). On phase switch, uses `AnimatePresence` from Framer Motion to animate nodes in/out. Custom edges with animated dashes.

**Step 4: Create MetricsPanel component**

Right-side panel showing comparison metrics (monthly cost, throughput, compute, AI models, deployment strategy) for the active phase. Numbers animate with CountUp effect on phase switch.

**Step 5: Create ArchitectureEvolution section**

Combines PhaseTab + ArchitectureDiagram + MetricsPanel. Manages phase state.

**Step 6: Wire into page, verify**

- Three phase tabs clickable
- Diagram animates between phases (nodes appear/disappear)
- Metrics panel updates with animated numbers
- Hover nodes show tooltip

**Step 7: Commit**

```bash
git add web/src/
git commit -m "feat(web): add Architecture Evolution section with interactive diagram"
```

---

### Task 6: Task Flow Section (Animated Sequence Diagram)

**Files:**
- Create: `web/src/components/sections/TaskFlow.tsx`
- Create: `web/src/data/task-flow-steps.ts`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Create task flow step data**

Create `web/src/data/task-flow-steps.ts` defining the 15-step task flow from ARCHITECTURE.md Section 3 (User → API → S3 → SQS → STT Worker → ... → done). Each step has: actor, action, target, description.

**Step 2: Build TaskFlow section**

A vertical animated timeline. Each step appears sequentially on scroll with staggered timing. Steps are connected by animated lines. Color-coded by phase (API = blue, STT = cyan, LLM = purple, DB = green). Click a step to expand detail card.

**Step 3: Wire into page, verify, commit**

```bash
git add web/src/
git commit -m "feat(web): add Task Flow section with animated sequence diagram"
```

---

### Task 7: Capacity Calculator Section

**Files:**
- Create: `web/src/data/capacity.ts`
- Create: `web/src/components/sections/CapacityCalculator.tsx`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Create capacity calculation logic**

Create `web/src/data/capacity.ts`:

```ts
export interface CapacityResult {
  recommendedPhase: 1 | 2 | 3;
  sttGpus: number;
  llmGpus: number;
  selfHostedCost: number;
  managedCost: number;
  savings: number;
}

const STT_TASKS_PER_GPU_PER_MIN = 10;
const LLM_TASKS_PER_GPU_PER_MIN = 40;
const GPU_COST_PER_MONTH = 420;
const TRANSCRIBE_COST_PER_MIN = 0.024;
const BEDROCK_COST_PER_TASK = 0.003;
const GPU_TARGET_UTILIZATION = 0.7;

export function calculateCapacity(
  monthlyTasks: number,
  avgAudioMinutes: number
): CapacityResult {
  // Tasks per minute needed (assuming 30 days, 24 hours)
  const tasksPerMin = monthlyTasks / (30 * 24 * 60);

  // GPU requirements
  const sttGpus = Math.max(
    1,
    Math.ceil(tasksPerMin / (STT_TASKS_PER_GPU_PER_MIN * GPU_TARGET_UTILIZATION))
  );
  const llmGpus = Math.max(
    1,
    Math.ceil(tasksPerMin / (LLM_TASKS_PER_GPU_PER_MIN * GPU_TARGET_UTILIZATION))
  );

  // Costs
  const selfHostedCost = (sttGpus + llmGpus) * GPU_COST_PER_MONTH + 500; // base infra
  const managedCost =
    monthlyTasks * avgAudioMinutes * TRANSCRIBE_COST_PER_MIN +
    monthlyTasks * BEDROCK_COST_PER_TASK +
    100; // base infra

  const savings = managedCost > 0 ? ((managedCost - selfHostedCost) / managedCost) * 100 : 0;

  let recommendedPhase: 1 | 2 | 3;
  if (monthlyTasks < 50000) recommendedPhase = 1;
  else if (monthlyTasks < 500000) recommendedPhase = 2;
  else recommendedPhase = 3;

  return { recommendedPhase, sttGpus, llmGpus, selfHostedCost, managedCost, savings };
}
```

**Step 2: Build CapacityCalculator section**

Two sliders (monthly volume: 1K-1M log scale, audio length: 0.5-10 min). Results panel shows recommended phase, GPU counts, costs, savings. Numbers animate on slider change. Recommended phase card has a glow border.

**Step 3: Wire into page, verify, commit**

```bash
git add web/src/
git commit -m "feat(web): add Capacity Calculator section with interactive sliders"
```

---

### Task 8: Cost Analysis Chart Section

**Files:**
- Create: `web/src/data/costs.ts`
- Create: `web/src/components/sections/CostAnalysis.tsx`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Create cost data**

Create `web/src/data/costs.ts` with data points from ARCHITECTURE.md section 2.6:

```ts
export const costData = [
  { tasks: 10000, managed: 270, selfHosted: 840 },
  { tasks: 30000, managed: 810, selfHosted: 840 },
  { tasks: 50000, managed: 1350, selfHosted: 840 },
  { tasks: 100000, managed: 2700, selfHosted: 840 },
  { tasks: 200000, managed: 5400, selfHosted: 1260 },
  { tasks: 500000, managed: 13500, selfHosted: 2520 },
];
```

**Step 2: Build CostAnalysis section**

Uses Recharts `LineChart` with two lines (managed vs self-hosted). Dark theme styling. Crossover point annotated with pulsing marker. Toggle between monthly cost and per-task cost views. Custom tooltip showing precise values.

**Step 3: Wire into page, verify, commit**

```bash
git add web/src/
git commit -m "feat(web): add Cost Analysis section with interactive crossover chart"
```

---

### Task 9: Technology Selection Section (Flip Cards)

**Files:**
- Create: `web/src/data/tech-selection.ts`
- Create: `web/src/components/sections/TechSelection.tsx`
- Create: `web/src/components/ui/FlipCard.tsx`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Create tech selection data**

Create `web/src/data/tech-selection.ts` with entries from ARCHITECTURE.md section 4 and ADR section 7. Each entry: name, icon, chosen, rationale, alternatives.

**Step 2: Build FlipCard component**

CSS 3D transform flip on hover. Front: tech name + icon + "chosen" label. Back: rationale + alternatives list.

**Step 3: Build TechSelection section**

Grid of FlipCards. Responsive layout.

**Step 4: Wire into page, verify, commit**

```bash
git add web/src/
git commit -m "feat(web): add Technology Selection section with flip cards"
```

---

### Task 10: Architecture Characteristics Section (Radar Chart)

**Files:**
- Create: `web/src/data/traits.ts`
- Create: `web/src/components/sections/ArchitectureTraits.tsx`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Create traits data**

Create `web/src/data/traits.ts` with 6 dimensions from ARCHITECTURE.md section 5. Each dimension: key, score (1-10), summary, details (3-5 bullet points).

**Step 2: Build ArchitectureTraits section**

Recharts `RadarChart` centered, dark-themed. Click any dimension vertex to expand a detail panel below the chart with explanation. Animated expansion.

**Step 3: Wire into page, verify, commit**

```bash
git add web/src/
git commit -m "feat(web): add Architecture Characteristics section with radar chart"
```

---

### Task 11: Deployment & CI/CD Section

**Files:**
- Create: `web/src/components/sections/DeploymentPipeline.tsx`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Build DeploymentPipeline section**

Three sub-sections:
1. **Environment topology:** Three cards (Dev → Staging → Prod) with animated connecting arrows. Each card shows specs.
2. **CI/CD pipeline:** Horizontal flow diagram: Push → Lint → Test → Build → Scan → PR → ECR → Staging → Prod. Steps light up sequentially on scroll.
3. **Canary deployment:** Animated bar showing traffic split (10% → 30% → 100%) with auto-playing animation.

**Step 2: Wire into page, verify, commit**

```bash
git add web/src/
git commit -m "feat(web): add Deployment & CI/CD section with pipeline animation"
```

---

### Task 12: AI Chat Backend (LLM Provider + API Route)

**Files:**
- Create: `web/src/lib/llm/provider.ts`
- Create: `web/src/lib/llm/system-prompt.ts`
- Create: `web/src/app/api/chat/route.ts`
- Create: `web/.env.local`

**Step 1: Create system prompt**

Create `web/src/lib/llm/system-prompt.ts` that reads the ARCHITECTURE.md content and constructs a system prompt. The prompt instructs the AI to act as the architecture designer, answer questions based on the document, cite specific sections, and support both English and Chinese.

```ts
export const SYSTEM_PROMPT = `You are the architect of the AI Processing Platform. You have deep knowledge of the entire system design. Answer questions based on the architecture document below. Be concise, cite section numbers, and support both English and Chinese.

When answering:
- Reference specific sections (e.g., "See Section 2.3")
- Include relevant numbers (costs, throughput, latency)
- Explain trade-offs when asked about design decisions
- If asked about something not in the document, say so

---

${architectureContent}
`;
```

The `architectureContent` variable should contain the full ARCHITECTURE.md text, embedded as a string constant (or loaded at build time).

**Step 2: Create API route**

Create `web/src/app/api/chat/route.ts`:

```ts
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "@/lib/llm/system-prompt";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const provider = process.env.LLM_PROVIDER || "anthropic";

  let model;
  if (provider === "openai") {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    model = openai("gpt-4o");
  } else {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    model = anthropic("claude-sonnet-4-20250514");
  }

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toDataStreamResponse();
}
```

**Step 3: Create .env.local**

Create `web/.env.local`:

```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-key-here
# OPENAI_API_KEY=your-key-here
```

Add `.env.local` to `.gitignore` (should already be there from Next.js scaffolding).

**Step 4: Test API route with curl**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Why Go instead of Python?"}]}'
```

Should get a streaming response.

**Step 5: Commit**

```bash
git add web/src/lib/ web/src/app/api/
git commit -m "feat(web): add AI chat API route with Claude/OpenAI provider abstraction"
```

---

### Task 13: AI Chat Frontend Widget

**Files:**
- Create: `web/src/components/chat/ChatWidget.tsx`
- Create: `web/src/components/chat/ChatMessage.tsx`
- Create: `web/src/components/chat/QuickQuestions.tsx`
- Modify: `web/src/app/[locale]/page.tsx`

**Step 1: Create ChatMessage component**

Renders a single chat message with markdown support. User messages right-aligned (cyan border), assistant messages left-aligned (purple border).

**Step 2: Create QuickQuestions component**

Horizontal scrollable row of preset question chips. Clicking sends the question.

**Step 3: Create ChatWidget**

Floating button (bottom-right) that expands to a chat panel. Uses Vercel AI SDK's `useChat` hook:

```tsx
"use client";

import { useChat } from "ai/react";
```

Panel has: title bar, message list, quick questions (when empty), input field. Animated expand/collapse with Framer Motion.

**Step 4: Add ChatWidget to page layout**

Add `<ChatWidget />` to the page so it's always visible.

**Step 5: Verify full chat flow**

- Click floating button → chat panel expands
- Click quick question → sends to API → streaming response appears
- Type custom question → works
- Language switches correctly

**Step 6: Commit**

```bash
git add web/src/
git commit -m "feat(web): add AI chat widget with streaming responses"
```

---

### Task 14: Polish, Build Verification, and Vercel Deployment

**Files:**
- Create: `web/vercel.json` (if needed)
- Modify: `web/src/app/[locale]/page.tsx` (final assembly)

**Step 1: Final page assembly**

Ensure all 9 sections are properly ordered in the page, using the real components (not placeholders).

**Step 2: Build verification**

```bash
cd web && npm run build
```

Fix any TypeScript or build errors.

**Step 3: Run production preview**

```bash
cd web && npm run start
```

Verify all sections, animations, i18n, and chat work in production mode.

**Step 4: Deploy to Vercel**

```bash
cd web && npx vercel
```

Follow prompts. Set environment variables (LLM_PROVIDER, ANTHROPIC_API_KEY) in Vercel dashboard.

**Step 5: Verify deployed site**

Visit the Vercel URL. Test:
- All sections render
- Language switch works
- Capacity calculator computes correctly
- AI chat responds

**Step 6: Commit any final fixes**

```bash
git add web/
git commit -m "feat(web): final polish and build verification"
```

---

## Task Summary

| Task | Component | Estimated Complexity |
|------|-----------|---------------------|
| 1 | Project Scaffolding | Low |
| 2 | i18n Setup | Medium |
| 3 | Navbar + Shared UI | Medium |
| 4 | Hero + Particle Background | Medium |
| 5 | Architecture Evolution (core) | High |
| 6 | Task Flow (animated sequence) | Medium |
| 7 | Capacity Calculator | Medium |
| 8 | Cost Analysis Chart | Medium |
| 9 | Technology Selection (flip cards) | Low |
| 10 | Architecture Characteristics (radar) | Medium |
| 11 | Deployment & CI/CD | Medium |
| 12 | AI Chat Backend | Medium |
| 13 | AI Chat Frontend | Medium |
| 14 | Polish & Deploy | Low |
