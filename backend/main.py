"""
FastAPI Server for Emergency Alert Correlation System (Milestone 2 - 70%).
Provides REST endpoints for incident lifecycle, topology inspection, provenance audit,
evidence degradation, sharing workflow, and evaluation metrics.
"""

import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, Header, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .correlation.engine import CorrelationEngine
from .correlation.scoring import CorrelationScoring
from .evaluation.evaluate import load_csv, run_evaluation
from .evaluation.error_analysis import ErrorAnalysisEngine

app = FastAPI(
    title="Emergency Alert Correlation System API",
    description="REST API for multi-source disaster alert correlation, root-cause candidate evaluation, provenance, and lifecycle management.",
    version="0.7.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# In-memory lifecycle & modification store
incident_overrides: Dict[str, Dict[str, Any]] = {}
sharing_records: Dict[str, List[Dict[str, Any]]] = {}


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

    engine = CorrelationEngine(scoring=CorrelationScoring(), affinity_threshold=0.46)
    if topology_available:
        engine.load_topology(topology)

    return engine, alerts, logs, traces, timeline


@app.get("/api/health")
def health_check():
    alerts = load_csv(os.path.join(DATA_DIR, "alerts.csv"))
    logs = load_csv(os.path.join(DATA_DIR, "logs.csv"))
    traces = load_csv(os.path.join(DATA_DIR, "traces.csv"))
    topology = load_csv(os.path.join(DATA_DIR, "topology.csv"))
    timeline = load_csv(os.path.join(DATA_DIR, "incidents.csv"))

    return {
        "status": "healthy",
        "service": "emergency-alert-correlation",
        "version": "0.7.0",
        "milestone": "70%",
        "subsystems": {
            "backend": "ONLINE",
            "dataset": {
                "alerts_count": len(alerts),
                "logs_count": len(logs),
                "traces_count": len(traces),
                "topology_edges_count": len(topology),
                "timeline_events_count": len(timeline),
            },
            "correlation_engine": "READY",
            "evidence_sources": {
                "alerts": "AVAILABLE",
                "logs": "AVAILABLE",
                "traces": "AVAILABLE",
                "topology": "AVAILABLE",
                "timeline": "AVAILABLE",
            },
            "delayed_reconciliation": "ENABLED",
        }
    }


@app.get("/api/organizations")
def get_organizations():
    return [
        {
            "id": "ORG-A",
            "name": "Emergency Website Operations",
            "type": "Primary Public Platform",
            "description": "Public emergency portal, API gateway, databases, and alerting service.",
            "services": ["Web Frontend", "API Gateway", "Emergency Data Service", "PostgreSQL Database", "Redis Cache", "Alert Service", "Notification Service", "Authentication Service", "User Service"],
        },
        {
            "id": "ORG-B",
            "name": "Cloud Infrastructure Provider",
            "type": "Core Infrastructure Partner",
            "description": "Core cloud compute clusters, host hypervisors, and private networking.",
            "services": ["Load Balancer", "API Gateway"],
        },
        {
            "id": "ORG-C",
            "name": "CDN & Network Partner",
            "type": "Edge & Network Infrastructure Partner",
            "description": "Edge CDN distribution, origin shield caches, and anycast DNS routing.",
            "services": ["CDN", "Load Balancer"],
        },
        {
            "id": "ORG-D",
            "name": "External Communication Provider",
            "type": "Communications Partner",
            "description": "Message brokers and external carrier SMS emergency broadcast infrastructure.",
            "services": ["Message Queue", "External SMS Provider", "External Email Provider"],
        },
    ]


@app.get("/api/alerts")
def get_alerts(
    organization_id: Optional[str] = Query(None, description="Filter by Organization ID"),
    role: str = Query("SRE_ENGINEER"),
):
    alerts = load_csv(os.path.join(DATA_DIR, "alerts.csv"))

    if organization_id and role not in ("ADMIN", "INCIDENT_COMMANDER"):
        if role in ("PARTNER", "PARTNER_ENGINEER"):
            shared_services = {"CDN", "Load Balancer", "External SMS Provider", "Message Queue", "Notification Service"}
            alerts = [a for a in alerts if a.get("service") in shared_services or a.get("organization_id") == organization_id]
        else:
            alerts = [a for a in alerts if a.get("organization_id") == organization_id]

    return {
        "total": len(alerts),
        "alerts": alerts,
    }


@app.get("/api/incidents")
def get_incidents(
    organization_id: Optional[str] = Query(None),
    role: str = Query("SRE_ENGINEER"),
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

    # Apply overrides from in-memory mutations
    for inc in incidents:
        inc_id = inc["incident_id"]
        if inc_id in incident_overrides:
            inc.update(incident_overrides[inc_id])
        if inc_id in sharing_records:
            inc["shared_with"] = sharing_records[inc_id]

    # Multi-tenant and role filtering
    filtered = []
    for inc in incidents:
        if organization_id and inc.get("organization_id") != organization_id and role not in ("ADMIN", "INCIDENT_COMMANDER"):
            if role in ("PARTNER", "PARTNER_ENGINEER"):
                shared_services = {"CDN", "Load Balancer", "External SMS Provider", "Message Queue", "Notification Service"}
                if not any(s in shared_services for s in inc.get("services", [])):
                    continue
            else:
                continue

        inc_copy = dict(inc)
        if role == "VIEWER":
            inc_copy.pop("linked_traces", None)
            inc_copy.pop("linked_logs", None)
            inc_copy["alerts"] = [
                {"alert_id": a["alert_id"], "service": a["service"], "severity": a["severity"]}
                for a in inc.get("alerts", [])
            ]
        elif role in ("PARTNER", "PARTNER_ENGINEER"):
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
    role: str = Query("SRE_ENGINEER"),
):
    engine, alerts, logs, traces, timeline = get_engine()
    incidents = engine.correlate(alerts, logs, traces, timeline)
    inc = next((i for i in incidents if i["incident_id"] == incident_id), None)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if incident_id in incident_overrides:
        inc.update(incident_overrides[incident_id])
    if incident_id in sharing_records:
        inc["shared_with"] = sharing_records[incident_id]

    return inc


@app.get("/api/incidents/{incident_id}/evidence")
def get_incident_evidence(incident_id: str):
    inc = get_incident_detail(incident_id)
    return {
        "incident_id": incident_id,
        "detailed_evidence": inc.get("provenance", {}).get("detailed_evidence", []),
    }


@app.get("/api/incidents/{incident_id}/dependencies")
def get_incident_dependencies(incident_id: str):
    inc = get_incident_detail(incident_id)
    return {
        "incident_id": incident_id,
        "services": inc.get("services", []),
        "blast_radius_path": inc.get("blast_radius_path", []),
        "reverse_symptom_path": inc.get("reverse_symptom_path", []),
    }


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
    inc = get_incident_detail(incident_id)
    return inc.get("provenance", {})


@app.get("/api/incidents/{incident_id}/audit-export")
def get_audit_export(incident_id: str):
    inc = get_incident_detail(incident_id)
    return {
        "audit_version": "2.0.0",
        "incident_id": inc["incident_id"],
        "organization_id": inc["organization_id"],
        "title": inc["title"],
        "status": inc["status"],
        "assigned_to": inc.get("assigned_to", "Unassigned"),
        "incident_commander": inc.get("incident_commander", "Alex Rivera"),
        "human_confirmation": {
            "is_confirmed": bool(inc.get("human_confirmed_root_cause")),
            "confirmed_root_cause": inc.get("human_confirmed_root_cause"),
            "notes": inc.get("human_confirmation_notes"),
        },
        "observed_facts": {
            "affected_services": inc["services"],
            "alert_count": len(inc["alerts"]),
            "alerts": inc["alerts"],
            "downstream_blast_radius": inc.get("blast_radius_path", []),
        },
        "system_inferences": {
            "probable_root_cause": inc["probable_root_cause"],
            "candidates": inc["probable_root_cause_candidates"],
            "confidence_score": inc["confidence_score"],
            "confidence_label": inc["confidence_label"],
            "correlation_explanation": inc["correlation_explanation"],
        },
        "lifecycle_audit_trail": inc.get("lifecycle_history", []),
        "sharing_history": inc.get("shared_with", []),
    }


# Lifecycle state & human-in-the-loop endpoints
@app.post("/api/incidents/{incident_id}/status")
def update_incident_status(incident_id: str, status: str = Body(..., embed=True)):
    if incident_id not in incident_overrides:
        incident_overrides[incident_id] = {}
    incident_overrides[incident_id]["status"] = status
    return {"incident_id": incident_id, "status": status, "updated": True}


@app.post("/api/incidents/{incident_id}/assign")
def assign_incident(incident_id: str, assignee: str = Body(..., embed=True)):
    if incident_id not in incident_overrides:
        incident_overrides[incident_id] = {}
    incident_overrides[incident_id]["assigned_to"] = assignee
    return {"incident_id": incident_id, "assigned_to": assignee, "updated": True}


@app.post("/api/incidents/{incident_id}/confirm-root-cause")
def confirm_root_cause(
    incident_id: str,
    candidate: str = Body(...),
    notes: Optional[str] = Body(None),
):
    if incident_id not in incident_overrides:
        incident_overrides[incident_id] = {}
    incident_overrides[incident_id]["human_confirmed_root_cause"] = candidate
    incident_overrides[incident_id]["human_confirmation_notes"] = notes
    incident_overrides[incident_id]["status"] = "ROOT_CAUSE_CANDIDATE"
    return {"incident_id": incident_id, "confirmed_root_cause": candidate, "updated": True}


@app.post("/api/incidents/{incident_id}/share")
def share_incident(
    incident_id: str,
    target_org: str = Body(...),
    share_alerts: bool = Body(True),
    share_dependencies: bool = Body(True),
):
    if incident_id not in sharing_records:
        sharing_records[incident_id] = []
    record = {
        "target_org": target_org,
        "shared_at": "2026-09-29T11:00:00Z",
        "share_alerts": share_alerts,
        "share_dependencies": share_dependencies,
        "share_logs": False,  # privacy enforced
    }
    sharing_records[incident_id].append(record)
    return {"incident_id": incident_id, "shared_with": target_org, "status": "SHARED"}


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
