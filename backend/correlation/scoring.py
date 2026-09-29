"""
Explainable correlation and root cause scoring engine (Milestone 2 - 70%).
Computes deterministic multi-factor correlation scores between alerts and evaluates root-cause candidates.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime


class CorrelationScoring:
    def __init__(
        self,
        time_weight: float = 0.22,
        service_weight: float = 0.18,
        topology_weight: float = 0.18,
        trace_weight: float = 0.14,
        log_weight: float = 0.10,
        metric_weight: float = 0.08,
        host_weight: float = 0.05,
        severity_weight: float = 0.05,
        time_window_sec: float = 180.0,
    ):
        self.time_weight = time_weight
        self.service_weight = service_weight
        self.topology_weight = topology_weight
        self.trace_weight = trace_weight
        self.log_weight = log_weight
        self.metric_weight = metric_weight
        self.host_weight = host_weight
        self.severity_weight = severity_weight
        self.time_window_sec = time_window_sec

    def parse_time(self, ts: str) -> float:
        """Parse ISO 8601 timestamp string into epoch seconds."""
        ts_clean = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(ts_clean).timestamp()

    def compute_time_proximity(self, ts1: str, ts2: str) -> Tuple[float, int]:
        delta = abs(self.parse_time(ts1) - self.parse_time(ts2))
        if delta >= self.time_window_sec:
            return 0.0, int(delta)
        score = max(0.0, 1.0 - (delta / self.time_window_sec))
        return score, int(delta)

    def compute_metric_similarity(self, alert_a: Dict[str, Any], alert_b: Dict[str, Any]) -> float:
        type_a = alert_a.get("alert_type")
        type_b = alert_b.get("alert_type")
        if type_a == type_b:
            return 1.0
        if (type_a == "RESOURCE_EXHAUSTION" and type_b in ("LATENCY", "ERROR_RATE")) or (
            type_b == "RESOURCE_EXHAUSTION" and type_a in ("LATENCY", "ERROR_RATE")
        ):
            return 0.85
        if (type_a == "LATENCY" and type_b == "ERROR_RATE") or (type_b == "LATENCY" and type_a == "ERROR_RATE"):
            return 0.70
        return 0.20

    def compute_shared_host(self, alert_a: Dict[str, Any], alert_b: Dict[str, Any]) -> float:
        host_a = alert_a.get("host", "")
        host_b = alert_b.get("host", "")
        if host_a and host_b and host_a == host_b:
            return 1.0
        if host_a and host_b:
            prefix_a = "-".join(host_a.split("-")[:2])
            prefix_b = "-".join(host_b.split("-")[:2])
            if prefix_a == prefix_b and len(prefix_a) > 2:
                return 0.65
        return 0.0

    def compute_severity_score(self, sev1: str, sev2: str) -> float:
        s1 = (sev1 or "").upper()
        s2 = (sev2 or "").upper()
        if s1 == "CRITICAL" and s2 == "CRITICAL":
            return 1.0
        if (s1 == "CRITICAL" and s2 == "HIGH") or (s1 == "HIGH" and s2 == "CRITICAL"):
            return 0.80
        if s1 == "HIGH" and s2 == "HIGH":
            return 0.65
        if s1 in ("HIGH", "MEDIUM") or s2 in ("HIGH", "MEDIUM"):
            return 0.40
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
        time_score, delta_sec = self.compute_time_proximity(alert_a["timestamp"], alert_b["timestamp"])
        same_service = alert_a.get("service") == alert_b.get("service")
        service_score = 1.0 if same_service else 0.0

        if topology_distance == 0:
            topo_score = 1.0
        elif topology_distance == 1:
            topo_score = 0.88
        elif topology_distance == 2:
            topo_score = 0.55
        else:
            topo_score = 0.0

        trace_score = 1.0 if shared_trace else 0.0
        log_score = 1.0 if log_match else 0.0
        metric_score = self.compute_metric_similarity(alert_a, alert_b)
        host_score = self.compute_shared_host(alert_a, alert_b)
        sev_score = self.compute_severity_score(alert_a.get("severity", ""), alert_b.get("severity", ""))

        weights: Dict[str, float] = {
            "time": self.time_weight,
            "service": self.service_weight,
            "topology": self.topology_weight if data_sources_available.get("topology", True) else 0.0,
            "trace": self.trace_weight if data_sources_available.get("traces", True) else 0.0,
            "log": self.log_weight if data_sources_available.get("logs", True) else 0.0,
            "metric": self.metric_weight,
            "host": self.host_weight,
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
            + norm_weights["metric"] * metric_score
            + norm_weights["host"] * host_score
            + norm_weights["severity"] * sev_score
        )

        reasons = []
        if delta_sec <= 60:
            reasons.append(f"{delta_sec}s close temporal proximity")
        else:
            reasons.append(f"{delta_sec}s temporal window")

        if service_score == 1.0:
            reasons.append(f"Same service ({alert_a.get('service')})")
        elif topology_distance == 1:
            reasons.append(f"Direct 1-hop topology edge ({alert_a.get('service')} ↔ {alert_b.get('service')})")
        elif topology_distance == 2:
            reasons.append(f"2-hop downstream topology path ({alert_a.get('service')} → {alert_b.get('service')})")

        if shared_trace:
            reasons.append("Shared distributed trace propagation")
        if log_match:
            reasons.append("Matching error log signatures")
        if metric_score >= 0.7:
            reasons.append(f"Causal metric synergy ({alert_a.get('alert_type')} ↔ {alert_b.get('alert_type')})")

        return {
            "total_score": round(total_score, 4),
            "sub_scores": {
                "time_score": round(time_score, 4),
                "service_score": round(service_score, 4),
                "topology_score": round(topo_score, 4),
                "trace_score": round(trace_score, 4),
                "log_score": round(log_score, 4),
                "metric_score": round(metric_score, 4),
                "host_score": round(host_score, 4),
                "severity_score": round(sev_score, 4),
            },
            "active_weights": {k: round(v, 4) for k, v in norm_weights.items()},
            "correlation_reasons": reasons,
        }
