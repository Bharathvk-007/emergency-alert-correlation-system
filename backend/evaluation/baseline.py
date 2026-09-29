"""
Baseline Alert Processing Method.
Implements the naive baseline approaches:
1. Purely independent alerts (no correlation)
2. Simple heuristic: Same service + same time window (no topology, no traces, no multi-service correlation).
"""

from typing import Dict, Any, List
from datetime import datetime


class BaselineAlertProcessor:
    def __init__(self, time_window_sec: float = 120.0):
        self.time_window_sec = time_window_sec

    def parse_time(self, ts: str) -> float:
        ts_clean = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(ts_clean).timestamp()

    def process_independent(self, alerts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Baseline approach 1: Every alert is an independent ticket."""
        return {
            "method": "independent_alerts",
            "total_alerts": len(alerts),
            "incident_count": len(alerts),
            "alert_reduction_pct": 0.0,
        }

    def process_service_window(self, alerts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Baseline approach 2: Group strictly by (service, time_window).
        Cannot group cross-service cascades (e.g. Database -> API Gateway -> Frontend).
        """
        # Sort by timestamp
        sorted_alerts = sorted(alerts, key=lambda a: self.parse_time(a["timestamp"]))
        groups: List[List[Dict[str, Any]]] = []

        for alert in sorted_alerts:
            t = self.parse_time(alert["timestamp"])
            svc = alert.get("service")
            placed = False

            for g in groups:
                if g[0].get("service") == svc:
                    # check time diff with last alert in group
                    last_t = self.parse_time(g[-1]["timestamp"])
                    if abs(t - last_t) <= self.time_window_sec:
                        g.append(alert)
                        placed = True
                        break
            if not placed:
                groups.append([alert])

        reduction = (
            ((len(alerts) - len(groups)) / len(alerts) * 100.0) if alerts else 0.0
        )

        return {
            "method": "service_window_baseline",
            "total_alerts": len(alerts),
            "grouped_incident_count": len(groups),
            "alert_reduction_pct": round(reduction, 2),
            "groups": groups,
        }
