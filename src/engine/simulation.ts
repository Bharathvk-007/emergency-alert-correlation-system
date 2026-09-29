import { RawAlert, SimulationState } from '../types';

export type SimulationCallback = (
  activeAlerts: RawAlert[],
  newAlert: RawAlert | null,
  state: SimulationState
) => void;

export class AlertSimulator {
  private alertsQueue: RawAlert[] = [];
  private activeAlerts: RawAlert[] = [];
  private timer: any = null;
  private state: SimulationState = {
    isRunning: false,
    isPaused: false,
    speedMultiplier: 1,
    currentStep: 0,
    totalSteps: 0,
    elapsedVirtualSec: 0,
    processedAlertCount: 0,
  };
  private callback: SimulationCallback | null = null;

  constructor(allAlerts: RawAlert[], onTick?: SimulationCallback) {
    this.callback = onTick || null;
    this.setAlerts(allAlerts);
  }

  setAlerts(allAlerts: RawAlert[]) {
    // Sort chronologically
    this.alertsQueue = [...allAlerts].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    this.state.totalSteps = this.alertsQueue.length;
    this.reset();
  }

  start(onTick?: SimulationCallback) {
    if (onTick) this.callback = onTick;
    if (this.state.isRunning && !this.state.isPaused) return;

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.scheduleNextTick();
  }

  pause() {
    this.state.isPaused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  resume() {
    if (!this.state.isRunning) {
      this.start();
      return;
    }
    this.state.isPaused = false;
    this.scheduleNextTick();
  }

  setSpeed(speed: number) {
    this.state.speedMultiplier = speed;
    if (this.state.isRunning && !this.state.isPaused) {
      if (this.timer) clearTimeout(this.timer);
      this.scheduleNextTick();
    }
  }

  reset() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.activeAlerts = [];
    this.state = {
      isRunning: false,
      isPaused: false,
      speedMultiplier: this.state.speedMultiplier || 1,
      currentStep: 0,
      totalSteps: this.alertsQueue.length,
      elapsedVirtualSec: 0,
      processedAlertCount: 0,
    };
    this.notify(null);
  }

  loadAll() {
    this.reset();
    this.activeAlerts = [...this.alertsQueue];
    this.state.currentStep = this.alertsQueue.length;
    this.state.processedAlertCount = this.alertsQueue.length;
    this.state.isRunning = false;
    this.notify(null);
  }

  private scheduleNextTick() {
    if (this.state.currentStep >= this.alertsQueue.length) {
      this.state.isRunning = false;
      this.notify(null);
      return;
    }

    const intervalMs = Math.max(250, 1200 / this.state.speedMultiplier);

    this.timer = setTimeout(() => {
      if (!this.state.isRunning || this.state.isPaused) return;

      const nextAlert = this.alertsQueue[this.state.currentStep];
      this.activeAlerts.push(nextAlert);
      this.state.currentStep += 1;
      this.state.processedAlertCount = this.activeAlerts.length;
      this.state.elapsedVirtualSec += 10;

      this.notify(nextAlert);

      if (this.state.currentStep < this.alertsQueue.length) {
        this.scheduleNextTick();
      } else {
        this.state.isRunning = false;
        this.notify(null);
      }
    }, intervalMs);
  }

  private notify(newAlert: RawAlert | null = null) {
    if (this.callback) {
      this.callback([...this.activeAlerts], newAlert, { ...this.state });
    }
  }

  getState(): SimulationState {
    return { ...this.state };
  }

  getActiveAlerts(): RawAlert[] {
    return [...this.activeAlerts];
  }
}
