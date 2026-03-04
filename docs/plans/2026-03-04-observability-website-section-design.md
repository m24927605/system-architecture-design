# Observability Website Section Design

**Date**: 2026-03-04
**Status**: Approved
**Approach**: New interactive section using custom SVG + Framer Motion, consistent with existing website patterns

## Overview

Add a new "Observability" section to the architecture visualization website, positioned between Architecture Traits (`#traits`) and Deployment (`#deploy`). The section showcases the Grafana Stack observability design with four interactive sub-blocks.

## Position & Navigation

- **Section ID**: `#observability`
- **Nav key**: `observability`
- **Nav label**: EN `"Observability"` / ZH `"可觀測性"`
- **Insertion point**: After `<ArchitectureTraits />`, before `<DeploymentPipeline />`

## Files to Create

| File | Purpose |
|------|---------|
| `web/src/components/sections/Observability.tsx` | Main section component |
| `web/src/data/observability.ts` | All observability data (stack nodes, alerts, metrics list) |

## Files to Modify

| File | Change |
|------|--------|
| `web/src/app/[locale]/page.tsx` | Import + insert `<Observability />` |
| `web/src/components/Navbar.tsx` | Add `observability` nav item |
| `web/src/messages/en.json` | Add `observability` translations |
| `web/src/messages/zh.json` | Add `observability` translations |

---

## Sub-Block 1: Stack Architecture Diagram (SVG)

### Design

Reuse the existing `ArchNode` / `ArchEdge` type system with a new SVG canvas (900x520) dedicated to the observability stack. Phase 2/3 tab switching with the same animation style as Architecture Evolution.

### Phase 2 Nodes

| Node ID | Label | Type | Position (x, y) |
|---------|-------|------|-----------------|
| `api` | API Service | `api` | (80, 80) |
| `stt-worker` | STT Worker | `worker` | (280, 80) |
| `llm-worker` | LLM Worker | `worker` | (480, 80) |
| `prometheus` | Prometheus | `monitoring` | (280, 220) |
| `grafana` | Grafana | `monitoring` | (540, 220) |
| `promtail` | Promtail (DaemonSet) | `monitoring` | (80, 360) |
| `loki` | Loki | `monitoring` | (280, 360) |
| `pagerduty` | PagerDuty | `external` | (540, 360) |
| `slack` | Slack | `external` | (700, 360) |

### Phase 2 Edges

| Source | Target |
|--------|--------|
| api | prometheus |
| stt-worker | prometheus |
| llm-worker | prometheus |
| prometheus | grafana |
| promtail | loki |
| loki | grafana |
| grafana | pagerduty |
| grafana | slack |

### Phase 3 Nodes (additions)

| Node ID | Label | Type | Position (x, y) |
|---------|-------|------|-----------------|
| `otel` | OTel Collector | `monitoring` | (280, 160) |
| `tempo` | Tempo | `monitoring` | (440, 280) |

Phase 3 rearranges positions to accommodate additional nodes. All Phase 2 nodes remain with adjusted coordinates.

### Phase 3 Edges (additions)

| Source | Target |
|--------|--------|
| api → otel | otel → prometheus |
| otel → tempo | tempo → grafana |

### Metrics Panel

| Field Key | Phase 2 | Phase 3 |
|-----------|---------|---------|
| `components` | Prometheus + Grafana + Loki | + Tempo + OTel Collector |
| `monthlyCost` | ~$183 | ~$502 |
| `pillars` | Metrics + Logs | Metrics + Logs + Traces |
| `alerting` | P0/P1/P2 → PagerDuty + Slack | Same |
| `ha` | Single instance | All HA (2+ replicas) |

### Interactions

- Phase 2/3 tab switching (same tab style as Architecture Evolution)
- Node hover glow effect
- Edge flowing dot animation (3 dots, 5s cycle)
- Phase switch fade out/in animation

### Node Colors

| Type | Color |
|------|-------|
| `api` | indigo (#6366F1) |
| `worker` | cyan (#22D3EE) |
| `monitoring` | purple (#A855F7) |
| `external` | slate (#64748B) |

---

## Sub-Block 2: Alert Tiers (P0 / P1 / P2)

### Design

Three vertically stacked accordion cards. Only one card expanded at a time.

### Card Collapsed State

- Left 4px color bar (P0=red #EF4444, P1=amber #F59E0B, P2=cyan #22D3EE)
- Tier badge (`P0` / `P1` / `P2`)
- Severity name (Critical / Warning / Info)
- Notification channel icons + text
- Rule count (`6 rules` / `8 rules` / `6 rules`)
- Expand arrow

### Card Expanded State

Table with columns: Alert, Condition, Duration.

#### P0 Critical Rules (6)

| Alert | Condition | Duration |
|-------|-----------|----------|
| Service unavailable | `up == 0` all instances | 2 min |
| DLQ accumulation | DLQ messages > 0 | 1 min |
| All GPUs offline | GPU count == 0 | 3 min |
| API error rate spike | 5xx rate > 20% | 3 min |
| DB connection exhaustion | connections > 90% | 2 min |
| SQS message age | oldest msg > 30 min | 5 min |

#### P1 Warning Rules (8)

| Alert | Condition | Duration |
|-------|-----------|----------|
| Error rate elevated | error rate > 5% | 5 min |
| API P99 latency high | P99 > 3s | 5 min |
| STT processing slow | P95 > 15s | 5 min |
| GPU utilization high | GPU > 85% | 10 min |
| SQS queue depth growing | depth > 1000 | 5 min |
| Redis memory high | memory > 80% | 5 min |
| Pod frequent restarts | restarts > 3/hr | Immediate |
| ArgoCD sync failed | OutOfSync | 10 min |

#### P2 Info Rules (6)

| Alert | Condition | Duration |
|-------|-----------|----------|
| Cache hit ratio drop | hit ratio < 80% | 15 min |
| Disk usage high | available < 20% | 10 min |
| GPU temperature high | temp > 80C | 10 min |
| RDS replication lag | lag > 5s (Phase 3) | 10 min |
| Canary rollout paused | phase == Paused | 5 min |
| Node CPU high | CPU > 75% | 15 min |

### Interactions

- Click card to toggle expand/collapse (accordion: one at a time)
- Expand animation: Framer Motion `AnimatePresence` + height auto
- Rule rows stagger in on expand

---

## Sub-Block 3: Dashboard Preview

### Design

CSS-rendered wireframe simulating a Grafana System Health Overview dashboard. Static display with animations, no real data.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  System Health Overview                          HEPH-AI    │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│  API Service │  STT Worker  │  LLM Worker  │  GPU Cluster    │
│  ● UP        │  ● UP        │  ● UP        │  ● 2 GPUs OK   │
│  [sparkline] │  [sparkline] │  [sparkline] │                 │
│  12 req/s    │  8 tasks/min │  25 tasks/min│  Util: 62%     │
├─────────────┴──────────────┴──────────────┴─────────────────┤
│  Task Pipeline                                               │
│  Upload ──▶ SQS-STT ──▶ SQS-LLM ──▶ Done                   │
│  48/min      depth:12      depth:3    45/min                │
├──────────────────────┬──────────────┬────────────────────────┤
│  PostgreSQL           │  Redis        │  SQS                 │
│  Conn: 23/100        │  Hit: 94%    │  DLQ: 0              │
│  P95: 8ms            │  Mem: 1.2GB  │  Oldest: 2s          │
├──────────────────────┴──────────────┴────────────────────────┤
│  Active Alerts: None ✓                                       │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

- Pure CSS + Tailwind (`bg-bg-card`, `border-border`, grid layout)
- Sparklines: SVG `<polyline>` with fixed fake data, gradient fill
- Status dots: CSS green pulse animation
- Pipeline: CSS flexbox + arrow symbols
- No Recharts dependency needed

### Animations

- Scroll reveal via `SectionWrapper`
- Sparkline draw animation (SVG stroke-dashoffset transition)
- Numbers CountUp effect (animate from 0 to target)

---

## Sub-Block 4: Metrics Coverage

### Design

Tab-based metrics table organized by monitoring dimension.

### Tabs

| Tab | Services / Groups | Metric Count |
|-----|-------------------|-------------|
| Application | API Service (4) + STT Worker (5) + LLM Worker (6) | 15 |
| GPU | DCGM metrics (6) | 6 |
| Infrastructure | PostgreSQL (5) + Redis (5) + SQS (5) | 15 |
| Network | Ingress (2) + ALB (2) + CoreDNS (1) | 5 |
| CI/CD | ArgoCD (2) + Argo Rollouts (2, Phase 3) | 4 |

### Tab Style

Same as Tech Selection tabs:
- Active: gradient background (`from-accent-start to-accent-end`)
- Inactive: `bg-bg-card border border-border`

### Table Style

- Service name as sub-header (bold + underline)
- Alternating row background
- Metric name: `font-mono text-cyan`
- Type: small badge (Counter=emerald, Histogram=amber, Gauge=indigo)
- Description: `text-text-secondary`

### Interactions

- Tab switch (one active at a time)
- Content fade-in on tab change
- Table rows stagger-in animation

---

## i18n Translations

### English (`en.json` additions)

```json
{
  "observability": {
    "title": "Observability",
    "subtitle": "Three pillars of observability — monitor every service from Growth to Scale",
    "phase2": "Phase 2: Growth",
    "phase3": "Phase 3: Scale",
    "components": "Components",
    "monthlyCost": "Monthly Cost",
    "pillars": "Pillars",
    "alerting": "Alerting",
    "ha": "High Availability",
    "alertTiers": "Alert Tiers",
    "dashboardPreview": "Dashboard Preview",
    "metricsCoverage": "Metrics Coverage",
    "rules": "rules",
    "critical": "Critical",
    "warning": "Warning",
    "info": "Info",
    "application": "Application",
    "gpu": "GPU",
    "infrastructure": "Infrastructure",
    "network": "Network",
    "cicd": "CI/CD",
    "metric": "Metric",
    "type": "Type",
    "description": "Description",
    "alert": "Alert",
    "condition": "Condition",
    "duration": "Duration",
    "activeAlerts": "Active Alerts: None"
  }
}
```

### Chinese (`zh.json` additions)

```json
{
  "observability": {
    "title": "可觀測性",
    "subtitle": "三支柱可觀測性 — 從 Growth 到 Scale 全服務監控",
    "phase2": "Phase 2: Growth",
    "phase3": "Phase 3: Scale",
    "components": "元件",
    "monthlyCost": "月成本",
    "pillars": "支柱",
    "alerting": "告警",
    "ha": "高可用性",
    "alertTiers": "告警分級",
    "dashboardPreview": "儀表板預覽",
    "metricsCoverage": "指標覆蓋",
    "rules": "條規則",
    "critical": "嚴重",
    "warning": "警告",
    "info": "資訊",
    "application": "應用服務",
    "gpu": "GPU",
    "infrastructure": "基礎設施",
    "network": "網路",
    "cicd": "CI/CD",
    "metric": "指標",
    "type": "類型",
    "description": "說明",
    "alert": "告警",
    "condition": "條件",
    "duration": "持續時間",
    "activeAlerts": "告警狀態：無"
  }
}
```
