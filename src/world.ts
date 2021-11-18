import { Inputs } from "./inputs";
import { Point } from "./point";
import { AdvancedShapeCreator, ShapeCreator } from "./shapeCreator";
import { Stats } from "./stats";
import { SoftStructure, SoftCircle, Cord, BoundingBox, SoftBox, JumpingBox, OpenDonut, Car } from "./structures";
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
  //bounds: BoundingBox;
  stats: Stats = new Stats();
  time: number// = 0;
  inputs: Inputs;
  cameraPosition: Vector;
  draggingCamera: boolean = false;
  shapeCreator: ShapeCreator;
  createMode: boolean = false;
  advancedShapeCreator: AdvancedShapeCreator;
  runNextPhysicUpdate: boolean = false;
  constructor() {
    //this.advancedShapeCreator = new AdvancedShapeCreator(this);
    //this.canvas = document.createElement("canvas");
    //this.cameraPosition = new Vector(0, 0);
    //this.canvas.width = window.innerWidth;
    //this.canvas.height = window.innerHeight;
    //document.body.appendChild(this.canvas);
    //this.ctx = this.canvas.getContext('2d');
    //this.inputs = new Inputs();
    //window.requestAnimationFrame(this.animationCallback.bind(this));
    this.gravity = new Vector(0, .8);
    this.base = window.innerHeight - 100;
    //this.bounds = new BoundingBox(new Vector(-5000, 20), new Vector(window.innerWidth + 10000, window.innerHeight - 40));

    //this.structures.push(new Cord(this, new Vector(this.canvas.width / 2 - 300, this.base - 600), new Vector(this.canvas.width / 2 + 300, this.base - 600), 10, true, true, 200, 100));
    //this.structures.push(new SoftCircle(this, new Vector(this.canvas.width / 2 - 80 + 200, this.base - 200), 100, 4, 90000, true, 100));
    //this.structures.push(new SoftBox(this, new Vector(this.canvas.width / 2 - 300 + Math.random() / 5, this.bounds.position.y + this.bounds.size.y - 175), new Vector(500, 50), 5000, true))
    for (let i = 0; i < 8; i++) {
      //this.structures.push(new SoftBox(this, new Vector(this.canvas.width / 2 - 300 + Math.random() / 5, this.bounds.position.y + this.bounds.size.y - 200 - 25.2 - (50.2 * i)), new Vector(50, 50)))
    }
    for (let i = 0; i < 1; i++) {
      //this.structures.push(new SoftBox(this, new Vector(this.canvas.width / 2 + Math.random() * 100, this.bounds.position.y - 100 * i), new Vector(20 + Math.random() * 40, 20 + Math.random() * 40)))
    }
    for (let i = 0; i < 5; i++) {
      //this.structures.push(new JumpingBox(this, new Vector(this.canvas.width * (i + 1) / 6, this.bounds.position.y - 100), new Vector(50, 50)).rotate(Math.random() * Math.PI * 2));
    }

    //this.structures.push(new JumpingBox(this, new Vector(this.canvas.width / 4, this.bounds.position.y + this.bounds.size.y / 2), new Vector(50, 50), 500, false, 1));

    //this.structures.push(new OpenDonut(this, new Vector((this.canvas.width * 3 / 4) - 200, this.bounds.position.y + this.bounds.size.y - 200), 60, 150, 16));
    //this.structures.push(new OpenDonut(this, new Vector((this.canvas.width * 3 / 4) + 200, this.bounds.position.y + this.bounds.size.y - 200), 60, 150, 16).rotate(Math.PI));

    //this.structures.push(new Car(this, new Vector(this.canvas.width / 2, this.bounds.position.y + this.bounds.size.y - 100), new Vector(300, 50), 40, .7))

    //document.body.addEventListener("mousedown", this.handleMousedown.bind(this));
    //document.body.addEventListener("mousemove", this.handleMousemove.bind(this));
    //document.body.addEventListener("contextmenu", (event) => event.preventDefault());
    //window.addEventListener("mouseup", this.handleMouseup.bind(this));
    /*this.inputs.on("Tab", () => {
      this.createMode = !this.createMode;
    });
    this.inputs.on("Enter", () => {
      if (this.createMode) {
        this.advancedShapeCreator.create();
        this.advancedShapeCreator.reset();
        this.createMode = false;
      }
    })
    this.inputs.on("Escape", () => {
      this.advancedShapeCreator.reset();
    })
    this.inputs.on("ArrowRight", () => {
      this.runNextPhysicUpdate = true;
    })*/ 
  }
  addStructure(structure: SoftStructure) { 
    this.structures.push(structure);
  }
  handleMousedown(event: MouseEvent) {
    event.preventDefault();
    this.mousePosition = new Vector(event.clientX, event.clientY).sub(this.cameraPosition);
    if (event.button == 0) {
      if (!this.createMode) {
        let point: Point;
        for (let i = 0; i < this.structures.length; i++) {
          if (point = this.structures[i].testPoint(this.mousePosition)) break;
        }
        this.draggingPoint = point;
      } else {
        this.advancedShapeCreator.addPoint(this.mousePosition);
      }
    } else if (event.button == 1) {
      this.draggingCamera = true;
    } else if (event.button == 2) {
      if (!this.createMode) {
        this.shapeCreator = new ShapeCreator(this);
        this.shapeCreator.next(this.mousePosition);
      } else {
        this.advancedShapeCreator.startSpring(this.mousePosition);
      }
    }
  }
  handleMousemove(event: MouseEvent) {
    event.preventDefault();
    //if (event.button == 0) {
    //} else if (event.button == 1) {
    if (this.draggingCamera) {
      this.cameraPosition.add(new Vector(event.movementX, event.movementY));
    }

    this.mousePosition = new Vector(event.clientX, event.clientY).sub(this.cameraPosition);

    if (this.shapeCreator && !this.createMode) {
      this.shapeCreator.next(this.mousePosition);
    }

    if (this.createMode) {
      this.advancedShapeCreator.mouseMove(this.mousePosition);
    }
    //}
  }
  handleMouseup(event: MouseEvent) {
    event.preventDefault();
    this.mousePosition = new Vector(event.clientX, event.clientY).sub(this.cameraPosition);
    if (event.button == 0) {
      this.draggingPoint = null;
    } else if (event.button == 1) {
      this.draggingCamera = false;
    } else if (event.button == 2) {
      this.shapeCreator?.end(this.mousePosition);
      if (this.createMode) {
        this.advancedShapeCreator.endSpring(this.mousePosition);
      }
    }
  }
  physicUpdate(delta: number) {
    this.runNextPhysicUpdate = false;
    this.draggingPoint?.addForce(this.mousePosition.copy().sub(this.draggingPoint.position).scale(0.1 * this.draggingPoint.mass));
    //this.structures[1].addTorque(-.5);
    this.structures.forEach(s => s.update(delta));
  }
  animationCallback(time: number) {
    this.stats.ms(time - this.lastTime);
    fps.textContent = this.stats.fps.toFixed(2) + " FPS";
    const deltaTime = Math.min(1 / this.stats.fps, 0.02);
    this.lastTime = time;

    this.ctx.fillStyle = "#fff8";
    this.ctx.strokeStyle = "#fff0";
    this.ctx.resetTransform();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.transform(1, 0, 0, 1, this.cameraPosition.x, this.cameraPosition.y);

    if (this.shapeCreator) this.shapeCreator.draw(this.ctx);

    /*this.ctx.fillStyle = "#0000";
    this.ctx.strokeStyle = "#000f";
    this.ctx.beginPath();
    this.ctx.moveTo(this.bounds.position.x, this.bounds.position.y);
    this.ctx.lineTo(this.bounds.position.x, this.bounds.position.y + this.bounds.size.y);
    this.ctx.lineTo(this.bounds.position.x + this.bounds.size.x, this.bounds.position.y + this.bounds.size.y);
    this.ctx.lineTo(this.bounds.position.x + this.bounds.size.x, this.bounds.position.y);
    this.ctx.stroke();*/
    //this.structures[1].addTorque(.5);

    if (!this.createMode || this.runNextPhysicUpdate) {
      this.physicUpdate(deltaTime);
    } else {
      this.advancedShapeCreator.draw(this.ctx)
    }
    this.time += deltaTime;
    this.structures.forEach(s => s.drawOutline(this.ctx));
    this.structures.forEach(s => s.draw(this.ctx));

    window.requestAnimationFrame(this.animationCallback.bind(this));
  }
}