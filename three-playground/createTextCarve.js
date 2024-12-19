// this method is expensive. Suitable for showcasing only one piece in a detailed manner.
// For gameplay, don't use this method
// compile with "tsc --target es6 ./three-playground/createTextCarve.ts"
import * as THREE from 'three';
import * as QT from './QuadTree.js';
import { gt, eq, ne, le } from './FloatComparison.js';
function createOutline(shapes) {
    let combinedOutline = { shapes: [], holes: [] };
    for (let i = 0; i < shapes.length; i++) {
        let dotOutline = shapes[i].extractPoints(20);
        combinedOutline.shapes.push(dotOutline.shape);
        for (let j = 0; j < dotOutline.holes.length; j++) {
            combinedOutline.holes.push(dotOutline.holes[j]);
        }
    } // after this you have shapes and holes as 2 arrays of vectors
    return combinedOutline;
}
function findOutlineBoundary(shapes) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < shapes.length; i++) {
        let shape = shapes[i];
        if (shape[0].x < minX) {
            minX = shape[0].x;
        }
        ;
        if (shape[0].x > maxX) {
            maxX = shape[0].x;
        }
        ;
        if (shape[0].y < minY) {
            minY = shape[0].y;
        }
        ;
        if (shape[0].y > maxY) {
            maxY = shape[0].y;
        }
        ;
        for (let j = 0; j < shape.length - 1; j++) {
            if (shape[j + 1].x < minX) {
                minX = shape[j + 1].x;
            }
            ;
            if (shape[j + 1].x > maxX) {
                maxX = shape[j + 1].x;
            }
            ;
            if (shape[j + 1].y < minY) {
                minY = shape[j + 1].y;
            }
            ;
            if (shape[j + 1].y > maxY) {
                maxY = shape[j + 1].y;
            }
            ;
        }
    }
    return new QT.Rectangle(minX - 1e-3, minY - 1e-3, maxX - minX + 2e-3, maxY - minY + 2e-3);
}
function buildPointTree(points, boundary) {
    let pointTree = new QT.QuadTree(boundary, 4); // pass the boundary so no need to recalculate
    for (let i = 0; i < points.length; i++) {
        let currPathPoints = points[i];
        for (let j = 0; j < currPathPoints.length; j++) {
            pointTree.insert(new QT.Point(currPathPoints[j].x, currPathPoints[j].y));
        }
    }
    return pointTree;
}
function buildEdgeTree(points, boundary) {
    let edgeTree = new QT.QuadTree(boundary, 4);
    for (let i = 0; i < points.length; i++) {
        let currPathPoints = points[i];
        for (let j = 0; j < currPathPoints.length - 1; j++) {
            // the edge must be defined with start to end. Cannot flip this order. This is crucial for checkPointInShape()
            let currEdge = new QT.Edge(new QT.Point(currPathPoints[j].x, currPathPoints[j].y), new QT.Point(currPathPoints[j + 1].x, currPathPoints[j + 1].y));
            edgeTree.insert(currEdge);
        }
        let finalEdge = new QT.Edge(new QT.Point(currPathPoints[currPathPoints.length - 1].x, currPathPoints[currPathPoints.length - 1].y), new QT.Point(currPathPoints[0].x, currPathPoints[0].y));
        edgeTree.insert(finalEdge);
    }
    return edgeTree;
}
function checkPointInShape(point, edgeTree) {
    let ray = new QT.Edge(new QT.Point(point.getX(), point.getY()), new QT.Point(Infinity, point.getY()));
    let relevantEdges = edgeTree.query(ray);
    let inShape = false; // if flips even number of times, the point is outside of shape
    let singleEndEnteringFromTop = 0;
    relevantEdges.forEach((edge) => {
        let x0 = point.getX();
        let y0 = point.getY();
        let x1 = edge.getP1().getX();
        let y1 = edge.getP1().getY();
        let x2 = edge.getP2().getX();
        let y2 = edge.getP2().getY();
        if (gt(y1, y0) && eq(y2, y0) && gt(x2, x0)) { // points on shape are not accepted
            // entering from top
            singleEndEnteringFromTop++;
        }
        else if (eq(y1, y0) && gt(y2, y0) && gt(x1, x0)) {
            // leaving from top
            singleEndEnteringFromTop--;
        }
        else if (ne(y1, y2) && ne(y1, y0) && ne(y2, y0)) {
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
    if (singleEndEnteringFromTop % 2 === 1) {
        inShape = !inShape;
    }
    return inShape;
}
function findDistanceToOutline(point, edges) {
    let maxSearchDimension = 8;
    let searchArea = new QT.Rectangle(point.getX() - maxSearchDimension / 2, point.getY() - maxSearchDimension / 2, maxSearchDimension, maxSearchDimension);
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
function sample(shapeEdges, holeEdges, shapeBoundary, resolution) {
    let samplesInShape = new QT.QuadTree(shapeBoundary, 4);
    for (let i = 0; i < resolution; i++) { // ensure all points are strictly inside the boundary
        let currX = shapeBoundary.getX() + (i + 1) / (resolution + 1) * shapeBoundary.getW();
        for (let j = 0; j < resolution; j++) {
            let currY = shapeBoundary.getY() + (j + 1) / (resolution + 1) * shapeBoundary.getH();
            let currSample = new QT.Point(currX, currY);
            if (checkPointInShape(currSample, shapeEdges) && !checkPointInShape(currSample, holeEdges)) {
                let distance = Math.min(findDistanceToOutline(currSample, shapeEdges), findDistanceToOutline(currSample, holeEdges));
                let currVector = new QT.Point(currX, currY, -distance);
                samplesInShape.insert(currVector);
            }
        }
    }
    return samplesInShape;
}
// after you connect 3 points for a triangle, you push the 3 points (Vector3) into the array in order
// the order affects the direction of computing normals (which side it points)
function connectAmongSamples(samplesInShape, pointsBuffer, shapeBoundary, resolution) {
    for (let i = 0; i < resolution - 1; i++) {
        let currX = shapeBoundary.getX() + (i + 1) / (resolution + 1) * shapeBoundary.getW(); // same as above
        let nextX = shapeBoundary.getX() + (i + 2) / (resolution + 1) * shapeBoundary.getW(); // the next one
        for (let j = 0; j < resolution - 1; j++) {
            let currY = shapeBoundary.getY() + (j + 1) / (resolution + 1) * shapeBoundary.getH();
            let nextY = shapeBoundary.getY() + (j + 2) / (resolution + 1) * shapeBoundary.getH();
            // I just assume that top=small x, left=small y. Just for naming here
            let topLeft = samplesInShape.retrieve(currX, currY);
            let bottomRight = samplesInShape.retrieve(nextX, nextY);
            // if the diagonal is in the shape, then there could be a triangle (top-right/bottom-left)
            if (topLeft && bottomRight) {
                let bottomLeft = samplesInShape.retrieve(nextX, currY);
                if (bottomLeft) {
                    pointsBuffer.push(toVector3(topLeft), toVector3(bottomRight), toVector3(bottomLeft));
                }
                let topRight = samplesInShape.retrieve(currX, nextY);
                if (topRight) {
                    pointsBuffer.push(toVector3(topLeft), toVector3(topRight), toVector3(bottomRight));
                }
            }
        }
    }
}
function connectSamplesAndEdges(samplesInShape, points, pointsBuffer) {
    // (sequentially) for each edge, find closest sample in shape for each end
    // if they are the same: connect edge & the sample
    // if they are different: check if the two closest samples are on same side or different side of the edge
    //    and connect the four points
    for (let i = 0; i < points.length; i++) {
        let currPath = points[i];
        for (let j = 0; j < currPath.length; j++) {
            let start = currPath[j];
            let end = currPath[(j + 1) % currPath.length]; // if j is length-1, this is 0; otherwise j+1
            let startClosest = findClosestSample(samplesInShape, start.x, start.y);
            let endClosest = findClosestSample(samplesInShape, end.x, end.y);
            if (startClosest.equals(endClosest)) {
                pointsBuffer.push(toVector3(startClosest), toVector3(endClosest), new THREE.Vector3(start.x, start.y, 0));
            }
            else {
            }
        }
    }
}
function findClosestSample(samplesInShape, queryX, queryY) {
    return new QT.Point(0, 0);
}
function createCarve(shapes, holes) {
    let shapeBoundary = findOutlineBoundary(shapes);
    let shapeEdges = buildEdgeTree(shapes, shapeBoundary);
    let holeEdges = buildEdgeTree(holes, shapeBoundary);
    // better be 2^n-1. I guess that's faster.
    // Too small values result in large imprecision or even errors. You need at least 1 point sampled
    // in each region of shape.
    const RESOLUTION = 127;
    let samplesInShape = sample(shapeEdges, holeEdges, shapeBoundary, RESOLUTION); // also calcs height
    let pointsBuffer = [];
    connectAmongSamples(samplesInShape, pointsBuffer, shapeBoundary, RESOLUTION);
    connectSamplesAndEdges(samplesInShape, shapes, pointsBuffer);
    connectSamplesAndEdges(samplesInShape, holes, pointsBuffer);
    return pointsBuffer;
}
function toVector3(point) {
    return new THREE.Vector3(point.getX(), point.getY(), point.getH());
}
function toPointsArray(qt) {
    let result = [];
    toPointsArrayHelper(qt, result);
    return result;
}
function toPointsArrayHelper(qtNode, result) {
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
function createTextCarve(geometry) {
    // retrieve the text shape
    let shapes = geometry.parameters.shapes; // an array of shapes
    if (!Array.isArray(shapes)) {
        shapes = [shapes];
    }
    let outline = createOutline(shapes);
    let pointsBuffer = createCarve(outline.shapes, outline.holes);
    let carveGeometry = new THREE.BufferGeometry().setFromPoints(pointsBuffer);
    carveGeometry.computeVertexNormals();
    return carveGeometry;
}
export { createTextCarve };
