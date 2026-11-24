import { Vec3 } from '../types/geometry';

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function len3(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function dist3(a: Vec3, b: Vec3): number {
  return len3(sub3(a, b));
}

export function normalize3(v: Vec3): Vec3 {
  const l = len3(v);
  if (l < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function midpoint3(a: Vec3, b: Vec3): Vec3 {
  return lerp3(a, b, 0.5);
}

export function centroid3(pts: Vec3[]): Vec3 {
  if (pts.length === 0) return { x: 0, y: 0, z: 0 };
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
    z += p.z;
  }
  return { x: x / pts.length, y: y / pts.length, z: z / pts.length };
}

export function triangleArea3(a: Vec3, b: Vec3, c: Vec3): number {
  return 0.5 * len3(cross3(sub3(b, a), sub3(c, a)));
}

export function polygonArea3(pts: Vec3[]): number {
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    area += triangleArea3(pts[0], pts[i], pts[i + 1]);
  }
  return area;
}

export function tetrahedronVolume3(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  return Math.abs(dot3(sub3(a, d), cross3(sub3(b, d), sub3(c, d)))) / 6;
}

export function pointToPlaneDistance(p: Vec3, a: Vec3, b: Vec3, c: Vec3): number {
  const n = cross3(sub3(b, a), sub3(c, a));
  const nl = len3(n);
  if (nl < 1e-12) return NaN;
  return Math.abs(dot3(sub3(p, a), n)) / nl;
}

export function projectPointToPlane(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const n = normalize3(cross3(sub3(b, a), sub3(c, a)));
  const signedDist = dot3(sub3(p, a), n);
  return sub3(p, scale3(n, signedDist));
}

export function pointToLineDistance(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = sub3(b, a);
  const l = len3(ab);
  if (l < 1e-12) return dist3(p, a);
  return len3(cross3(sub3(p, a), ab)) / l;
}

export function angleBetweenVectorsDeg(u: Vec3, v: Vec3): number {
  const lu = len3(u);
  const lv = len3(v);
  if (lu < 1e-12 || lv < 1e-12) return NaN;
  const cos = Math.max(-1, Math.min(1, dot3(u, v) / (lu * lv)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function angleLineToPlaneDeg(p1: Vec3, p2: Vec3, a: Vec3, b: Vec3, c: Vec3): number {
  const dir = sub3(p2, p1);
  const n = cross3(sub3(b, a), sub3(c, a));
  const ld = len3(dir);
  const ln = len3(n);
  if (ld < 1e-12 || ln < 1e-12) return NaN;
  const sinVal = Math.min(1, Math.abs(dot3(dir, n)) / (ld * ln));
  return (Math.asin(sinVal) * 180) / Math.PI;
}

export function isPerpendicular(u: Vec3, v: Vec3, tol = 1e-5): boolean {
  const lu = len3(u);
  const lv = len3(v);
  if (lu < 1e-10 || lv < 1e-10) return false;
  return Math.abs(dot3(u, v)) / (lu * lv) < tol;
}

export function isParallel(u: Vec3, v: Vec3, tol = 1e-5): boolean {
  const lu = len3(u);
  const lv = len3(v);
  if (lu < 1e-10 || lv < 1e-10) return false;
  return len3(cross3(u, v)) / (lu * lv) < tol;
}

export function isLinePerpPlane(p1: Vec3, p2: Vec3, a: Vec3, b: Vec3, c: Vec3, tol = 1e-5): boolean {
  const dir = sub3(p2, p1);
  const n = cross3(sub3(b, a), sub3(c, a));
  return isParallel(dir, n, tol);
}

export function isLineParallelPlane(p1: Vec3, p2: Vec3, a: Vec3, b: Vec3, c: Vec3, tol = 1e-5): boolean {
  const dir = sub3(p2, p1);
  const n = cross3(sub3(b, a), sub3(c, a));
  return isPerpendicular(dir, n, tol);
}

/**
 * Computes closed polyhedron volume via signed tetrahedra from origin
 * assuming consistently outward-oriented faces, or fallback by centroid decomposition.
 */
export function polyhedronVolume(vertices: Map<string, Vec3>, faceVertexIds: string[][]): number {
  const allPts = Array.from(vertices.values());
  const center = centroid3(allPts);
  let total = 0;
  for (const fv of faceVertexIds) {
    if (fv.length < 3) continue;
    const pts = fv.map((id) => vertices.get(id)).filter((p): p is Vec3 => Boolean(p));
    if (pts.length < 3) continue;
    for (let i = 1; i < pts.length - 1; i++) {
      total += tetrahedronVolume3(center, pts[0], pts[i], pts[i + 1]);
    }
  }
  return total;
}
