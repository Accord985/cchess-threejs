// these functions are for precise float point comparison.
const THRESHOLD = 1e-10;
function compareFloat(left, right) {
    if (Math.abs(left - right) < THRESHOLD) {
        return 0;
    }
    return (left < right) ? -1 : 1;
}
function lt(left, right) {
    return compareFloat(left, right) < 0;
}
function gt(left, right) {
    return compareFloat(left, right) > 0;
}
function eq(left, right) {
    return compareFloat(left, right) === 0;
}
function le(left, right) {
    return !gt(left, right);
}
function ge(left, right) {
    return !lt(left, right);
}
function ne(left, right) {
    return !eq(left, right);
}
function min(a, b) {
    return gt(a, b) ? b : a;
}
function max(a, b) {
    return le(a, b) ? b : a;
}
export { lt, gt, le, ge, eq, ne, min, max };
