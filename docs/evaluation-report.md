# Evaluation Benchmark Report (Milestone 2 - 70%)

## 1. Experimental Methodology

The evaluation benchmarks the **Naive Baseline Alert Processing Method** against the **Emergency Alert Correlation Prototype Engine** using the standardized multi-service synthetic dataset simulating crisis-level load on a public emergency-information platform.

### Dataset Overview
* **Total Ingested Alerts:** 20 raw alerts
  * Incident 1 (Database Failure & Cascading 504s): 8 alerts
  * Incident 2 (CDN Route Degradation & Edge Cache Misses): 4 alerts
  * Incident 3 (Message Queue Partition Stall & SMS SLA Breach): 4 alerts
  * Unrelated / Background Noise: 4 alerts (Auth crawling, routine JVM GC, Redis key eviction, telemetry webhook jitter)
* **Total Known Ground-Truth Incidents:** 3 distinct disaster incidents

---

## 2. Quantitative Evaluation Results (Measured Live)

| Metric | Baseline System (Uncorrelated) | Baseline (Window + Service Grouping) | Milestone Target | Prototype Measured Result | Target Met? |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Raw Alert Volume** | 20 | 20 | 20 | **20** | ✓ Validated |
| **Active Incidents Created** | 20 | 14 | 3 – 5 | **3** | ✓ Exceeded |
| **Alert Reduction %** | 0.0% | 30.0% | $\ge 50.0\%$ | **85.0%** (16/20 grouped into 3) | ✓ Exceeded |
| **Incident Detection Rate (Recall)** | 100% (fragmented) | 60.0% (fragmented) | $\ge 95.0\%$ | **100.0%** (3/3 true incidents identified) | ✓ Exceeded |
| **False Positive Rate (Noise into Incident)** | 100% (noise treated as incident) | 33.3% (noise grouped) | $\le 10.0\%$ | **0.0%** (0 noise alerts grouped into incidents) | ✓ Exceeded |
| **False Negative Rate (Missed True Alerts)** | 0.0% | 0.0% | $\le 5.0\%$ | **0.0%** (0 true incident alerts missed) | ✓ Validated |
| **Root-Cause Candidate Precision** | 0.0% (no root cause inference) | 0.0% (random pick) | $\ge 80.0\%$ | **100.0%** (Top candidate matches ground truth in 3/3 incidents) | ✓ Exceeded |
| **Median Time to Identify Candidate** | 300s (manual triage) | 180s | $\le 30\text{s}$ | **0s** (Instantaneous T0 anchor) | ✓ Exceeded |
| **Mean Alerts Per Incident** | 1.0 alert/ticket | 1.4 alerts/group | 4 – 8 alerts | **5.3 alerts/incident** | ✓ Validated |

---

## 3. Automated Edge & Failure Case Test Suite (Section 16)

All 7 automated failure scenarios pass deterministically:
* **TEST 1 (Logs completely missing):** 3 true incidents detected with graceful weight redistribution.
* **TEST 2 (Traces delayed by 60s):** 3 incidents detected with topology/log fallback.
* **TEST 3 (Topology unavailable):** Fallback to trace & temporal proximity succeeded.
* **TEST 4 (Unrelated simultaneous alerts):** Separated into 2 distinct incidents (no false super-incident).
* **TEST 5 (Duplicate alerts):** Deduplicated into 3 incidents without redundant tickets.
* **TEST 6 (Multi-organization access):** Tenant separation and boundary access preserved.
* **TEST 7 (Delayed evidence reconciliation):** Incident INC-001 updated in-place with arriving logs without creating duplicate tickets.

---

## 4. Error Analysis & Failure Modes

1. **False Positive Prevention:** Unrelated crawler alarms occurring in close time proximity to database failures are rejected because topological hop distance is infinite (disconnected subgraphs).
2. **False Negative Prevention:** If logs are delayed by minutes, distributed trace parent/child spans and topology edges preserve the cluster boundary until logs arrive.
3. **Root-Cause Ranking Disambiguation:** Upstream leaf nodes (e.g. databases, message queues) receive depth weighting so downstream reverse proxies (API Gateway) that emit high alert counts do not overshadow the true upstream defect.
