import { RawAlert } from '../types';

export class BaselineAlertProcessor {
  timeWindowSec: number;

  constructor(timeWindowSec: number = 120.0) {
    this.timeWindowSec = timeWindowSec;
  }

  parseTime(ts: string): number {
    return new Date(ts).getTime() / 1000.0;
  }

  processIndependent(alerts: RawAlert[]) {
    return {
      method: 'independent_alerts',
      total_alerts: alerts.length,
      incident_count: alerts.length,
      alert_reduction_pct: 0.0,
    };
  }

  processServiceWindow(alerts: RawAlert[]) {
    const sorted = [...alerts].sort(
      (a, b) => this.parseTime(a.timestamp) - this.parseTime(b.timestamp)
    );
    const groups: RawAlert[][] = [];

    for (const alert of sorted) {
      const t = this.parseTime(alert.timestamp);
      let placed = false;

      for (const g of groups) {
        if (g[0].service === alert.service) {
          const lastT = this.parseTime(g[g.length - 1].timestamp);
          if (Math.abs(t - lastT) <= this.timeWindowSec) {
            g.push(alert);
            placed = true;
            break;
          }
        }
      }
      if (!placed) {
        groups.push([alert]);
      }
    }

    const reduction =
      alerts.length > 0
        ? ((alerts.length - groups.length) / alerts.length) * 100.0
        : 0.0;

    return {
      method: 'service_window_baseline',
      total_alerts: alerts.length,
      grouped_incident_count: groups.length,
      alert_reduction_pct: Math.round(reduction * 10) / 10,
      groups,
    };
  }
}
