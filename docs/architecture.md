# Architecture & Technical Design

## 1. System Overview & Technology Stack

The Emergency Alert Correlation System is designed as a modular, deterministic, and explainable observability intelligence layer.

* **Backend Engine:** Python 3.10+ / FastAPI (REST endpoints, correlation engine, evaluation framework) with mirrored TypeScript engine in the frontend client.
* **Frontend Web Application:** React 19 + TypeScript + Tailwind CSS + Lucide Icons + Motion animations.
* **Data Layer:** Normalized CSV/JSON schemas for alerts, logs, distributed traces, service topology, and incident event timelines.
* **Visualization:** Interactive SVG-based Service Dependency Topology Graph with live status indicators, timeline chronographs, and provenance tree inspectors.

---

## 2. Correlation Algorithm & Scoring Mathematical Formulation

For any pair of raw alerts $a_i$ and $a_j$, the correlation engine calculates a pairwise affinity score:

$$S(a_i, a_j) = \sum_{k \in \mathcal{K}} w_k \cdot s_k(a_i, a_j)$$

where $\mathcal{K} = \{\text{time}, \text{service}, \text{topology}, \text{trace}, \text{log}, \text{severity}\}$ and $\sum w_k = 1.0$.

### Default Feature Weights:
* $w_{\text{time}} = 0.25$
* $w_{\text{service}} = 0.20$
* $w_{\text{topology}} = 0.20$
* $w_{\text{trace}} = 0.15$
* $w_{\text{log}} = 0.10$
* $w_{\text{severity}} = 0.10$

### Sub-Score Formulations:

1. **Temporal Proximity Score ($s_{\text{time}}$):**
   $$s_{\text{time}} = \max\left(0, 1 - \frac{|\Delta t|}{\tau}\right)$$
   where $\Delta t = |t(a_i) - t(a_j)|$ and $\tau = 180\text{ seconds}$ (sliding correlation window).

2. **Service Affinity Score ($s_{\text{service}}$):**
   $$s_{\text{service}} = \begin{cases} 1.0 & \text{if } \text{service}(a_i) == \text{service}(a_j) \\ 0.0 & \text{otherwise} \end{cases}$$

3. **Topology Distance Score ($s_{\text{topology}}$):**
   Let $d(u, v)$ be the shortest undirected graph hop distance between $\text{service}(a_i)$ and $\text{service}(a_j)$:
   $$s_{\text{topology}} = \begin{cases} 1.0 & \text{if } d(u, v) = 0 \\ 0.85 & \text{if } d(u, v) = 1 \text{ (direct neighbor)} \\ 0.50 & \text{if } d(u, v) = 2 \text{ (two hops)} \\ 0.0 & \text{if } d(u, v) \ge 3 \text{ or unreachable} \end{cases}$$

4. **Distributed Trace Score ($s_{\text{trace}}$):**
   $$s_{\text{trace}} = \begin{cases} 1.0 & \text{if both alerts link to identical } \text{trace\_id} \\ 0.7 & \text{if trace spans connect services } u \text{ and } v \\ 0.0 & \text{otherwise} \end{cases}$$

5. **Log Association Score ($s_{\text{log}}$):**
   $$s_{\text{log}} = \begin{cases} 1.0 & \text{if error logs share request ID or specific fault signatures} \\ 0.5 & \text{if correlated error logs match time window} \\ 0.0 & \text{otherwise} \end{cases}$$

6. **Severity Alignment Score ($s_{\text{severity}}$):**
   $$s_{\text{severity}} = \begin{cases} 1.0 & \text{if both alerts are CRITICAL} \\ 0.7 & \text{if CRITICAL + HIGH} \\ 0.5 & \text{if both HIGH} \\ 0.2 & \text{otherwise} \end{cases}$$

---

## 3. Dynamic Missing-Data Graceful Weight Rebalancing

When telemetry pipelines experience degradation during disaster conditions, the engine dynamically recalibrates active weights so the total active weight remains normalized to $1.0$:

$$w_k^* = \frac{w_k \cdot \mathbb{I}(\text{source}_k \text{ available})}{\sum_{m} w_m \cdot \mathbb{I}(\text{source}_m \text{ available})}$$

Additionally, the incident's overall system confidence grade adapts:
* All 4 sources active: **HIGH (90–98%)**
* Logs missing: **MEDIUM-HIGH (80–89%)**
* Traces missing: **MEDIUM (70–79%)**
* Both logs & traces missing: **LOW-MEDIUM (55–65%)**

---

## 4. Probable Root-Cause Candidate Scoring

The system computes candidate root-cause scores for each service $v$ present in an incident cluster:

$$\text{RCS}(v) = 0.40 \cdot \text{EarliestEvent}(v) + 0.35 \cdot \text{TopologicalDepth}(v) + 0.15 \cdot \text{SeverityWeight}(v) + 0.10 \cdot \text{ErrorLogClarity}(v)$$

* **Earliest Event:** Service with the earliest timestamp in the timeline receives $1.0$, decaying exponentially for downstream services.
* **Topological Depth:** In a directed failure cascade $A \rightarrow B \rightarrow C$, upstream dependencies have higher depth scores ($1.0$ for root node).
* **Severity Weight:** Services exhibiting critical resource exhaustion (e.g. pool exhausted, disk stall) score higher than generic timeout metrics.

---

## 5. Provenance Model

Every grouped incident generates a provenance graph:
```
Incident (INC-001)
├── Correlation Metadata (timestamp, confidence, active weights)
├── Grouped Alerts [ALT-101, ALT-102, ALT-103, ALT-104, ALT-105, ALT-106, ALT-107, ALT-108]
├── Associated Traces [TRC-2001]
├── Associated Logs [LOG-101, LOG-102, LOG-103, LOG-104, LOG-105]
├── Active Topology Path [PostgreSQL -> Emergency Data Service -> API Gateway -> Web Frontend]
├── Timeline Anchors (T0: 10:02:11Z PostgreSQL saturation)
└── Candidate Root Causes Ranked with Evidence Notes
```
Every conclusion references the exact alert IDs, log lines, and trace IDs that justified it.
