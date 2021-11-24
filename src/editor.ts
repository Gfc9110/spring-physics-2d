import { EditorMouseEvent } from "./domHelpers";
import {
  BoxTool,
  CreateTool,
  DragTool,
  EditorToolGroup,
  SelectTool,
} from "./editorTool";
import { Inputs, MouseButton } from "./inputs";
import { Point } from "./point";
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
  PLAY = 1,
}

export class Editor {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  inputs: Inputs;
  cameraTransform: Transform;
  world: World;
  state: EditorState = 1;
  stats: Stats;
  time: number = 0;
  lastTime: number = 0;
  testCar: Car;
  draggingCamera = false;
  draggingPoint: Point;
  frameTime: number = null;
  mousePosition: Vector;
  mainTools: EditorToolGroup;
  constructor() {
    this.stats = new Stats();
    this.world = new World();
    this.canvas = document.createElement("canvas");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);
    this.world.addStructure(
      (this.testCar = new Car(
        this.world,
        new Vector(0, this.canvas.height / 2),
        new Vector(300, 50),
        40,
        0.7
      ))
    );
    this.world.addStructure(
      new SoftBox(
        this.world,
        new Vector(0, this.canvas.height),
        new Vector(this.canvas.width, 50),
        100,
        true,
        1
      )
    );
    this.cameraTransform = {
      position: new Vector(0, this.canvas.height / 2),
      //rotation: 0,
      scale: 1,
    };
    this.ctx = this.canvas.getContext("2d");
    this.inputs = new Inputs(this);

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

    this.mainTools = new EditorToolGroup(this);
    this.mainTools.addTools(
      new SelectTool(this),
      new DragTool(this),
      new BoxTool(this),
      new CreateTool(this)
    );
    this.mainTools.activateTool(1);

    this.stats.calculateFPS(250);
  }
  render(time: number) {
    if (this.state == EditorState.PLAY || this.inputs.get("ArrowRight")) {
      this.mainTools.onUpdate(0.005);
      this.world.physicUpdate(0.005);
    }

    this.drawWorld();

    this.mainTools.onDraw();

    window.requestAnimationFrame(this.render.bind(this));
  }
  drawWorld() {
    this.ctx.fillStyle = "#ffff";
    this.ctx.strokeStyle = "#fff0";
    this.ctx.resetTransform();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.transform(
      1,
      0,
      0,
      1,
      this.canvas.width / 2,
      this.canvas.height / 2
    );
    this.ctx.transform(
      this.cameraTransform.scale,
      0,
      0,
      this.cameraTransform.scale,
      0,
      0
    );
    this.ctx.transform(
      1,
      0,
      0,
      1,
      -this.cameraTransform.position.x,
      -this.cameraTransform.position.y
    );
    const ctx = this.ctx;
    this.world.structures.forEach((s) => s.drawOutline(ctx));
    this.world.structures.forEach((s) => s.draw(ctx));
  }
  onMousedown(event: EditorMouseEvent) {
    switch (event.button) {
      case MouseButton.MIDDLE: {
        this.draggingCamera = true;
        break;
      }
      default: {
        this.mainTools.onMousedown(event);
      }
    }
  }
  onMousemove(event: EditorMouseEvent) {
    this.mousePosition = event.screenPosition;
    if (this.draggingCamera) {
      this.cameraTransform.position.add(
        event.screenMovement.copy().scale(-1 / this.cameraTransform.scale)
      );
    } else {
      this.mainTools.onMousemove(event);
    }
  }
  onMouseup(event: EditorMouseEvent) {
    switch (event.button) {
      case MouseButton.MIDDLE: {
        this.draggingCamera = false;
        break;
      }
      default: {
        this.mainTools.onMouseup(event);
      }
    }
  }
  onMouseWheel(deltaY: number, screenPosition: Vector) {
    const lastScale = this.cameraTransform.scale;
    this.cameraTransform.scale *= deltaY > 0 ? 0.95 : 1.05;
    this.cameraTransform.scale = Math.max(
      0.1,
      Math.min(this.cameraTransform.scale, 10)
    );
    const centerMouse = screenPosition
      .copy()
      .sub(new Vector(this.canvas.width / 2, this.canvas.height / 2));
    if (lastScale != this.cameraTransform.scale)
      this.cameraTransform.position.add(
        centerMouse.scale(
          (deltaY < 0 ? 0.05 : -0.05) / this.cameraTransform.scale
        )
      );
  }
  canvasToWorld(canvasPosition: Vector) {
    let offset = canvasPosition
      .copy()
      .sub(new Vector(this.canvas.width / 2, this.canvas.height / 2));
    offset.scale(1 / this.cameraTransform.scale);
    return offset.add(this.cameraTransform.position);
  }
  worldToCanvas(worldPosition: Vector) {
    let offset = worldPosition.copy().sub(this.cameraTransform.position);
    offset.scale(this.cameraTransform.scale);
    return offset.add(
      new Vector(this.canvas.width / 2, this.canvas.height / 2)
    );
  }
}
