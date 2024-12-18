// compile with "tsc --target es6 ./three-playground/createTextCarve.ts"

import * as THREE from 'three';
import * as QT from './QuadTree.js';

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
  return new QT.Rectangle(minX, minY, maxX - minX, maxY - minY);
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
      edgeTree.insert(currEdge);
    }
    let finalEdge = new QT.Edge(
      new QT.Point(currPathPoints[currPathPoints.length - 1].x, currPathPoints[currPathPoints.length - 1].y),
      new QT.Point(currPathPoints[0].x, currPathPoints[0].y)
    );
    edgeTree.insert(finalEdge);
  }
  return edgeTree;
}

function checkPointInShape(point: QT.Point, edgeTree: QT.QuadTree<QT.Edge>): boolean {
  let ray = new QT.Edge(new QT.Point(point.getX(), point.getY()), new QT.Point(Infinity, point.getY()));
  let relevantEdges = edgeTree.query(ray);
  let inShape = false;  // if flips even number of times, the point is outside of shape
  let singleEndEnteringFromTop = 0;
  relevantEdges.forEach((edge) => {
    if (edge.getP1().getY() > point.getY() && edge.getP2().getY() === point.getY() && edge.getP2().getX() > point.getX()) {  // points on shape are not accepted
      // entering from top
      singleEndEnteringFromTop++;
    } else if (edge.getP1().getY() === point.getY() && edge.getP2().getY() > point.getY() && edge.getP1().getX() > point.getX()) {
      // leaving from top
      singleEndEnteringFromTop--;
    } else if (edge.getP1().getY() !== edge.getP2().getY() &&
          edge.getP1().getY() !== point.getY() && edge.getP2().getY() !== point.getY()) {
      // now neither of the endpoints should be on the ray
      //     (notice that parallel=>do nothing, and we don't wanna count single touch from bottom multiple times)
      // find intersection, and it should be on both the ray and the edge
      // For the ray: check if its x coord is strictly larger than point
      // For the edge: check both x & y coord fall between the two endpoints (could be equal)
      let intersectX = (edge.getP2().getX() - edge.getP1().getX()) / (edge.getP2().getY() - edge.getP1().getY()) * (point.getY() - edge.getP1().getY()) + edge.getP1().getX();
      if (intersectX > point.getX() && ((intersectX - edge.getP1().getX()) * (intersectX - edge.getP2().getX()) <= 0 &&
          (point.getY() - edge.getP1().getY()) * (point.getY() - edge.getP2().getY()) <= 0)) {
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

function createCarve(shapes: THREE.Vector2[][], holes: THREE.Vector2[][]): THREE.Vector3[] {
  let shapeBoundary = findOutlineBoundary(shapes);
  let shapePoints = buildPointTree(shapes, shapeBoundary);
  let holePoints = buildPointTree(holes, shapeBoundary);
  let shapeEdges = buildEdgeTree(shapes, shapeBoundary);
  let holeEdges = buildEdgeTree(holes, shapeBoundary);
  // sampling
  const resolution = 127;
  // let samplesInShape: THREE.Vector3[] = [];
  let samplesInShape = new QT.QuadTree<QT.Point>(shapeBoundary, 4);
  for (let i = 0; i < resolution; i++) {  // ensure all points are strictly inside the boundary
    let currX = shapeBoundary.getX() + (i+1) / (resolution+1) * shapeBoundary.getW();
    for (let j = 0; j < resolution; j++) {
      let currY = shapeBoundary.getY() + (j+1) / (resolution+1) * shapeBoundary.getH();
      let currSample = new QT.Point(currX, currY);
      if (checkPointInShape(currSample, shapeEdges) && !checkPointInShape(currSample, holeEdges)) {
        let distance = Math.min(findDistanceToOutline(currSample, shapeEdges),
                                findDistanceToOutline(currSample, holeEdges));
        // let currVector = new THREE.Vector3(currX, currY, distance);
        // samplesInShape.push(currVector);
        let currVector = new QT.Point(currX, currY, -distance);
        samplesInShape.insert(currVector);
      }
    }
  }

  // connection

  // return samplesInShape;
  return toPointsArray(samplesInShape);
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

function createTextCarve(geometry: THREE.ExtrudeGeometry): THREE.BufferGeometry {
  // retrieve the text shape
  let shapes: THREE.Shape | THREE.Shape[] = geometry.parameters.shapes;  // an array of shapes
  if (!Array.isArray(shapes)) { shapes = [shapes]; }
  let outline = createOutline(shapes);
  let pointsBuffer = createCarve(outline.shapes, outline.holes);
  let carveGeometry = new THREE.BufferGeometry().setFromPoints(pointsBuffer);
  return carveGeometry;
}

export {createTextCarve};