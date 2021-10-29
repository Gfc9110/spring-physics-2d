export class Vector {
  static ZERO = new Vector();
  constructor(public x = 0, public y = 0) { }
  add(v: Vector) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  copy() {
    return new Vector(this.x, this.y);
  }
  scale(val: number) {
    this.x *= val;
    this.y *= val;
    return this;
  }
  distanceSq(v: Vector) {
    return Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2);
  }
  distance(v: Vector) {
    return Math.sqrt(this.distanceSq(v));
  }
  sub(v: Vector) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  get length() {
    return this.distance(Vector.ZERO);
  }
  get lengthSq() {
    return this.distanceSq(Vector.ZERO);
  }
  normalize() {
    return this.scale(1 / this.length);
  }
  toString() {
    return `{ x : ${this.x} , y : ${this.y}}`;
  }
  rotate(angle: number) {
    let x = this.x;
    let y = this.y;
    this.x = (x * Math.cos(angle)) - (y * Math.sin(angle));
    this.y = (x * Math.sin(angle)) + (y * Math.cos(angle));
    return this;
  }
  rotateAround(angle: number, around: Vector) {
    let x = this.x - around.x;
    let y = this.y - around.y;
    this.x = around.x + (x * Math.cos(angle)) - (y * Math.sin(angle));
    this.y = around.y + (x * Math.sin(angle)) + (y * Math.cos(angle));
    return this;
  }
  mult(v: Vector) {
    this.x *= v.x;
    this.y *= v.y;
    return this;
  }
  dot(v: Vector) {
    return this.x * v.x + this.y * v.y;
  }
  projectOn(v: Vector) {
    return v.copy().scale(this.dot(v) / v.lengthSq);
  }
}