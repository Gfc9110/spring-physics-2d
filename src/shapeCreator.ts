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
      springs.push(new Spring(points[i], points[i - 1], 1000, null, true));
      if (i == points.length - 1) {
        springs.push(new Spring(points[i], points[0], 1000, null, true));
      }
    }

    structure.points = points;
    structure.springs = springs;
    let centerPoint = new Point(structure, structure.center, 1, false, false);
    springs.push(...points.map(p => new Spring(p, centerPoint, 1000)));
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