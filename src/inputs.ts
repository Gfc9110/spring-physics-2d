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
}