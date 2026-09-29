"""
FastAPI Server for Emergency Alert Correlation System.
Provides REST endpoints for incident management, topology inspection, provenance audit, and evaluation metrics.
"""

import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .correlation.engine import CorrelationEngine
from .correlation.scoring import CorrelationScoring
from .evaluation.evaluate import load_csv, run_evaluation
from .evaluation.error_analysis import ErrorAnalysisEngine

app = FastAPI(
    title="Emergency Alert Correlation System API",
    description="REST API for multi-source disaster alert correlation, root-cause candidate evaluation, and provenance tracking.",
    version="0.3.5",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def get_engine(
    logs_available: bool = True,
    traces_available: bool = True,
    topology_available: bool = True,
) -> tuple[CorrelationEngine, List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    alerts = load_csv(os.path.join(DATA_DIR, "alerts.csv"))
    logs = load_csv(os.path.join(DATA_DIR, "logs.csv"))
    traces = load_csv(os.path.join(DATA_DIR, "traces.csv"))
    topology = load_csv(os.path.join(DATA_DIR, "topology.csv"))
    timeline = load_csv(os.path.join(DATA_DIR, "incidents.csv"))

    engine = CorrelationEngine(scoring=CorrelationScoring(), affinity_threshold=0.48)
    if topology_available:
        engine.load_topology(topology)

    return engine, alerts, logs, traces, timeline


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "emergency-alert-correlation",
        "version": "0.3.5",
        "milestone": "35%",
    }


@app.get("/api/organizations")
def get_organizations():
    return [
        {
            "id": "ORG-A",
            "name": "Emergency Website Operations",
            "type": "Primary Public Platform",
            "description": "Public emergency portal, API gateway, databases, and alerting service.",
            "services": ["Web Frontend", "API Gateway", "Emergency Data Service", "PostgreSQL Database", "Redis Cache", "Alert Service", "Notification Service"],
        },
        {
            "id": "ORG-B",
            "name": "Cloud Infrastructure & Edge Provider",
            "type": "Infrastructure Partner",
            "description": "Edge CDN distribution, points of presence, and ingress load balancers.",
            "services": ["CDN", "Load Balancer"],
        },
        {
            "id": "ORG-C",
            "name": "Emergency Telecom & Broadcast Partner",
            "type": "Communications Partner",
            "description": "Message brokers and external carrier SMS broadcast infrastructure.",
            "services": ["Message Queue", "External SMS Provider", "External Email Provider"],
        },
    ]


@app.get("/api/alerts")
def get_alerts(
    organization_id: Optional[str] = Query(None, description="Filter by Organization ID"),
    role: str = Query("ENGINEER", description="User role: ADMIN, ENGINEER, INCIDENT_COMMANDER, PARTNER, VIEWER"),
):
    alerts = load_csv(os.path.join(DATA_DIR, "alerts.csv"))

    if organization_id:
        if role == "PARTNER":
            # Partners only see shared boundary services
            shared_services = {"CDN", "Load Balancer", "External SMS Provider", "Message Queue", "Notification Service"}
            alerts = [a for a in alerts if a.get("service") in shared_services or a.get("organization_id") == organization_id]
        else:
            alerts = [a for a in alerts if a.get("organization_id") == organization_id or role == "ADMIN"]

    return {
        "total": len(alerts),
        "alerts": alerts,
    }


@app.get("/api/incidents")
def get_incidents(
    organization_id: Optional[str] = Query(None),
    role: str = Query("ENGINEER"),
    logs_available: bool = Query(True),
    traces_available: bool = Query(True),
    topology_available: bool = Query(True),
):
    engine, alerts, logs, traces, timeline = get_engine(logs_available, traces_available, topology_available)
    sources = {
        "alerts": True,
        "logs": logs_available,
        "traces": traces_available,
        "topology": topology_available,
        "timeline": True,
    }
    incidents = engine.correlate(alerts, logs, traces, timeline, sources)

    # Multi-tenant and role filtering
    filtered = []
    for inc in incidents:
        if organization_id and inc.get("organization_id") != organization_id and role not in ("ADMIN", "INCIDENT_COMMANDER"):
            # Check if any service overlaps partner boundary
            if role == "PARTNER":
                shared_services = {"CDN", "Load Balancer", "External SMS Provider", "Message Queue", "Notification Service"}
                if not any(s in shared_services for s in inc.get("services", [])):
                    continue
            else:
                continue

        # Sanitize for Viewer or Partner
        inc_copy = dict(inc)
        if role == "VIEWER":
            inc_copy.pop("linked_traces", None)
            inc_copy.pop("linked_logs", None)
            inc_copy["alerts"] = [{"alert_id": a["alert_id"], "service": a["service"], "severity": a["severity"]} for a in inc.get("alerts", [])]
        elif role == "PARTNER":
            inc_copy.pop("linked_logs", None)

        filtered.append(inc_copy)

    return {
        "total": len(filtered),
        "incidents": filtered,
        "data_sources_status": sources,
    }


@app.get("/api/incidents/{incident_id}")
def get_incident_detail(
    incident_id: str,
    role: str = Query("ENGINEER"),
):
    engine, alerts, logs, traces, timeline = get_engine()
    incidents = engine.correlate(alerts, logs, traces, timeline)
    inc = next((i for i in incidents if i["incident_id"] == incident_id), None)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@app.get("/api/incidents/{incident_id}/timeline")
def get_incident_timeline(incident_id: str):
    timeline = load_csv(os.path.join(DATA_DIR, "incidents.csv"))
    events = [e for e in timeline if e.get("incident_id") == incident_id]
    events.sort(key=lambda x: x.get("timestamp", ""))
    return {
        "incident_id": incident_id,
        "event_count": len(events),
        "events": events,
        "earliest_event": events[0] if events else None,
    }


@app.get("/api/incidents/{incident_id}/provenance")
def get_incident_provenance(incident_id: str):
    engine, alerts, logs, traces, timeline = get_engine()
    incidents = engine.correlate(alerts, logs, traces, timeline)
    inc = next((i for i in incidents if i["incident_id"] == incident_id), None)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc.get("provenance", {})


@app.get("/api/incidents/{incident_id}/audit-export")
def get_audit_export(incident_id: str):
    engine, alerts, logs, traces, timeline = get_engine()
    incidents = engine.correlate(alerts, logs, traces, timeline)
    inc = next((i for i in incidents if i["incident_id"] == incident_id), None)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    prov = inc.get("provenance", {})
    return {
        "audit_version": "1.0.0",
        "incident_id": inc["incident_id"],
        "organization_id": inc["organization_id"],
        "title": inc["title"],
        "status": inc["status"],
        "system_version": "Emergency-Correlation-Core v0.3.5",
        "observed_facts": {
            "affected_services": inc["services"],
            "alert_count": len(inc["alerts"]),
            "alerts": inc["alerts"],
            "linked_traces": inc.get("linked_traces", []),
            "linked_logs": inc.get("linked_logs", []),
        },
        "system_inferences": {
            "probable_root_cause": inc["probable_root_cause"],
            "candidates": inc["probable_root_cause_candidates"],
            "confidence_score": inc["confidence_score"],
            "confidence_label": inc["confidence_label"],
            "correlation_explanation": inc["correlation_explanation"],
        },
        "telemetry_provenance_metadata": {
            "data_sources_used": inc.get("data_sources_status", {}),
            "provenance": prov,
        }
    }


@app.get("/api/topology")
def get_topology():
    edges = load_csv(os.path.join(DATA_DIR, "topology.csv"))
    nodes = set()
    for e in edges:
        nodes.add(e["source_service"])
        nodes.add(e["target_service"])
    return {
        "nodes": [{"id": n, "label": n} for n in sorted(list(nodes))],
        "edges": edges,
    }


@app.get("/api/metrics")
def get_evaluation_metrics():
    return run_evaluation()


@app.get("/api/error-analysis")
def get_error_analysis():
    return ErrorAnalysisEngine.get_failure_mode_analysis()
