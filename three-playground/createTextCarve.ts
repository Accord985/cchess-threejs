// this method is expensive. Suitable for showcasing only one piece in a detailed manner.
// For gameplay, don't use this method
// compile with "tsc --target es6 ./three-playground/createTextCarve.ts"

import * as THREE from 'three';
import * as QT from './QuadTree.js';
import {gt, eq, ne, le, lt} from './FloatComparison.js';

// better be 2^n. I guess that's faster.
// Too small values might result in large imprecision or even errors.
const RESOLUTION = 32;
const HEIGHT_FACTOR = 0.15;

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

function buildEdgeTree(points: THREE.Vector2[][], boundary: QT.Rectangle): QT.QuadTree<QT.Edge> {
  let edgeTree = new QT.QuadTree<QT.Edge>(boundary, 4);
  for (let i = 0; i < points.length; i++) {
    let currPathPoints = points[i];
    for (let j = 0; j < currPathPoints.length - 1; j++) {
      // the edge must be defined with start to end. Cannot flip this order. This is crucial for checkPointInShape()
      let currEdge = new QT.Edge(new QT.Point(currPathPoints[j].x, currPathPoints[j].y),
                                new QT.Point(currPathPoints[j + 1].x, currPathPoints[j + 1].y));
      edgeTree.insert(currEdge);
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
        let currVector = new QT.Point(currX, currY, -distance * HEIGHT_FACTOR);
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

// for each sample, query with area around it (+-1step). maybe try 0.5 step.
// Sometimes a point really has 2 closest sample (same distance to them).
function findClosestSample(px: number, py: number, halfWidth: number, halfHeight: number,
      samplesInShape: QT.QuadTree<QT.Point>): QT.Point[] {  // point x, point y
  const DELTA = 1e-3;
  halfWidth += DELTA;  halfHeight += DELTA;
  let queryArea = new QT.Rectangle(px - halfWidth, py - halfHeight, 2 * halfWidth, 2 * halfHeight);
  let relevantSamples = samplesInShape.query(queryArea);
  let minDistanceSquare = Infinity;
  let result: QT.Point[] = [];
  relevantSamples.forEach((sample: QT.Point) => {
    if (queryArea.contains(sample)) {
      let currDistanceSquare = Math.pow((sample.getX() - px), 2) + Math.pow((sample.getY() - py), 2);
      if (eq(currDistanceSquare, minDistanceSquare)) {  // same but not enough to beat
        result.push(sample);
      }
      if (lt(currDistanceSquare, minDistanceSquare)) {
        result.length = 0;  // clear it all
        result.push(sample);
        minDistanceSquare = currDistanceSquare;
      }
    }
  });
  return result;
}

function selfConnect(pathPoint: THREE.Vector2, closestSamples: QT.Point[], pointsBuffer: THREE.Vector3[]) {
  if (closestSamples.length > 1) {
    let startVec = new THREE.Vector3(pathPoint.x, pathPoint.y, 0);
    for (let i = 0; i < closestSamples.length - 1; i++) {
      pointsBuffer.push(toVector3(closestSamples[i]), toVector3(closestSamples[i+1]), startVec);
    }
  }
}

function removeShared(arr1: any[], arr2: any[]) {
  for (let i = 0; i < arr1.length; i++) {
    let indexIn2 = arr2.indexOf(arr1[i]);
    if (indexIn2 !== -1) {
      arr2.splice(indexIn2, 1);
      arr1.splice(i, 1);  // delete the element at the index
    }
  }
}

function interConnect(start: THREE.Vector2, end: THREE.Vector2, startClosests: QT.Point[],
      endClosests: QT.Point[], pointsBuffer: THREE.Vector3[], widthStep: number,
      heightStep: number, samplesInShape: QT.QuadTree<QT.Point>): void {
  // didn't consider if start & end have more than 1 not shared element
  if (startClosests.length === 0 || endClosests.length === 0) {
    // console.warn("edge with ", start, end, " is omitted");
    return;
  }
  // removeShared(startClosest, endClosest);

  // idk but just take the first one for now. lots of edge cases to consider
  let startClosest = startClosests[0];
  let endClosest = endClosests[0];
  if (startClosest.equals(endClosest)) {
    pointsBuffer.push(
      new THREE.Vector3(start.x, start.y, 0),
      new THREE.Vector3(end.x, end.y, 0),
      toVector3(startClosest)
    );
  } else {
    let startPoint = new QT.Point(start.x, start.y);
    let endPoint = new QT.Point(end.x, end.y);
    pushFourPoints(startPoint, endPoint, startClosest, endClosest, pointsBuffer);


    // you might miss a triangle if you push 4 points (a trapezium) but the two closest samples are not 45deg
    if (ne(startClosest.getX() - endClosest.getX(), startClosest.getY() - endClosest.getY()) &&
          ne(startClosest.getX() - endClosest.getX(), 0) && ne(startClosest.getY() - endClosest.getY(), 0)) {
      let widthUnits = Math.round((endClosest.getX() - startClosest.getX()) / widthStep);  // float imprecision
      let heightUnits = Math.round((endClosest.getY() - startClosest.getY()) / heightStep);
      // try all 4 directions, but guaranteed to have only one to work
      // firstly, try moving once and does samplesInShape.has() the element?
      // if so, then move n times
      let n = Math.abs(Math.abs(widthUnits) - Math.abs(heightUnits));

      let retrieved, previous;

      // start to end X
      previous = startClosest;
      retrieved = samplesInShape.retrieve(startClosest.getX() + Math.sign(widthUnits) * widthStep, startClosest.getY());
      for (let i = 0; i < n; i++) {
        if (!retrieved) { continue; }  // why would this happen???
        pointsBuffer.push(toVector3(retrieved), toVector3(previous), toVector3(endClosest));
        previous = retrieved;
        retrieved = samplesInShape.retrieve(previous.getX() + Math.sign(widthUnits) * widthStep, previous.getY());
      }

      // start to end Y
      previous = startClosest;
      retrieved = samplesInShape.retrieve(startClosest.getX(), startClosest.getY() + Math.sign(heightUnits) * heightStep);
      for (let i = 0; i < n; i++) {
        if (!retrieved) { continue; }  // why would this happen???
        pointsBuffer.push(toVector3(retrieved), toVector3(previous), toVector3(endClosest));
        previous = retrieved;
        retrieved = samplesInShape.retrieve(previous.getX(), previous.getY() + Math.sign(heightUnits) * heightStep);
      }

      // seems like it works without the end to start part
      // end to start X
      previous = endClosest;
      retrieved = samplesInShape.retrieve(endClosest.getX() - Math.sign(widthUnits) * widthStep, endClosest.getY());
      for (let i = 0; i < n; i++) {
        if (!retrieved) { continue; }  // why would this happen???
        pointsBuffer.push(toVector3(retrieved), toVector3(previous), toVector3(startClosest));
        previous = retrieved;
        retrieved = samplesInShape.retrieve(previous.getX() - Math.sign(widthUnits) * widthStep, previous.getY());
      }

      // end to start Y
      previous = endClosest;
      retrieved = samplesInShape.retrieve(endClosest.getX(), endClosest.getY() - Math.sign(heightUnits) * heightStep);
      for (let i = 0; i < n; i++) {
        if (!retrieved) { console.log("i ",i,", n ",n); continue; }  // why would this happen???
        pointsBuffer.push(toVector3(retrieved), toVector3(previous), toVector3(startClosest));
        previous = retrieved;
        retrieved = samplesInShape.retrieve(previous.getX(), previous.getY() - Math.sign(heightUnits) * heightStep);
      }
    }
  }
}


function pushFourPoints(p1: QT.Point, p2: QT.Point, p3: QT.Point, p4: QT.Point, pointsBuffer: THREE.Vector3[]): void {
  // flatten the the vectors and check their cross products, a negative z coordinate means clockwise rotation
  // edgeP1 and startClosest; edgeP1 and endClosest
  if (!pointsOnSameSide(p1, p2, p3, p4)) {
    pointsBuffer.push(
      toVector3(p3), toVector3(p4), toVector3(p1),
      toVector3(p3), toVector3(p4), toVector3(p2),
    );
  } else if (!pointsOnSameSide(p1, p4, p3, p2)) {
    pointsBuffer.push(
      toVector3(p3), toVector3(p2), toVector3(p1),
      toVector3(p3), toVector3(p2), toVector3(p4),
    );
  } else {  // p3 + p1 has to be the line
    pointsBuffer.push(
      toVector3(p3), toVector3(p1), toVector3(p2),
      toVector3(p3), toVector3(p1), toVector3(p4),
    );
  }
}

function connectSamplesAndEdges(samplesInShape: QT.QuadTree<QT.Point>, points: THREE.Vector2[][],
      pointsBuffer: THREE.Vector3[], shapeBoundary: QT.Rectangle): void {
  let widthStep = 1 / RESOLUTION * shapeBoundary.getW();
  let heightStep = 1 / RESOLUTION * shapeBoundary.getH();
  for (let i = 0; i < points.length; i++) {
    let currPath = points[i];
    let currStart = currPath[0];
    let startClosest = findClosestSample(currStart.x, currStart.y, widthStep, heightStep, samplesInShape);  // probably halfstep is even enough
    // connect for start in case it has more than 1 closest samples
    selfConnect(currStart, startClosest, pointsBuffer);
    for (let j = 0; j < currPath.length - 1; j++) {
      let currEnd = currPath[j + 1];
      let endClosest = findClosestSample(currEnd.x, currEnd.y, widthStep, heightStep, samplesInShape);
      selfConnect(currEnd, endClosest, pointsBuffer);
      interConnect(currStart, currEnd, startClosest, endClosest, pointsBuffer, widthStep, heightStep, samplesInShape);
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
  return gt(crossZP1Start * crossZP1End, 0);
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