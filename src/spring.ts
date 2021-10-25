import { Point, Segment } from "./point";

export class Spring {
  constructor(public pointA: Point, public pointB: Point, public constant = 200, public distance?: number, public isSide = false) {
    if (!distance) {
      this.distance = pointA.position.distance(pointB.position);
    }
  }
  update(delta: number) {
    const direction = this.pointA.position.copy().sub(this.pointB.position).normalize();
    if (direction.length > 0) {
      const d = (this.distance - this.pointA.position.distance(this.pointB.position)) / this.distance;
      const forceVal = /*Math.abs(Math.sin(Math.min(Math.max(d * (Math.PI / 2), -Math.PI / 2), Math.PI / 2))) * */this.constant * d;
      direction.scale(forceVal);
      this.pointA.addForce(direction);
      this.pointB.addForce(direction.scale(-1));
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "#0005";
    if (this.isSide) {
      ctx.strokeStyle = "#000";
    }
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.pointA.position.x, this.pointA.position.y);
    ctx.lineTo(this.pointB.position.x, this.pointB.position.y);
    ctx.stroke();
  }
  get segment() {
    return new Segment(this.pointA.position, this.pointB.position)
  }
}