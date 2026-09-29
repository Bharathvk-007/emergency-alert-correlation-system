# 3-Minute Demonstration Script: Emergency Alert Correlation System (70% Milestone)

## Scenario Overview
A major regional hurricane causes severe load on the public emergency information website. Primary database connection pools exhaust, cascading downstream to API Gateway 504s, public portal render timeouts, and delayed citizen SMS alerts.

---

## Minute 1: The Outage & Near-Real-Time Stream Ingestion
1. **Reset & Start Stream:**
   * Open the dashboard.
   * In the top bar, click **"Reset"** then **"Start Stream"** (Speed: 2x).
   * Observe incoming alarms appearing in the chronograph:
     * `10:02:11` - PostgreSQL Database connection pool exhaustion (`ALT-101`)
     * `10:02:22` - Emergency Data Service query timeout (`ALT-103`)
     * `10:02:29` - API Gateway HTTP 5xx spike (`ALT-105`)
     * `10:02:40` - Web Frontend gateway timeout 504 errors (`ALT-108`)
2. **Alert Reduction Proof:**
   * Point out the **Alert Noise Reduction gauge (85.0%)**: 20 raw telemetry alarms are consolidated into 3 cohesive disaster incidents.

---

## Minute 2: Root-Cause Isolation, Blast Radius & Provenance
1. **Open Incident INC-001:**
   * Click **"Details"** on `INC-001`.
   * **Root Cause vs Symptom Distinction:** Show Section 2:
     * `PostgreSQL Database` is classified as **PROBABLE_ROOT_CAUSE** (Score: 1.0, Confidence: HIGH).
     * `Emergency Data Service` is classified as **CONTRIBUTING_FAILURE** (Score: 0.77).
     * `Web Frontend` is classified as **DOWNSTREAM_SYMPTOM** (Score: 0.57).
   * **Downstream Blast Radius:** Show the forward path: `PostgreSQL -> Emergency Data Service -> API Gateway -> Web Frontend`.
   * **Reverse Upstream Path:** Show the reverse diagnostic trail from symptom back to root origin.
2. **Inspect Provenance Graph:**
   * Click the **"Provenance"** tab.
   * Click on evidence anchor `ALT-101` and `LOG-101` to show the explicit correlation rationale and weight contributions.

---

## Minute 3: Missing Telemetry, In-Place Reconciliation & Audit Export
1. **Simulate Pipeline Dropout:**
   * In the top bar, click **"Traces"** to simulate a collector sampling outage.
   * Show that the incident remains intact, active weights rebalance dynamically, and system confidence adjusts gracefully to `MEDIUM`.
2. **Delayed Evidence In-Place Reconciliation:**
   * Switch to the **"Edge Cases"** tab and run **"Test 7"**.
   * Demonstrate that arriving delayed evidence updates `INC-001` in-place rather than creating duplicate, fragmented tickets.
3. **Human-in-the-Loop Confirmation & Status:**
   * In the **"Human-in-the-Loop"** tab, confirm the root cause as `PostgreSQL Database` and set status to `ROOT_CAUSE_CANDIDATE`.
4. **Privacy-Aware Sharing & Audit Export:**
   * Click **"Share with Partner"** and show that external partners receive incident summaries while internal database query logs are masked.
   * Click **"Audit Report"** and export the audit-ready JSON/CSV/HTML report strictly separating **Observed Evidence** from **System Inferences**.
