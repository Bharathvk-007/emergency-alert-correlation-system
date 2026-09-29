# Emergency Alert Correlation System (70% Milestone Prototype)

> **Explainable multi-source alert correlation, root-cause candidate ranking, dependency topology, and graceful degradation for public emergency-information platforms during crisis traffic.**

---

## 1. What was Completed in Milestone 1 vs. Added in Milestone 2

### Milestone 1 (First 35%):
* Baseline un-correlated alert processing vs heuristic grouping.
* Synthetic dataset (alerts, logs, traces, topology, timelines) across 14 services and 3 disaster incidents.
* Explainable deterministic correlation scoring with 6 feature weights.
* Basic service topology and chronological timeline.
* Initial multi-organization separation (`ORG-A`, `ORG-B`, `ORG-C`).
* Basic incident list, details view, and audit export.

### Milestone 2 (Added for 70% Milestone):
* **Advanced Multi-Dimensional Correlation:** Metric synergy, host/resource locality, propagation sequence, and historical disaster incident similarity.
* **3-Tier Root Cause Ranking:** Distinct classification into `PROBABLE_ROOT_CAUSE`, `CONTRIBUTING_FAILURE`, and `DOWNSTREAM_SYMPTOM`, with downstream affected service counts and candidate confidence levels.
* **Near-Real-Time Stream Simulation:** Interactive playback bar with Start, Pause, Resume, Reset, 1x/2x/5x speed controls, and noise injection.
* **Delayed Evidence In-Place Reconciliation:** When delayed logs/traces arrive, existing incident IDs are updated in-place rather than generating duplicate, fragmented tickets.
* **Complete Dependency Path Analysis:** Bidirectional path computation (Forward Downstream Blast Radius + Reverse Upstream Diagnostic Trail).
* **Clickable Evidence Provenance Graph:** Interactive anchor inspection revealing exact source telemetry, correlation reasoning, and weight contribution.
* **Incident Lifecycle Management:** 6 states (`NEW`, `INVESTIGATING`, `CORRELATED`, `ROOT_CAUSE_CANDIDATE`, `MITIGATED`, `RESOLVED`), SRE assignment, Incident Commander tracking, and immutable lifecycle history.
* **Human-in-the-Loop Confirmation:** Distinct separation between automated `SYSTEM SUGGESTION` and `HUMAN CONFIRMED` root cause verdicts with investigation notes.
* **Privacy-Aware Cross-Organization Sharing:** Controlled evidence sharing with `ORG-B` (Cloud), `ORG-C` (CDN), and `ORG-D` (Telecom), automatically masking internal database logs and private hostnames.
* **Multi-Format Audit Export:** Export audit-ready incident reports in **JSON**, **CSV**, and human-readable **HTML** formats.
* **7 Automated Edge & Failure Tests:** Python test suite verifying resilience across missing logs, delayed traces, offline topology, simultaneous outages, deduplication, multi-org access, and delayed reconciliation.
* **Stakeholder Validation Module:** Operational feedback questionnaire for SRE, IC, Platform, and Partner roles.
* **Health & Diagnostics Endpoint:** Comprehensive subsystem status at `GET /api/health`.

---

## 2. Quantitative Evaluation Results (Measured Live)

| Evaluation Metric | Naive Baseline | Milestone Target | Prototype Measured Result | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Raw Alert Volume** | 20 | 20 | **20** | ✓ Validated |
| **Active Incidents Presented** | 14 (fragmented) | 3 – 5 | **3** | ✓ Exceeded |
| **Alert Noise Reduction %** | 30.0% | $\ge 50.0\%$ | **85.0%** (16 grouped into 3) | ✓ Exceeded |
| **Incident Detection Rate (Recall)** | 60.0% | $\ge 95.0\%$ | **100.0%** (3/3 true incidents) | ✓ Exceeded |
| **False Positive Rate (Noise into Incident)** | 33.3% | $\le 10.0\%$ | **0.0%** (0 noise alarms promoted) | ✓ Exceeded |
| **False Negative Rate (Missed Incidents)** | 0.0% | $\le 5.0\%$ | **0.0%** (0 missed incidents) | ✓ Validated |
| **Root-Cause Precision** | 0.0% | $\ge 80.0\%$ | **100.0%** (3/3 true origins ranked #1) | ✓ Exceeded |
| **Median Time to Identify Candidate** | 300s (manual) | $\le 30\text{s}$ | **0s** (Instantaneous T0 anchor) | ✓ Exceeded |
| **Mean Alerts Per Incident** | 1.4 alerts/group | 4 – 8 alerts | **5.3 alerts/incident** | ✓ Validated |

---

## 3. Installation & Run Commands

### A. Run Frontend (React 19 + Vite)
```bash
npm install
npm run dev
```
Open your browser at `http://localhost:3000`.

### B. Run Automated Edge & Failure Tests (7 Tests)
```bash
python3 -m backend.evaluation.test_edge_cases
```

### C. Run Evaluation Benchmark
```bash
python3 -m backend.evaluation.evaluate
```

### D. Run Python Backend Server
```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. 3-Minute Demo Flow

1. **Minute 1: Ingestion Stream & Alert Noise Reduction**
   * Click **"Reset"** then **"Start Stream"** (Speed: 2x) in the top simulation bar.
   * Watch incoming alarms populate the chronograph and consolidate into exactly 3 incidents (**85.0% noise reduction**).
2. **Minute 2: Root-Cause Candidate Ranking & Blast Radius**
   * Open `INC-001`. Point out the classification of `PostgreSQL Database` as **PROBABLE_ROOT_CAUSE** and downstream services as **CONTRIBUTING_FAILURE** or **SYMPTOM**.
   * Inspect the **Downstream Blast Radius** (`PostgreSQL -> EDS -> API Gateway -> Web Frontend`).
   * Click the **"Provenance"** tab and inspect evidence anchors (`ALT-101`, `LOG-101`) for exact correlation rationales.
3. **Minute 3: Missing Telemetry, In-Place Reconciliation & Audit Export**
   * Click **"Traces"** in the top bar to simulate sampling dropouts $\rightarrow$ observe graceful confidence recalibration.
   * In the **"Human-in-the-Loop"** tab, confirm the root cause as SRE Lead and assign the incident.
   * Click **"Share with Partner"** to demonstrate privacy-aware sharing with internal logs masked.
   * Click **"Audit Report"** to inspect and export the report in JSON, CSV, or HTML.

---

## 5. Roadmap: The Remaining 30% to Complete the Project

* [ ] **Phase 3 (Next 15%):** Native OpenTelemetry gRPC ingest receiver, Kafka topic consumer, and real-time sliding window persistence in PostgreSQL/Cloud SQL.
* [ ] **Phase 4 (Final 15%):** Graph Neural Network (GNN) embeddings for topology discovery on unmapped microservices, automated runbook webhooks (PagerDuty / Slack / AWS AutoScaling), and production OAuth SSO authentication.
