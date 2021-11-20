import { Spring } from "./spring";
import { SoftStructure } from "./structures";
import { Vector } from "./vector";

//https://www.geeksforgeeks.org/check-if-two-given-line-segments-intersect/

export class Segment {
  static onSegment(p: Vector, q: Vector, r: Vector) {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
      q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y)
  }
  static orientation(p: Vector, q: Vector, r: Vector) {
    let val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val == 0) return 0;
    return val > 0 ? 1 : 2;
  }
  projection(v: Vector) {
    let ab = this.b.copy().sub(this.a);
    let av = v.copy().sub(this.a);

    let dot = ab.dot(av);

    let abL = ab.length;
    let avL = av.length;

    let cos = dot / (abL * avL);

    let t = (cos * avL) / abL;

    let inside = t >= 0 && t <= 1;

    return { projection: this.a.copy().add(ab.scale(t)), t, cos, acos: Math.acos(cos), inside }
  }
  constructor(public a: Vector, public b: Vector) { }
  intersects(s: Segment) {
    let p1 = this.a;
    let q1 = this.b;
    let p2 = s.a;
    let q2 = s.b;

    let o1 = Segment.orientation(p1, q1, p2);
    let o2 = Segment.orientation(p1, q1, q2);
    let o3 = Segment.orientation(p2, q2, p1);
    let o4 = Segment.orientation(p2, q2, q1);

    if (o1 != o2 && o3 != o4) {
      return true;
    }

    if (o1 == 0 && Segment.onSegment(p1, p2, q1)) {
      return true;
    }

    if (o2 == 0 && Segment.onSegment(p1, q2, q1)) {
      return true;
    }

    if (o3 == 0 && Segment.onSegment(p2, p1, q2)) {
      return true;
    }

    if (o4 == 0 && Segment.onSegment(p2, q1, q2)) {
      return true;
    }

    return false;
  }
  get normal() {
    return this.b.copy().sub(this.a).normalize().rotate(Math.PI / 2)
  }
  get center() {
    return this.a.copy().add(this.b).scale(0.5);
  }
}

export class Point {
  velocity: Vector;
  restitution = 0;
  acceleration: Vector;
  _neighbors: Point[];
  _neighborsSegments: Segment[];
  constructor(public structure: SoftStructure, public position: Vector/*, private world: World*/, public mass: number = 1, public isFixed = false, public isExternal = false, public friction = 1) {
    this.acceleration = new Vector();
    this.velocity = new Vector();
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#000";
    if (this.isFixed) {
      ctx.fillStyle = "#00f";
    }
    if (this.structure.world.draggingPoint == this) {
      ctx.strokeStyle = "#66f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.position.x, this.position.y);
      ctx.lineTo(this.structure.world.mousePosition.x, this.structure.world.mousePosition.y);
      ctx.stroke();
    }
  }
  drawPoint(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#0000";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.isFixed ? 4 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
  addForce(force: Vector) {
    this.acceleration.add(force.copy().scale(1 / this.mass));
  }
  handleCollisions(delta: number) {

  }
  update(delta: number, base?: number) {
    //console.log(this.position.y)
    if (!this.isFixed) {
      this.velocity.add(this.acceleration.scale(delta));

      this.velocity.scale(0.9995);
    }

    let newPosition = this.position.copy().add(this.velocity);

    let collisions: Spring[] = this.structure.world.structures.filter(st => st != this.structure && st.boundingBox.intersects(this.structure.boundingBox) && st.isPositionInside(newPosition)).map(st => this.closestSpring(st.springs.filter(s => s.isSide), newPosition, true))
    collisions = collisions.filter(s => !!s);
    collisions.forEach(is => {
      let { projection, t, acos } = is.segment.projection(newPosition)

      const radiusA = projection.distance(is.pointA.position);
      const radiusB = projection.distance(is.pointB.position);

      const momentA = radiusA * is.pointA.mass;
      const momentB = radiusB * is.pointB.mass;
      const totalMoment = momentA + momentB;

      const averageFriction = (this.friction + (is.pointA.friction * (1 - t) + is.pointB.friction * t)) / 2;

      const springVelocityAtImpact = is.pointA.velocity.copy().scale(1 - t).add(is.pointB.velocity.copy().scale(t));
      const springMassAtImpact = (is.pointA.mass * (1 - t) + is.pointB.mass * t) * 2;

      const totalMass = this.mass + springMassAtImpact;

      const springTangentVelocityAtImpact = springVelocityAtImpact.projectOn(is.pointA.position.copy().sub(is.pointB.position).scale(100).sub(new Vector(50, 50)));
      const tangentVelocity = this.velocity.projectOn(is.pointA.position.copy().sub(is.pointB.position).scale(100).sub(new Vector(50, 50)));

      const springNormalVelocityAtImpact = springVelocityAtImpact.copy().sub(springTangentVelocityAtImpact);
      const normalVelocity = this.velocity.copy().sub(tangentVelocity);

      tangentVelocity.add(springTangentVelocityAtImpact.copy().sub(tangentVelocity).scale(averageFriction));
      springTangentVelocityAtImpact.add(tangentVelocity.copy().sub(springTangentVelocityAtImpact).scale(averageFriction));

      //springTangentVelocityAtImpact.scale(0.9);
      //tangentVelocity.scale(0.9);

      const finalNormalVelocity = springNormalVelocityAtImpact.copy().scale(springMassAtImpact).add(normalVelocity.copy().scale(this.mass)).scale(1 / (this.mass + springMassAtImpact)).scale(this.isFixed ? 0 : 1);

      const finalSpringVelocityAtImpact = finalNormalVelocity.copy().add(springTangentVelocityAtImpact);

      const springVelocityDifferenceAtImpact = finalSpringVelocityAtImpact.copy().sub(springVelocityAtImpact);

      if (!is.pointA.isFixed)
        is.pointA.velocity.add(springVelocityDifferenceAtImpact.copy().scale(momentB / totalMoment));
      if (!is.pointB.isFixed)
        is.pointB.velocity.add(springVelocityDifferenceAtImpact.copy().scale(momentA / totalMoment));

      if (!this.isFixed) {
        this.velocity = tangentVelocity.add(finalNormalVelocity);
      }
      newPosition = projection;

      if (this.isFixed) {
        const positionDifference = this.position.copy().sub(newPosition);
        if (!is.pointA.isFixed)
          is.pointA.position.add(positionDifference.copy().scale(momentB / totalMoment));
        if (!is.pointB.isFixed)
          is.pointB.position.add(positionDifference.copy().scale(momentA / totalMoment));
      }/* else {
        const positionDifference = newPosition.copy().sub(this.position);
        newPosition = this.position.copy().add(positionDifference.scale(this.mass / totalMass));
        const springPositionDifference = positionDifference.scale(-springMassAtImpact / totalMass);
        if (!is.pointA.isFixed)
          is.pointA.position.add(springPositionDifference.copy().scale(1));
        if (!is.pointB.isFixed)
          is.pointB.position.add(springPositionDifference.copy().scale(1));
      }*/
    });
    if (!this.isFixed) {
      this.position = newPosition;
    }

    //let bounds = this.structure.world.bounds;

    /*if (this.position.x < bounds.position.x) {
      this.position.x = bounds.position.x;
      this.velocity.x = 0;
      this.velocity.scale(1 - this.friction);
    } else if (this.position.x > bounds.position.x + bounds.size.x) {
      this.position.x = bounds.position.x + bounds.size.x;
      this.velocity.x = 0;
      this.velocity.scale(1 - this.friction);
    }

    if (this.position.y < bounds.position.y) {
      //this.position.y = bounds.position.y;
      //this.velocity.y = 0;
      //this.velocity.scale(0.7);
    } else if (this.position.y > bounds.position.y + bounds.size.y) {
      this.position.y = bounds.position.y + bounds.size.y;
      this.velocity.y = 0;
      this.velocity.scale(1 - this.friction);
    }*/

    this.acceleration = new Vector();
    if (this.isFixed) {
      this.velocity = new Vector();
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
  closestSpring(springs: Spring[], position?: Vector, isInside = false) {
    position = position || this.position;
    return springs.map(s => { return { s, projection: s.segment.projection(position) } }).filter(x => x.projection.t < 1.1 && x.projection.t > -0.1).sort((a, b) => a.projection.projection.distanceSq(position) - b.projection.projection.distanceSq(position)).map(d => {
      return d.s;
    })[0];
  }
  /*isInsideSegment(s: Segment, position?: Vector) {
    position = position || this.position;
    let { projection } = s.projection(position);
    const difference = position.copy().sub(projection)
    if (difference.length == 0) return true;
    return position.copy().sub(projection).normalize().angleTo(s.normal) > Math.PI / 2;
  }*/
  isInsideStructure(s: SoftStructure, position?: Vector) {
    let testSegment = new Segment(position || this.position, s.center.add(s.boundingBox.size));
    return s.springs.filter(sp => sp.isSide && sp.segment.intersects(testSegment)).length % 2 == 1;
  }
  findInside(s: SoftStructure, found: Point[]) {
    let ns = this.neighbors.filter(n => n.isExternal && s.springs.every(s => !new Segment(this.position, n.position).intersects(s.segment)) && !found.find(n1 => n == n1) && n.isInsideStructure(s));
    found.push(...ns);
    ns.forEach(n => n.findInside(s, found));
    return found;
  }
}