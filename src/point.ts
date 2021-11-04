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
  pointProjection(v: Vector) {
    let inside = false;
    let l2 = this.a.distanceSq(this.b);

    if (l2 == 0) return { t: 0, projection: this.a };

    let t = ((v.x - this.a.x) * (this.b.x - this.a.x) + (v.y - this.a.y) * (this.b.y - this.a.y)) / l2;

    inside = t >= 0 && t <= 1;

    Math.max(0, Math.min(1, t));

    let projection = new Vector(this.a.x + t * (this.b.x - this.a.x), this.a.y + t * (this.b.y - this.a.y));
    return { projection, t, inside }

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
}

export class Point {
  velocity: Vector;
  restitution = 0;
  acceleration: Vector;
  _neighbors: Point[];
  _neighborsSegments: Segment[];
  constructor(public structure: SoftStructure, public position: Vector/*, private world: World*/, public mass: number = 1, public isFixed = false, public isExternal = false) {
    this.acceleration = new Vector();
    this.velocity = new Vector();
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#000";
    if (this.isFixed) {
      ctx.fillStyle = "#00f";
    }
    /*ctx.strokeStyle = "#0000";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.isFixed ? 4 : 2, 0, Math.PI * 2);
    ctx.fill();*/

    if (this.structure.world.draggingPoint == this) {
      ctx.strokeStyle = "#66f";
      ctx.lineWidth = 2;
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
    if (!this.isFixed) {
      this.velocity.add(this.acceleration.scale(delta));

      this.velocity.scale(0.999);
    }

    let newPosition = this.position.copy().add(this.velocity);

    let testSegments = this.neighborsSegments(newPosition, true);

    let filter: Spring[] = [];

    if (this.isExternal) {
      let intersectingSprings = this.structure.world.structures.filter(st => st != this.structure && st.boundingBox.intersects(this.structure.boundingBox) && this.isInsideStructure(st)).map(st => {
        let intSprings = st.springs.filter(s => s.isSide && testSegments.some(ts => ts.intersects(s.segment)));
        if (testSegments.every(ts => intSprings.find(s => ts.intersects(s.segment))) || this.findInside(st, [this]).length > 1) {
          return this.closestSpring(intSprings, newPosition);
        }
        return null
      }).filter(s => !!s && !filter.find(s1 => s1 == s) && filter.push(s))

      intersectingSprings.forEach(is => {
        let { projection, t } = is.segment.pointProjection(newPosition)

        const radiusA = projection.distance(is.pointA.position);
        const radiusB = projection.distance(is.pointB.position);

        const momentA = radiusA * is.pointA.mass;
        const momentB = radiusB * is.pointB.mass;
        const totalMoment = momentA + momentB;

        const springVelocityAtImpact = is.pointA.velocity.copy().scale(1 - t).add(is.pointB.velocity.copy().scale(t));
        const springMassAtImpact = is.pointA.mass * (1 - t) + is.pointB.mass * t;

        const springTangentVelocityAtImpact = springVelocityAtImpact.projectOn(is.pointA.position.copy().sub(is.pointB.position));
        const tangentVelocity = this.velocity.projectOn(is.pointA.position.copy().sub(is.pointB.position));

        const springNormalVelocityAtImpact = springVelocityAtImpact.copy().sub(springTangentVelocityAtImpact);
        const normalVelocity = this.velocity.copy().sub(tangentVelocity);

        springTangentVelocityAtImpact.scale(0.9);
        tangentVelocity.scale(0.9);

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
        }
      });
    }
    if (!this.isFixed) {
      this.position = newPosition;
    }

    let bounds = this.structure.world.bounds;

    if (this.position.x < bounds.position.x) {
      this.position.x = bounds.position.x;
      this.velocity.x = 0;
      this.velocity.scale(0.9);
    } else if (this.position.x > bounds.position.x + bounds.size.x) {
      this.position.x = bounds.position.x + bounds.size.x;
      this.velocity.x = 0;
      this.velocity.scale(0.9);
    }

    if (this.position.y < bounds.position.y) {
      //this.position.y = bounds.position.y;
      //this.velocity.y = 0;
      //this.velocity.scale(0.7);
    } else if (this.position.y > bounds.position.y + bounds.size.y) {
      this.position.y = bounds.position.y + bounds.size.y;
      this.velocity.y = 0;
      this.velocity.scale(0.9);
    }

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
  closestSpring(springs: Spring[], position?: Vector, inside = false) {
    position = position || this.position;
    let minDistance = Infinity;
    let closestSpring: Spring;
    springs.forEach(s => {
      const seg = s.segment;
      let { projection } = s.segment.pointProjection(position);
      let distance = projection.distanceSq(position);
      if (distance < minDistance && (inside ? this.isInsideSegment(seg, position) : true)) {
        minDistance = distance;
        closestSpring = s;
      }
    });
    return closestSpring;
  }
  isInsideSegment(s: Segment, position?: Vector) {
    position = position || this.position;
    let { projection, inside } = s.pointProjection(position);
    return inside && Math.round(s.normal.angle * 100) == Math.round(projection.sub(position).angle * 100) && projection.lengthSq > 0;
  }
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