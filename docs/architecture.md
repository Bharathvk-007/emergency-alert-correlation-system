# Architecture & Technical Design (Milestone 2 - 70%)

## 1. System Overview & Technology Stack

The Emergency Alert Correlation System operates as an explainable, deterministic intelligence layer for mission-critical public safety platforms.

* **Backend Engine:** Python 3.10+ / FastAPI (REST endpoints, correlation engine, evaluation suite, test runners) with mirrored TypeScript engine in the frontend client.
* **Frontend Web Application:** React 19 + TypeScript + Tailwind CSS + Lucide Icons.
* **Streaming Engine:** Virtual clock event streamer with 1x, 2x, 5x speed playback and noise injection.
* **Resilience Layer:** Dynamic weight rebalancing and in-place delayed evidence reconciliation.
* **Data Layer:** Normalized CSV/JSON schemas for alerts, logs, distributed traces, topology edges, and ground-truth incident timelines.

---

## 2. Updated Correlation Algorithm & Mathematical Formulation

Pairwise affinity between alarms $a_i$ and $a_j$:

$$S(a_i, a_j) = \sum_{k \in \mathcal{K}} w_k^* \cdot s_k(a_i, a_j)$$

where:
$$\mathcal{K} = \{\text{time}, \text{service}, \text{topology}, \text{trace}, \text{log}, \text{metric}, \text{host}, \text{severity}\}$$

### Feature Weights:
* $w_{\text{time}} = 0.22$
* $w_{\text{service}} = 0.18$
* $w_{\text{topology}} = 0.18$
* $w_{\text{trace}} = 0.14$
* $w_{\text{log}} = 0.10$
* $w_{\text{metric}} = 0.08$
* $w_{\text{host}} = 0.05$
* $w_{\text{severity}} = 0.05$

---

## 3. Dynamic Weight Rebalancing & Delayed Reconciliation

When telemetry pipelines experience degradation during disaster traffic:

$$w_k^* = \frac{w_k \cdot \mathbb{I}(\text{source}_k \text{ available})}{\sum_{m} w_m \cdot \mathbb{I}(\text{source}_m \text{ available})}$$

When delayed evidence arrives later:
* Existing incident dossier is matched by service overlap.
* Evidence anchors are appended in-place without generating a duplicate incident ID.
* Confidence and root cause scores are recalculated with an immutable audit entry.

---

## 4. Probable Root-Cause Candidate Scoring (RCS)

$$\text{RCS}(v) = 0.40 \cdot \text{EarliestEvent}(v) + 0.35 \cdot \text{OriginDepth}(v) + 0.15 \cdot \text{ResourceAlarm}(v) + 0.10 \cdot \text{FatalLog}(v)$$

* **PROBABLE_ROOT_CAUSE:** $\text{RCS} \ge 0.85$
* **CONTRIBUTING_FAILURE:** $0.55 \le \text{RCS} < 0.85$
* **SYMPTOM:** $\text{RCS} < 0.55$

---

## 5. Provenance & Blast Radius Model

Every incident generates an immutable evidence tree:
```
INC-001 (PostgreSQL Database Outage)
├── Blast Radius Path: PostgreSQL -> Emergency Data Service -> API Gateway -> Web Frontend
├── Reverse Diagnostic Path: Web Frontend -> API Gateway -> EDS -> PostgreSQL
├── Detailed Evidence Anchors:
│   ├── ALT-101 (Prometheus: max_connections saturated) [Weight: 35%]
│   ├── LOG-101 (PostgreSQL: remaining connection slots reserved) [Weight: 15%]
│   ├── TRC-2001 (Trace: 5800ms SSR timeout span) [Weight: 18%]
│   └── TOPOLOGY: EDS -> PostgreSQL [Weight: 18%]
└── Human Confirmation Verdict (Confirmed by SRE Lead)
```
