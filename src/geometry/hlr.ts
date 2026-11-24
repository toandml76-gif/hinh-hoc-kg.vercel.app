import { CameraState, GeometryEdge, GeometryFace, GeometryModel, Vec2, Vec3 } from '../types/geometry';
import { add3, centroid3, cross3, dist3, dot3, len3, lerp3, normalize3, scale3, sub3 } from './math3d';

export interface CameraBasis {
  eye: Vec3;
  target: Vec3;
  right: Vec3;
  up: Vec3;
  forward: Vec3; // points from eye toward target
  distance: number;
  focalLength: number;
  sceneRadius: number;
  width: number;
  height: number;
  panX: number;
  panY: number;
  projection: 'perspective' | 'orthographic';
}

export interface ProjectedPoint {
  x: number;
  y: number;
  depth: number; // distance along camera forward axis from eye
  world: Vec3;
}

export interface VisibilitySpan {
  t0: number;
  t1: number;
  visible: boolean;
  start3D: Vec3;
  end3D: Vec3;
  start2D: Vec2;
  end2D: Vec2;
}

export interface HlrEdgeResult {
  edge: GeometryEdge;
  spans: VisibilitySpan[];
}

export interface Tri3D {
  faceId: string;
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
  vIds: [string, string, string];
  normal: Vec3;
}

/**
 * Builds an orthonormal camera basis centered on the solid's bounding centroid.
 * Coordinate convention: Z is vertical UP (standard Vietnamese textbook Oxyz),
 * X goes forward-left/right, Y goes horizontal.
 */
export function buildCameraBasis(
  model: GeometryModel,
  camera: CameraState,
  width: number,
  height: number,
  referenceBounds?: { target: Vec3; sceneRadius: number } | null
): CameraBasis {
  let target: Vec3;
  let maxR = 0.5;
  if (referenceBounds) {
    target = referenceBounds.target;
    maxR = Math.max(0.5, referenceBounds.sceneRadius);
  } else {
    const pts = model.vertices.map((v) => v.pos);
    target = centroid3(pts);
    for (const p of pts) {
      const r = dist3(p, target);
      if (r > maxR) maxR = r;
    }
  }

  const yaw = camera.yaw;
  const pitch = Math.max(-Math.PI / 2 + 0.04, Math.min(Math.PI / 2 - 0.04, camera.pitch));

  // Camera position on orbit sphere around target (Z-up)
  const dirFromTarget: Vec3 = {
    x: Math.cos(pitch) * Math.cos(yaw),
    y: Math.cos(pitch) * Math.sin(yaw),
    z: Math.sin(pitch),
  };

  const distance = maxR * 5.2;
  const eye = add3(target, scale3(dirFromTarget, distance));
  const forward = normalize3(sub3(target, eye));
  const worldUp: Vec3 = { x: 0, y: 0, z: 1 };
  let right = cross3(forward, worldUp);
  if (len3(right) < 1e-6) {
    right = { x: 1, y: 0, z: 0 };
  } else {
    right = normalize3(right);
  }
  const up = normalize3(cross3(right, forward));

  const minDim = Math.max(120, Math.min(width, height));
  // Auto-fit focal length so solid + labels stay safely inside viewport
  const baseScale = (minDim * 0.34) / maxR;
  const focalLength = baseScale * distance * camera.zoom;

  return {
    eye,
    target,
    right,
    up,
    forward,
    distance,
    focalLength,
    sceneRadius: maxR,
    width,
    height,
    panX: camera.panX,
    panY: camera.panY,
    projection: camera.projection,
  };
}

export function projectPoint(p: Vec3, cam: CameraBasis): ProjectedPoint {
  const rel = sub3(p, cam.eye);
  const cx = dot3(rel, cam.right);
  const cy = dot3(rel, cam.up);
  const cz = dot3(rel, cam.forward);

  const safeDepth = Math.max(0.05, cz);
  const scale =
    cam.projection === 'perspective'
      ? cam.focalLength / safeDepth
      : cam.focalLength / cam.distance;

  return {
    x: cam.width * 0.5 + cam.panX + cx * scale,
    y: cam.height * 0.5 + cam.panY - cy * scale,
    depth: cz,
    world: p,
  };
}

/**
 * Triangulates all solid boundary faces into 3D triangles for exact occlusion testing.
 */
export function buildOccluderTriangles(model: GeometryModel): Tri3D[] {
  const vMap = new Map<string, Vec3>();
  for (const v of model.vertices) {
    vMap.set(v.id, v.pos);
  }

  const tris: Tri3D[] = [];
  for (const face of model.faces) {
    if (face.kind !== 'solid_boundary') continue;
    if (face.vertices.length < 3) continue;
    const id0 = face.vertices[0];
    const p0 = vMap.get(id0);
    if (!p0) continue;

    for (let i = 1; i < face.vertices.length - 1; i++) {
      const id1 = face.vertices[i];
      const id2 = face.vertices[i + 1];
      const p1 = vMap.get(id1);
      const p2 = vMap.get(id2);
      if (!p1 || !p2) continue;
      const n = cross3(sub3(p1, p0), sub3(p2, p0));
      if (len3(n) < 1e-10) continue;
      tris.push({
        faceId: face.id,
        v0: p0,
        v1: p1,
        v2: p2,
        vIds: [id0, id1, id2],
        normal: normalize3(n),
      });
    }
  }
  return tris;
}

/**
 * Möller–Trumbore ray-triangle intersection.
 * Returns ray parameter `dist > 0` if hit, or `null` otherwise.
 * Inclusive epsilon prevents microscopic cracks along internal diagonals of quad faces.
 */
export function rayTriangleIntersect(
  origin: Vec3,
  dir: Vec3,
  tri: Tri3D
): number | null {
  const edge1 = sub3(tri.v1, tri.v0);
  const edge2 = sub3(tri.v2, tri.v0);
  const h = cross3(dir, edge2);
  const a = dot3(edge1, h);

  if (Math.abs(a) < 1e-9) return null; // Ray parallel to triangle plane

  const f = 1.0 / a;
  const s = sub3(origin, tri.v0);
  const u = f * dot3(s, h);
  const baryTol = 1e-5;
  if (u < -baryTol || u > 1.0 + baryTol) return null;

  const q = cross3(s, edge1);
  const v = f * dot3(dir, q);
  if (v < -baryTol || u + v > 1.0 + baryTol) return null;

  const t = f * dot3(edge2, q);
  if (t > 1e-6) return t;
  return null;
}

/**
 * Checks whether a 3D point `point` is occluded by any solid boundary triangle
 * from the given camera.
 */
export function isPointOccluded(
  point: Vec3,
  cam: CameraBasis,
  triangles: Tri3D[],
  incidentFaceIds?: Set<string>
): boolean {
  const eps = Math.max(1e-4, cam.sceneRadius * 2e-4);

  let rayOrigin: Vec3;
  let rayDir: Vec3;
  let distToPoint: number;

  if (cam.projection === 'perspective') {
    rayOrigin = cam.eye;
    const toPoint = sub3(point, cam.eye);
    distToPoint = len3(toPoint);
    if (distToPoint < 1e-8) return false;
    rayDir = scale3(toPoint, 1 / distToPoint);
  } else {
    // Orthographic ray arrives along cam.forward from far behind camera
    const backDist = cam.sceneRadius * 20;
    rayOrigin = sub3(point, scale3(cam.forward, backDist));
    rayDir = cam.forward;
    distToPoint = backDist;
  }

  for (const tri of triangles) {
    if (incidentFaceIds && incidentFaceIds.has(tri.faceId)) {
      continue;
    }

    // Quick plane distance check: if point lies ON the triangle plane, it cannot be
    // strictly occluded by that coplanar triangle.
    const planeDist = Math.abs(dot3(sub3(point, tri.v0), tri.normal));
    if (planeDist < eps) {
      continue;
    }

    const hitDist = rayTriangleIntersect(rayOrigin, rayDir, tri);
    if (hitDist !== null && hitDist < distToPoint - eps) {
      return true;
    }
  }

  return false;
}

/**
 * Finds exact 3D parameter t in (0, 1) where the 2D projection of segment AB
 * crosses the 2D projection of edge Q0Q1, using the exact viewing plane
 * (perspective-accurate without linear screen-space distortion).
 */
function findViewingPlaneSplitT(
  a: Vec3,
  b: Vec3,
  q0: Vec3,
  q1: Vec3,
  cam: CameraBasis
): number | null {
  let planeNormal: Vec3;
  let planePoint: Vec3;

  if (cam.projection === 'perspective') {
    planeNormal = cross3(sub3(q0, cam.eye), sub3(q1, cam.eye));
    planePoint = cam.eye;
  } else {
    planeNormal = cross3(sub3(q1, q0), cam.forward);
    planePoint = q0;
  }

  if (len3(planeNormal) < 1e-10) return null;

  const ab = sub3(b, a);
  const denom = dot3(ab, planeNormal);
  if (Math.abs(denom) < 1e-10) return null;

  const t = -dot3(sub3(a, planePoint), planeNormal) / denom;
  if (t <= 1e-5 || t >= 1 - 1e-5) return null;

  // Verify in 2D projected space that the intersection actually lies on segment Q0Q1
  const hit3D = lerp3(a, b, t);
  const pHit = projectPoint(hit3D, cam);
  const p0 = projectPoint(q0, cam);
  const p1 = projectPoint(q1, cam);

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-8) return null;

  const u = ((pHit.x - p0.x) * dx + (pHit.y - p0.y) * dy) / lenSq;
  if (u < -1e-4 || u > 1 + 1e-4) return null;

  return t;
}

/**
 * Finds exact 3D parameter t in (0, 1) where segment AB pierces the 3D plane of tri.
 */
function findPlanePierceT(a: Vec3, b: Vec3, tri: Tri3D): number | null {
  const ab = sub3(b, a);
  const denom = dot3(ab, tri.normal);
  if (Math.abs(denom) < 1e-10) return null;
  const t = dot3(sub3(tri.v0, a), tri.normal) / denom;
  if (t <= 1e-5 || t >= 1 - 1e-5) return null;
  return t;
}

/**
 * Computes exact analytical Hidden-Line Removal (HLR) spans for a single 3D segment.
 */
export function computeSegmentVisibility(
  a: Vec3,
  b: Vec3,
  cam: CameraBasis,
  triangles: Tri3D[],
  incidentFaceIds?: Set<string>
): VisibilitySpan[] {
  const splits: number[] = [0, 1];

  for (const tri of triangles) {
    if (incidentFaceIds && incidentFaceIds.has(tri.faceId)) {
      continue;
    }

    // 1. Viewing-plane intersections with the 3 edges of the triangle
    const t01 = findViewingPlaneSplitT(a, b, tri.v0, tri.v1, cam);
    if (t01 !== null) splits.push(t01);

    const t12 = findViewingPlaneSplitT(a, b, tri.v1, tri.v2, cam);
    if (t12 !== null) splits.push(t12);

    const t20 = findViewingPlaneSplitT(a, b, tri.v2, tri.v0, cam);
    if (t20 !== null) splits.push(t20);

    // 2. Direct 3D piercing intersection with the triangle plane
    const tPierce = findPlanePierceT(a, b, tri);
    if (tPierce !== null) splits.push(tPierce);
  }

  // Sort and deduplicate split parameters
  splits.sort((x, y) => x - y);
  const uniqueSplits: number[] = [splits[0]];
  for (let i = 1; i < splits.length; i++) {
    if (splits[i] - uniqueSplits[uniqueSplits.length - 1] > 1e-4) {
      uniqueSplits.push(splits[i]);
    }
  }
  if (uniqueSplits[uniqueSplits.length - 1] < 1 - 1e-5) {
    uniqueSplits.push(1);
  } else {
    uniqueSplits[uniqueSplits.length - 1] = 1;
  }

  // Evaluate visibility of each elementary sub-interval via 3D ray casting at midpoint
  const rawSpans: Array<{ t0: number; t1: number; visible: boolean }> = [];
  for (let i = 0; i < uniqueSplits.length - 1; i++) {
    const t0 = uniqueSplits[i];
    const t1 = uniqueSplits[i + 1];
    if (t1 - t0 < 1e-5) continue;

    const tMid = 0.5 * (t0 + t1);
    const mid3D = lerp3(a, b, tMid);
    const occluded = isPointOccluded(mid3D, cam, triangles, incidentFaceIds);
    const visible = !occluded;

    const prev = rawSpans[rawSpans.length - 1];
    if (prev && prev.visible === visible) {
      prev.t1 = t1;
    } else {
      rawSpans.push({ t0, t1, visible });
    }
  }

  return rawSpans.map((sp) => {
    const start3D = lerp3(a, b, sp.t0);
    const end3D = lerp3(a, b, sp.t1);
    const pStart = projectPoint(start3D, cam);
    const pEnd = projectPoint(end3D, cam);
    return {
      t0: sp.t0,
      t1: sp.t1,
      visible: sp.visible,
      start3D,
      end3D,
      start2D: { x: pStart.x, y: pStart.y },
      end2D: { x: pEnd.x, y: pEnd.y },
    };
  });
}

/**
 * Computes exact HLR for every edge (both solid boundary edges and auxiliary lines)
 * in a GeometryModel at the given camera state.
 */
export function computeModelHLR(
  model: GeometryModel,
  camera: CameraState,
  width: number,
  height: number,
  referenceBounds?: { target: Vec3; sceneRadius: number } | null
): {
  cameraBasis: CameraBasis;
  projectedVertices: Map<string, ProjectedPoint>;
  edgeResults: HlrEdgeResult[];
  sortedFaces: Array<{ face: GeometryFace; points2D: Vec2[]; avgDepth: number }>;
} {
  const cam = buildCameraBasis(model, camera, width, height, referenceBounds);
  const vMap = new Map<string, Vec3>();
  const projectedVertices = new Map<string, ProjectedPoint>();

  for (const v of model.vertices) {
    vMap.set(v.id, v.pos);
    projectedVertices.set(v.id, projectPoint(v.pos, cam));
  }

  const triangles = buildOccluderTriangles(model);

  // Build map from vertex pair to incident solid faces (so an edge on a face is never self-occluded)
  const solidFacesByVertex = new Map<string, Set<string>>();
  for (const face of model.faces) {
    if (face.kind !== 'solid_boundary') continue;
    for (const vid of face.vertices) {
      let set = solidFacesByVertex.get(vid);
      if (!set) {
        set = new Set();
        solidFacesByVertex.set(vid, set);
      }
      set.add(face.id);
    }
  }

  const edgeResults: HlrEdgeResult[] = [];
  for (const edge of model.edges) {
    const a = vMap.get(edge.from);
    const b = vMap.get(edge.to);
    if (!a || !b) continue;

    // Faces that contain BOTH endpoints are coplanar/incident with this edge
    const facesA = solidFacesByVertex.get(edge.from);
    const facesB = solidFacesByVertex.get(edge.to);
    const incidentFaces = new Set<string>();
    if (facesA && facesB) {
      for (const fid of facesA) {
        if (facesB.has(fid)) incidentFaces.add(fid);
      }
    }

    let segStart = a;
    let segEnd = b;
    if (edge.kind === 'user_line') {
      const dir = normalize3(sub3(b, a));
      if (len3(dir) > 1e-10) {
        const ext = Math.max(0.85, cam.sceneRadius * 0.55);
        segStart = sub3(a, scale3(dir, ext));
        segEnd = add3(b, scale3(dir, ext));
      }
    }

    const spans = computeSegmentVisibility(segStart, segEnd, cam, triangles, incidentFaces);
    edgeResults.push({ edge, spans });
  }

  const sortedFaces = model.faces
    .map((face) => {
      const ptsProj = face.vertices
        .map((id) => projectedVertices.get(id))
        .filter((p): p is ProjectedPoint => Boolean(p));
      const avgDepth =
        ptsProj.length > 0
          ? ptsProj.reduce((acc, p) => acc + p.depth, 0) / ptsProj.length
          : 0;
      return {
        face,
        points2D: ptsProj.map((p) => ({ x: p.x, y: p.y })),
        avgDepth,
      };
    })
    .sort((a, b) => b.avgDepth - a.avgDepth); // Painter's order: farthest first

  return {
    cameraBasis: cam,
    projectedVertices,
    edgeResults,
    sortedFaces,
  };
}
