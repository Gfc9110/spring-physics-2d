import { mousePickDistancesq } from "./constants";
import { Point, Segment } from "./point";
import { Spring } from "./spring";
import { lerpColor, Vector } from "./vector";
import { World } from "./world";

export class BoundingBox {
  constructor(public position: Vector, public size: Vector) { }
  intersects(bb: BoundingBox) {
    return (Math.abs((this.position.x + this.size.x / 2) - (bb.position.x + bb.size.x / 2)) * 2 < (this.size.x + bb.size.x)) &&
      (Math.abs((this.position.y + this.size.y / 2) - (bb.position.y + bb.size.y / 2)) * 2 < (this.size.y + bb.size.y))
  }
}
export class SoftStructure {
  normalsRecalculated = false;
  random: number;
  gravityScale: number = 1;
  testPoint(position: Vector, maxDistanceSq: number = mousePickDistancesq) {
    for (let i = 0; i < this.points.length; i++) {
      if (this.points[i].testPoint(position, maxDistanceSq)) return this.points[i];
    }
  }
  springs: Spring[] = [];
  points: Point[] = [];
  constructor(public world: World, public fillStyle = "#999f", public strokeStyle = "#000f") {
    this.random = Math.random();
  }
  update(delta: number) {
    if (!this.normalsRecalculated) {
      //this.recalculateNormals();
      this.normalsRecalculated = true;
    }
    this.points.forEach(p => p.addForce(this.world.gravity.copy().scale(p.mass)));
    this.springs.forEach(s => s.update(delta));
    this.points.forEach(p => p.update(delta, this.world.base));
  }
  drawOutline(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.fillStyle;
    ctx.strokeStyle = this.strokeStyle;
    this.outlines.forEach(outline => {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(outline[0].x, outline[0].y);
      outline.forEach((v, i) => {
        i == 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)
      })
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    })
    //this.springs.filter(s => s.isSide).forEach(s => s.drawNormal(ctx));
  }
  draw(ctx: CanvasRenderingContext2D) {
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
  get outlines() {
    const outlines: Point[][] = [];
    while (this.points.find((p) => p.isExternal && !outlines.flat().find(p1 => p == p1))) {
      let outlinePoints: Point[] = [];
      let currentPoint = this.points.find((p) => p.isExternal && !outlines.flat().find(p1 => p == p1));
      while (currentPoint) {
        outlinePoints.push(currentPoint);
        currentPoint = currentPoint.neighbors.find(n => n.isExternal && !outlinePoints.find(op => op == n) && this.springs.find(s => s.isSide && ((s.pointA == currentPoint && s.pointB == n) || (s.pointB == currentPoint && s.pointA == n))));
      }
      outlines.push(outlinePoints);
    }
    return outlines.map(pts => pts.map(p => p.position));
  }
  isPositionInside(position: Vector) {
    let testSegment = new Segment(position, this.center.add(this.boundingBox.size));
    return this.springs.filter(sp => sp.isSide && sp.segment.intersects(testSegment)).length % 2 == 1;
  }
  recalculateNormals() {
    this.springs.filter(s => s.isSide).forEach(s => {
      if (this.isPositionInside(s.center.add(s.segment.normal))) {
        console.log(this)
        console.log("invertingNormal")
        //s.invertNormals();
      }
    })
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
    this.points.push(endPoint, startPoint);
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
  size: Vector;
  constructor(world: World, center: Vector, size: Vector, stiffness = 500, fixed = false, mass = 1) {
    super(world);
    this.size = size;
    const topLeft = new Point(this, center.copy().add(new Vector(-size.x / 2, -size.y / 2)), mass, fixed, true);

    const topRight = new Point(this, center.copy().add(new Vector(size.x / 2, -size.y / 2)), mass, fixed, true);

    const bottomRight = new Point(this, center.copy().add(new Vector(size.x / 2, size.y / 2)), mass, fixed, true);

    const bottomLeft = new Point(this, center.copy().add(new Vector(-size.x / 2, size.y / 2)), mass, fixed, true);

    this.points.push(topLeft, topRight, bottomRight, bottomLeft);

    this.springs.push(new Spring(bottomRight, bottomLeft, stiffness, null, true));
    this.springs.push(new Spring(topRight, bottomRight, stiffness, null, true));
    this.springs.push(new Spring(topLeft, topRight, stiffness, null, true));
    this.springs.push(new Spring(bottomLeft, topLeft, stiffness, null, true));

    this.springs.push(new Spring(bottomLeft, topRight, stiffness, null));
    this.springs.push(new Spring(topLeft, bottomRight, stiffness, null));
  }
}

export class JumpingBox extends SoftBox {
  constructor(world: World, center: Vector, size: Vector, stiffness = 500, fixed = false, mass = 1) {
    super(world, center, size, stiffness, fixed, mass);
    this.strokeStyle = "#0000";
  }
  update(delta: number) {
    this.springs[1].target = this.world.inputs.get("KeyS") ? this.size.y / 3 : this.size.y * 3;
    this.springs[3].target = this.world.inputs.get("KeyS") ? this.size.y / 3 : this.size.y * 3;
    this.fillStyle = lerpColor("#ff6644", "#55ccs55", Math.pow((this.springs[1].distance - this.size.y / 3) / (this.size.y * 3 - this.size.y / 3), 2));
    super.update(delta);
  }
}

export class OpenDonut extends SoftStructure {
  constructor(world: World, center: Vector, r: number = 80, R: number = 100, sides = 10) {
    super(world);
    const angle = Math.PI * 2 / (sides + 2);
    let temp = new Vector(r, 0);
    let internalPoints: Point[] = [];
    for (let i = 0; i < sides; i++) {
      this.points.push(internalPoints[i] = new Point(this, center.copy().add(temp.rotate(angle)), 1, false, true));
      if (i > 0) {
        this.springs.push(new Spring(internalPoints[i - 1], internalPoints[i], 1000, null, true));
      }
      if (i == sides - 1) {
        this.springs.push(new Spring(internalPoints[0], internalPoints[i], 1000, null, false));
      }
    }
    let externalPoints: Point[] = [];
    temp.scale(R / r);
    for (let i = 0; i < sides; i++) {
      this.points.push(externalPoints[i] = new Point(this, center.copy().add(temp), 1, false, true));
      temp.rotate(-angle)
      const isExt = i == 0 || i == sides - 1;
      this.springs.push(new Spring(externalPoints[i], internalPoints[sides - i - 1], 1000, null, isExt));
      if (!isExt) {
        this.springs.push(new Spring(externalPoints[i], internalPoints[sides - i - 2], 1000, null, isExt));
        this.springs.push(new Spring(externalPoints[i], internalPoints[sides - i], 1000, null, isExt));
      }
      if (i > 0) {
        this.springs.push(new Spring(externalPoints[i - 1], externalPoints[i], 1000, null, true));
      }
      if (i == sides - 1) {
        this.springs.push(new Spring(externalPoints[0], externalPoints[i], 1000, null, false));
        this.springs.push(new Spring(externalPoints[0], internalPoints[0], 1000, null, false));
        this.springs.push(new Spring(externalPoints[i], internalPoints[i], 1000, null, false));
      }
    }
  }
}

export class Car extends SoftStructure {
  bodyPoints: Point[];
  leftWheelPoints: Point[];
  rightWheelPoints: Point[];
  rightWheelAnchorPoint: Point;
  leftWheelAnchorPoint: Point;
  constructor(world: World, center: Vector, size: Vector, wheelRadius: number, wheelDistance: number, wheelStep = 10) {
    super(world);

    //BODY
    this.bodyPoints = [];
    this.bodyPoints.push(new Point(this, center.copy().add(size.copy().scale(-0.5)), 5, false, true)); // 0
    this.bodyPoints.push(new Point(this, center.copy().add(new Vector(size.x / 2, -size.y / 2)), 5, false, true)); // 1
    this.bodyPoints.push(new Point(this, center.copy().add(size.copy().scale(0.5)), 5, false, true)); // 2

    this.bodyPoints.push(this.rightWheelAnchorPoint = new Point(this, center.copy().add(new Vector(size.x * wheelDistance / 2, size.y / 2)), 5, false, true)); // 3
    this.bodyPoints.push(this.leftWheelAnchorPoint = new Point(this, center.copy().add(new Vector(-size.x * wheelDistance / 2, size.y / 2)), 5, false, true)); // 4

    this.bodyPoints.push(new Point(this, center.copy().add(new Vector(-size.x / 2, size.y / 2)), 5, false, true)); // 5

    for (let i = 1; i < this.bodyPoints.length; i++) {
      this.springs.push(new Spring(this.bodyPoints[i], this.bodyPoints[i - 1], 10000, null, true))
      if (i == this.bodyPoints.length - 1) {
        this.springs.push(new Spring(this.bodyPoints[0], this.bodyPoints[i], 10000, null, true))
      }
    }

    this.springs.push(new Spring(this.bodyPoints[0], this.bodyPoints[2], 10000))
    this.springs.push(new Spring(this.bodyPoints[1], this.bodyPoints[5], 10000))

    this.springs.push(new Spring(this.bodyPoints[3], this.bodyPoints[1], 10000))
    this.springs.push(new Spring(this.bodyPoints[4], this.bodyPoints[0], 10000))

    this.springs.push(new Spring(this.bodyPoints[3], this.bodyPoints[0], 10000))
    this.springs.push(new Spring(this.bodyPoints[4], this.bodyPoints[1], 10000))

    this.points.push(...this.bodyPoints);

    //LEFT WHEEL

    this.leftWheelPoints = [];
    let angle = Math.PI * 2 / wheelStep;
    let offset = new Vector(wheelRadius, 0)
    for (let i = 0; i < wheelStep; i++) {
      this.leftWheelPoints.push(new Point(this, offset.rotate(angle).copy().add(this.leftWheelAnchorPoint.position), 1, false, true));
      this.springs.push(new Spring(this.leftWheelPoints[i], this.leftWheelAnchorPoint, 500));
      if (i > 0) {
        this.springs.push(new Spring(this.leftWheelPoints[i], this.leftWheelPoints[i - 1], null, null, true));
      }
      if (i > 1) {
        this.springs.push(new Spring(this.leftWheelPoints[i], this.leftWheelPoints[i - 2]));
      }
      if (i == wheelStep - 2) {
        this.springs.push(new Spring(this.leftWheelPoints[0], this.leftWheelPoints[i]));
      }
      if (i == wheelStep - 1) {
        this.springs.push(new Spring(this.leftWheelPoints[0], this.leftWheelPoints[i], null, null, true));
        this.springs.push(new Spring(this.leftWheelPoints[1], this.leftWheelPoints[i]));
      }
    }
    this.points.push(...this.leftWheelPoints);

    //RIGHT WHEEL

    this.rightWheelPoints = [];
    //let angle = Math.PI * 2 / wheelStep;
    //let offset = new Vector(wheelRadius, 0)
    for (let i = 0; i < wheelStep; i++) {
      this.rightWheelPoints.push(new Point(this, offset.rotate(angle).copy().add(this.rightWheelAnchorPoint.position), 1, false, true));
      this.springs.push(new Spring(this.rightWheelPoints[i], this.rightWheelAnchorPoint, 500));
      if (i > 0) {
        this.springs.push(new Spring(this.rightWheelPoints[i], this.rightWheelPoints[i - 1], null, null, true));
      }
      if (i > 1) {
        this.springs.push(new Spring(this.rightWheelPoints[i], this.rightWheelPoints[i - 2]));
      }
      if (i == wheelStep - 2) {
        this.springs.push(new Spring(this.rightWheelPoints[0], this.rightWheelPoints[i]));
      }
      if (i == wheelStep - 1) {
        this.springs.push(new Spring(this.rightWheelPoints[0], this.rightWheelPoints[i], null, null, true));
        this.springs.push(new Spring(this.rightWheelPoints[1], this.rightWheelPoints[i]));
      }
    }
    this.points.push(...this.rightWheelPoints);

  }
  update(delta: number) {
    if (this.world.inputs.get("KeyD")) {
      this.leftWheelPoints.forEach(p => {
        const offset = p.position.copy().sub(this.leftWheelAnchorPoint.position);
        if (offset.length > 0) {
          const direction = offset.copy().normalize().rotate(Math.PI / 2);
          p.addForce(direction.scale(20 / offset.length))
        }
      })
      this.rightWheelPoints.forEach(p => {
        const offset = p.position.copy().sub(this.rightWheelAnchorPoint.position);
        if (offset.length > 0) {
          const direction = offset.copy().normalize().rotate(Math.PI / 2);
          p.addForce(direction.scale(20 / offset.length))
        }
      })
    } else if (this.world.inputs.get("KeyA")) {
      this.leftWheelPoints.forEach(p => {
        const offset = p.position.copy().sub(this.leftWheelAnchorPoint.position);
        if (offset.length > 0) {
          const direction = offset.copy().normalize().rotate(Math.PI / 2);
          p.addForce(direction.scale(-20 / offset.length))
        }
      })
      this.rightWheelPoints.forEach(p => {
        const offset = p.position.copy().sub(this.rightWheelAnchorPoint.position);
        if (offset.length > 0) {
          const direction = offset.copy().normalize().rotate(Math.PI / 2);
          p.addForce(direction.scale(-20 / offset.length))
        }
      })
    }
    super.update(delta);
  }
}