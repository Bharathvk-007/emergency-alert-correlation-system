# Advanced Correlation Method (70% Milestone)

## 1. Multi-Evidence Dimension Formulation

Pairwise affinity between alarms $a_i$ and $a_j$ is evaluated across 8 telemetry dimensions:

$$S(a_i, a_j) = \sum_{k \in \mathcal{K}} w_k^* \cdot s_k(a_i, a_j)$$

where:
$$\mathcal{K} = \{\text{time}, \text{service}, \text{topology}, \text{trace}, \text{log}, \text{metric}, \text{host}, \text{severity}\}$$

### Configurable Weights ($\sum w_k = 1.0$):
* $w_{\text{time}} = 0.22$
* $w_{\text{service}} = 0.18$
* $w_{\text{topology}} = 0.18$
* $w_{\text{trace}} = 0.14$
* $w_{\text{log}} = 0.10$
* $w_{\text{metric}} = 0.08$
* $w_{\text{host}} = 0.05$
* $w_{\text{severity}} = 0.05$

---

## 2. Sub-Score Metrics

1. **Temporal Proximity ($s_{\text{time}}$):**
   $$s_{\text{time}} = \max\left(0, 1 - \frac{|\Delta t|}{180\text{s}}\right)$$
2. **Topology Hop Distance ($s_{\text{topology}}$):**
   * $0\text{ hops} \rightarrow 1.0$
   * $1\text{ hop (direct)} \rightarrow 0.88$
   * $2\text{ hops} \rightarrow 0.55$
   * $\ge 3\text{ hops} \rightarrow 0.0$ (Hard isolation prevents cross-domain false merging)
3. **Metric Synergy ($s_{\text{metric}}$):**
   * Matching alert type $\rightarrow 1.0$
   * `RESOURCE_EXHAUSTION` $\leftrightarrow$ `LATENCY`/`ERROR_RATE` $\rightarrow 0.85$
   * `LATENCY` $\leftrightarrow$ `ERROR_RATE` $\rightarrow 0.70$
4. **Host/Resource Locality ($s_{\text{host}}$):**
   * Identical host $\rightarrow 1.0$
   * Shared cluster prefix $\rightarrow 0.65$

---

## 3. Explainable Pairwise Reasoning

Every pair clustered produces an inspectable human-readable justification:
```
ALERT-102 + ALERT-108
Correlation Evidence:
• 87s temporal clustering window
• 2-hop downstream topology path (PostgreSQL -> Web Frontend)
• Shared distributed trace propagation (TRC-2001)
• Matching error log failure signatures
• Causal metric synergy (LATENCY <-> ERROR_RATE)
Correlation Score: 0.91
```

---

## 4. 3-Tier Root-Cause Ranking

Candidates are scored and classified into three tiers:
1. **PROBABLE_ROOT_CAUSE:** Earliest $T_0$ anomaly, initiating resource alarm, or origin node in directed path ($\text{RCS} \ge 0.85$).
2. **CONTRIBUTING_FAILURE:** Intermediate hop in cascade that amplified failure or saturated buffers ($0.55 \le \text{RCS} < 0.85$).
3. **SYMPTOM:** Downstream reverse proxy timeout, HTTP 504, or client render failure ($\text{RCS} < 0.55$).
