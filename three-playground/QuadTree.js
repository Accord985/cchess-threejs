// compile with "tsc --target es6 ./three-playground/QuadTree.ts"
class Point {
    constructor(x, y, h) {
        this.x = x;
        this.y = y;
        this.h = h || 0; // if null use 0
    }
    getX() { return this.x; }
    getY() { return this.y; }
    getH() { return this.h; }
    equals(point2) {
        if (point2 instanceof Edge) {
            throw new Error("cannot compare edge and point");
        }
        return point2.x === this.x && point2.y === this.y;
    }
    // the edge here is a line segment with two endpoints, not an infinite line
    distanceToEdge(edge) {
        let x0 = this.x;
        let y0 = this.y; // point A
        let x1 = edge.getP1().x;
        let y1 = edge.getP1().y; // point B
        let x2 = edge.getP2().x;
        let y2 = edge.getP2().y; // point C
        // check if the height should be taken (foot of height within the segment)
        // this is equivalent to: angle between vec<BA> & vec<BC> and between vec<CA> & vec<CB> are both acute
        //  and equivalent to: dot product of BA & BC and CA & CB are both strictly positive
        if ((x0 - x1) * (x2 - x1) + (y0 - y1) * (y2 - y1) > 0 &&
            (x0 - x2) * (x1 - x2) + (y0 - y2) * (y1 - y2) > 0) {
            // height: calculated from the area of the triangle ABC and the length of base BC: h=2A/b
            // area could be calculated from the coordinates of the three vertices
            let twiceArea = Math.abs(x1 * y2 + x2 * y0 + x0 * y1 - x1 * y0 - x2 * y1 - x0 * y2);
            let baseLength = Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
            let heightLength = twiceArea / baseLength;
            return heightLength;
        }
        else {
            let distanceToEnds = Math.min(Math.sqrt(Math.pow((x1 - x0), 2) + Math.pow((y1 - y0), 2)), Math.sqrt(Math.pow((x2 - x0), 2) + Math.pow((y2 - y0), 2)));
            return distanceToEnds;
        }
    }
}
class Edge {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
    }
    getP1() { return this.p1; }
    getP2() { return this.p2; }
    computeYOnEdge(x) {
        let x1 = this.p1.getX();
        let x2 = this.p2.getX();
        let y1 = this.p1.getY();
        let y2 = this.p2.getY();
        if (x1 === x2) {
            throw new Error("The line is vertical, cannot find a single y");
        }
        return y1 - (x1 - x) * (y2 - y1) / (x2 - x1);
    }
    equals(edge2) {
        if (edge2 instanceof Point) {
            throw new Error("cannot compare edge and point");
        }
        return edge2.p1.equals(this.p1) && edge2.p2.equals(this.p2);
    }
}
class Rectangle {
    constructor(x, y, w, h) {
        if (w < 0 || h < 0) {
            throw new Error('Width and height should be non-negative');
        }
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    getX() { return this.x; }
    getY() { return this.y; }
    getW() { return this.w; }
    getH() { return this.h; }
    contains(element) {
        if (element instanceof Point) {
            let point = element;
            // float point imprecision: 5.262 < 4.072 + 1.19 gives you true as 4.072 + 1.19 yields 5.2620000000000005
            return (this.ge(point.getX(), this.x) && this.lt(point.getX(), this.x + this.w)
                && this.ge(point.getY(), this.y) && this.lt(point.getY(), this.y + this.h));
        }
        else if (element instanceof Rectangle) {
            let rect = element;
            // edge cases: the new rectangle only shares a side and the remaining is outside. Reject these
            return !(rect.x + rect.w < this.x || rect.x > this.x + this.w || // can't be all left or all right
                rect.y + rect.h < this.y || rect.y > this.y + this.h);
        }
        else { // must be type Edge
            let edge = element;
            let p1x = edge.getP1().getX();
            let p1y = edge.getP1().getY();
            let p2x = edge.getP2().getX();
            let p2y = edge.getP2().getY();
            // edge cases: the line lies exactly on edge. Accept this one as contained
            if ((this.eq(p1x, this.x + this.w) && this.eq(p2x, this.x + this.w)) ||
                (this.eq(p1x, this.x) && this.eq(p2x, this.x))) {
                let yOverlap = this.findOverlap(p1y, p2y, this.y, this.y + this.h);
                return yOverlap[0] < yOverlap[1];
            }
            // find the overlapping x values of edge in rectangle
            let xOverlap = this.findOverlap(p1x, p2x, this.x, this.x + this.w);
            if (xOverlap[0] > xOverlap[1]) {
                return false;
            }
            else if (xOverlap[0] === xOverlap[1]) {
                let yOverlap = this.findOverlap(p1y, p2y, this.y, this.y + this.h);
                return yOverlap[0] < yOverlap[1];
            }
            // check if the y values overlap (boundary excluded) [rectangle and line in the overlapping x values]
            let yOverlap = this.findOverlap(edge.computeYOnEdge(xOverlap[0]), edge.computeYOnEdge(xOverlap[1]), this.y, this.y + this.h);
            return yOverlap[0] <= yOverlap[1];
        }
    }
    findOverlap(start1, end1, start2, end2) {
        // these operations could also be imprecise: Math.max(5.262, 4.072+1.19) => 5.2620000000000005
        let min1 = this.min(start1, end1);
        let max1 = this.max(start1, end1);
        let min2 = this.min(start2, end2);
        let max2 = this.max(start2, end2);
        return [this.max(min1, min2), this.min(max1, max2)]; // smaller of range, larger of range
    }
    // these functions are for precise float point comparison.
    compareFloat(left, right, threshold) {
        if (Math.abs(left - right) < threshold) {
            return 0;
        }
        return (left < right) ? -1 : 1;
    }
    lt(left, right) { return this.compareFloat(left, right, 1e-8) < 0; }
    gt(left, right) { return this.compareFloat(left, right, 1e-8) > 0; }
    le(left, right) { return this.compareFloat(left, right, 1e-8) <= 0; }
    ge(left, right) { return this.compareFloat(left, right, 1e-8) >= 0; }
    eq(left, right) { return this.compareFloat(left, right, 1e-8) === 0; }
    min(a, b) { return this.gt(a, b) ? b : a; }
    max(a, b) { return this.le(a, b) ? b : a; }
}
class QuadTree {
    constructor(boundary, capacity) {
        if (!Number.isInteger(capacity)) {
            throw new Error("capacity should be an integer");
        }
        this.boundary = boundary;
        this.capacity = capacity;
        this.elements = [];
        this.children = null; // null, or array of QuadTree. nw, ne, sw, se
        this.size = 0;
    }
    getBoundary() { return this.boundary; }
    getCapacity() { return this.capacity; }
    getChildren() { return this.children; }
    getElements() { return this.elements; }
    getSize() { return this.size; }
    insert(element) {
        if (!this.boundary.contains(element)) {
            return;
        }
        if (this.elements.length < this.capacity) {
            this.elements.push(element);
            this.size++;
        }
        else {
            // if hasn't subdivided, initiate the children (subdivide)
            if (!this.children) {
                this.subdivide();
            }
            if (!this.children) {
                throw new Error("Children not initiated after subdividing");
            }
            ;
            for (let i = 0; i < 4; i++) {
                this.children[i].insert(element);
            }
            // recalculate the size for parent node
            this.size = this.capacity;
            for (let i = 0; i < 4; i++) {
                this.size += this.children[i].size;
            }
        }
    }
    subdivide() {
        let x = this.boundary.getX();
        let y = this.boundary.getY();
        let w = this.boundary.getW();
        let h = this.boundary.getH();
        let northwest = new Rectangle(x, y, w / 2, h / 2); // small x small y
        let northeast = new Rectangle(x + w / 2, y, w / 2, h / 2); // great x small y
        let southwest = new Rectangle(x, y + h / 2, w / 2, h / 2); // small x great y
        let southeast = new Rectangle(x + w / 2, y + h / 2, w / 2, h / 2); // great x great y
        this.children = [];
        this.children[0] = new QuadTree(northwest, this.capacity);
        this.children[1] = new QuadTree(northeast, this.capacity);
        this.children[2] = new QuadTree(southwest, this.capacity);
        this.children[3] = new QuadTree(southeast, this.capacity);
    }
    query(queryElement) {
        let result = new Set();
        this.queryHelper(queryElement, result);
        return result;
    }
    queryHelper(queryElement, result) {
        if (!this.boundary.contains(queryElement)) {
            return;
        }
        // add own elements
        for (let i = 0; i < this.elements.length; i++) {
            result.add(this.elements[i]);
        }
        // check its children
        if (this.children) {
            for (let i = 0; i < 4; i++) {
                this.children[i].queryHelper(queryElement, result);
            }
        }
    }
    // queryWithPoint(point: Point): Set<T> {
    //   let result = new Set<T>();
    //   this.queryPointHelper(point, result);
    //   return result;
    // }
    // private queryPointHelper(point: Point, result: Set<T>): void {
    //   if (!this.boundary.contains(point)) {return;}
    //   // add own elements
    //   for (let i = 0; i < this.elements.length; i++) {
    //     result.add(this.elements[i]);
    //   }
    //   // check its children
    //   if (this.children) {
    //     for (let i = 0; i < 4; i++) {
    //       this.children[i].queryPointHelper(point, result);
    //     }
    //   }
    // }
    // queryWithRay(ray: Edge): Set<T> {
    //   let result = new Set<T>();
    //   this.queryRayHelper(ray, result);
    //   return result;
    // }
    // private queryRayHelper(ray: Edge, result: Set<T>): void {
    //   if (!this.boundary.contains(ray)) {return;}
    //   // add own elements
    //   for (let i = 0; i < this.elements.length; i++) {
    //     result.add(this.elements[i]);
    //   }
    //   // check its children
    //   if (this.children) {
    //     for (let i = 0; i < 4; i++) {
    //       this.children[i].queryRayHelper(ray, result);
    //     }
    //   }
    // }
    has(element) {
        for (let i = 0; i < this.elements.length; i++) {
            if (this.elements[i].equals(element)) {
                return true;
            }
        }
        let result = false;
        if (this.children) {
            for (let i = 0; i < 4; i++) {
                result = result || this.children[i].has(element);
            }
        }
        return result;
    }
}
export { Point, Edge, Rectangle, QuadTree };
