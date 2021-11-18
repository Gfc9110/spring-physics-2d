import { Vector } from "./vector";


export enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2
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
    this.listeners[event.code]?.forEach(c => c(event));
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
  onMousedown(callback: (button: MouseButton, screenPosition: Vector) => any) {
    document.body.addEventListener("mousedown", (event) => {
      event.preventDefault();
      callback(event.button, new Vector(event.clientX, event.clientY));
    });
  }
  onMouseup(callback: (button: MouseButton, screenPosition: Vector) => any) {
    document.body.addEventListener("mouseup", (event) => {
      event.preventDefault();
      callback(event.button, new Vector(event.clientX, event.clientY));
    });
  }
  onMousemove(callback: (screenPosition: Vector, screenOffset: Vector) => any) {
    document.body.addEventListener("mousemove", (event) => {
      event.preventDefault();
      callback(new Vector(event.clientX, event.clientY), new Vector(event.movementX, event.movementY));
    });
  }
  onMouseWheel(callback: (deltaY: number, screenPosition: Vector) => any) {
    document.body.addEventListener("wheel", (event) => {
      //event.preventDefault();
      callback(event.deltaY, new Vector(event.clientX, event.clientY))
    })
  }
}