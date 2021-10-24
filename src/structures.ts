import { mousePickDistancesq } from "./constants";
import { Point } from "./point";
import { Spring } from "./spring";
import { Vector } from "./vector";
import { World } from "./world";

export class SoftStructure {
  testPoint(position: Vector, maxDistanceSq: number = mousePickDistancesq) {
    for (let i = 0; i < this.points.length; i++) {
      if (this.points[i].testPoint(position, maxDistanceSq)) return this.points[i];
    }
  }
  springs: Spring[] = [];
  points: Point[] = [];
  constructor(public world: World) { }
  update(delta: number) {
    this.points.forEach(p => p.addForce(this.world.gravity.copy()));
    this.springs.forEach(s => s.update(delta));
    this.points.forEach(p => p.update(delta, this.world.base));
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.springs.forEach(s => s.draw(ctx));
    this.points.forEach(p => p.draw(ctx));
  }
  rotate(angle: number) {
    let center = this.center;
    this.points.forEach(p => p.rotateAround(angle, center))
    return this;
  }
  /*addForce(force: Vector) {
    this.points.forEach(p => p.addForce(force))
  }*/
  addTorque(torque: number) {
    let center = this.center;
    this.points.forEach(p => {
      const offset = p.position.copy().sub(center);
      if (offset.length > 0) {
        const direction = offset.copy().normalize().rotate(Math.PI / 2);
        p.addForce(direction.scale(offset.length * torque))
      }
    });
  }
  get center() {
    let center = new Vector();
    this.points.forEach(p => center.add(p.position));
    return center.scale(1 / this.points.length);
  }
}

export class SoftCircle extends SoftStructure {
  constructor(world: World, center: Vector, radius: number = 50, sides: number = 8) {
    super(world);
    const angle = (Math.PI * 2) / sides;
    let centerPoint = new Point(this, center.copy());
    this.points.push(centerPoint);
    let lastPoint;
    let firstPoint;
    for (let i = 0; i < sides; i++) {
      const point = new Point(this, center.copy().add(new Vector(Math.cos(angle * i) * radius, Math.sin(angle * i) * radius)))
      if (i == 0) firstPoint = point;
      this.points.push(point);
      this.springs.push(new Spring(centerPoint, point))
      if (lastPoint) {
        this.springs.push(new Spring(point, lastPoint))
      }
      if (i == sides - 1) {
        this.springs.push(new Spring(point, firstPoint))
      }
      lastPoint = point
    }
  }
  update(delta: number) {
    //this.centerPoint.addForce(new Vector(1, 0))
    //this.addTorque(0.001);
    //console.log(this.center);
    super.update(delta);
  }
}

export class Cord extends SoftStructure {
  constructor(world: World, startPosition: Vector, endPosition: Vector, steps: number = 30, firstFixed = false, lastFixed = false, tension = 5) {
    super(world);
    const step = endPosition.copy().sub(startPosition).scale(1 / steps)
    let lastPoint: Point;
    for (let i = 0; i < steps; i++) {
      const point = new Point(this, startPosition.add(step).copy(), 1, (i == 0 && firstFixed) || (i == steps - 1) && lastFixed);
      this.points.push(point);
      if (lastPoint) {
        this.springs.push(new Spring(point, lastPoint, tension));
      }
      lastPoint = point;
    }
  }
}