export class GameLoop {
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly maxDt: number,
    private readonly onFrame: (dt: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const tick = (now: number): void => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, this.maxDt);
      this.lastTime = now;
      this.onFrame(dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
