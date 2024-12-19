// these functions are for precise float point comparison.
const THRESHOLD = 1e-8;

function compareFloat(left: number, right: number): number {
  if (Math.abs(left - right) < THRESHOLD) {
    return 0;
  }
  return (left < right) ? -1 : 1;
}

function lt(left: number, right: number): boolean {
  return compareFloat(left, right) < 0;
}
function gt(left: number, right: number): boolean {
  return compareFloat(left, right) > 0;
}
function eq(left: number, right: number): boolean {
  return compareFloat(left, right) === 0;
}
function le(left: number, right: number): boolean {
  return !gt(left, right);
}
function ge(left: number, right: number): boolean {
  return !lt(left, right);
}
function ne(left: number, right: number): boolean {
  return !eq(left, right);
}
function min(a: number, b: number): number {
  return gt(a, b) ? b : a;
}
function max(a: number, b: number): number {
  return le(a, b) ? b : a;
}

export {lt, gt, le, ge, eq, ne, min, max};