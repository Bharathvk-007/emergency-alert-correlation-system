# Multi-Organization & Permission-Aware Governance (70% Milestone)

## 1. Tenant Organizations

* **ORG-A: Emergency Website Operations**
  * Core portal operator. Manages `Web Frontend`, `API Gateway`, `Emergency Data Service`, `PostgreSQL Database`, `Redis Cache`, `Alert Service`, and `Notification Service`.
* **ORG-B: Cloud Infrastructure Provider**
  * Cloud compute and private networking. Manages `Load Balancer` and `API Gateway`.
* **ORG-C: CDN & Network Partner**
  * Edge distribution and origin shielding. Manages `CDN` and ingress `Load Balancer`.
* **ORG-D: External Communication Provider**
  * Emergency telecommunications. Manages `Message Queue`, `External SMS Provider`, and `External Email Provider`.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Permission Feature | ADMIN | SRE_ENGINEER | INCIDENT_COMMANDER | PARTNER_ENGINEER | VIEWER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Tenant Incidents** | Full | Full | Full | Perimeter Only | Read-only |
| **Inspect Raw Database Logs** | ✓ | ✓ | Redacted | ✗ (Masked) | ✗ (Masked) |
| **Inspect Distributed Traces** | ✓ | ✓ | ✓ | Perimeter Only | ✗ (Masked) |
| **Change Lifecycle State** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Confirm Root Cause** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Assign Incident Lead** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Share Incident Slice** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Export Audit Report** | Full | Full | Full | Sanitized | Sanitized |

---

## 3. Privacy-Aware Sharing Workflow

When collaborating with external partners during a cascading outage:
1. Authorized responders click **"Share with Partner"**.
2. Select target organization (`ORG-B`, `ORG-C`, or `ORG-D`).
3. Evidence is cryptographically scoped:
   * **Shared:** High-level incident summary, blast radius path, and shared boundary telemetry alerts.
   * **Masked:** Private internal application logs, database connection strings, and internal hostnames.
4. An immutable audit record is appended to the incident history.
