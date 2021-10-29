export class Stats {
  times: number[] = [];
  constructor() { }
  ms(ms: number) {
    this.times.push(ms);
    if (this.times.length > 50) {
      this.times.splice(0, 1);
    }
  }
  get fps() {
    return 1000 / (this.times.reduce((a, b) => a + b) / this.times.length);
  }
}