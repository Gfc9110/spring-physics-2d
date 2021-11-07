import { Point, Segment } from "./point";
import { Vector } from "./vector";

export class Spring {
  private _targetDistance: number;
  normalsInverted: boolean;
  constructor(public pointA: Point, public pointB: Point, public constant: number = null, public distance?: number, public isSide = false, public damping: number = null) {
    if (!distance) {
      this.distance = pointA.position.distance(pointB.position);
    }
    if (!constant) {
      this.constant = this.distance * 3;
    }
    if (!damping) {
      this.damping = this.constant / 100;
    }
  }
  update(delta: number) {
    if (this._targetDistance) {
      this.distance += (this._targetDistance - this.distance) * delta * 10;
    }
    const direction = this.pointA.position.copy().sub(this.pointB.position).normalize();
    if (direction.length > 0) {
      const dampingForce = this.segment.projection(this.pointA.velocity.copy().sub(this.pointB.velocity).scale(this.damping).add(this.center)).projection.sub(this.center);
      const d = (this.distance - this.pointA.position.distance(this.pointB.position)) / this.distance;
      const forceVal = /*Math.abs(Math.sin(Math.min(Math.max(d * (Math.PI / 2), -Math.PI / 2), Math.PI / 2))) * */this.constant * d
      direction.scale(forceVal).sub(dampingForce);
      this.pointA.addForce(direction);
      this.pointB.addForce(direction.scale(-1));
    }
  }
  drawNormal(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "#f004";
    ctx.fillStyle = "#0000";
    ctx.lineWidth = 1;
    ctx.beginPath()
    ctx.moveTo(this.center.x, this.center.y)
    ctx.lineTo(this.center.x + this.segment.normal.x * 10, this.center.y + this.segment.normal.y * 10);
    ctx.stroke();
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
  invertNormals() {
    //this.normalsInverted = !this.normalsInverted;
    let b = this.pointB;
    this.pointB = this.pointA;
    this.pointA = b;
  }
  get segment() {
    return new Segment((this.normalsInverted ? this.pointB : this.pointA).position, (this.normalsInverted ? this.pointA : this.pointB).position)
  }
  get center() {
    return this.pointA.position.copy().add(this.pointB.position).scale(0.5);
  }
  set target(target: number) {
    this._targetDistance = target;
  }
}