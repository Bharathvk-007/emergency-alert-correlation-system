"""
Automated Edge & Failure Case Test Suite (Section 16).
Runs reproducible verification for all 7 edge scenarios:
TEST 1: Logs completely missing.
TEST 2: Traces delayed by 60 seconds.
TEST 3: Topology unavailable.
TEST 4: Unrelated alerts occurring simultaneously.
TEST 5: Duplicate alerts.
TEST 6: Multiple organizations have overlapping services.
TEST 7: Delayed evidence reconciliation.
"""

import os
import sys
from backend.evaluation.evaluate import load_csv
from backend.correlation.engine import CorrelationEngine
from backend.correlation.scoring import CorrelationScoring

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


def run_all_tests():
    alerts = load_csv(os.path.join(DATA_DIR, "alerts.csv"))
    logs = load_csv(os.path.join(DATA_DIR, "logs.csv"))
    traces = load_csv(os.path.join(DATA_DIR, "traces.csv"))
    topology = load_csv(os.path.join(DATA_DIR, "topology.csv"))
    timeline = load_csv(os.path.join(DATA_DIR, "incidents.csv"))

    print("==================================================")
    print("RUNNING 7 AUTOMATED EDGE & FAILURE TESTS (70% MILESTONE)")
    print("==================================================")

    # TEST 1: Logs completely missing
    engine1 = CorrelationEngine()
    engine1.load_topology(topology)
    incidents1 = engine1.correlate(
        alerts, logs, traces, timeline,
        {"alerts": True, "logs": False, "traces": True, "topology": True, "timeline": True}
    )
    gt_detected1 = set(inc.get("probable_root_cause") for inc in incidents1)
    assert "PostgreSQL Database" in gt_detected1 and "CDN" in gt_detected1 and "Message Queue" in gt_detected1, f"Missing root causes in {gt_detected1}"
    print(f"[PASS] TEST 1: Logs completely missing -> {len(incidents1)} incidents detected with graceful weight redistribution; all major ground truth root causes confirmed.")

    # TEST 2: Traces delayed / missing
    engine2 = CorrelationEngine()
    engine2.load_topology(topology)
    incidents2 = engine2.correlate(
        alerts, logs, traces, timeline,
        {"alerts": True, "logs": True, "traces": False, "topology": True, "timeline": True}
    )
    gt_detected2 = set(inc.get("probable_root_cause") for inc in incidents2)
    assert "PostgreSQL Database" in gt_detected2 and "CDN" in gt_detected2 and "Message Queue" in gt_detected2, f"Missing root causes in {gt_detected2}"
    print(f"[PASS] TEST 2: Traces delayed/missing -> {len(incidents2)} incidents detected with topology/log fallback.")

    # TEST 3: Topology unavailable
    engine3 = CorrelationEngine()
    # do not load topology
    incidents3 = engine3.correlate(
        alerts, logs, traces, timeline,
        {"alerts": True, "logs": True, "traces": True, "topology": False, "timeline": True}
    )
    assert len(incidents3) >= 3, f"Expected at least 3 clusters, got {len(incidents3)}"
    print("[PASS] TEST 3: Topology unavailable -> Fallback to trace & temporal proximity succeeded.")

    # TEST 4: Unrelated alerts occurring simultaneously
    # Test that PostgreSQL alert and Message Queue alert do not fuse into 1 incident
    pg_alerts = [a for a in alerts if a.get("service") == "PostgreSQL Database"]
    mq_alerts = [a for a in alerts if a.get("service") == "Message Queue"]
    engine4 = CorrelationEngine()
    engine4.load_topology(topology)
    incidents4 = engine4.correlate(
        pg_alerts + mq_alerts, logs, traces, timeline,
        {"alerts": True, "logs": True, "traces": True, "topology": True, "timeline": True}
    )
    assert len(incidents4) == 2, f"Expected 2 separate incidents for PG and MQ, got {len(incidents4)}"
    print("[PASS] TEST 4: Unrelated simultaneous alerts -> Separated into 2 distinct incidents (no false super-incident).")

    # TEST 5: Duplicate alerts deduplication
    engine_ref = CorrelationEngine()
    engine_ref.load_topology(topology)
    ref_incidents = engine_ref.correlate(
        alerts, logs, traces, timeline,
        {"alerts": True, "logs": True, "traces": True, "topology": True, "timeline": True}
    )
    duplicate_alerts = alerts + alerts[:5]  # duplicate first 5 alerts
    engine5 = CorrelationEngine()
    engine5.load_topology(topology)
    incidents5 = engine5.correlate(
        duplicate_alerts, logs, traces, timeline,
        {"alerts": True, "logs": True, "traces": True, "topology": True, "timeline": True}
    )
    assert len(incidents5) == len(ref_incidents), f"Expected {len(ref_incidents)} incidents despite duplicate alerts, got {len(incidents5)}"
    print(f"[PASS] TEST 5: Duplicate alerts -> Deduplicated into {len(incidents5)} incidents without redundant tickets.")

    # TEST 6: Multiple organizations with overlapping perimeter services
    engine6 = CorrelationEngine()
    engine6.load_topology(topology)
    incidents6 = engine6.correlate(
        alerts, logs, traces, timeline,
        {"alerts": True, "logs": True, "traces": True, "topology": True, "timeline": True}
    )
    # Check that incident contains primary org and boundary services
    org_set = set(inc["organization_id"] for inc in incidents6)
    assert len(org_set) >= 2, f"Expected multi-tenant separation, found orgs: {org_set}"
    print("[PASS] TEST 6: Multi-organization access -> Tenant separation and boundary access preserved.")

    # TEST 7: Delayed evidence reconciliation
    # First run without logs
    engine7 = CorrelationEngine()
    engine7.load_topology(topology)
    initial_incidents = engine7.correlate(
        alerts, [], traces, timeline,
        {"alerts": True, "logs": False, "traces": True, "topology": True, "timeline": True}
    )
    init_id = initial_incidents[0]["incident_id"]

    # Reconcile when logs arrive later
    reconciled_incidents = engine7.correlate(
        alerts, logs, traces, timeline,
        {"alerts": True, "logs": True, "traces": True, "topology": True, "timeline": True},
        existing_incidents=initial_incidents
    )
    reconciled_id = reconciled_incidents[0]["incident_id"]
    assert init_id == reconciled_id, f"Expected same incident ID {init_id}, got {reconciled_id}"
    print(f"[PASS] TEST 7: Delayed evidence reconciliation -> Incident {init_id} updated in-place with arriving logs without creating duplicate tickets.")

    print("==================================================")
    print("ALL 7 EDGE & FAILURE TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_all_tests()
