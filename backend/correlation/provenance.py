"""
Provenance Tracking Model.
Maintains clear, audit-ready provenance records for every grouped incident,
linking symptoms to underlying telemetry evidence and correlation rules.
"""

from typing import Dict, Any, List


class ProvenanceTracker:
    def __init__(self):
        self.records: Dict[str, Dict[str, Any]] = {}

    def create_provenance(
        self,
        incident_id: str,
        organization_id: str,
        alert_ids: List[str],
        trace_ids: List[str],
        log_ids: List[str],
        topology_edges: List[Dict[str, str]],
        timeline_events: List[Dict[str, Any]],
        correlation_reasons: List[str],
        root_cause_candidates: List[Dict[str, Any]],
        scores: Dict[str, Any],
        timestamps: Dict[str, str],
        data_sources_used: Dict[str, bool],
    ) -> Dict[str, Any]:
        provenance_doc = {
            "incident_id": incident_id,
            "organization_id": organization_id,
            "alert_ids": alert_ids,
            "trace_ids": trace_ids,
            "log_ids": log_ids,
            "topology_edges": topology_edges,
            "timeline_events": timeline_events,
            "correlation_reasons": correlation_reasons,
            "root_cause_candidates": root_cause_candidates,
            "scores": scores,
            "timestamps": timestamps,
            "data_sources_used": data_sources_used,
            "lineage_tree": {
                "root": incident_id,
                "alerts": alert_ids,
                "traces": trace_ids,
                "logs": log_ids,
                "dependency_flow": [f"{e.get('source')} -> {e.get('target')}" for e in topology_edges],
            }
        }
        self.records[incident_id] = provenance_doc
        return provenance_doc

    def get_provenance(self, incident_id: str) -> Dict[str, Any]:
        return self.records.get(incident_id, {})
