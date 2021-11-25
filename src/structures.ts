import { mousePickDistancesq } from "./constants";
import { Point, Segment } from "./point";
import { Spring } from "./spring";
import { lerpColor, Vector } from "./vector";
import { World } from "./world";

export class BoundingBox {
  constructor(public position: Vector, public size: Vector) {}
  intersects(bb: BoundingBox) {
    return (
      Math.abs(
        this.position.x + this.size.x / 2 - (bb.position.x + bb.size.x / 2)
      ) *
        2 <
        this.size.x + bb.size.x &&
      Math.abs(
        this.position.y + this.size.y / 2 - (bb.position.y + bb.size.y / 2)
      ) *
        2 <
        this.size.y + bb.size.y
    );
  }
}
export class SoftStructure {
  normalsRecalculated = false;
  random: number;
  gravityScale: number = 1;
  shapes: Shape[] = [];
  testPoint(position: Vector, maxDistanceSq: number = mousePickDistancesq) {
    let p = this.points
      .filter((p) => p.testPoint(position, maxDistanceSq))
      .sort(
        (a, b) =>
          a.position.distanceSq(position) - b.position.distanceSq(position)
      );
    return p[0];
  }
  springs: Spring[] = [];
  points: Point[] = [];
  constructor(
    public world: World,
    public fillStyle = "#999f",
    public strokeStyle = "#000f"
  ) {
    this.random = Math.random();
  }
  update(delta: number) {
    if (!this.normalsRecalculated) {
      //this.recalculateNormals();
      this.normalsRecalculated = true;
    }
    this.points.forEach((p) =>
      p.addForce(this.world.gravity.copy().scale(p.mass))
    );
    this.springs.forEach((s) => s.update(delta));
    this.points.forEach((p) => p.update(delta, this.world.base));
  }
  drawOutline(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.fillStyle;
    ctx.strokeStyle = this.strokeStyle;
    this.outlines.forEach((outline) => {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(outline[0].x, outline[0].y);
      outline.forEach((v, i) => {
        i == 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    //this.springs.filter(s => s.isSide).forEach(s => s.drawNormal(ctx));
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.points.forEach((p) => p.draw(ctx));
  }
  rotate(angle: number) {
    let center = this.center;
    this.points.forEach((p) => p.rotateAround(angle, center));
    return this;
  }
  /*addForce(force: Vector) {
    this.points.forEach(p => p.addForce(force))
  }*/
  addTorque(torque: number) {
    let center = this.center;
    this.points.forEach((p) => {
      const offset = p.position.copy().sub(center);
      if (offset.length > 0) {
        const direction = offset
          .copy()
          .normalize()
          .rotate(Math.PI / 2);
        p.addForce(direction.scale(offset.length * torque));
      }
    });
  }
  get center() {
    let center = new Vector();
    this.points.forEach((p) => center.add(p.position));
    return center.scale(1 / this.points.length);
  }
  get boundingBox(): BoundingBox {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    this.points.forEach((p) => {
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
    });
    return new BoundingBox(
      new Vector(minX, minY),
      new Vector(maxX - minX, maxY - minY)
    );
  }
  get outlines() {
    const outlines: Point[][] = [];
    while (
      this.points.find(
        (p) => p.isExternal && !outlines.flat().find((p1) => p == p1)
      )
    ) {
      let outlinePoints: Point[] = [];
      let currentPoint = this.points.find(
        (p) => p.isExternal && !outlines.flat().find((p1) => p == p1)
      );
      while (currentPoint) {
        outlinePoints.push(currentPoint);
        currentPoint = currentPoint.neighbors.find(
          (n) =>
            n.isExternal &&
            !outlinePoints.find((op) => op == n) &&
            this.springs.find(
              (s) =>
                s.isSide &&
                ((s.pointA == currentPoint && s.pointB == n) ||
                  (s.pointB == currentPoint && s.pointA == n))
            )
        );
      }
      outlines.push(outlinePoints);
    }
    return outlines.map((pts) => pts.map((p) => p.position));
  }
}

export class Shape {
  constructor(
    public structure: SoftStructure,
    public points: Point[],
    public springs: Spring[]
  ) {}
  get center() {
    let center = new Vector();
    this.points.forEach((p) => center.add(p.position));
    return center.scale(1 / this.points.length);
  }
  get boundingBox(): BoundingBox {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    this.points.forEach((p) => {
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
    });
    return new BoundingBox(
      new Vector(minX, minY),
      new Vector(maxX - minX, maxY - minY)
    );
  }
  isPositionInside(position: Vector) {
    let testSegment = new Segment(
      position,
      this.center.add(this.boundingBox.size)
    );
    return (
      this.springs.filter(
        (sp) => sp.isSide && sp.segment.intersects(testSegment)
      ).length %
        2 ==
      1
    );
  }
}

export class SoftBox extends SoftStructure {
  size: Vector;
  constructor(
    world: World,
    center: Vector,
    size: Vector,
    stiffness = 500,
    fixed = false,
    mass = 1,
    friction = 0.2
  ) {
    super(world);
    this.size = size;
    const topLeft = new Point(
      this,
      center.copy().add(new Vector(-size.x / 2, -size.y / 2)),
      mass,
      fixed,
      true,
      friction
    );

    const topRight = new Point(
      this,
      center.copy().add(new Vector(size.x / 2, -size.y / 2)),
      mass,
      fixed,
      true,
      friction
    );

    const bottomRight = new Point(
      this,
      center.copy().add(new Vector(size.x / 2, size.y / 2)),
      mass,
      fixed,
      true,
      friction
    );

    const bottomLeft = new Point(
      this,
      center.copy().add(new Vector(-size.x / 2, size.y / 2)),
      mass,
      fixed,
      true,
      friction
    );

    this.points.push(topLeft, topRight, bottomRight, bottomLeft);

    this.springs.push(
      new Spring(bottomRight, bottomLeft, stiffness, null, true)
    );
    this.springs.push(new Spring(topRight, bottomRight, stiffness, null, true));
    this.springs.push(new Spring(topLeft, topRight, stiffness, null, true));
    this.springs.push(new Spring(bottomLeft, topLeft, stiffness, null, true));

    this.springs.push(new Spring(bottomLeft, topRight, stiffness, null));
    this.springs.push(new Spring(topLeft, bottomRight, stiffness, null));
    this.shapes.push(new Shape(this, [...this.points], [...this.springs]));
  }
}

export class Car extends SoftStructure {
  bodyPoints: Point[] = [];
  leftWheelPoints: Point[] = [];
  rightWheelPoints: Point[] = [];
  rightWheelAnchorPoint: Point;
  leftWheelAnchorPoint: Point;
  bodySprings: Spring[] = [];
  leftWheelSprings: Spring[] = [];
  rightWheelSprings: Spring[] = [];
  constructor(
    world: World,
    center: Vector,
    size: Vector,
    wheelRadius: number,
    wheelDistance: number,
    wheelStep = 16,
    traction = 0.2
  ) {
    super(world);

    //BODY
    this.bodyPoints = [];
    this.bodyPoints.push(
      new Point(
        this,
        center.copy().add(size.copy().scale(-0.5)),
        5,
        false,
        true,
        0.3
      )
    ); // 0
    this.bodyPoints.push(
      new Point(
        this,
        center.copy().add(new Vector(size.x / 2, -size.y / 2)),
        5,
        false,
        true,
        0.3
      )
    ); // 1
    this.bodyPoints.push(
      new Point(
        this,
        center.copy().add(size.copy().scale(0.5)),
        5,
        false,
        true,
        0.3
      )
    ); // 2

    this.bodyPoints.push(
      (this.rightWheelAnchorPoint = new Point(
        this,
        center.copy().add(new Vector((size.x * wheelDistance) / 2, size.y / 2)),
        5,
        false,
        true,
        0.3
      ))
    ); // 3
    this.bodyPoints.push(
      (this.leftWheelAnchorPoint = new Point(
        this,
        center
          .copy()
          .add(new Vector((-size.x * wheelDistance) / 2, size.y / 2)),
        5,
        false,
        true,
        0.3
      ))
    ); // 4

    this.bodyPoints.push(
      new Point(
        this,
        center.copy().add(new Vector(-size.x / 2, size.y / 2)),
        5,
        false,
        true,
        0.3
      )
    ); // 5

    for (let i = 1; i < this.bodyPoints.length; i++) {
      this.bodySprings.push(
        new Spring(
          this.bodyPoints[i],
          this.bodyPoints[i - 1],
          10000,
          null,
          true
        )
      );
      if (i == this.bodyPoints.length - 1) {
        this.bodySprings.push(
          new Spring(this.bodyPoints[0], this.bodyPoints[i], 10000, null, true)
        );
      }
    }

    this.bodySprings.push(
      new Spring(this.bodyPoints[0], this.bodyPoints[2], 10000)
    );
    this.bodySprings.push(
      new Spring(this.bodyPoints[1], this.bodyPoints[5], 10000)
    );

    this.bodySprings.push(
      new Spring(this.bodyPoints[3], this.bodyPoints[1], 5000)
    );
    this.bodySprings.push(
      new Spring(this.bodyPoints[4], this.bodyPoints[0], 5000)
    );

    this.bodySprings.push(
      new Spring(this.bodyPoints[3], this.bodyPoints[0], 5000)
    );
    this.bodySprings.push(
      new Spring(this.bodyPoints[4], this.bodyPoints[1], 5000)
    );

    this.springs.push(...this.bodySprings);

    this.points.push(...this.bodyPoints);

    this.shapes.push(new Shape(this, this.bodyPoints, this.bodySprings));

    //LEFT WHEEL
    let angle = (Math.PI * 2) / wheelStep;
    let offset = new Vector(wheelRadius, 0);
    for (let i = 0; i < wheelStep; i++) {
      this.leftWheelPoints.push(
        new Point(
          this,
          offset.rotate(angle).copy().add(this.leftWheelAnchorPoint.position),
          2,
          false,
          true,
          traction
        )
      );
      this.leftWheelSprings.push(
        new Spring(this.leftWheelPoints[i], this.leftWheelAnchorPoint, 1000)
      );
      if (i > 0) {
        this.leftWheelSprings.push(
          new Spring(
            this.leftWheelPoints[i],
            this.leftWheelPoints[i - 1],
            500,
            null,
            true
          )
        );
      }
      if (i > 1) {
        this.leftWheelSprings.push(
          new Spring(this.leftWheelPoints[i], this.leftWheelPoints[i - 2], 500)
        );
      }
      if (i == wheelStep - 2) {
        this.leftWheelSprings.push(
          new Spring(this.leftWheelPoints[0], this.leftWheelPoints[i], 500)
        );
      }
      if (i == wheelStep - 1) {
        this.leftWheelSprings.push(
          new Spring(
            this.leftWheelPoints[0],
            this.leftWheelPoints[i],
            500,
            null,
            true
          )
        );
        this.leftWheelSprings.push(
          new Spring(this.leftWheelPoints[1], this.leftWheelPoints[i], 500)
        );
      }
    }
    this.points.push(...this.leftWheelPoints);
    this.springs.push(...this.leftWheelSprings);
    this.shapes.push(
      new Shape(this, this.leftWheelPoints, this.leftWheelSprings)
    );

    //RIGHT WHEEL
    //let angle = Math.PI * 2 / wheelStep;
    //let offset = new Vector(wheelRadius, 0)
    for (let i = 0; i < wheelStep; i++) {
      this.rightWheelPoints.push(
        new Point(
          this,
          offset.rotate(angle).copy().add(this.rightWheelAnchorPoint.position),
          2,
          false,
          true,
          traction
        )
      );
      this.rightWheelSprings.push(
        new Spring(this.rightWheelPoints[i], this.rightWheelAnchorPoint, 1000)
      );
      if (i > 0) {
        this.rightWheelSprings.push(
          new Spring(
            this.rightWheelPoints[i],
            this.rightWheelPoints[i - 1],
            500,
            null,
            true
          )
        );
      }
      if (i > 1) {
        this.rightWheelSprings.push(
          new Spring(this.rightWheelPoints[i], this.rightWheelPoints[i - 2], 50)
        );
      }
      if (i == wheelStep - 2) {
        this.rightWheelSprings.push(
          new Spring(this.rightWheelPoints[0], this.rightWheelPoints[i], 500)
        );
      }
      if (i == wheelStep - 1) {
        this.rightWheelSprings.push(
          new Spring(
            this.rightWheelPoints[0],
            this.rightWheelPoints[i],
            500,
            null,
            true
          )
        );
        this.rightWheelSprings.push(
          new Spring(this.rightWheelPoints[1], this.rightWheelPoints[i], 500)
        );
      }
    }
    this.points.push(...this.rightWheelPoints);
    this.springs.push(...this.rightWheelSprings);
    this.shapes.push(
      new Shape(this, this.rightWheelPoints, this.rightWheelSprings)
    );
  }
  update(delta: number) {
    /*if (this.world.inputs.get("KeyD")) {
      this.leftWheelPoints.forEach(p => {
        const offset = p.position.copy().sub(this.leftWheelAnchorPoint.position);
        if (offset.length > 0) {
          const direction = offset.copy().normalize().rotate(Math.PI / 2);
          p.addForce(direction.scale(80 / offset.length))
        }
      })
      this.rightWheelPoints.forEach(p => {
        const offset = p.position.copy().sub(this.rightWheelAnchorPoint.position);
        if (offset.length > 0) {
          const direction = offset.copy().normalize().rotate(Math.PI / 2);
          p.addForce(direction.scale(80 / offset.length))
        }
      })
    } else if (this.world.inputs.get("KeyA")) {
      this.leftWheelPoints.forEach(p => {
        const offset = p.position.copy().sub(this.leftWheelAnchorPoint.position);
        if (offset.length > 0) {
          const direction = offset.copy().normalize().rotate(Math.PI / 2);
          p.addForce(direction.scale(-80 / offset.length))
        }
      })
      this.rightWheelPoints.forEach(p => {
        const offset = p.position.copy().sub(this.rightWheelAnchorPoint.position);
        if (offset.length > 0) {
          const direction = offset.copy().normalize().rotate(Math.PI / 2);
          p.addForce(direction.scale(-80 / offset.length))
        }
      })
    }*/
    super.update(delta);
  }
}

export class WheelAxle extends SoftStructure {
  leftWheelPoints: Point[] = [];
  leftWheelAnchorPoint: Point;
  leftWheelSprings: Spring[] = [];
  rightWheelPoints: Point[] = [];
  rightWheelAnchorPoint: Point;
  rightWheelSprings: Spring[] = [];
  constructor(
    world: World,
    center: Vector,
    wheelRadius: number,
    wheelDistance: number,
    wheelStep = 16,
    traction = 0.2
  ) {
    super(world);

    this.rightWheelAnchorPoint = new Point(
      this,
      center.copy().add(new Vector(wheelDistance / 2, 0)),
      5,
      false,
      false,
      0.3
    );
    this.leftWheelAnchorPoint = new Point(
      this,
      center.copy().add(new Vector(-wheelDistance / 2, 0)),
      5,
      false,
      false,
      0.3
    );

    this.springs.push(
      new Spring(
        this.leftWheelAnchorPoint,
        this.rightWheelAnchorPoint,
        10000,
        null,
        false,
        400
      )
    );

    //LEFT WHEEL
    let angle = (Math.PI * 2) / wheelStep;
    let offset = new Vector(wheelRadius, 0);
    for (let i = 0; i < wheelStep; i++) {
      this.leftWheelPoints.push(
        new Point(
          this,
          offset.rotate(angle).copy().add(this.leftWheelAnchorPoint.position),
          2,
          false,
          true,
          traction
        )
      );
      this.leftWheelSprings.push(
        new Spring(this.leftWheelPoints[i], this.leftWheelAnchorPoint, 1000)
      );
      if (i > 0) {
        this.leftWheelSprings.push(
          new Spring(
            this.leftWheelPoints[i],
            this.leftWheelPoints[i - 1],
            500,
            null,
            true
          )
        );
      }
      if (i > 1) {
        this.leftWheelSprings.push(
          new Spring(this.leftWheelPoints[i], this.leftWheelPoints[i - 2], 500)
        );
      }
      if (i == wheelStep - 2) {
        this.leftWheelSprings.push(
          new Spring(this.leftWheelPoints[0], this.leftWheelPoints[i], 500)
        );
      }
      if (i == wheelStep - 1) {
        this.leftWheelSprings.push(
          new Spring(
            this.leftWheelPoints[0],
            this.leftWheelPoints[i],
            500,
            null,
            true
          )
        );
        this.leftWheelSprings.push(
          new Spring(this.leftWheelPoints[1], this.leftWheelPoints[i], 500)
        );
      }
    }
    this.points.push(...this.leftWheelPoints, this.leftWheelAnchorPoint);
    this.springs.push(...this.leftWheelSprings);
    this.shapes.push(
      new Shape(this, this.leftWheelPoints, this.leftWheelSprings)
    );

    //RIGHT WHEEL
    //let angle = Math.PI * 2 / wheelStep;
    //let offset = new Vector(wheelRadius, 0)
    for (let i = 0; i < wheelStep; i++) {
      this.rightWheelPoints.push(
        new Point(
          this,
          offset.rotate(angle).copy().add(this.rightWheelAnchorPoint.position),
          2,
          false,
          true,
          traction
        )
      );
      this.rightWheelSprings.push(
        new Spring(this.rightWheelPoints[i], this.rightWheelAnchorPoint, 1000)
      );
      if (i > 0) {
        this.rightWheelSprings.push(
          new Spring(
            this.rightWheelPoints[i],
            this.rightWheelPoints[i - 1],
            500,
            null,
            true
          )
        );
      }
      if (i > 1) {
        this.rightWheelSprings.push(
          new Spring(this.rightWheelPoints[i], this.rightWheelPoints[i - 2], 50)
        );
      }
      if (i == wheelStep - 2) {
        this.rightWheelSprings.push(
          new Spring(this.rightWheelPoints[0], this.rightWheelPoints[i], 500)
        );
      }
      if (i == wheelStep - 1) {
        this.rightWheelSprings.push(
          new Spring(
            this.rightWheelPoints[0],
            this.rightWheelPoints[i],
            500,
            null,
            true
          )
        );
        this.rightWheelSprings.push(
          new Spring(this.rightWheelPoints[1], this.rightWheelPoints[i], 500)
        );
      }
    }
    this.points.push(...this.rightWheelPoints, this.rightWheelAnchorPoint);
    this.springs.push(...this.rightWheelSprings);
    this.shapes.push(
      new Shape(this, this.rightWheelPoints, this.rightWheelSprings)
    );
  }
  drawOutline(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "#000";
    ctx.moveTo(
      this.leftWheelAnchorPoint.position.x,
      this.leftWheelAnchorPoint.position.y
    );
    ctx.lineTo(
      this.rightWheelAnchorPoint.position.x,
      this.rightWheelAnchorPoint.position.y
    );
    ctx.stroke();
    super.drawOutline(ctx);
  }
}
