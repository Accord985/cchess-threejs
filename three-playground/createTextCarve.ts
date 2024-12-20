// this method is expensive. Suitable for showcasing only one piece in a detailed manner.
// For gameplay, don't use this method
// compile with "tsc --target es6 ./three-playground/createTextCarve.ts"

import * as THREE from 'three';
import * as QT from './QuadTree.js';
import {gt, eq, ne, le, lt} from './FloatComparison.js';


// better be 2^n. I guess that's faster.
// Too small values might result in large imprecision or even errors.
const RESOLUTION = 128;

type Outline = {
  shapes: THREE.Vector2[][],
  holes: THREE.Vector2[][]
};

function createOutline(shapes: THREE.Shape[]): Outline {
  let combinedOutline: Outline = {shapes: [], holes: []};
  for (let i = 0; i < shapes.length; i++) {
    let dotOutline: {shape: THREE.Vector2[], holes: THREE.Vector2[][]} = shapes[i].extractPoints(20);
    combinedOutline.shapes.push(dotOutline.shape);
    for (let j = 0; j < dotOutline.holes.length; j++) {
      combinedOutline.holes.push(dotOutline.holes[j]);
    }
  }  // after this you have shapes and holes as 2 arrays of vectors
  return combinedOutline;
}

function findOutlineBoundary(shapes: THREE.Vector2[][]): QT.Rectangle {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < shapes.length; i++) {
    let shape = shapes[i];
    if (shape[0].x < minX) {minX = shape[0].x};
    if (shape[0].x > maxX) {maxX = shape[0].x};
    if (shape[0].y < minY) {minY = shape[0].y};
    if (shape[0].y > maxY) {maxY = shape[0].y};
    for (let j = 0; j < shape.length - 1; j++) {
      if (shape[j+1].x < minX) {minX = shape[j+1].x};
      if (shape[j+1].x > maxX) {maxX = shape[j+1].x};
      if (shape[j+1].y < minY) {minY = shape[j+1].y};
      if (shape[j+1].y > maxY) {maxY = shape[j+1].y};
    }
  }
  return new QT.Rectangle(minX - 1e-3, minY - 1e-3, maxX - minX + 2e-3, maxY - minY + 2e-3);
}

function buildPointTree(points: THREE.Vector2[][], boundary: QT.Rectangle): QT.QuadTree<QT.Point> {
  let pointTree = new QT.QuadTree<QT.Point>(boundary, 4);  // pass the boundary so no need to recalculate
  for (let i = 0; i < points.length; i++) {
    let currPathPoints = points[i];
    for (let j = 0; j < currPathPoints.length; j++) {
      pointTree.insert(new QT.Point(currPathPoints[j].x, currPathPoints[j].y));
    }
  }
  return pointTree;
}

function buildEdgeTree(points: THREE.Vector2[][], boundary: QT.Rectangle): QT.QuadTree<QT.Edge> {
  let edgeTree = new QT.QuadTree<QT.Edge>(boundary, 4);
  for (let i = 0; i < points.length; i++) {
    let currPathPoints = points[i];
    for (let j = 0; j < currPathPoints.length - 1; j++) {
      // the edge must be defined with start to end. Cannot flip this order. This is crucial for checkPointInShape()
      let currEdge = new QT.Edge(new QT.Point(currPathPoints[j].x, currPathPoints[j].y),
                                new QT.Point(currPathPoints[j + 1].x, currPathPoints[j + 1].y));
      // let before = edgeTree.getSize();
      edgeTree.insert(currEdge);
      // let after = edgeTree.getSize();
      // if (before === after) {
      //   console.log("I didn't add ", currEdge, " successfully to ", edgeTree);
      // }
    }
  }
  // no need to do final point back to first point because the points already has duplicate starting & ending points
  return edgeTree;
}

function checkPointInShape(point: QT.Point, edgeTree: QT.QuadTree<QT.Edge>): boolean {
  let ray = new QT.Edge(new QT.Point(point.getX(), point.getY()), new QT.Point(Infinity, point.getY()));
  let relevantEdges = edgeTree.query(ray);
  let inShape = false;  // if flips even number of times, the point is outside of shape
  let singleEndEnteringFromTop = 0;
  relevantEdges.forEach((edge) => {
    let x0 = point.getX(); let y0 = point.getY();
    let x1 = edge.getP1().getX(); let y1 = edge.getP1().getY();
    let x2 = edge.getP2().getX(); let y2 = edge.getP2().getY();
    if (gt(y1, y0) && eq(y2, y0) && gt(x2, x0)) {  // points on shape are not accepted
      // entering from top
      singleEndEnteringFromTop++;
    } else if (eq(y1, y0) && gt(y2, y0) && gt(x1, x0)) {
      // leaving from top
      singleEndEnteringFromTop--;
    } else if (ne(y1, y2) && ne(y1, y0) && ne(y2, y0)) {
      // now neither of the endpoints should be on the ray AND it is not parallel to the ray
      //     (notice that parallel=>do nothing, and we don't wanna count single touch from bottom multiple times)
      // find intersection, and it should be on both the ray and the edge
      // For the ray: check if its x coord is strictly larger than point
      // For the edge: check both x & y coord fall between the two endpoints (could be equal)
      let intersectX = (x2 - x1) / (y2 - y1) * (y0 - y1) + x1;
      if (gt(intersectX, x0) && (le((intersectX - x1) * (intersectX - x2), 0) &&
          le((y0 - y1) * (y0 - y2), 0))) {
        inShape = !inShape;
      }
    }
  });
  // after it is all done, flip inShape for (# of single endpoint entering on top) times
  if (singleEndEnteringFromTop % 2 === 1) { inShape = !inShape; }
  return inShape;
}

function findDistanceToOutline(point: QT.Point, edges: QT.QuadTree<QT.Edge>): number {
  let maxSearchDimension = 8;
  let searchArea = new QT.Rectangle(point.getX() - maxSearchDimension / 2,
      point.getY() - maxSearchDimension / 2, maxSearchDimension, maxSearchDimension);
  let relevantEdges = edges.query(searchArea);
  let minDistance = maxSearchDimension * Math.SQRT2 / 2;
  relevantEdges.forEach((edge) => {
    let distance = point.distanceToEdge(edge);
    if (distance < minDistance) {
      minDistance = distance;
    }
  });
  return minDistance;
}

function findNthSampleValue(min: number, rangeSpan: number, resolution: number, n: number) {
  if (!Number.isInteger(n) || !Number.isInteger(resolution)) {
    throw new Error("index n and resolution should both be integers");
  }
  if (n >= resolution || n < 0) {
    throw new Error("n should be 0-based index from 0 to resolution-1");
  }
  return min + (n + 0.5) / resolution * rangeSpan;
}

function sample(shapeEdges: QT.QuadTree<QT.Edge>, holeEdges: QT.QuadTree<QT.Edge>,
      shapeBoundary: QT.Rectangle): QT.QuadTree<QT.Point> {
  let samplesInShape = new QT.QuadTree<QT.Point>(shapeBoundary, 4);
  for (let i = 0; i < RESOLUTION; i++) {  // ensure all points are strictly inside the boundary
    let currX = findNthSampleValue(shapeBoundary.getX(), shapeBoundary.getW(), RESOLUTION, i);
    for (let j = 0; j < RESOLUTION; j++) {
      let currY = findNthSampleValue(shapeBoundary.getY(), shapeBoundary.getH(), RESOLUTION, j);
      let currSample = new QT.Point(currX, currY);
      if (checkPointInShape(currSample, shapeEdges) && !checkPointInShape(currSample, holeEdges)) {
        let distance = Math.min(findDistanceToOutline(currSample, shapeEdges),
                                findDistanceToOutline(currSample, holeEdges));
        let currVector = new QT.Point(currX, currY, - distance);
        samplesInShape.insert(currVector);
      }
    }
  }
  return samplesInShape;
}

// after you connect 3 points for a triangle, you push the 3 points (Vector3) into the array
function connectAmongSamples(samplesInShape: QT.QuadTree<QT.Point>, pointsBuffer: THREE.Vector3[],
  shapeBoundary: QT.Rectangle): void {
  for (let i = 0; i < RESOLUTION - 1; i++) {
    let currX = findNthSampleValue(shapeBoundary.getX(), shapeBoundary.getW(), RESOLUTION, i);
    let nextX = findNthSampleValue(shapeBoundary.getX(), shapeBoundary.getW(), RESOLUTION, i + 1);
    let firstY = findNthSampleValue(shapeBoundary.getY(), shapeBoundary.getH(), RESOLUTION, 0);

    // I just assume that top=small x, left=small y. Just for naming here
    let topLeft = samplesInShape.retrieve(currX, firstY);
    let bottomLeft = samplesInShape.retrieve(nextX, firstY);
    for (let j = 0; j < RESOLUTION - 1; j++) {
      let nextY = findNthSampleValue(shapeBoundary.getY(), shapeBoundary.getH(), RESOLUTION, j + 1);
      let bottomRight = samplesInShape.retrieve(nextX, nextY);
      let topRight = samplesInShape.retrieve(currX, nextY);
      // add triangle if all vertices are present. But avoid adding 4 triangles if all 4 are present
      if (topLeft && bottomRight) {
        if (topRight) {
          pointsBuffer.push(toVector3(topLeft), toVector3(topRight), toVector3(bottomRight));
        }
        if (bottomLeft) {
          pointsBuffer.push(toVector3(topLeft), toVector3(bottomLeft), toVector3(bottomRight));
        }
      } else if (topRight && bottomLeft) {
        if (topLeft) {
          pointsBuffer.push(toVector3(topLeft), toVector3(topRight), toVector3(bottomLeft));
        }
        if (bottomRight) {
          pointsBuffer.push(toVector3(topRight), toVector3(bottomLeft), toVector3(bottomRight));
        }
      }
      topLeft = topRight;
      bottomLeft = bottomRight;
    }
  }
}

function connectSamplesAndEdges(samplesInShape: QT.QuadTree<QT.Point>, points: THREE.Vector2[][],
      pointsBuffer: THREE.Vector3[], shapeBoundary: QT.Rectangle): void {
  // for each sample, query with area around it (+-0.5step). Connect all points
  // query;
  let widthStep = 1 / RESOLUTION * shapeBoundary.getW() + 1e-3;
  let heightStep = 1 / RESOLUTION * shapeBoundary.getH() + 1e-3;
  const findClosestSample = (px: number, py: number): QT.Point | null => {  // point x, point y
    let queryArea = new QT.Rectangle(px - widthStep, py - heightStep, 2 * widthStep, 2 * heightStep);
    let relevantSamples = samplesInShape.query(queryArea);
    let minDistanceSquare = Infinity;
    let result = null;
    relevantSamples.forEach((sample) => {
      if (queryArea.contains(sample)) {
        let currDistanceSquare = Math.pow((sample.getX() - px), 2) + Math.pow((sample.getY() - py), 2);
        if (currDistanceSquare < minDistanceSquare) {
          result = sample;
          minDistanceSquare = currDistanceSquare;
        }
      }
    });
    return result;
  };
  for (let i = 0; i < points.length; i++) {
    let currPath = points[i];
    let currStart = currPath[0];
    let startClosest = findClosestSample(currStart.x, currStart.y);
    for (let j = 0; j < currPath.length - 1; j++) {
      let currEnd = currPath[j + 1];
      let endClosest = findClosestSample(currEnd.x, currEnd.y);
      if (!startClosest || !endClosest) {
        console.warn("edge with ", currStart, currEnd, " is omitted");
      } else if (startClosest.equals(endClosest)) {
        pointsBuffer.push(
          new THREE.Vector3(currStart.x, currStart.y, 0),
          new THREE.Vector3(currEnd.x, currEnd.y, 0),
          toVector3(startClosest)
        );
      } else {
        // flatten the the vectors and check their cross products, a negative z coordinate means clockwise rotation
        // edgeP1 and startClosest; edgeP1 and endClosest
        let startPoint = new QT.Point(currStart.x, currStart.y);
        let endPoint = new QT.Point(currEnd.x, currEnd.y);
        let startVec = new THREE.Vector3(currStart.x, currStart.y, 0);
        let endVec = new THREE.Vector3(currEnd.x, currEnd.y, 0);
        if (!pointsOnSameSide(startClosest, endClosest, startPoint, endPoint)) {
          pointsBuffer.push(
            startVec, endVec, toVector3(startClosest),
            startVec, endVec, toVector3(endClosest)
          );
        } else if (!pointsOnSameSide(startClosest, endPoint, startPoint, endClosest)) {
          pointsBuffer.push(
            startVec, toVector3(endClosest), toVector3(startClosest),
            startVec, toVector3(endClosest), endVec
          );
        } else {  // start + startClosest has to be the line
          pointsBuffer.push(
            startVec, toVector3(startClosest), toVector3(endClosest),
            startVec, toVector3(startClosest), endVec
          );
        }
      }
      currStart = currEnd;
      startClosest = endClosest;
    }
  }
}

function pointsOnSameSide(point1: QT.Point, point2: QT.Point, edgeP1: QT.Point, edgeP2: QT.Point) {
  // flatten the the vectors and check their cross products, a negative z coordinate means clockwise rotation
  // edgeP1 and startClosest; edgeP1 and endClosest
  // if the z coord is the same sign => same side; otherwise, different
  // x1y2 - x2y1 (x1, x2, 0) & (y1, y2, 0)
  let v1x = point1.getX() - edgeP1.getX();
  let v1y = point1.getY() - edgeP1.getY();
  let v2x = point2.getX() - edgeP1.getX();
  let v2y = point2.getY() - edgeP1.getY();
  let v0x = edgeP2.getX() - edgeP1.getX();
  let v0y = edgeP2.getY() - edgeP1.getY();
  let crossZP1Start = v0x * v1y - v1x * v0y;  // v0 x v1
  let crossZP1End = v0x * v2y - v2x * v0y;  // v0 x v2
  // console.log("ep1 to p1: ", [v1x, v1y], "; ep1 to p2: ", [v2x, v2y], "ep1 to ep2: ", [v0x, v0y]);
  // console.log("crossZP1Start", crossZP1Start);
  // console.log("crossZP1End", crossZP1End);
  // console.log("product: ", crossZP1End * crossZP1Start);
  // console.log("So they are on same side? ", lt(crossZP1Start * crossZP1End, 0));
  return gt(crossZP1Start * crossZP1End, 0);
}

function clipLineInArea(edge: QT.Edge, rect: QT.Rectangle): QT.Edge | null {
  // use Liang-Barsky algorithm (thank you copilot for inspiration)
  let xMin = rect.getX(); let yMin = rect.getY();
  let xMax = xMin + rect.getW(); let yMax = yMin + rect.getH();
  let x1 = edge.getP1().getX(); let y1 = edge.getP1().getY();
  let x2 = edge.getP2().getX(); let y2 = edge.getP2().getY();
  let dx = x2 - x1; let dy = y2 - y1;
  let tMin = 0.0; let tMax = 1.0;
  let p = [-dx, dx, -dx, dx];
  let q = [x1 - xMin, xMax - x1, y1 - yMin, yMax - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      return (q[i] < 0) ? null : edge;
    } else {
      let t = q[i] / p[i];
      if (p[i] < 0) {
        tMin = Math.max(tMin, t);
      } else {
        tMax = Math.min(tMax, t);
      }
    }
  }
  if (tMin > tMax) { return null; }
  let newX1 = x1 + tMin * dx;
  let newY1 = y1 + tMin * dy;
  let newX2 = x1 + tMax * dx;
  let newY2 = y1 + tMax * dy;
  return new QT.Edge(new QT.Point(newX1, newY1), new QT.Point(newX2, newY2));
}

function createCarve(shapes: THREE.Vector2[][], holes: THREE.Vector2[][]): THREE.Vector3[] {
  let shapeBoundary = findOutlineBoundary(shapes);
  let shapeEdges = buildEdgeTree(shapes, shapeBoundary);
  let holeEdges = buildEdgeTree(holes, shapeBoundary);

  let samplesInShape = sample(shapeEdges, holeEdges, shapeBoundary);  // also calcs height
  let pointsBuffer: THREE.Vector3[] = [];
  connectAmongSamples(samplesInShape, pointsBuffer, shapeBoundary);
  connectSamplesAndEdges(samplesInShape, shapes, pointsBuffer, shapeBoundary);
  connectSamplesAndEdges(samplesInShape, holes, pointsBuffer, shapeBoundary);
  return pointsBuffer;
}

function toVector3(point: QT.Point): THREE.Vector3 {
  return new THREE.Vector3(point.getX(), point.getY(), point.getH());
}

function toPointsArray(qt: QT.QuadTree<QT.Point>) {
  let result: THREE.Vector3[] = [];
  toPointsArrayHelper(qt, result);
  return result;
}

function toPointsArrayHelper(qtNode: QT.QuadTree<QT.Point>, result: THREE.Vector3[]): void {
  for (let i = 0; i < qtNode.getElements().length; i++) {
    let currPoint = qtNode.getElements()[i];
    let currVector = new THREE.Vector3(currPoint.getX(), currPoint.getY(), currPoint.getH());
    result.push(currVector);
  }
  let children = qtNode.getChildren();
  if (children) {
    for (let i = 0; i < 4; i++) {
      toPointsArrayHelper(children[i], result);
    }
  }
}

// as some triangles have their vertices pushed in the wrong order, the normal vector is computed
// the opposite as expected. I want all the normal vectors to point down (z<0 direction)
function correctWindingOrders(geometry: THREE.BufferGeometry): void {
  let positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i += 3) {
    let v1 = new THREE.Vector3().fromBufferAttribute(positions, i);  // vertice 1
    let v2 = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
    let v3 = new THREE.Vector3().fromBufferAttribute(positions, i + 2);
    // find winding order: find cross product of vec<v1,v2> and vec<v1,v3>
    //  & a negative z coordinate means clockwise rotation
    // a1b2 - a2b1
    let crossZ = (v2.x - v1.x) * (v3.y - v1.y) - (v2.y - v1.y) * (v3.x - v1.x)
    if (crossZ > 0) {
      positions.setXYZ(i, v3.x, v3.y, v3.z);
      positions.setXYZ(i + 2, v1.x, v1.y, v1.z);
    }
  }
  positions.needsUpdate = true;
}

function createTextCarve(geometry: THREE.ExtrudeGeometry): THREE.BufferGeometry {
  // retrieve the text shape
  let shapes: THREE.Shape | THREE.Shape[] = geometry.parameters.shapes;  // an array of shapes
  if (!Array.isArray(shapes)) { shapes = [shapes]; }
  let outline = createOutline(shapes);
  let pointsBuffer = createCarve(outline.shapes, outline.holes);
  let carveGeometry = new THREE.BufferGeometry().setFromPoints(pointsBuffer);
  correctWindingOrders(carveGeometry);
  carveGeometry.computeVertexNormals();
  return carveGeometry;
}

export {createTextCarve};