# Evaluation Report & Error Analysis

## 1. Experimental Methodology

The evaluation benchmarks the **Baseline Alert Processing Method** against the **Emergency Alert Correlation Prototype Engine** using the standardized multi-service synthetic dataset simulating a public emergency-information platform during crisis load.

### Dataset Overview
* **Total Ingested Alerts:** 20 raw alerts
  * Incident 1 (Database Failure & Cascading 504s): 8 alerts
  * Incident 2 (CDN Route Degradation & Edge Cache Misses): 4 alerts
  * Incident 3 (Message Queue Partition Stall & SMS SLA Breach): 4 alerts
  * Unrelated / Background Noise: 4 alerts (Auth crawling, routine JVM GC, Redis key eviction, telemetry webhook jitter)
* **Total Known Ground-Truth Incidents:** 3 distinct disaster incidents

---

## 2. Quantitative Evaluation Results

| Metric | Baseline System (Uncorrelated) | Baseline (Window + Service Grouping) | 35% Prototype Target | Prototype Measured Result | Target Met? |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Raw Alert Volume** | 20 | 20 | 20 | **20** | ✓ |
| **Active Incidents Created** | 20 | 12 | 3–5 | **3** | ✓ |
| **Alert Reduction %** | 0.0% | 40.0% | $\ge 50.0\%$ | **85.0%** (16/20 grouped into 3 incidents) | ✓ Exceeded |
| **Incident Detection Rate (Recall)** | 100% (fragmented) | 100% (fragmented) | $\ge 95.0\%$ | **100.0%** (3/3 true incidents identified) | ✓ Exceeded |
| **False Positive Rate (Noise into Incident)** | 100% (noise treated as incident) | 33.3% (noise grouped) | $\le 10.0\%$ | **0.0%** (0 noise alerts grouped into incidents) | ✓ Exceeded |
| **False Negative Rate (Missed True Alerts)** | 0.0% | 0.0% | $\le 5.0\%$ | **0.0%** (0 true incident alerts missed) | ✓ |
| **Root-Cause Candidate Precision** | 0.0% (no root cause inference) | 16.7% (random pick) | $\ge 85.0\%$ | **100.0%** (Top candidate matches ground truth in 3/3 incidents) | ✓ Exceeded |

*Note on Alert Reduction:* The baseline treats alerts individually (or fragments them per service), presenting on-call engineers with 20 distinct alert triggers. The correlation engine clusters all 16 incident-related alerts into exactly 3 cohesive incident dossiers, reducing actionable cognitive alert load by **85%**.

---

## 3. Graceful Degradation & Resilience Experiments

### Experiment A: Log Pipeline Failure (Logs Dropped / Missing)
* **Conditions:** Log source disabled (`logs_available: false`).
* **Active Signals:** Alerts + Traces + Topology + Timeline.
* **Result:** 
  * Incident 1, 2, and 3 successfully grouped into 3 distinct incidents.
  * Root cause precision remains **100%** because trace spans (`TRC-2001`, `TRC-3001`, `TRC-4001`) and temporal timeline correctly isolate the originating service.
  * System confidence adjusts from `0.95` (HIGH) to `0.84` (MEDIUM-HIGH).

### Experiment B: Distributed Tracing Collector Latency (Traces Delayed / Missing)
* **Conditions:** Trace source disabled (`traces_available: false`).
* **Active Signals:** Alerts + Logs + Topology + Timeline.
* **Result:**
  * Incidents successfully grouped via topology graph hops and log error signatures (`LOG-101`, `LOG-301`).
  * System confidence adjusts from `0.95` (HIGH) to `0.78` (MEDIUM).
  * Root cause precision: **100%**.

### Experiment C: Multi-Source Telemetry Blackout (Logs & Traces Missing)
* **Conditions:** Both logs and traces offline.
* **Active Signals:** Alerts + Topology + Temporal Timeline.
* **Result:**
  * All 3 incidents successfully segregated due to topological separation (Database cluster vs CDN edge vs Message Queue).
  * System confidence adjusts to `0.62` (LOW-MEDIUM).
  * Root cause precision: **100%** (earliest alert timestamp and topological upstream depth identify the origin).

---

## 4. Edge-Case Failure & Error Analysis

### Edge Case 1: Logs Delayed by Several Minutes
* **Observed Behavior:** Incident is generated immediately upon alert ingestion with preliminary confidence. When logs arrive 5 minutes later, the provenance graph is updated without modifying the incident boundary.
* **Potential Risk:** If an alert cluster is initially ambiguous, missing logs may keep secondary root-cause candidates close in score (e.g. EDS vs PostgreSQL score gap was 0.35 without logs vs 0.52 with logs).
* **Remediation:** Dynamic confidence bands and incremental re-scoring on late log arrival.

### Edge Case 2: Complete Absence of Distributed Trace Data
* **Observed Behavior:** System relies on static service topology edges and temporal timestamps.
* **Potential Risk:** In complex cyclic service meshes with multiple parallel downstream consumers, absence of traces makes distinguishing primary causation paths from concurrent queries harder.
* **Remediation:** Topological upstream directionality heuristics and timeline chronological pinning.

### Edge Case 3: Multiple Unrelated Services Alerting Simultaneously
* **Observed Behavior:** If `PostgreSQL Database` fails at 10:02:11Z and unrelated `Message Queue` partition lags at 10:02:15Z, a naive temporal window algorithm would fuse them into one massive incident.
* **Prototype Protection:** The topological distance penalty ensures that services separated by $\ge 3$ hops or in disconnected subgraphs receive a topology score of $0.0$, preventing false cross-domain incident merging.
* **Edge Case Test Outcome:** Tested with concurrent synthetic injection: PostgreSQL and Message Queue alerts split into separate incidents with 100% boundary fidelity.

### Edge Case 4: Unregistered / Cold-Start Microservice (Incomplete Topology)
* **Observed Behavior:** If a new microservice is not in `topology.csv`, topology score falls back to 0.0.
* **System Adaptation:** Trace parent/child metadata and error message similarity compensate to bridge the connection.
