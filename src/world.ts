import { Inputs } from "./inputs";
import { Point } from "./point";
import { Stats } from "./stats";
import { SoftStructure, SoftCircle, Cord, BoundingBox, SoftBox, JumpingBox } from "./structures";
import { Vector } from "./vector";

const fps = document.querySelector("#fps");
export class World {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastTime: number = 0;
  gravity: Vector;
  base: number;
  structures: SoftStructure[] = [];
  draggingPoint: Point;
  mousePosition: Vector;
  bounds: BoundingBox;
  stats: Stats = new Stats();
  time: number = 0;
  inputs: Inputs;
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.inputs = new Inputs();
    window.requestAnimationFrame(this.animationCallback.bind(this));
    this.gravity = new Vector(0, .8);
    this.base = window.innerHeight - 100;
    this.bounds = new BoundingBox(new Vector(20, 20), new Vector(window.innerWidth - 40, window.innerHeight - 40));

    this.structures.push(new Cord(this, new Vector(this.canvas.width / 2 - 300, this.base - 600), new Vector(this.canvas.width / 2 + 300, this.base - 600), 30, true, true, 200, 15));
    this.structures.push(new SoftCircle(this, new Vector(this.canvas.width / 2 - 80 + 200, this.base - 200), 100, 4, 90000, true, 100));
    this.structures.push(new SoftBox(this, new Vector(this.canvas.width / 2 - 300 + Math.random() / 5, this.bounds.position.y + this.bounds.size.y - 175), new Vector(500, 50), 5000, true))
    for (let i = 0; i < 8; i++) {
      this.structures.push(new SoftBox(this, new Vector(this.canvas.width / 2 - 300 + Math.random() / 5, this.bounds.position.y + this.bounds.size.y - 200 - 25.2 - (50.2 * i)), new Vector(50, 50)))
    }
    for (let i = 0; i < 8; i++) {
      this.structures.push(new SoftBox(this, new Vector(this.canvas.width / 2 + Math.random() * 100, this.bounds.position.y - 100 * i), new Vector(20 + Math.random() * 40, 20 + Math.random() * 40)))
    }
    /*for (let i = 0; i < 5; i++) {
      this.structures.push(new JumpingBox(this, new Vector(this.canvas.width * (i + 1) / 6, this.bounds.position.y - 100), new Vector(50, 50)).rotate(Math.random() * Math.PI * 2));
    }*/

    this.structures.push(new JumpingBox(this, new Vector(this.canvas.width / 4, this.bounds.position.y + this.bounds.size.y / 2), new Vector(50, 50), 600));

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
    this.stats.ms(time - this.lastTime);
    fps.textContent = this.stats.fps.toFixed(2) + " FPS";
    const deltaTime = Math.min(1 / this.stats.fps, 0.008);
    this.lastTime = time;

    this.draggingPoint?.addForce(this.mousePosition.copy().sub(this.draggingPoint.position).scale(0.1 * this.draggingPoint.mass));

    this.ctx.fillStyle = "#fff8";
    this.ctx.strokeStyle = "#fff0";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#0000";
    this.ctx.strokeStyle = "#000f";
    this.ctx.beginPath();
    this.ctx.moveTo(this.bounds.position.x, this.bounds.position.y);
    this.ctx.lineTo(this.bounds.position.x, this.bounds.position.y + this.bounds.size.y);
    this.ctx.lineTo(this.bounds.position.x + this.bounds.size.x, this.bounds.position.y + this.bounds.size.y);
    this.ctx.lineTo(this.bounds.position.x + this.bounds.size.x, this.bounds.position.y);
    this.ctx.stroke();

    this.structures[1].addTorque(-.5);
    //this.structures[1].addTorque(.5);

    this.structures.forEach(s => s.update(deltaTime));
    this.time += deltaTime;
    this.structures.forEach(s => s.drawOutline(this.ctx));
    this.structures.forEach(s => s.draw(this.ctx));

    window.requestAnimationFrame(this.animationCallback.bind(this));
  }
}