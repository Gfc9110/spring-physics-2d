import { Point, Segment } from "./point";
import { Spring } from "./spring";
import { SoftStructure } from "./structures";
import { Vector } from "./vector";
import { World } from "./world";

export class ShapeCreator {
  points: Vector[] = [];
  constructor(public world: World) { }
  next(position: Vector) {
    if (!this.lastPoint || position.distance(this.lastPoint) > 50) {
      this.points.push(position.copy());
    }
  }
  end(position: Vector) {
    this.next(position);
    let structure = new SoftStructure(this.world);
    let points = this.points.map(v => new Point(structure, v, 1, false, true));
    let springs = [];
    for (let i = 1; i < points.length; i++) {
      springs.push(new Spring(points[i], points[i - 1], null, null, true));
      if (i == points.length - 1) {
        springs.push(new Spring(points[i], points[0], null, null, true));
      }
    }

    structure.points = points;
    structure.springs = springs;
    let centerPoint = new Point(structure, structure.center, 1, false, false);
    springs.push(...points.map(p => new Spring(p, centerPoint)));
    points.push(centerPoint);
    this.world.structures.push(structure);
    this.world.shapeCreator = null;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000f";
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    this.points.forEach((p, i) => {
      if (i > 0) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
    })
    ctx.stroke();
  }
  get lastPoint() {
    return this.points[this.points.length - 1];
  }
}

export class AdvancedShapeCreator {
  points: Point[] = [];
  springs: Spring[] = [];
  creatingSpring: { a: Vector, b: Vector };
  structure: SoftStructure;
  startPoint: Point;
  constructor(public world: World) {
    this.structure = new SoftStructure(world);
  }
  addPoint(position: Vector) {
    this.points.push(new Point(this.structure, position))
  }
  startSpring(position: Vector) {
    this.startPoint = this.points.find(p => p.position.distanceSq(position) < 400);
    if (this.startPoint) {
      this.creatingSpring = { a: this.startPoint.position, b: position };
    }
  }
  mouseMove(position: Vector) {
    if (this.creatingSpring) {
      let endPoint = this.points.find(p => p != this.startPoint && p.position.distanceSq(position) < 900);
      this.creatingSpring.b = endPoint?.position || position;
    }
  }
  endSpring(position: Vector) {
    if (this.startPoint) {
      let endPoint = this.points.find(p => p != this.startPoint && p.position.distanceSq(position) < 900);
      if (endPoint) {
        this.springs.push(new Spring(this.startPoint, endPoint, null, null, this.world.inputs.get("ControlLeft")));
        if (this.world.inputs.get("ControlLeft")) {
          this.startPoint.isExternal = true;
          endPoint.isExternal = true;
        }
      }
      this.creatingSpring = null;
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.points.forEach(p => p.drawPoint(ctx))
    this.springs.forEach(s => s.draw(ctx))
    if (this.creatingSpring) {
      ctx.strokeStyle = "#000f";
      ctx.fillStyle = "#0000";
      ctx.beginPath();
      ctx.moveTo(this.creatingSpring.a.x, this.creatingSpring.a.y);
      ctx.lineTo(this.creatingSpring.b.x, this.creatingSpring.b.y);
      ctx.stroke();
    }
  }
  reset() {
    this.points = [];
    this.springs = [];
    this.structure = new SoftStructure(this.world);
  }
  create() {
    this.structure.points = this.points;
    this.structure.springs = this.springs;
    this.world.structures.push(this.structure);
  }
}