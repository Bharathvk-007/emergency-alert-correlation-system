# User and Workflow Map

## 1. User Roles & Personas

| Role Code | Role Name | Primary Objective | Visible Scope | Permitted Actions |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Organization Administrator | Tenant management, system configuration, compliance oversight | Full tenant scope + correlation parameters + audit trails | Configure weights, manage API integrations, export audits |
| **ENGINEER** | Platform / SRE Engineer | Deep technical triage, isolating root causes, executing mitigations | Raw alerts, telemetry logs, distributed traces, topology graphs | Drill down into traces/logs, test edge case simulations, trigger correlation runs |
| **INCIDENT_COMMANDER** | Incident Commander (IC) | Strategic coordination, public impact assessment, executive comms | High-level incident summaries, blast radius, candidate root causes, timeline | Acknowledge incidents, declare severity, promote root-cause candidates, export briefings |
| **PARTNER** | External Partner / Telco / CDN | Coordinated mitigation of shared boundary services | Boundary services (CDN, SMS Gateways, Ingress LB) only | View shared SLA telemetry, acknowledge upstream/downstream tickets |
| **VIEWER** | Read-Only Observer / Auditor | Situational awareness without risk of operational disruption | Redacted incident summaries and public service health status | View dashboard, export compliance summaries (no sensitive logs/traces) |

---

## 2. Multi-Organization Separation

The system isolates tenancy at the data ingestion and query layer:

* **ORG-A (Emergency Public Website Operator):**
  * Core owner of public website, API gateway, emergency data services, database, cache, and notification dispatch.
* **ORG-B (Cloud Infrastructure & CDN Provider):**
  * Manages edge points-of-presence (PoPs), origin shields, ingress load balancers, and host hypervisors.
* **ORG-C (Communication & Telco Partner):**
  * Operates message broker bridges, external carrier SMS aggregators, and citizen broadcast dispatch pipes.

### Cross-Tenant Visibility Rules:
1. **Unshared Internal Services:** Alerts and logs from internal databases or local caches are strictly confidential to the owning organization.
2. **Boundary / Shared Dependencies:** Alerts originating on edge boundaries (e.g., CDN $\rightarrow$ Load Balancer, Notification Service $\rightarrow$ Message Queue $\rightarrow$ SMS Gateway) can be correlated into unified incidents with sanitized views for partners.
3. **Role Filtering:** A `PARTNER` user from ORG-B will see that `Load Balancer` and `CDN` are experiencing elevated latency, but will not see internal `PostgreSQL` query logs.

---

## 3. End-to-End Operational Workflow

```
[Raw Alert Ingestion]
         │ (Alerts from Prometheus, Datadog, Synthetics)
         ▼
[Normalization & Deduplication]
         │ (Format schema unification, host-service mapping, deduplication window)
         ▼
[Correlation Pipeline]
   ┌─────┴────────────────────────────────────────┐
   │ 1. Temporal Proximity Window (e.g. ±120s)     │
   │ 2. Topological Graph Traversal (Up/Downstream)│
   │ 3. Trace ID & Request ID Association          │
   │ 4. Log Message Semantic / Keyword Match       │
   │ 5. Dynamic Missing-Data Graceful Weighting   │
   └─────┬────────────────────────────────────────┘
         ▼
[Incident Grouping & Provenance Binding]
         │ (Clusters alerts into INC-XXX with full evidence lineage)
         ▼
[Dependency Analysis & Root-Cause Candidate Scoring]
         │ (Identifies upstream originating fault vs downstream symptoms)
         ▼
[Role-Aware UI Presentation]
   ├── IC: Executive summary, blast radius, public advisory draft
   ├── SRE: Deep trace graphs, raw logs, database lock diagnostics
   └── Partner: Edge latency boundaries and SLA telemetry
         ▼
[Incident Investigation & Confirmation]
         │ (Engineer confirms/refines candidate root cause in UI)
         ▼
[Audit & Export]
         └─ (Generates audit-ready JSON/Markdown report separating Facts from Inference)
```

---

## 4. UI Transformation Matrix

| UI Component / View | ADMIN | ENGINEER | INCIDENT COMMANDER | PARTNER | VIEWER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Executive KPI Dashboard** | Full | Full | Full | Tenant Boundary | Read-only |
| **Incident List & Triage** | Full | Full | Full | Tenant Boundary | Read-only |
| **Deep Traces & Log Messages** | Full | Full | Summarized | Hidden | Hidden |
| **Service Topology Map** | Full Graph | Full Graph | Impact Heatmap | Boundary Edges | Public Nodes |
| **Correlation Weight Tuning** | Editable | View-only | View-only | Hidden | Hidden |
| **Missing Data Simulator** | Active | Active | View State | View State | View State |
| **Audit Report Export** | Full (All) | Full (All) | Full (All) | Redacted | Redacted |
