# Emergency Alert Correlation System (35% Milestone Prototype)

> **Explainable multi-source alert correlation, root-cause candidate ranking, and dependency topology for public emergency-information platforms during crisis traffic.**

---

## 1. Project Overview & Problem Statement
During severe emergencies and regional disasters, public crisis information portals experience immense traffic surges. Infrastructure strain triggers cascading failures across microservices, databases, caches, and CDN edges.

Monitoring systems inundate SREs with hundreds of noisy, symptomatic alerts (e.g. HTTP 504s, client timeouts, queue delays). Responders struggle to distinguish downstream symptoms from originating root causes. 

This project implements an **explainable, deterministic correlation engine** that:
1. Clusters noisy alarms into actionable **incidents**.
2. Ranks **probable root-cause candidates** with explicit evidence notes.
3. Preserves backwards **provenance** linking every symptom to traces, logs, and topology.
4. Gracefully degrades when data sources (logs or traces) are delayed or missing.
5. Enforces **multi-organization isolation** (Website Operator, Cloud Provider, Telco).

---

## 2. Architecture & Technology Stack

* **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, SVG Topology Visualizer.
* **Backend:** Python 3.10+ / FastAPI, Pydantic, CSV/JSON data stores.
* **Correlation Engine:** Agglomerative affinity graph clustering with configurable multi-signal weighting.
* **Resilience Layer:** Dynamic runtime weight rebalancing for dropped or delayed telemetry streams.

```
Incoming Telemetry (Alerts, Logs, Traces, Topology, Timeline)
                       │
                       ▼
         [Normalization & Deduplication]
                       │
                       ▼
        [Multi-Signal Affinity Scoring]
  (Time: 0.25, Service: 0.20, Topology: 0.20, Trace: 0.15, Log: 0.10, Severity: 0.10)
                       │
                       ▼
        [Agglomerative Incident Grouping]
                       │
                       ▼
       [Probable Root-Cause Ranking (RCS)]
   (Earliest T0 Event, Upstream Depth, Resource Alarms, Fatal Logs)
                       │
                       ▼
          [Immutable Provenance Binding]
                       │
                       ▼
       [Role-Aware UI & Audit Report Export]
```

---

## 3. Dataset Description
The synthetic dataset models 14 microservices and edge providers:
* **Edge & Ingress:** `CDN`, `Load Balancer`, `Web Frontend`
* **Core API:** `API Gateway`, `Authentication Service`, `User Service`
* **Data Layer:** `Emergency Data Service`, `PostgreSQL Database`, `Redis Cache`
* **Messaging & Alerting:** `Alert Service`, `Notification Service`, `Message Queue`, `External SMS Provider`, `External Email Provider`

### Ground Truth Incidents Modeled:
1. **INC-001 (ORG-A):** PostgreSQL connection pool and disk I/O exhaustion $\rightarrow$ Emergency Data Service query timeouts $\rightarrow$ API Gateway 504s $\rightarrow$ Web Frontend failure.
2. **INC-002 (ORG-B):** CDN edge cache eviction storm & origin latency spike $\rightarrow$ Ingress Load Balancer queue build-up $\rightarrow$ Web Frontend TTFB degradation.
3. **INC-003 (ORG-C):** Message Queue partition write stall $\rightarrow$ Notification Service buffer capacity breach $\rightarrow$ External SMS Carrier delivery SLA failure.
4. **NOISE:** Routine crawler bot rate-limiting, scheduled JVM batch sync, background Redis volatile key eviction.

Files stored in `backend/data/` and `src/data/`:
* `alerts.csv`
* `logs.csv`
* `traces.csv`
* `topology.csv`
* `incidents.csv`

---

## 4. Evaluation Benchmark Results

| Metric | Naive Baseline | Milestone Target | Prototype Measured Result | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Raw Alert Volume** | 20 | 20 | **20** | ✓ Validated |
| **Active Incidents Presented** | 14 (fragmented) | 3 – 5 | **3** | ✓ Exceeded |
| **Alert Noise Reduction %** | 30.0% | $\ge 50.0\%$ | **85.0%** | ✓ Exceeded |
| **Incident Detection Rate (Recall)** | 60.0% | $\ge 95.0\%$ | **100.0%** | ✓ Exceeded |
| **False Positive Rate (Noise into Incident)** | 33.3% | $\le 10.0\%$ | **0.0%** | ✓ Exceeded |
| **False Negative Rate (Missed Incidents)** | 0.0% | $\le 5.0\%$ | **0.0%** | ✓ Validated |
| **Root-Cause Precision** | 0.0% | $\ge 85.0\%$ | **100.0%** | ✓ Exceeded |

---

## 5. How to Install & Run

### A. Run Frontend (React 19 + Vite)
```bash
# Install node dependencies
npm install

# Start Vite dev server on port 3000
npm run dev
```
Open your browser at `http://localhost:3000`.

### B. Run Python Backend & Evaluation
```bash
# Navigate to backend and install requirements
pip install -r backend/requirements.txt

# Run Python evaluation benchmark directly
python3 -m backend.evaluation.evaluate

# Start FastAPI server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 6. Key API Endpoints
* `GET /api/health` - System health and milestone version.
* `GET /api/organizations` - Multi-tenant organization definitions.
* `GET /api/alerts?organization_id=ORG-A&role=ENGINEER` - Filtered alerts stream.
* `GET /api/incidents` - Correlated incidents with dynamic source parameters.
* `GET /api/incidents/{incident_id}` - Detailed incident dossier.
* `GET /api/incidents/{incident_id}/timeline` - Chronological incident event stream.
* `GET /api/incidents/{incident_id}/provenance` - Full backwards evidence lineage.
* `GET /api/incidents/{incident_id}/audit-export` - Audit-ready JSON export.
* `GET /api/topology` - Directed service dependency nodes and edges.
* `GET /api/metrics` - Live evaluation benchmark calculations.

---

## 7. Handled Edge Cases & Graceful Degradation
* **Edge Case 1 (Logs Delayed):** System rebalances log weight (0.10) to time and topology signals. Incident remains grouped; confidence adjusts to `MEDIUM-HIGH`.
* **Edge Case 2 (Traces Offline):** Graph topology adjacency and timeline chronological sequence bridge the causation chain. Confidence adjusts to `MEDIUM`.
* **Edge Case 3 (Concurrent Unrelated Outages):** Topological distance cutoff ($\ge 3$ hops) prevents false clustering across disconnected microservice subgraphs.
* **Edge Case 4 (Incomplete Topology):** Distributed trace span parent/child edges substitute for static architecture CMDB links.

---

## 8. Milestone Completion (First 35%) & Roadmap (Remaining 65%)

### Completed in 35% Milestone:
- [x] Complete problem analysis and epistemological foundation (`docs/problem-analysis.md`).
- [x] User and multi-tenant workflow map (`docs/workflow-map.md`).
- [x] Full synthetic dataset (alerts, logs, traces, topology, timelines) in CSV and JSON.
- [x] Baseline alert processing module (independent vs. window+service grouping).
- [x] Deterministic, explainable correlation scoring engine with dynamic source rebalancing.
- [x] Service topology graph with shortest paths and upstream depth calculation.
- [x] Incident chronological timeline with earliest event pinning.
- [x] Role-Based Access Control (Admin, Engineer, Incident Commander, Partner, Viewer).
- [x] Complete evaluation suite benchmarking baseline vs prototype results.
- [x] 4 automated edge-case verification scenarios.
- [x] Audit-ready incident export separating Observed Facts from System Inferences.
- [x] Interactive web dashboard with 6 specialized views.

### Roadmap for Remaining 65%:
- [ ] **Phase 2 (Next 25%):** Real-time Kafka / OpenTelemetry streaming ingest pipeline, WebSockets push for live cluster recomputation, sliding window state persistence.
- [ ] **Phase 3 (Next 20%):** Graph Neural Network (GNN) embeddings for topology inference on unmapped microservices, and semantic embedding clustering for unstructured log messages.
- [ ] **Phase 4 (Final 20%):** Automated runbook trigger generation, integration with PagerDuty / Slack APIs, and historical disaster replay simulator.
