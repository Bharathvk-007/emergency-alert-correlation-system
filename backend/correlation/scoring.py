"""
Explainable correlation and root cause scoring engine.
Computes deterministic multi-factor correlation scores between alerts and evaluates root-cause candidates.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime


class CorrelationScoring:
    def __init__(
        self,
        time_weight: float = 0.25,
        service_weight: float = 0.20,
        topology_weight: float = 0.20,
        trace_weight: float = 0.15,
        log_weight: float = 0.10,
        severity_weight: float = 0.10,
        time_window_sec: float = 180.0,
    ):
        self.time_weight = time_weight
        self.service_weight = service_weight
        self.topology_weight = topology_weight
        self.trace_weight = trace_weight
        self.log_weight = log_weight
        self.severity_weight = severity_weight
        self.time_window_sec = time_window_sec

    def parse_time(self, ts: str) -> float:
        """Parse ISO 8601 timestamp string into epoch seconds."""
        ts_clean = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(ts_clean).timestamp()

    def compute_time_proximity(self, ts1: str, ts2: str) -> float:
        """Calculate temporal proximity score: 1.0 when identical, decaying to 0 at window boundary."""
        delta = abs(self.parse_time(ts1) - self.parse_time(ts2))
        if delta >= self.time_window_sec:
            return 0.0
        return max(0.0, 1.0 - (delta / self.time_window_sec))

    def compute_severity_score(self, sev1: str, sev2: str) -> float:
        """Score based on alert severity alignment."""
        sev1 = (sev1 or "").upper()
        sev2 = (sev2 or "").upper()
        if sev1 == "CRITICAL" and sev2 == "CRITICAL":
            return 1.0
        if "CRITICAL" in (sev1, sev2) and "HIGH" in (sev1, sev2):
            return 0.75
        if sev1 == "HIGH" and sev2 == "HIGH":
            return 0.60
        if "HIGH" in (sev1, sev2) or "MEDIUM" in (sev1, sev2):
            return 0.35
        return 0.15

    def compute_pairwise_affinity(
        self,
        alert_a: Dict[str, Any],
        alert_b: Dict[str, Any],
        topology_distance: int,
        shared_trace: bool,
        log_match: bool,
        data_sources_available: Dict[str, bool],
    ) -> Dict[str, Any]:
        """
        Calculates explainable affinity score between two alerts, gracefully rebalancing
        weights if certain data sources are missing or delayed.
        """
        # Temporal score
        time_score = self.compute_time_proximity(alert_a["timestamp"], alert_b["timestamp"])

        # Service score (same service = 1.0)
        same_service = alert_a.get("service") == alert_b.get("service")
        service_score = 1.0 if same_service else 0.0

        # Topology score (0 hops = 1.0, 1 hop = 0.85, 2 hops = 0.50, >=3 = 0.0)
        if topology_distance == 0:
            topo_score = 1.0
        elif topology_distance == 1:
            topo_score = 0.85
        elif topology_distance == 2:
            topo_score = 0.50
        else:
            topo_score = 0.0

        # Trace score
        trace_score = 1.0 if shared_trace else 0.0

        # Log score
        log_score = 1.0 if log_match else 0.0

        # Severity score
        sev_score = self.compute_severity_score(
            alert_a.get("severity", ""), alert_b.get("severity", "")
        )

        # Dynamic rebalancing based on source availability
        weights: Dict[str, float] = {
            "time": self.time_weight,
            "service": self.service_weight,
            "topology": self.topology_weight if data_sources_available.get("topology", True) else 0.0,
            "trace": self.trace_weight if data_sources_available.get("traces", True) else 0.0,
            "log": self.log_weight if data_sources_available.get("logs", True) else 0.0,
            "severity": self.severity_weight,
        }

        total_weight = sum(weights.values()) or 1.0
        norm_weights = {k: v / total_weight for k, v in weights.items()}

        total_score = (
            norm_weights["time"] * time_score
            + norm_weights["service"] * service_score
            + norm_weights["topology"] * topo_score
            + norm_weights["trace"] * trace_score
            + norm_weights["log"] * log_score
            + norm_weights["severity"] * sev_score
        )

        return {
            "total_score": round(total_score, 4),
            "sub_scores": {
                "time_score": round(time_score, 4),
                "service_score": round(service_score, 4),
                "topology_score": round(topo_score, 4),
                "trace_score": round(trace_score, 4),
                "log_score": round(log_score, 4),
                "severity_score": round(sev_score, 4),
            },
            "active_weights": {k: round(v, 4) for k, v in norm_weights.items()},
        }
