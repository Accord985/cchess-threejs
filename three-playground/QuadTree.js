class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    getX() { return this.x; }
    getY() { return this.y; }
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
    ;
    getH() { return this.h; }
    ;
    contains(element) {
        if (element instanceof Point) {
            let point = element;
            return (point.getX() > this.x && point.getX() < this.x + this.w
                && point.getY() > this.y && point.getY() < this.y + this.h);
        }
        else { // must be type Edge
            let edge = element;
            // find the overlapping x values of edge in rectangle
            let xOverlap = this.findOverlap(edge.getP1().getX(), edge.getP2().getX(), this.x, this.x + this.w);
            if (xOverlap[0] >= xOverlap[1]) {
                return false;
            }
            // check if the y values overlap (boundary excluded) [rectangle and line in the overlapping x values]
            let yOverlap = this.findOverlap(edge.computeYOnEdge(xOverlap[0]), edge.computeYOnEdge(xOverlap[1]), this.y, this.y + this.h);
            return yOverlap[0] < yOverlap[1];
        }
    }
    findOverlap(start1, end1, start2, end2) {
        let min1 = Math.min(start1, end1);
        let max1 = Math.max(start1, end1);
        let min2 = Math.min(start2, end2);
        let max2 = Math.max(start2, end2);
        return [Math.max(min1, min2), Math.min(max1, max2)]; // smaller of range, larger of range
    }
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
    }
    getBoundary() { return this.boundary; }
    getCapacity() { return this.capacity; }
    getChildren() { return this.children; }
    getElements() { return this.elements; }
    insert(element) {
        if (!this.boundary.contains(element)) {
            return;
        }
        if (this.elements.length < this.capacity) {
            this.elements.push(element);
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
    query() {
    }
}
export { Point, Edge, Rectangle, QuadTree };
