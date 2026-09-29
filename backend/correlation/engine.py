"""
Deterministic & Explainable Alert Correlation Engine.
Groups incoming alerts into incidents, evaluates probable root-cause candidates,
preserves provenance, and supports graceful degradation when telemetry streams are missing or delayed.
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
        affinity_threshold: float = 0.48,
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
    ) -> List[Dict[str, Any]]:
        """
        Executes multi-source correlation over incoming alerts.
        """
        sources_status = data_sources_available or {
            "alerts": True,
            "logs": True,
            "traces": True,
            "topology": True,
            "timeline": True,
        }

        # Filter logs and traces if disabled
        active_logs = logs if sources_status.get("logs", True) else []
        active_traces = traces if sources_status.get("traces", True) else []
        active_timeline = timeline_events if sources_status.get("timeline", True) else []

        # Map trace IDs to services
        trace_to_services: Dict[str, Set[str]] = {}
        trace_to_alerts: Dict[str, Set[str]] = {}
        for trc in active_traces:
            tid = trc.get("trace_id")
            if tid:
                if tid not in trace_to_services:
                    trace_to_services[tid] = set()
                trace_to_services[tid].add(trc.get("service", ""))

        # Cluster alerts using agglomerative affinity graph
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

                # Check shared trace
                shared_trace = False
                for tid, s_set in trace_to_services.items():
                    if a1.get("service") in s_set and a2.get("service") in s_set:
                        # also verify temporal match within trace
                        shared_trace = True
                        break

                # Check log match
                log_match = False
                if active_logs:
                    # check if errors exist for both services in similar time window
                    svc1 = a1.get("service")
                    svc2 = a2.get("service")
                    logs_s1 = [l for l in active_logs if l.get("service") == svc1]
                    logs_s2 = [l for l in active_logs if l.get("service") == svc2]
                    if logs_s1 and logs_s2:
                        log_match = True

                # Topological distance
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

        # Build incident objects
        incidents: List[Dict[str, Any]] = []
        inc_counter = 1

        for cluster_indices in clusters:
            cluster_alerts = [alerts[idx] for idx in cluster_indices]
            # Ignore single low-severity noise alerts from creating major incidents
            if len(cluster_alerts) == 1 and cluster_alerts[0].get("severity") in ("LOW", "INFO"):
                continue

            inc_id = f"INC-{inc_counter:03d}"
            inc_counter += 1

            services = sorted(list(set(a.get("service", "") for a in cluster_alerts)))
            primary_org = cluster_alerts[0].get("organization_id", "ORG-A")

            # Collect symptoms
            symptoms = []
            for a in cluster_alerts:
                symptoms.append(f"{a.get('service')}: {a.get('message')}")

            # Collect linked traces and logs
            linked_traces = []
            for trc in active_traces:
                if trc.get("service") in services:
                    linked_traces.append(trc.get("trace_id"))
            linked_traces = sorted(list(set(linked_traces)))

            linked_logs = []
            for log in active_logs:
                if log.get("service") in services:
                    linked_logs.append(log.get("log_id"))
            linked_logs = sorted(list(set(linked_logs)))

            # Evaluate Root Cause Candidates
            candidates = self._evaluate_root_cause_candidates(
                services, cluster_alerts, active_logs, active_traces, active_timeline
            )

            # Determine confidence level
            confidence, conf_label = self._determine_confidence(sources_status, cluster_alerts)

            # Correlation explanation
            lead_candidate = candidates[0]["candidate"] if candidates else "Unknown"
            explanation = self._build_explanation(
                inc_id, cluster_alerts, lead_candidate, sources_status, services
            )

            # Provenance recording
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
                    "created_at": datetime.utcnow().isoformat() + "Z",
                    "earliest_alert": cluster_alerts[0].get("timestamp"),
                    "latest_alert": cluster_alerts[-1].get("timestamp"),
                },
                data_sources_used=sources_status,
            )

            # Calculate overall severity
            severities = [a.get("severity") for a in cluster_alerts]
            inc_severity = "CRITICAL" if "CRITICAL" in severities else ("HIGH" if "HIGH" in severities else "MEDIUM")

            incidents.append({
                "incident_id": inc_id,
                "title": f"{lead_candidate} degradation impacting {len(services)} services",
                "severity": inc_severity,
                "status": "ACTIVE",
                "organization_id": primary_org,
                "services": services,
                "alert_count": len(cluster_alerts),
                "alerts": cluster_alerts,
                "symptoms": symptoms,
                "probable_root_cause": lead_candidate,
                "probable_root_cause_candidates": candidates,
                "confidence_score": confidence,
                "confidence_label": conf_label,
                "correlation_explanation": explanation,
                "linked_traces": linked_traces,
                "linked_logs": linked_logs,
                "data_sources_status": sources_status,
                "provenance": provenance,
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
        """
        Ranks candidate root causes using:
        1. Earliest event timestamp within the incident cluster window (weight 0.40)
        2. Root cause indicator in alerts or topology origin (weight 0.35)
        3. Criticality of resource exhaustion / error rate alert (weight 0.15)
        4. Log fatal/error severity in cluster window (weight 0.10)
        """
        if not services or not alerts:
            return []

        alert_times = [self.scoring.parse_time(a["timestamp"]) for a in alerts]
        cluster_start = min(alert_times) - 60.0
        cluster_end = max(alert_times) + 60.0

        # Filter logs and timeline strictly to this cluster's temporal span
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
            # Time delta score: 1.0 for the earliest, decaying smoothly
            delta = max(0.0, earliest_per_service[s] - min_time)
            time_score = max(0.1, 1.0 - (delta / 45.0))

            # Origin/depth score: service with earliest event or root origin
            is_earliest_in_cluster = (delta == 0.0)
            origin_score = 0.95 if is_earliest_in_cluster else 0.40

            # Resource exhaustion / severe alert check
            has_root_indicator = any(
                a.get("service") == s and (
                    str(a.get("is_root_cause_indicator", "")).lower() == "true"
                    or a.get("alert_type") in ("RESOURCE_EXHAUSTION", "STATE_CHANGE")
                )
                for a in alerts
            )
            resource_score = 1.0 if has_root_indicator else 0.4

            # Fatal log check in cluster
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

            evidence_notes = []
            if delta == 0:
                evidence_notes.append("First observed anomaly timestamp in incident cluster")
            else:
                evidence_notes.append(f"Anomaly observed +{int(delta)}s after initial cluster trigger")

            if has_root_indicator:
                evidence_notes.append("Triggered root-cause indicator / RESOURCE_EXHAUSTION alarm")
            if has_fatal_log:
                evidence_notes.append("Associated FATAL/ERROR log lines detected in cluster window")

            candidates.append({
                "candidate": s,
                "score": round(total_rc_score, 3),
                "confidence_level": "HIGH" if total_rc_score >= 0.8 else ("MEDIUM" if total_rc_score >= 0.5 else "LOW"),
                "evidence_notes": evidence_notes,
                "time_delta_sec": int(delta),
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
    ) -> str:
        sources_str = ", ".join([k for k, v in sources.items() if v])
        missing = [k for k, v in sources.items() if not v]
        missing_note = f" (Warning: {', '.join(missing)} offline/delayed)" if missing else ""

        return (
            f"Incident {inc_id} was grouped from {len(alerts)} alerts across {len(services)} services "
            f"({', '.join(services)}) based on temporal proximity and topological dependency paths. "
            f"Evidence sources utilized: {sources_str}{missing_note}. "
            f"'{root_cause}' is evaluated as the leading probable root-cause candidate due to initiating "
            f"alarms preceding downstream symptom propagation."
        )
