import { Inputs, MouseButton } from "./inputs";
import { Stats } from "./stats";
import { Car, SoftBox } from "./structures";
import { Vector } from "./vector";
import { World } from "./world";

export interface Transform {
  position: Vector;
  //rotation: number;
  scale: number;
}

export enum EditorState {
  PAUSE = 0,
  PLAY = 1
}

export class Editor {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  inputs: Inputs;
  cameraTransform: Transform
  world: World;
  state: EditorState = 1;
  stats: Stats;
  time: number = 0;
  lastTime: number = 0;
  testCar: Car;
  draggingCamera = false;
  mainTools: ToolGroup;
  constructor() {
    this.stats = new Stats();
    this.world = new World();
    this.canvas = document.createElement("canvas");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);
    this.world.addStructure(this.testCar = new Car(this.world, new Vector(0, this.canvas.height / 2), new Vector(300, 50), 40, .7));
    this.world.addStructure(new SoftBox(this.world, new Vector(0, this.canvas.height), new Vector(this.canvas.width, 50), 100, true, 1));
    this.cameraTransform = {
      position: new Vector(0, this.canvas.height / 2),
      //rotation: 0,
      scale: 1,
    }
    this.ctx = this.canvas.getContext('2d');
    this.inputs = new Inputs();

    this.mainTools = new ToolGroup();
    this.mainTools.addTool(new Tool("cursor-move", (event) => {
      console.log(event);
      document.body.style.cursor = "auto";
    }))
    this.mainTools.addTool(new Tool("vector-square-plus", (event) => {
      console.log(event);
      document.body.style.cursor = "crosshair";
    }))


    window.requestAnimationFrame(this.render.bind(this));
    this.inputs.onMousedown(this.onMousedown.bind(this));
    this.inputs.onMousemove(this.onMousemove.bind(this));
    this.inputs.onMouseup(this.onMouseup.bind(this));
    this.inputs.onMouseWheel(this.onMouseWheel.bind(this));
    this.inputs.on("Tab", () => {
      switch (this.state) {
        case EditorState.PLAY:
          this.state = EditorState.PAUSE;
          break;
        case EditorState.PAUSE:
          this.state = EditorState.PLAY;
          break;
      }
    });
  }
  render(time: number) {
    this.stats.ms(time - this.lastTime);
    //console.log(this.stats.fps.toFixed(2) + " FPS");
    const deltaTime = Math.min(1 / this.stats.fps, 0.02);
    this.lastTime = time;

    if (this.state == EditorState.PLAY || this.inputs.get("ArrowRight")) {
      this.world.physicUpdate(deltaTime);
    }

    this.drawWorld();

    window.requestAnimationFrame(this.render.bind(this));
  }
  drawWorld() {

    this.ctx.fillStyle = "#ffff";
    this.ctx.strokeStyle = "#fff0";
    this.ctx.resetTransform();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.transform(1, 0, 0, 1, this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.transform(this.cameraTransform.scale, 0, 0, this.cameraTransform.scale, 0, 0);
    this.ctx.transform(1, 0, 0, 1, - this.cameraTransform.position.x, - this.cameraTransform.position.y);
    const ctx = this.ctx;
    this.world.structures.forEach(s => s.drawOutline(ctx));
    this.world.structures.forEach(s => s.draw(ctx));
  }
  onMousedown(button: MouseButton, screenPosition: Vector) {
    switch (button) {
      case MouseButton.MIDDLE: { this.draggingCamera = true; }
      default: { }
    }
  }
  onMousemove(screenPosition: Vector, screenOffset: Vector) {
    if (this.draggingCamera) {
      this.cameraTransform.position.add(screenOffset.scale(-1 / this.cameraTransform.scale))
    }
  }
  onMouseup(button: MouseButton, screenPosition: Vector) {
    switch (button) {
      case MouseButton.MIDDLE: { this.draggingCamera = false; }
      default: { }
    }
  }
  onMouseWheel(deltaY: number, screenPosition: Vector) {
    const lastScale = this.cameraTransform.scale;
    this.cameraTransform.scale *= deltaY > 0 ? 0.95 : 1.05;
    this.cameraTransform.scale = Math.max(0.1, Math.min(this.cameraTransform.scale, 10))
    const centerMouse = screenPosition.copy().sub(new Vector(this.canvas.width / 2, this.canvas.height / 2))
    if (lastScale != this.cameraTransform.scale)
      this.cameraTransform.position.add(centerMouse.scale((deltaY < 0 ? 0.05 : -0.05) / this.cameraTransform.scale))
  }
}

export class ToolGroup {
  parent = document.querySelector("#toolbar");
  element: HTMLDivElement;
  tools: Tool[] = [];
  constructor() {
    this.element = classEl("toolgroup");
    this.parent.appendChild(this.element);
  }
  addTool(tool: Tool) {
    this.element.appendChild(tool.element);
    this.tools.push(tool);
  }
}

export class Tool {
  element: HTMLDivElement;
  constructor(iconName: string, clickCallback: (event: PointerEvent) => any) {
    this.element = classEl("tool");
    this.element.appendChild(iconEl(iconName))
    this.element.addEventListener("click", clickCallback);
  }
}

function classEl(className: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  return el;
}

function iconEl(iconName: string): HTMLDivElement {
  return classEl(`mdi mdi-${iconName}`)
}