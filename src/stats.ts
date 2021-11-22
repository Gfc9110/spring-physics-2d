export class Stats {
  times: number[] = [];
  fpsToCalc: number;
  constructor() {}
  get frameTime() {
    return this.times.sort((a, b) => a - b)[Math.round(this.times.length / 2)];
  }
  pushFrameTime(frameTime: number): number {
    this.times.push(frameTime);
    if (--this.fpsToCalc > 0) return null;
    return this.frameTime;
  }
  calculateFPS(frameCount: number) {
    this.fpsToCalc = frameCount;
  }
}
