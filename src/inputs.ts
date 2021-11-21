import { EditorMouseEvent } from "./domHelpers";
import { Vector } from "./vector";

export enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
}

export class Inputs {
  listeners: { [event: string]: ((event: KeyboardEvent) => any)[] } = {};
  private _inputs: { [code: string]: boolean } = {};
  constructor() {
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
  }
  onKeyDown(event: KeyboardEvent) {
    event.preventDefault();
    this.listeners[event.code]?.forEach((c) => c(event));
    this._inputs[event.code] = true;
  }
  onKeyUp(event: KeyboardEvent) {
    event.preventDefault();
    this._inputs[event.code] = false;
  }
  get(code: string) {
    return this._inputs[code] || false;
  }
  on(event: string, callback: (event: KeyboardEvent) => any) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(callback);
  }
  onMousedown(callback: (event: EditorMouseEvent) => any) {
    window.addEventListener("mousedown", (event) => {
      event.preventDefault();
      callback(new EditorMouseEvent(event));
    });
  }
  onMouseup(callback: (event: EditorMouseEvent) => any) {
    window.addEventListener("mouseup", (event) => {
      event.preventDefault();
      callback(new EditorMouseEvent(event));
    });
  }
  onMousemove(callback: (event: EditorMouseEvent) => any) {
    window.addEventListener("mousemove", (event) => {
      event.preventDefault();
      callback(new EditorMouseEvent(event));
    });
  }
  onMouseWheel(callback: (deltaY: number, screenPosition: Vector) => any) {
    window.addEventListener("wheel", (event) => {
      //event.preventDefault();
      callback(event.deltaY, new Vector(event.clientX, event.clientY));
    });
  }
}
