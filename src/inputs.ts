export class Inputs {
  private _inputs: { [code: string]: boolean } = {};
  constructor() {
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
  }
  onKeyDown(event: KeyboardEvent) {
    event.preventDefault();
    this._inputs[event.code] = true;
  }
  onKeyUp(event: KeyboardEvent) {
    event.preventDefault();
    this._inputs[event.code] = false;
  }
  get(code: string) {
    return this._inputs[code] || false;
  }
}