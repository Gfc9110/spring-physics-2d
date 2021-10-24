import { Point } from "./point";
import { SoftStructure, SoftCircle, Cord } from "./structures";
import { Vector } from "./vector";

export class World {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastTime: number = 0;
  gravity: Vector;
  base: number;
  structures: SoftStructure[] = [];
  draggingPoint: Point;
  mousePosition: Vector;
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    window.requestAnimationFrame(this.animationCallback.bind(this));
    this.gravity = new Vector(0, .8);
    this.base = window.innerHeight - 100;

    this.structures.push(new SoftCircle(this, new Vector(this.canvas.width / 2 - 150, this.base - 200), 100, 5));
    this.structures.push(new SoftCircle(this, new Vector(this.canvas.width / 2 + 150, this.base - 200), 100, 16));
    this.structures.push(new Cord(this, new Vector(this.canvas.width / 2 - 300, this.base - 600), new Vector(this.canvas.width / 2 + 300, this.base - 600), 20, true, true, 60));

    document.body.addEventListener("mousedown", this.handleMousedown.bind(this));
    document.body.addEventListener("mousemove", this.handleMousemove.bind(this));
    window.addEventListener("mouseup", this.handleMouseup.bind(this));
  }
  handleMousedown(event: MouseEvent) {
    this.mousePosition = new Vector(event.clientX, event.clientY);
    let point: Point;
    for (let i = 0; i < this.structures.length; i++) {
      if (point = this.structures[i].testPoint(this.mousePosition)) break;
    }
    this.draggingPoint = point;
  }
  handleMousemove(event: MouseEvent) {
    this.mousePosition = new Vector(event.clientX, event.clientY);
  }
  handleMouseup(event: MouseEvent) {
    this.mousePosition = new Vector(event.clientX, event.clientY);
    this.draggingPoint = null;
  }
  animationCallback(time: number) {
    const deltaTime = 0.016;//(time - this.lastTime) / 1000;
    this.lastTime = time;

    this.draggingPoint?.addForce(this.mousePosition.copy().sub(this.draggingPoint.position).scale(0.1));

    this.ctx.fillStyle = "#ffff";
    this.ctx.strokeStyle = "#fff0";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = "#000";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - 100);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - 100);
    this.ctx.stroke();

    //this.structures[0].addTorque(-0.001);
    //this.structures[1].addTorque(0.001);

    this.structures.forEach(s => s.update(deltaTime));
    this.structures.forEach(s => s.draw(this.ctx));

    window.requestAnimationFrame(this.animationCallback.bind(this));
  }
}