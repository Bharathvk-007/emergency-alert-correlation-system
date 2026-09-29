# Problem Analysis: Emergency Alert Correlation System

## 1. Problem Statement
During regional natural disasters, severe weather emergencies, or civil crises, public emergency-information portals experience traffic spikes orders of magnitude above baseline. Simultaneously, physical infrastructure degradation or unexpected load surges trigger cascading failures across distributed microservices, databases, edge CDNs, and telemetry pipelines. 

Modern observability systems (Prometheus, Datadog, CloudWatch, Envoy, Kafka) broadcast hundreds of raw alerts per minute during an unfolding outage. SREs, on-call engineers, and Incident Commanders are inundated with a blizzard of symptomatic notifications (e.g., HTTP 504 timeouts, client render failures, latency SLA breaches). Without an automated, explainable correlation system, responders spend critical minutes manually reconciling alarms across disparate consoles to determine the underlying failure origin.

---

## 2. Current Operational Pain & Stakeholder Impact
* **Who Experiences the Pain:**
  * **Platform & SRE Engineers:** Face cognitive overload, context-switching between 4+ dashboards (APM, database, CDN, network), trying to isolate which service failed first.
  * **Incident Commanders (IC):** Cannot quickly establish the scope of public impact or formulate accurate public communication briefings because root causes are obscured by downstream noise.
  * **Partner Organizations & Infrastructure Providers (CDN, Cloud, Telco):** Blamed for downstream symptoms when the true failure is internal, or vice versa, due to lack of shared dependency provenance.
  * **Citizens / Evacuees:** Face degraded or unreachable evacuation zone lookups, delayed SMS emergency broadcasts, and inconsistent advisories during life-safety moments.

* **Why Alert Noise Is Fatal During Disasters:**
  * Alert fatigue causes engineers to miss primary trigger alarms amidst secondary symptomatic noise.
  * Duplicate or cascading alerts trigger duplicate paging, fragmenting response teams across symptoms rather than uniting them on the root cause.
  * Mean Time to Identify (MTTI) and Mean Time to Mitigate (MTTM) inflate exponentially.

---

## 3. Symptom Alerts vs. Root-Cause Indicators

| Category | Definition | Concrete System Examples |
| :--- | :--- | :--- |
| **Symptom Alerts** | Observable downstream degradations, user-facing failures, or secondary performance threshold breaches caused by an upstream defect. | • API Gateway HTTP 5xx spike<br>• Web Frontend p95 render latency degraded<br>• Synthetics check 504 Gateway Timeout<br>• Notification Service dispatch buffer near capacity |
| **Probable Root-Cause Candidates** | Originating defects, resource exhaustions, hardware/network stalls, or misconfigurations that initiated the failure chain. | • PostgreSQL connection pool exhausted (max connections reached)<br>• Message Queue broker partition write stall<br>• CDN origin shield invalidation storm & route drop<br>• Physical storage I/O lock saturation |

> **Epistemological Principle:** Distributed systems monitoring exhibits partial observability. The system must never claim root causes with absolute certainty unless verifiable deterministic proof exists. The system uniformly reports:
> - `probable root cause`
> - `candidate root cause`
> - `correlated evidence`

---

## 4. Multi-Source Correlation & Resilience to Missing/Delayed Data

### Why Single-Source Telemetry Fails
1. **Alerts alone** lack execution context and distributed dependency paths.
2. **Logs alone** are high volume and can be delayed by minutes during buffer congestion.
3. **Traces alone** only capture sampled synchronous request paths, omitting asynchronous broker stalls or host hardware failures.
4. **Topology alone** shows theoretical static links, not dynamic temporal fault cascades.

### Why Missing / Delayed Data Must Be Supported
In disaster conditions, logging agents often drop packets, distributed tracing collectors experience sampling throttling, or partner network metrics arrive with 5–15 minute delays. A brittle correlation engine that depends on all 4 signals being 100% available will fail precisely when the outage is most severe. 

The system implements **graceful confidence degradation**:
* **Alerts + Traces + Topology** (Logs delayed/absent) $\rightarrow$ Confidence: `MEDIUM-HIGH`
* **Alerts + Logs + Topology** (Traces absent) $\rightarrow$ Confidence: `MEDIUM`
* **Alerts + Temporal proximity only** (Topology & Traces absent) $\rightarrow$ Confidence: `LOW-MEDIUM`

---

## 5. Objectives & Requirements

### Project Objectives (35% Milestone)
1. Establish a deterministic, explainable correlation engine that reduces raw alert volume by $\ge 30\%$ while detecting $\ge 95\%$ of synthetic disaster incidents.
2. Provide provenance graphs linking symptoms to candidate root causes.
3. Support multi-organization visibility (Emergency Website Ops, Cloud Provider, Comm Provider).
4. Prove resilience across 3+ defined edge failure cases (delayed logs, absent traces, simultaneous multi-incident noise).

### Functional Requirements
* **FR-1:** Ingest structured alerts, logs, distributed traces, and topology graphs.
* **FR-2:** Group alerts into discrete `Incident` objects using configurable weighted scoring (Temporal, Service, Topology, Trace, Log, Severity).
* **FR-3:** Rank probable root-cause candidates with explainable confidence scores based on earliest event timeline and upstream topological distance.
* **FR-4:** Maintain an immutable provenance record for every grouped alert.
* **FR-5:** Enforce Role-Based Access Control (RBAC) and Multi-Tenant filtering.
* **FR-6:** Export an audit-ready incident explanation differentiating observed facts from system inferences.

### Non-Functional Requirements
* **NFR-1 (Explainability):** Zero black-box outputs; every correlation decision must have inspectable formula weights and evidence pointers.
* **NFR-2 (Determinism):** Identical telemetry inputs must produce identical correlation groupings.
* **NFR-3 (Performance):** Correlation processing latency $< 500\text{ms}$ for bursts of 1,000 alerts.
* **NFR-4 (Degradability):** The engine must never crash or output empty incidents if 1–2 data sources are offline.

---

## 6. Success Metrics & Targets

| Metric | Baseline (Uncorrelated) | 35% Prototype Target | Measurement Formula |
| :--- | :--- | :--- | :--- |
| **Raw Alert Volume** | $N$ total alerts | $N$ total alerts | Total raw alarms emitted |
| **Incident Count** | $N$ (or trivial 1-per-service) | Clustered incidents | Number of grouped incidents |
| **Alert Reduction %** | $0\%$ | $\ge 50\%$ | $\frac{\text{Raw Alerts} - \text{Incident Count}}{\text{Raw Alerts}} \times 100$ |
| **Incident Detection Rate** | $\approx 60\%$ (fragmented) | $\ge 95\%$ | $\frac{\text{True Incidents Detected}}{\text{Known Ground Truth Incidents}}$ |
| **False Positive Rate** | High ($> 40\%$ noise) | $\le 10\%$ | $\frac{\text{Noise alerts grouped into incidents}}{\text{Total noise alerts}}$ |
| **Root-Cause Precision** | $0\%$ (manual guessing) | $\ge 85\%$ | $\frac{\text{Top candidate matches true root cause}}{\text{Total evaluated incidents}}$ |

---

## 7. Assumptions, Risks & Limitations

### Assumptions
* Services report UTC-synchronized timestamps via NTP.
* Service identifiers in alerts and traces follow standard naming conventions.
* An initial static or service-mesh derived topology map is available.

### Risks & Limitations
* **Cascading Clock Drift:** Minor drift ($< 2\text{s}$) is tolerated by the configurable temporal window, but severe drift ($> 60\text{s}$) degrades causal timeline ordering.
* **Cold-Start Services:** Ephemeral lambdas or newly deployed microservices absent from the static topology map fall back to trace and temporal correlation.
* **Milestone Scope:** The 35% milestone focuses on deterministic heuristics and explainable scoring before introducing graph neural networks or semantic vector embeddings in the subsequent 65%.
