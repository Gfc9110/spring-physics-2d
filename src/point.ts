import { SoftStructure } from "./structures";
import { Vector } from "./vector";

export class Segment {
  static onSegment(a: Vector, b: Vector, c: Vector) {
    return b.x <= Math.max(a.x, c.x) && b.x >= Math.min(a.x, c.x) &&
      b.y <= Math.max(a.y, c.y) && b.y >= Math.min(a.y, c.y)
  }
  static orientation(a: Vector, b: Vector, c: Vector) {
    let val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (val == 0) return 0;
    return val > 0 ? 1 : 2;
  }
  constructor(public a: Vector, public b: Vector) { }
  intersects(s: Segment) {
    let o1 = Segment.orientation(this.a, this.b, s.a);
    let o2 = Segment.orientation(this.a, this.b, s.b);
    let o3 = Segment.orientation(s.a, s.b, this.a);
    let o4 = Segment.orientation(s.a, s.b, this.b);

    if (o1 != o2 && o3 != o4) {
      return true;
    }
  }
}

export class Point {
  velocity: Vector;
  acceleration: Vector;
  _neighbors: Point[];
  _neighborsSegments: Segment[];
  constructor(public structure: SoftStructure, public position: Vector/*, private world: World*/, public mass: number = 1, public isFixed = false) {
    this.acceleration = new Vector();
    this.velocity = new Vector();
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#0000";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 2, 0, Math.PI * 2);
    ctx.fill();

    if (this.structure.world.draggingPoint == this) {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.position.x, this.position.y);
      ctx.lineTo(this.structure.world.mousePosition.x, this.structure.world.mousePosition.y);
      ctx.stroke();
    }
  }
  addForce(force: Vector) {
    this.acceleration.add(force.copy().scale(1 / this.mass));
  }
  update(delta: number, base?: number) {
    //console.log(this.acceleration);
    if (!this.isFixed) {
      this.velocity.add(this.acceleration.scale(delta));

      this.velocity.scale(0.999);

      const newPosition = this.position.copy().add(this.velocity);

      let testSegments = this.neighborsSegments(newPosition);

      if (!this.structure.world.structures.some(st => st != this.structure && st.boundingBox.intersects(this.structure.boundingBox) && st.springs.some(s => {
        let segment = new Segment(s.pointA.position, s.pointB.position);
        return testSegments.some(s => s.intersects(segment));
      }))) {
        this.position = newPosition;
      } else {
        /*let opposingAcceleration = this.velocity.scale(-1);
        let totalMass = */
        this.velocity = new Vector();
      }
      if (base && this.position.y > base) {
        this.position.y = base;
        this.velocity.y = 0;
        this.velocity.scale(0.8);
      }
      this.acceleration = new Vector();
    }
  }
  rotateAround(angle: number, around: Vector) {
    this.position.rotateAround(angle, around);
  }
  testPoint(position: Vector, maxDistanceSq: number) {
    return this.position.distanceSq(position) <= maxDistanceSq;
  }
  get neighbors(): Point[] {
    return this._neighbors || (this._neighbors = this.structure.springs.filter(s => s.pointA == this || s.pointB == this).map(s => s.pointA == this ? s.pointB : s.pointA));
  }
  neighborsSegments(position?: Vector) {
    return this.neighbors.map(p => new Segment(p.position, position || this.position));
  }
}