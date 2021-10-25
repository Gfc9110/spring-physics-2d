import { Spring } from "./spring";
import { SoftStructure } from "./structures";
import { Vector } from "./vector";

export class Segment {
  static onSegment(a: Vector, b: Vector, c: Vector) {
    return b.x <= Math.max(a.x, c.x) && b.x >= Math.min(a.x, c.x) &&
      b.y <= Math.max(a.y, c.y) && b.y >= Math.min(a.y, c.y)
  }
  static orientation(a: Vector, b: Vector, c: Vector) {
    let val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (val == 0) return 0;
    return val > 0 ? 1 : 2;
  }
  pointProjection(v: Vector) {
    let l2 = this.a.distanceSq(this.b);

    if (l2 == 0) return { t: 0, projection: this.a };

    let t = ((v.x - this.a.x) * (this.b.x - this.a.x) + (v.y - this.a.y) * (this.b.y - this.a.y)) / l2;

    Math.max(0, Math.min(1, t));

    let projection = new Vector(this.a.x + t * (this.b.x - this.a.x), this.a.y + t * (this.b.y - this.a.y));
    return { projection, t }

  }
  constructor(public a: Vector, public b: Vector) { }
  intersects(s: Segment) {
    let o1 = Segment.orientation(this.a, this.b, s.a);
    let o2 = Segment.orientation(this.a, this.b, s.b);
    let o3 = Segment.orientation(s.a, s.b, this.a);
    let o4 = Segment.orientation(s.a, s.b, this.b);

    if (o1 != o2 && o3 != o4) {
      return true;
    }

    if (o1 == 0 && Segment.onSegment(this.a, s.a, this.b)) {
      return true;
    }

    if (o2 == 0 && Segment.onSegment(this.a, s.b, this.b)) {
      return true;
    }

    if (o3 == 0 && Segment.onSegment(s.a, this.a, s.b)) {
      return true;
    }

    if (o4 == 0 && Segment.onSegment(s.a, this.a, s.b)) {
      return true;
    }

    return false;
  }
}

export class Point {
  velocity: Vector;
  restitution = 1;
  acceleration: Vector;
  _neighbors: Point[];
  _neighborsSegments: Segment[];
  constructor(public structure: SoftStructure, public position: Vector/*, private world: World*/, public mass: number = 1, public isFixed = false, public isExternal = false) {
    this.acceleration = new Vector();
    this.velocity = new Vector();
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#0000";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 2, 0, Math.PI * 2);
    ctx.fill();

    if (this.structure.world.draggingPoint == this) {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.position.x, this.position.y);
      ctx.lineTo(this.structure.world.mousePosition.x, this.structure.world.mousePosition.y);
      ctx.stroke();
    }
  }
  addForce(force: Vector) {
    this.acceleration.add(force.copy().scale(1 / this.mass));
  }
  handleCollisions(delta: number) {

  }
  update(delta: number, base?: number) {
    //console.log(this.acceleration);
    if (!this.isFixed) {
      this.velocity.add(this.acceleration.scale(delta));

      this.velocity.scale(0.999);

      let newPosition = this.position.copy().add(this.velocity);

      let testSegments = this.neighborsSegments(newPosition, true);

      let filter: Spring[] = [];

      if (this.isExternal) {
        let intersectingSprings = this.structure.world.structures.filter(st => st != this.structure && st.boundingBox.intersects(this.structure.boundingBox)).map(st => {
          let intSprings = st.springs.filter(s => s.isSide && testSegments.some(ts => ts.intersects(s.segment)));
          if (testSegments.every(ts => intSprings.find(s => ts.intersects(s.segment)))) {
            return intSprings[0]
          }
          return null
        }).filter(s => !!s && !filter.find(s1 => s1 == s) && filter.push(s))//.flat().filter(s => testSegments.every(ts => ts.intersects(s.segment)))

        intersectingSprings.forEach(is => {
          console.log("intetrsecting")
          let { projection } = is.segment.pointProjection(newPosition)
          let springMass = is.pointA.mass + is.pointB.mass;
          let doubleSpringMass = 2 * springMass;
          let springVelocity = is.pointA.velocity.copy().add(is.pointB.velocity).scale(0.5);

          let sumMass = this.mass + springMass;

          let newVelocity = this.velocity.copy().scale((this.mass - springMass) / sumMass).add(springVelocity.copy().scale(doubleSpringMass / sumMass));

          let newSpringVelocity = this.velocity.copy().scale(doubleSpringMass / sumMass).add(springVelocity.copy().scale((springMass - this.mass) / sumMass));

          newSpringVelocity.scale(1 / springMass);

          is.pointA.velocity = newSpringVelocity.copy().scale(is.pointB.mass);
          is.pointB.velocity = newSpringVelocity.scale(is.pointA.mass);

          this.velocity = newVelocity;
          newPosition = projection;
        });

      }

      this.position = newPosition;

      //if (intersectingSprings.length > 0) console.log(intersectingSprings.length, this.structure.points.length)

      /*if (!this.structure.world.structures.some(st => st != this.structure && st.boundingBox.intersects(this.structure.boundingBox) && st.springs.some(s => {
        let segment = new Segment(s.pointA.position, s.pointB.position);
        return testSegments.some(s => s.intersects(segment));
      }))) {
      } else {
        //let opposingAcceleration = this.velocity.scale(-1);
        //let totalMass =
        this.velocity.scale(0.8);
      }*/
      if (base && this.position.y > base) {
        this.position.y = base;
        this.velocity.y = 0;
        this.velocity.scale(0.8);
      }
      this.acceleration = new Vector();
    }
  }
  rotateAround(angle: number, around: Vector) {
    this.position.rotateAround(angle, around);
  }
  testPoint(position: Vector, maxDistanceSq: number) {
    return this.position.distanceSq(position) <= maxDistanceSq;
  }
  get neighbors(): Point[] {
    return this._neighbors || (this._neighbors = this.structure.springs.filter(s => s.pointA == this || s.pointB == this).map(s => s.pointA == this ? s.pointB : s.pointA));
  }
  neighborsSegments(position?: Vector, external = false) {
    return this.neighbors.filter(p => external ? p.isExternal : true).map(p => new Segment(p.position, position || this.position));
  }
}