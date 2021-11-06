import { Point, Segment } from "./point";
import { Vector } from "./vector";

export class Spring {
  private _targetDistance: number;
  constructor(public pointA: Point, public pointB: Point, public constant: number = null, public distance?: number, public isSide = false, public damping = 2) {
    if (!distance) {
      this.distance = pointA.position.distance(pointB.position);
    }
    if (!constant) {
      this.constant = this.distance * 3;
    }
  }
  update(delta: number) {
    if (this._targetDistance) {
      this.distance += (this._targetDistance - this.distance) * delta * 10;
    }
    const direction = this.pointA.position.copy().sub(this.pointB.position).normalize();
    if (direction.length > 0) {
      const dampingForce = this.segment.pointProjection(this.pointA.velocity.copy().sub(this.pointB.velocity).scale(this.damping).add(this.center)).projection.sub(this.center);
      const d = (this.distance - this.pointA.position.distance(this.pointB.position)) / this.distance;
      const forceVal = /*Math.abs(Math.sin(Math.min(Math.max(d * (Math.PI / 2), -Math.PI / 2), Math.PI / 2))) * */this.constant * d
      direction.scale(forceVal).sub(dampingForce);
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
  get center() {
    return this.pointA.position.copy().add(this.pointB.position).scale(0.5);
  }
  set target(target: number) {
    this._targetDistance = target;
  }
}