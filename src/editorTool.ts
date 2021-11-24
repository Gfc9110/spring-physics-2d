import { classEl, EditorMouseEvent, iconEl, toolLabel } from "./domHelpers";
import { Editor } from "./editor";
import { MouseButton } from "./inputs";
import { Point } from "./point";
import { SoftBox, SoftStructure } from "./structures";
import { Vector } from "./vector";

export enum EditorToolType {
  DRAG = "cursor-move",
  CREATE = "vector-square-plus",
  SELECT = "cursor-default-click-outline",
  BOX = "shape-square-plus",
}

export class EditorToolGroup {
  activeTool: EditorTool;
  parent = document.querySelector("#toolbar");
  element: HTMLDivElement;
  tools: EditorTool[] = [];
  constructor(public editor: Editor) {
    this.element = classEl("toolgroup");
    this.parent.appendChild(this.element);
    this.element.addEventListener("click", (event) => {
      let e = new EditorMouseEvent(event);
      let tool = this.tools.find(
        (t) => t.element == (event.target as Element).closest(".tool")
      );
      if (tool) {
        this.deactivateTools(e);
        tool.activate(e);
        this.activeTool = tool;
      }
    });
  }
  activateTool(i: number) {
    this.deactivateTools(null);
    let t = this.tools[i];
    if (t) {
      this.activeTool = t;
      t.activate(null);
    }
  }
  addTool(tool: EditorTool) {
    this.element.appendChild(tool.element);
    this.tools.push(tool);
  }
  addTools(...tools: EditorTool[]) {
    tools.forEach(this.addTool.bind(this));
  }
  deactivateTools(event: EditorMouseEvent) {
    this.tools.forEach((t) => t.deactivate(event));
    this.activeTool = null;
  }
  onMousedown(event: EditorMouseEvent) {
    this.activeTool?.onMousedown(event);
  }
  onMousemove(event: EditorMouseEvent) {
    this.activeTool?.onMousemove(event);
  }
  onMouseup(event: EditorMouseEvent) {
    this.activeTool?.onMouseup(event);
  }
  onUpdate(deltaTime: number) {
    this.activeTool?.onUpdate(deltaTime);
  }
  onDraw() {
    this.activeTool?.onDraw();
  }
}

export class EditorTool {
  element: HTMLDivElement;
  active: boolean;
  constructor(
    public editor: Editor,
    type: EditorToolType,
    label: string = null
  ) {
    this.element = classEl("tool");
    this.element.appendChild(iconEl(type));
    if (label) {
      this.element.appendChild(toolLabel(label));
    }
  }
  deactivate(event: EditorMouseEvent) {
    this.active = false;
    if (this.element.classList.contains("active-tool")) {
      this.element.classList.remove("active-tool");
      this.onDeactivate(event);
    }
  }
  activate(event: EditorMouseEvent) {
    this.active = true;
    if (!this.element.classList.contains("active-tool")) {
      this.element.classList.add("active-tool");
      this.onActivate(event);
    }
  }
  onActivate(event: EditorMouseEvent) {}
  onDeactivate(event: EditorMouseEvent) {}
  onMousedown(event: EditorMouseEvent) {}
  onMousemove(event: EditorMouseEvent) {}
  onMouseup(event: EditorMouseEvent) {}
  onDraw() {}
  onUpdate(deltaTime: number) {}
}

export class DragTool extends EditorTool {
  draggingPoint: Point;
  constructor(editor: Editor) {
    super(editor, EditorToolType.DRAG, "Drag");
  }
  onMousedown(event: EditorMouseEvent) {
    switch (event.button) {
      case MouseButton.LEFT: {
        this.draggingPoint = this.editor.world.structures
          .map((s) =>
            s.testPoint(this.editor.canvasToWorld(event.screenPosition))
          )
          .filter((p) => !!p)[0];
      }
    }
  }
  onMouseup(event: EditorMouseEvent) {
    switch (event.button) {
      case MouseButton.LEFT: {
        this.draggingPoint = null;
      }
    }
  }
  onUpdate(deltaTime: number) {
    this.draggingPoint?.addForce(
      this.editor
        .canvasToWorld(this.editor.mousePosition)
        .sub(this.draggingPoint.position)
        .scale(deltaTime * 100)
    );
  }
  onDraw() {
    if (this.draggingPoint) {
      this.editor.ctx.strokeStyle = "#000";
      this.editor.ctx.fillStyle = "#0000";
      this.editor.ctx.resetTransform();
      this.editor.ctx.beginPath();
      const pointCanvas = this.editor.worldToCanvas(
        this.draggingPoint.position
      );
      this.editor.ctx.moveTo(pointCanvas.x, pointCanvas.y);
      this.editor.ctx.lineTo(
        this.editor.mousePosition.x,
        this.editor.mousePosition.y
      );
      this.editor.ctx.stroke();
    }
  }
}

export class SelectTool extends EditorTool {
  constructor(editor: Editor) {
    super(editor, EditorToolType.SELECT, "Select");
  }
}

export class CreateTool extends EditorTool {
  gridSize = 25;
  gridHalfSide = 30;
  constructor(editor: Editor) {
    super(editor, EditorToolType.CREATE, "Add Structure");
  }
  onDraw() {
    this.gridSize =
      50 /
      Math.pow(2, Math.floor(Math.log2(this.editor.cameraTransform.scale)));
    this.editor.ctx.strokeStyle = "#0000";
    this.editor.ctx.fillStyle = "#000f";
    this.editor.ctx.resetTransform();
    let worldCenter = this.editor
      .canvasToWorld(this.editor.mousePosition)
      .scale(1 / this.gridSize);
    worldCenter.x = Math.round(worldCenter.x);
    worldCenter.y = Math.round(worldCenter.y);
    worldCenter.scale(this.gridSize);
    this.editor.ctx.fillStyle = "#0004";
    const maxDistance = Math.pow(this.gridSize * this.gridHalfSide, 2);
    for (let x = -this.gridHalfSide; x <= this.gridHalfSide; x++) {
      for (let y = -this.gridHalfSide; y <= this.gridHalfSide; y++) {
        let pos = worldCenter.copy().add(new Vector(x, y).scale(this.gridSize));
        let dist = worldCenter.distanceSq(pos);
        if (dist < maxDistance) {
          pos = this.editor.worldToCanvas(pos);
          //this.editor.ctx.fillStyle = `rgba(0,0,0,${50000 / dist} )`;
          this.editor.ctx.fillRect(pos.x - 1, pos.y - 1, 3, 3);
        }
      }
    }
  }
}

export class BoxTool extends EditorTool {
  screenStart: Vector;
  constructor(editor: Editor) {
    super(editor, EditorToolType.BOX, "Add Box");
  }
  onMousedown(event: EditorMouseEvent) {
    this.screenStart = event.screenPosition;
  }
  onMouseup(event: EditorMouseEvent) {
    let worldStart = this.editor.canvasToWorld(this.screenStart);
    let worldEnd = this.editor.canvasToWorld(event.screenPosition);
    this.editor.world.structures.push(
      new SoftBox(
        this.editor.world,
        new Vector(
          (worldStart.x + worldEnd.x) / 2,
          (worldStart.y + worldEnd.y) / 2
        ),
        new Vector(worldEnd.x - worldStart.x, worldEnd.y - worldStart.y),
        2000,
        false,
        6
      )
    );
    this.screenStart = null;
  }
  onDraw() {
    if (this.screenStart) {
      this.editor.ctx.resetTransform();
      this.editor.ctx.strokeStyle = "#0008";
      this.editor.ctx.fillStyle = "#0000";
      this.editor.ctx.strokeRect(
        this.screenStart.x,
        this.screenStart.y,
        this.editor.mousePosition.x - this.screenStart.x,
        this.editor.mousePosition.y - this.screenStart.y
      );
    }
  }
}
