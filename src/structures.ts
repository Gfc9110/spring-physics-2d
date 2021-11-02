import { mousePickDistancesq } from "./constants";
import { Point } from "./point";
import { Spring } from "./spring";
import { Vector } from "./vector";
import { World } from "./world";

export class BoundingBox {
  constructor(public position: Vector, public size: Vector) { }
  intersects(bb: BoundingBox) {
    return (Math.abs((this.position.x + this.size.x / 2) - (bb.position.x + bb.size.x / 2)) * 2 < (this.size.x + bb.size.x)) &&
      (Math.abs((this.position.y + this.size.y / 2) - (bb.position.y + bb.size.y / 2)) * 2 < (this.size.y + bb.size.y))
  }
}
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
    this.points.forEach(p => p.addForce(this.world.gravity.copy().scale(p.mass)));
    this.springs.forEach(s => s.update());
    this.points.forEach(p => p.update(delta, this.world.base));
  }
  draw(ctx: CanvasRenderingContext2D) {
    let bb = this.boundingBox;
    ctx.strokeStyle = "#0002";
    this.world.structures.filter(s => s != this && s.boundingBox.intersects(bb)).forEach(_ => ctx.strokeStyle = "#f002");
    ctx.strokeRect(bb.position.x, bb.position.y, bb.size.x, bb.size.y)
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
  get boundingBox(): BoundingBox {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    this.points.forEach(p => {
      if (p.position.x < minX) {
        minX = p.position.x;
      }
      if (p.position.x > maxX) {
        maxX = p.position.x;
      }
      if (p.position.y < minY) {
        minY = p.position.y;
      }
      if (p.position.y > maxY) {
        maxY = p.position.y;
      }
    })
    return new BoundingBox(new Vector(minX, minY), new Vector(maxX - minX, maxY - minY));
  }
}

export class SoftCircle extends SoftStructure {
  constructor(world: World, center: Vector, radius: number = 50, sides: number = 8, stiffness = 500, centerFixed = false, mass = 1) {
    super(world);
    const angle = (Math.PI * 2) / sides;
    let centerPoint = new Point(this, center.copy(), mass, centerFixed);
    this.points.push(centerPoint);
    let lastPoint;
    let firstPoint;
    for (let i = 0; i < sides; i++) {
      const point = new Point(this, center.copy().add(new Vector(Math.cos(angle * i) * radius, Math.sin(angle * i) * radius)), mass, false, true)
      if (i == 0) firstPoint = point;
      this.points.push(point);
      this.springs.push(new Spring(centerPoint, point, stiffness))
      if (lastPoint) {
        this.springs.push(new Spring(point, lastPoint, stiffness, null, true))
      }
      if (i == sides - 1) {
        this.springs.push(new Spring(firstPoint, point, stiffness, null, true))
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
  constructor(world: World, startPosition: Vector, endPosition: Vector, steps: number = 30, startFixed = false, endFixed = false, tension = 5, width = 5) {
    super(world);
    const step = endPosition.copy().sub(startPosition).scale(1 / steps)
    const startPoint = new Point(this, startPosition.copy(), 1, startFixed, true);
    const endPoint = new Point(this, endPosition, 1, endFixed, true);
    this.points.push(startPoint, endPoint);
    const up = step.copy().rotate(Math.PI / 2).normalize().scale(width / 2);
    let lastUpPoint = startPoint;
    let lastDownPoint = startPoint;
    for (let i = 1; i < steps; i++) {
      const upPoint = new Point(this, startPosition.add(step).copy().add(up), 1, false, true);
      const downPoint = new Point(this, startPosition.copy().sub(up), 1, false, true);

      this.springs.push(new Spring(lastUpPoint, upPoint, tension, null, true, tension / 100))
      this.springs.push(new Spring(downPoint, lastDownPoint, tension, null, true, tension / 100))
      this.springs.push(new Spring(downPoint, upPoint, tension, null, false, tension / 100))

      if (i > 1) {
        this.springs.push(new Spring(downPoint, lastUpPoint, tension, null, false, tension / 100))
        this.springs.push(new Spring(upPoint, lastDownPoint, tension, null, false, tension / 100))
      }

      if (i == steps - 1) {
        this.springs.push(new Spring(upPoint, endPoint, tension, null, true, tension / 100))
        this.springs.push(new Spring(endPoint, downPoint, tension, null, true, tension / 100))
      }

      this.points.push(upPoint, downPoint);

      lastUpPoint = upPoint;
      lastDownPoint = downPoint;
    }
  }
}

export class SoftBox extends SoftStructure {
  constructor(world: World, center: Vector, size: Vector, stiffness = 500, fixed = false) {
    super(world);
    const topLeft = new Point(this, center.copy().add(new Vector(-size.x / 2, -size.y / 2)), 1, false, true);

    const topRight = new Point(this, center.copy().add(new Vector(size.x / 2, -size.y / 2)), 1, false, true);

    const bottomRight = new Point(this, center.copy().add(new Vector(size.x / 2, size.y / 2)), 1, fixed, true);

    const bottomLeft = new Point(this, center.copy().add(new Vector(-size.x / 2, size.y / 2)), 1, fixed, true);

    this.points.push(topLeft, topRight, bottomRight, bottomLeft);

    this.springs.push(new Spring(bottomRight, bottomLeft, stiffness, null, true));
    this.springs.push(new Spring(topRight, bottomRight, stiffness, null, true));
    this.springs.push(new Spring(topLeft, topRight, stiffness, null, true));
    this.springs.push(new Spring(bottomLeft, topLeft, stiffness, null, true));

    this.springs.push(new Spring(bottomLeft, topRight, stiffness, null));
    this.springs.push(new Spring(topLeft, bottomRight, stiffness, null));
  }
}