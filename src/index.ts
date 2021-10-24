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
    this.gravity = new Vector(0, 10);
    this.base = window.innerHeight - 100;
    this.structures.push(new SoftCircle(this, new Vector(300, this.base - 100), 100, 16));
  }
  animationCallback(time: number) {
    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.ctx.fillStyle = "#ffff";
    this.ctx.strokeStyle = "#fff0";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = "#000";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - 100);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - 100);
    this.ctx.stroke();

    this.structures.forEach(s => s.update(deltaTime));
    this.structures.forEach(s => s.draw(this.ctx));

    window.requestAnimationFrame(this.animationCallback.bind(this));
  }
}

class Point {
  velocity: Vector;
  acceleration: Vector;
  constructor(public position: Vector/*, private world: World*/) {
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
    this.acceleration = this.acceleration || new Vector();
    this.acceleration.add(force);
  }
  update(delta: number, base?: number) {
    this.velocity.add(this.acceleration.scale(delta));

    this.velocity.scale(0.999);

    this.position.add(this.velocity);

    if (base && this.position.y > base) {
      this.position.y = base;
      this.velocity.y = 0;
      this.velocity.scale(0.5);
    }
    this.acceleration = new Vector();
  }
  distance(p: Point) {
    return this.position.distance(p.position);
  }
}

class Spring {
  constructor(public pointA: Point, public pointB: Point, public constant = 300, public distance?: number) {
    if (!distance) {
      this.distance = pointA.distance(pointB);
    }
  }
  update(delta: number) {
    const d = this.distance - this.pointA.distance(this.pointB);
    const forceVal = d * this.constant;
    const direction = this.pointA.position.copy().sub(this.pointB.position).normalize();
    direction.scale(forceVal * delta);
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
    return this.distance(new Vector());
  }
  normalize() {
    return this.scale(1 / this.length);
  }
  toString() {
    return `{ x : ${this.x} , y : ${this.y}}`;
  }
}

class SoftStructure {
  springs: Spring[] = [];
  points: Point[] = [];
  constructor(private world: World) { }
  update(delta: number) {
    this.points.forEach(p => p.addForce(this.world.gravity.copy().scale(delta)));
    this.springs.forEach(s => s.update(delta));
    this.points.forEach(p => p.update(delta, this.world.base));
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.springs.forEach(s => s.draw(ctx));
    this.points.forEach(p => p.draw(ctx));
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
    this.centerPoint.addForce(new Vector(1, 0))
    super.update(delta);
  }
}

new World();