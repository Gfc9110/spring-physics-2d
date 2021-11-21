import { MouseButton } from "./inputs";
import { Vector } from "./vector";

export function classEl(className: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  return el;
}

export function iconEl(iconName: string): HTMLDivElement {
  return classEl(`mdi mdi-${iconName}`);
}

export class EditorMouseEvent {
  screenPosition: Vector;
  screenMovement: Vector;
  button: MouseButton;
  constructor(event: MouseEvent) {
    this.screenPosition = new Vector(event.clientX, event.clientY);
    this.screenMovement = new Vector(event.movementX, event.movementY);
    this.button = event.button;
  }
}
