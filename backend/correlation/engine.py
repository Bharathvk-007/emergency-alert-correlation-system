"""
Deterministic & Explainable Alert Correlation Engine (Milestone 2 - 70%).
Groups incoming alerts into incidents, evaluates probable root-cause candidates,
preserves provenance, and supports graceful degradation and delayed evidence reconciliation.
"""

from typing import Dict, Any, List, Set, Optional
from datetime import datetime
from .scoring import CorrelationScoring
from .topology import TopologyGraph
from .provenance import ProvenanceTracker


class CorrelationEngine:
    def __init__(
        self,
        scoring: Optional[CorrelationScoring] = None,
        affinity_threshold: float = 0.46,
    ):
        self.scoring = scoring or CorrelationScoring()
        self.topology = TopologyGraph()
        self.provenance_tracker = ProvenanceTracker()
        self.affinity_threshold = affinity_threshold

    def load_topology(self, topology_records: List[Dict[str, str]]):
        for rec in topology_records:
            self.topology.add_edge(
                source=rec["source_service"],
                target=rec["target_service"],
                dep_type=rec.get("dependency_type", "http"),
                criticality=rec.get("criticality", "high"),
            )

    def correlate(
        self,
        alerts: List[Dict[str, Any]],
        logs: List[Dict[str, Any]],
        traces: List[Dict[str, Any]],
        timeline_events: List[Dict[str, Any]],
        data_sources_available: Optional[Dict[str, bool]] = None,
        existing_incidents: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        sources_status = data_sources_available or {
            "alerts": True,
            "logs": True,
            "traces": True,
            "topology": True,
            "timeline": True,
        }

        active_logs = logs if sources_status.get("logs", True) else []
        active_traces = traces if sources_status.get("traces", True) else []
        active_timeline = timeline_events if sources_status.get("timeline", True) else []

        trace_to_services: Dict[str, Set[str]] = {}
        for trc in active_traces:
            tid = trc.get("trace_id")
            if tid:
                if tid not in trace_to_services:
                    trace_to_services[tid] = set()
                trace_to_services[tid].add(trc.get("service", ""))

        n = len(alerts)
        clusters: List[List[int]] = []
        visited = set()

        for i in range(n):
            if i in visited:
                continue
            current_cluster = [i]
            visited.add(i)

            for j in range(i + 1, n):
                if j in visited:
                    continue
                a1 = alerts[i]
                a2 = alerts[j]

                shared_trace = False
                for tid, s_set in trace_to_services.items():
                    if a1.get("service") in s_set and a2.get("service") in s_set:
                        shared_trace = True
                        break

                log_match = False
                if active_logs:
                    svc1 = a1.get("service")
                    svc2 = a2.get("service")
                    logs_s1 = any(l.get("service") == svc1 for l in active_logs)
                    logs_s2 = any(l.get("service") == svc2 for l in active_logs)
                    if logs_s1 and logs_s2:
                        log_match = True

                topo_dist = (
                    self.topology.shortest_distance(a1.get("service", ""), a2.get("service", ""))
                    if sources_status.get("topology", True)
                    else 999
                )

                affinity = self.scoring.compute_pairwise_affinity(
                    a1, a2, topo_dist, shared_trace, log_match, sources_status
                )

                if affinity["total_score"] >= self.affinity_threshold:
                    current_cluster.append(j)
                    visited.add(j)

            clusters.append(current_cluster)

        incidents: List[Dict[str, Any]] = []
        inc_counter = 1
        past_incidents = existing_incidents or []

        for cluster_indices in clusters:
            cluster_alerts = [alerts[idx] for idx in cluster_indices]
            if len(cluster_alerts) == 1 and cluster_alerts[0].get("severity") in ("LOW", "INFO"):
                continue

            services = sorted(list(set(a.get("service", "") for a in cluster_alerts)))
            primary_org = cluster_alerts[0].get("organization_id", "ORG-A")

            # Check existing match for delayed evidence reconciliation
            existing_match = None
            for old_inc in past_incidents:
                if any(s in old_inc.get("services", []) for s in services):
                    existing_match = old_inc
                    break

            inc_id = existing_match["incident_id"] if existing_match else f"INC-{inc_counter:03d}"
            if not existing_match:
                inc_counter += 1

            symptoms = []
            contributing = []
            for a in cluster_alerts:
                msg = f"{a.get('service')}: {a.get('message')}"
                if a.get("alert_type") in ("RESOURCE_EXHAUSTION", "STATE_CHANGE") or str(a.get("is_root_cause_indicator", "")).lower() == "true":
                    contributing.append(msg)
                else:
                    symptoms.append(msg)

            linked_traces = sorted(list(set(
                trc.get("trace_id") for trc in active_traces if trc.get("service") in services
            )))
            linked_logs = sorted(list(set(
                log.get("log_id") for log in active_logs if log.get("service") in services
            )))

            candidates = self._evaluate_root_cause_candidates(
                services, cluster_alerts, active_logs, active_traces, active_timeline
            )

            confidence, conf_label = self._determine_confidence(sources_status, cluster_alerts)
            lead_candidate = candidates[0]["candidate"] if candidates else (services[0] if services else "Unknown")

            explanation = self._build_explanation(
                inc_id, cluster_alerts, lead_candidate, sources_status, services, existing_match is not None
            )

            blast_radius = self.topology.get_downstream_blast_radius(lead_candidate)
            reverse_path = self.topology.get_reverse_upstream_path(services[-1], lead_candidate) if services else [lead_candidate]

            # Detailed evidence anchors
            detailed_evidence = []
            for a in cluster_alerts:
                detailed_evidence.append({
                    "id": a.get("alert_id"),
                    "type": "ALERT",
                    "source": a.get("source"),
                    "timestamp": a.get("timestamp"),
                    "service": a.get("service"),
                    "organization": a.get("organization_id"),
                    "description": a.get("message"),
                    "correlation_reason": f"Emitted {a.get('severity')} alarm on metric {a.get('metric')}",
                    "weight_contribution": 0.35 if a.get("severity") == "CRITICAL" else 0.20,
                })

            provenance = self.provenance_tracker.create_provenance(
                incident_id=inc_id,
                organization_id=primary_org,
                alert_ids=[a.get("alert_id") for a in cluster_alerts],
                trace_ids=linked_traces,
                log_ids=linked_logs,
                topology_edges=[
                    e for e in self.topology.edges
                    if e["source"] in services and e["target"] in services
                ],
                timeline_events=[
                    evt for evt in active_timeline if evt.get("service") in services
                ],
                correlation_reasons=[
                    f"Temporal cluster span: {cluster_alerts[0].get('timestamp')} - {cluster_alerts[-1].get('timestamp')}",
                    f"Topological adjacency between: {', '.join(services)}",
                    f"Active evidence sources: {[k for k, v in sources_status.items() if v]}"
                ],
                root_cause_candidates=candidates,
                scores={
                    "confidence_score": confidence,
                    "confidence_label": conf_label,
                    "active_weights": self.scoring.__dict__,
                },
                timestamps={
                    "created_at": existing_match["created_at"] if existing_match else datetime.utcnow().isoformat() + "Z",
                    "earliest_alert": cluster_alerts[0].get("timestamp"),
                    "latest_alert": cluster_alerts[-1].get("timestamp"),
                    "last_reconciled_at": datetime.utcnow().isoformat() + "Z" if existing_match else None,
                },
                data_sources_used=sources_status,
            )

            severities = [a.get("severity") for a in cluster_alerts]
            inc_severity = "CRITICAL" if "CRITICAL" in severities else ("HIGH" if "HIGH" in severities else "MEDIUM")

            lifecycle_history = existing_match.get("lifecycle_history", []) if existing_match else [
                {
                    "timestamp": cluster_alerts[0].get("timestamp"),
                    "from_status": "NEW",
                    "to_status": "CORRELATED",
                    "actor": "CorrelationEngine",
                    "actor_role": "ADMIN",
                    "note": f"Clustered {len(cluster_alerts)} alerts",
                }
            ]

            incidents.append({
                "incident_id": inc_id,
                "title": f"{lead_candidate} degradation impacting {len(services)} services",
                "severity": inc_severity,
                "status": existing_match.get("status", "CORRELATED") if existing_match else "CORRELATED",
                "organization_id": primary_org,
                "services": services,
                "alert_count": len(cluster_alerts),
                "alerts": cluster_alerts,
                "symptoms": symptoms,
                "contributing_failures": contributing,
                "probable_root_cause": existing_match.get("human_confirmed_root_cause") if existing_match and existing_match.get("human_confirmed_root_cause") else lead_candidate,
                "probable_root_cause_candidates": candidates,
                "confidence_score": confidence,
                "confidence_label": conf_label,
                "correlation_explanation": explanation,
                "linked_traces": linked_traces,
                "linked_logs": linked_logs,
                "data_sources_status": sources_status,
                "provenance": provenance,
                "assigned_to": existing_match.get("assigned_to", "Unassigned (SRE Pool)") if existing_match else "Unassigned (SRE Pool)",
                "incident_commander": existing_match.get("incident_commander", "Alex Rivera") if existing_match else "Alex Rivera",
                "created_at": existing_match.get("created_at", cluster_alerts[0].get("timestamp")) if existing_match else cluster_alerts[0].get("timestamp"),
                "updated_at": datetime.utcnow().isoformat() + "Z",
                "lifecycle_history": lifecycle_history,
                "blast_radius_path": blast_radius,
                "reverse_symptom_path": reverse_path,
                "shared_with": existing_match.get("shared_with", []) if existing_match else [],
            })

        return incidents

    def _evaluate_root_cause_candidates(
        self,
        services: List[str],
        alerts: List[Dict[str, Any]],
        logs: List[Dict[str, Any]],
        traces: List[Dict[str, Any]],
        timeline: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        if not services or not alerts:
            return []

        alert_times = [self.scoring.parse_time(a["timestamp"]) for a in alerts]
        cluster_start = min(alert_times) - 60.0
        cluster_end = max(alert_times) + 60.0

        cluster_logs = [
            l for l in logs
            if l.get("service") in services
            and cluster_start <= self.scoring.parse_time(l["timestamp"]) <= cluster_end
        ]
        cluster_timeline = [
            evt for evt in timeline
            if evt.get("service") in services
            and cluster_start <= self.scoring.parse_time(evt["timestamp"]) <= cluster_end
        ]

        earliest_per_service: Dict[str, float] = {}
        for s in services:
            earliest_per_service[s] = 9999999999.0

        for a in alerts:
            s = a.get("service")
            if s in earliest_per_service:
                ts = self.scoring.parse_time(a["timestamp"])
                if ts < earliest_per_service[s]:
                    earliest_per_service[s] = ts

        for evt in cluster_timeline:
            s = evt.get("service")
            if s in earliest_per_service:
                ts = self.scoring.parse_time(evt["timestamp"])
                if ts < earliest_per_service[s]:
                    earliest_per_service[s] = ts

        min_time = min(earliest_per_service.values())

        candidates = []
        for s in services:
            delta = max(0.0, earliest_per_service[s] - min_time)
            time_score = max(0.1, 1.0 - (delta / 45.0))
            is_earliest_in_cluster = (delta == 0.0)
            origin_score = 0.95 if is_earliest_in_cluster else 0.40

            has_root_indicator = any(
                a.get("service") == s and (
                    str(a.get("is_root_cause_indicator", "")).lower() == "true"
                    or a.get("alert_type") in ("RESOURCE_EXHAUSTION", "STATE_CHANGE")
                )
                for a in alerts
            )
            resource_score = 1.0 if has_root_indicator else 0.4

            has_fatal_log = any(
                l.get("service") == s and l.get("level") in ("FATAL", "ERROR")
                for l in cluster_logs
            )
            log_evidence_score = 1.0 if has_fatal_log else 0.4

            total_rc_score = (
                0.40 * time_score
                + 0.35 * origin_score
                + 0.15 * resource_score
                + 0.10 * log_evidence_score
            )

            supporting_alerts = [a.get("alert_id") for a in alerts if a.get("service") == s]
            supporting_logs = [l.get("log_id") for l in cluster_logs if l.get("service") == s]
            supporting_traces = [t.get("trace_id") for t in traces if t.get("service") == s]

            downstream = self.topology.get_downstream_blast_radius(s)
            dep_path = self.topology.find_path(s, services[-1])

            evidence_notes = []
            if delta == 0:
                evidence_notes.append("First observed anomaly timestamp in incident cluster (T0)")
            else:
                evidence_notes.append(f"Anomaly observed +{int(delta)}s after initial cluster trigger")

            if has_root_indicator:
                evidence_notes.append("Triggered critical root-cause indicator / RESOURCE_EXHAUSTION alarm")
            if has_fatal_log:
                evidence_notes.append("Associated FATAL/ERROR log lines detected in cluster window")
            evidence_notes.append(f"Impacts {len(downstream)} downstream consumer services")

            classification = "SYMPTOM"
            if total_rc_score >= 0.85 or is_earliest_in_cluster:
                classification = "PROBABLE_ROOT_CAUSE"
            elif total_rc_score >= 0.55 or has_root_indicator or has_fatal_log:
                classification = "CONTRIBUTING_FAILURE"

            conf_label = (
                "HIGH CONFIDENCE CANDIDATE"
                if total_rc_score >= 0.8
                else ("MEDIUM CONFIDENCE CANDIDATE" if total_rc_score >= 0.5 else "LOW CONFIDENCE CANDIDATE")
            )

            candidates.append({
                "candidate": s,
                "score": round(total_rc_score, 3),
                "confidence_level": "HIGH" if total_rc_score >= 0.8 else ("MEDIUM" if total_rc_score >= 0.5 else "LOW"),
                "confidence_label": conf_label,
                "classification": classification,
                "evidence_notes": evidence_notes,
                "evidence_count": len(supporting_alerts) + len(supporting_logs) + len(supporting_traces),
                "time_delta_sec": int(delta),
                "downstream_affected_count": len(downstream),
                "downstream_services": downstream,
                "dependency_path": dep_path,
                "supporting_alerts": supporting_alerts,
                "supporting_logs": supporting_logs,
                "supporting_traces": supporting_traces,
            })

        candidates.sort(key=lambda x: x["score"], reverse=True)
        return candidates

    def _determine_confidence(
        self, sources: Dict[str, bool], alerts: List[Dict[str, Any]]
    ) -> (float, str):
        active_count = sum(1 for k, v in sources.items() if v)
        base = 0.50 + (active_count * 0.10)
        if len(alerts) >= 3:
            base += 0.05
        base = min(0.98, base)
        if base >= 0.88:
            label = "HIGH"
        elif base >= 0.70:
            label = "MEDIUM"
        else:
            label = "LOW"
        return round(base, 2), label

    def _build_explanation(
        self,
        inc_id: str,
        alerts: List[Dict[str, Any]],
        root_cause: str,
        sources: Dict[str, bool],
        services: List[str],
        is_reconciled: bool = False,
    ) -> str:
        sources_str = ", ".join([k for k, v in sources.items() if v])
        missing = [k for k, v in sources.items() if not v]
        missing_note = f" (Warning: {', '.join(missing)} offline/delayed)" if missing else ""
        rec_note = " [Reconciled delayed telemetry]" if is_reconciled else ""

        return (
            f"Incident {inc_id} was grouped from {len(alerts)} alerts across {len(services)} services "
            f"({', '.join(services)}) based on temporal proximity and topological dependency paths. "
            f"Evidence sources: {sources_str}{missing_note}.{rec_note} "
            f"'{root_cause}' is evaluated as the leading candidate root cause because initiating "
            f"alarms preceded downstream symptom propagation."
        )
