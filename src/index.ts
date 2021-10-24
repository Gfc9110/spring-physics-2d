import './styles/style.scss';

class World {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastTime: number = 0;
  gravity: Vector;
  base: number;
  structures: SoftStructure[] = [];
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    window.requestAnimationFrame(this.animationCallback.bind(this));
    this.gravity = new Vector(0, 0.16);
    this.base = window.innerHeight - 100;
    this.structures.push(new SoftCircle(this, new Vector(this.canvas.width / 2 - 150, this.base - 200), 100, 5));
    this.structures.push(new SoftCircle(this, new Vector(this.canvas.width / 2 + 150, this.base - 200), 100, 16));
  }
  animationCallback(time: number) {
    const deltaTime = 0.016;//(time - this.lastTime) / 1000;
    this.lastTime = time;

    this.ctx.fillStyle = "#ffff";
    this.ctx.strokeStyle = "#fff0";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = "#000";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - 100);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - 100);
    this.ctx.stroke();

    this.structures[0].addTorque(-0.001);
    this.structures[1].addTorque(0.001);

    this.structures.forEach(s => s.update(deltaTime));
    this.structures.forEach(s => s.draw(this.ctx));

    window.requestAnimationFrame(this.animationCallback.bind(this));
  }
}

class Point {
  velocity: Vector;
  acceleration: Vector;
  constructor(public position: Vector/*, private world: World*/, public mass: number = 1) {
    this.acceleration = new Vector();
    this.velocity = new Vector();
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#0000";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  addForce(force: Vector) {
    this.acceleration.add(force.copy().scale(1 / this.mass));
  }
  update(delta: number, base?: number) {
    //console.log(this.acceleration);
    this.velocity.add(this.acceleration.scale(delta));

    this.velocity.scale(0.999);

    this.position.add(this.velocity);

    if (base && this.position.y > base) {
      this.position.y = base;
      this.velocity.y = 0;
      this.velocity.scale(0.8);
    }
    this.acceleration = new Vector();
  }
  distance(p: Point) {
    return this.position.distance(p.position);
  }
  rotateAround(angle: number, around: Vector) {
    this.position.rotateAround(angle, around);
  }
}

class Spring {
  constructor(public pointA: Point, public pointB: Point, public constant = 3, public distance?: number) {
    if (!distance) {
      this.distance = pointA.distance(pointB);
    }
  }
  update(delta: number) {
    const d = this.distance - this.pointA.distance(this.pointB);
    const forceVal = d * this.constant;
    const direction = this.pointA.position.copy().sub(this.pointB.position).normalize();
    direction.scale(forceVal);
    this.pointA.addForce(direction);
    this.pointB.addForce(direction.scale(-1));
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.pointA.position.x, this.pointA.position.y);
    ctx.lineTo(this.pointB.position.x, this.pointB.position.y);
    ctx.stroke();
  }
}

class Vector {
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
}

class SoftStructure {
  springs: Spring[] = [];
  points: Point[] = [];
  constructor(private world: World) { }
  update(delta: number) {
    this.points.forEach(p => p.addForce(this.world.gravity.copy()));
    this.springs.forEach(s => s.update(delta));
    this.points.forEach(p => p.update(delta, this.world.base));
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.springs.forEach(s => s.draw(ctx));
    this.points.forEach(p => p.draw(ctx));
  }
  rotate(angle: number) {
    let center = this.center;
    this.points.forEach(p => p.rotateAround(angle, center))
    return this;
  }
  /*addForce(force: Vector) {
    this.points.forEach(p => p.addForce(force))
  }*/
  addTorque(torque: number) {
    let center = this.center;
    this.points.forEach(p => {
      const offset = p.position.copy().sub(center);
      if (offset.length > 0) {
        const direction = offset.copy().normalize().rotate(Math.PI / 2);
        p.addForce(direction.scale(offset.length * torque))
      }
    });
  }
  get center() {
    let center = new Vector();
    this.points.forEach(p => center.add(p.position));
    return center.scale(1 / this.points.length);
  }
}

class SoftCircle extends SoftStructure {
  centerPoint: Point;
  constructor(world: World, center: Vector, radius: number = 50, sides: number = 8) {
    super(world);
    const angle = (Math.PI * 2) / sides;
    this.centerPoint = new Point(center.copy());
    this.points.push(this.centerPoint);
    let lastPoint;
    let firstPoint;
    for (let i = 0; i < sides; i++) {
      const point = new Point(center.copy().add(new Vector(Math.cos(angle * i) * radius, Math.sin(angle * i) * radius)))
      if (i == 0) firstPoint = point;
      this.points.push(point);
      this.springs.push(new Spring(this.centerPoint, point))
      if (lastPoint) {
        this.springs.push(new Spring(point, lastPoint))
      }
      if (i == sides - 1) {
        this.springs.push(new Spring(point, firstPoint))
      }
      lastPoint = point
    }
  }
  update(delta: number) {
    //this.centerPoint.addForce(new Vector(1, 0))
    //this.addTorque(0.001);
    //console.log(this.center);
    super.update(delta);
  }
}

new World();