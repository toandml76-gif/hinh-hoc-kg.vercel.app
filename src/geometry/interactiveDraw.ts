import {
  DisplayOptions,
  GeometryEdge,
  GeometryModel,
  GeometryVertex,
  Vec2,
  Vec3,
  VertexConstraint,
} from '../types/geometry';
import { CameraBasis, ProjectedPoint, projectPoint, rayTriangleIntersect, Tri3D } from './hlr';
import { add3, cross3, dot3, len3, lerp3, normalize3, scale3, sub3 } from './math3d';

export interface Ray3D {
  origin: Vec3;
  dir: Vec3;
}

export interface SurfacePointPick {
  pos3D: Vec3;
  pos2D: Vec2;
  targetType: 'edge' | 'face';
  targetLabel: string;
  constraint: VertexConstraint;
  depth: number;
}

const PREFERRED_POINT_LABELS = [
  'E', 'F', 'I', 'J', 'K', 'N', 'P', 'Q', 'H', 'G', 'M', 'O', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

/**
 * Picks the next unused textbook uppercase point label (E, F, I, J, K, N, P...).
 */
export function getNextPointLabel(model: GeometryModel): string {
  const used = new Set(model.vertices.map((v) => v.label.toUpperCase()));
  for (const ch of PREFERRED_POINT_LABELS) {
    if (!used.has(ch)) return ch;
  }
  let idx = 1;
  while (used.has(`P${idx}`)) idx++;
  return `P${idx}`;
}

/**
 * Unprojects a 2D canvas coordinate into an exact 3D camera ray (perspective or orthographic).
 */
export function screenToWorldRay(screenPos: Vec2, cam: CameraBasis): Ray3D {
  if (cam.projection === 'perspective') {
    const cx = (screenPos.x - (cam.width * 0.5 + cam.panX)) / cam.focalLength;
    const cy = -(screenPos.y - (cam.height * 0.5 + cam.panY)) / cam.focalLength;
    const dir = normalize3(
      add3(cam.forward, add3(scale3(cam.right, cx), scale3(cam.up, cy)))
    );
    return { origin: cam.eye, dir };
  } else {
    const scale = cam.focalLength / cam.distance;
    const cx = (screenPos.x - (cam.width * 0.5 + cam.panX)) / scale;
    const cy = -(screenPos.y - (cam.height * 0.5 + cam.panY)) / scale;
    const origin = add3(cam.eye, add3(scale3(cam.right, cx), scale3(cam.up, cy)));
    return { origin, dir: cam.forward };
  }
}

/**
 * Computes the closest parameter `t` in [0, 1] on 3D segment AB to a 3D ray (origin, dir),
 * providing perspective-accurate picking on 3D edges without screen-space distortion.
 */
function closestParamOnSegmentToRay(a: Vec3, b: Vec3, ray: Ray3D): number {
  const u = sub3(b, a);
  const v = ray.dir;
  const w0 = sub3(a, ray.origin);

  const aDot = dot3(u, u);
  const bDot = dot3(u, v);
  const cDot = dot3(v, v);
  const dDot = dot3(u, w0);
  const eDot = dot3(v, w0);

  const denom = aDot * cDot - bDot * bDot;
  if (Math.abs(denom) < 1e-10) {
    return 0.5;
  }
  const t = (bDot * eDot - cDot * dDot) / denom;
  return Math.max(0.04, Math.min(0.96, t));
}

/**
 * Computes barycentric coordinates (b0, b1, b2) of a coplanar point P inside triangle (v0, v1, v2).
 */
function computeBarycentric(p: Vec3, v0: Vec3, v1: Vec3, v2: Vec3): [number, number, number] {
  const e0 = sub3(v1, v0);
  const e1 = sub3(v2, v0);
  const e2 = sub3(p, v0);

  const d00 = dot3(e0, e0);
  const d01 = dot3(e0, e1);
  const d11 = dot3(e1, e1);
  const d20 = dot3(e2, e0);
  const d21 = dot3(e2, e1);

  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-12) return [1 / 3, 1 / 3, 1 / 3];

  const b1 = (d11 * d20 - d01 * d21) / denom;
  const b2 = (d00 * d21 - d01 * d20) / denom;
  const b0 = 1 - b1 - b2;
  return [b0, b1, b2];
}

/**
 * Picks a 3D point belonging to an existing line/edge (priority 1) or plane/face (priority 2)
 * directly beneath the 2D canvas pointer.
 */
export function pickPointOnEdgeOrFace(
  screenPos: Vec2,
  model: GeometryModel,
  projectedVertices: Map<string, ProjectedPoint>,
  cam: CameraBasis,
  display: DisplayOptions,
  edgeSnapRadiusPx = 12
): SurfacePointPick | null {
  const vMap = new Map<string, GeometryVertex>();
  for (const v of model.vertices) {
    vMap.set(v.id, v);
  }

  const ray = screenToWorldRay(screenPos, cam);

  // Step 1: Raycast against all visible planes/faces first (front-most intersection)
  let bestFacePick: SurfacePointPick | null = null;
  let bestHitDist = Infinity;

  for (const face of model.faces) {
    if (face.kind === 'highlight_plane' && !display.showAuxiliary) continue;
    if (face.vertices.length < 3) continue;

    const id0 = face.vertices[0];
    const p0 = vMap.get(id0)?.pos;
    if (!p0) continue;

    for (let i = 1; i < face.vertices.length - 1; i++) {
      const id1 = face.vertices[i];
      const id2 = face.vertices[i + 1];
      const p1 = vMap.get(id1)?.pos;
      const p2 = vMap.get(id2)?.pos;
      if (!p1 || !p2) continue;

      const n = cross3(sub3(p1, p0), sub3(p2, p0));
      if (len3(n) < 1e-10) continue;

      const tri: Tri3D = {
        faceId: face.id,
        v0: p0,
        v1: p1,
        v2: p2,
        vIds: [id0, id1, id2],
        normal: normalize3(n),
      };

      const hitDist = rayTriangleIntersect(ray.origin, ray.dir, tri);
      if (hitDist !== null && hitDist < bestHitDist) {
        bestHitDist = hitDist;
        const pos3D = add3(ray.origin, scale3(ray.dir, hitDist));
        const pHit = projectPoint(pos3D, cam);
        const bary = computeBarycentric(pos3D, p0, p1, p2);
        bestFacePick = {
          pos3D,
          pos2D: { x: pHit.x, y: pHit.y },
          targetType: 'face',
          targetLabel: `mặt phẳng ${face.label}`,
          constraint: {
            type: 'on_face',
            faceId: face.id,
            faceLabel: face.label,
            triVertices: [id0, id1, id2],
            bary,
          },
          depth: pHit.depth,
        };
      }
    }
  }

  // Step 2: Check visible edges/lines.
  // Front/unoccluded edges use full `edgeSnapRadiusPx` (11-12px).
  // Occluded/interior edges behind a front face require tight aim (<= 4.5px)
  // so clicking inside a visible front face is never hijacked by a hidden edge behind it.
  const occludedEdgeSnapPx = Math.min(4.5, edgeSnapRadiusPx * 0.4);
  let bestFrontEdgePick: SurfacePointPick | null = null;
  let bestFrontEdgeDist = edgeSnapRadiusPx;
  let bestHiddenEdgePick: SurfacePointPick | null = null;
  let bestHiddenEdgeDist = occludedEdgeSnapPx;

  for (const edge of model.edges) {
    const isAuxNonUser =
      edge.kind !== 'solid' && edge.kind !== 'user_segment' && edge.kind !== 'user_line';
    if (isAuxNonUser && !display.showAuxiliary) continue;

    const vA = vMap.get(edge.from);
    const vB = vMap.get(edge.to);
    if (!vA || !vB) continue;

    let a3D = vA.pos;
    let b3D = vB.pos;
    let a2D: Vec2 | undefined = projectedVertices.get(edge.from);
    let b2D: Vec2 | undefined = projectedVertices.get(edge.to);

    // For extended user_line, allow placing a point on the visible extended span too
    if (edge.kind === 'user_line') {
      const ext = getExtendedLineEndpoints(vA.pos, vB.pos, cam.sceneRadius);
      a3D = ext.start;
      b3D = ext.end;
      const pStart = projectPoint(a3D, cam);
      const pEnd = projectPoint(b3D, cam);
      a2D = { x: pStart.x, y: pStart.y };
      b2D = { x: pEnd.x, y: pEnd.y };
    }

    if (!a2D || !b2D) continue;

    const dx = b2D.x - a2D.x;
    const dy = b2D.y - a2D.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 16) continue;

    const u = Math.max(
      0.03,
      Math.min(0.97, ((screenPos.x - a2D.x) * dx + (screenPos.y - a2D.y) * dy) / lenSq)
    );
    const projX = a2D.x + u * dx;
    const projY = a2D.y + u * dy;
    const screenDist = Math.hypot(screenPos.x - projX, screenPos.y - projY);

    if (screenDist > edgeSnapRadiusPx) continue;

    let t3D = closestParamOnSegmentToRay(vA.pos, vB.pos, ray);
    if (edge.kind === 'user_line') {
      const tExt = closestParamOnSegmentToRay(a3D, b3D, ray);
      const hitExt = lerp3(a3D, b3D, tExt);
      const abVec = sub3(vB.pos, vA.pos);
      const abLenSq = dot3(abVec, abVec);
      t3D = abLenSq > 1e-10 ? dot3(sub3(hitExt, vA.pos), abVec) / abLenSq : 0.5;
    } else if (Math.abs(t3D - 0.5) < 0.025) {
      // Gentle snap to exact midpoint when hovering dead-center of an edge
      t3D = 0.5;
    }

    const pos3D = lerp3(vA.pos, vB.pos, t3D);
    const pHit = projectPoint(pos3D, cam);
    const isFrontOrUnoccluded = !bestFacePick || pHit.depth <= bestFacePick.depth + 0.08;
    const lineName = `${vA.label}${vB.label}`;
    const candidate: SurfacePointPick = {
      pos3D,
      pos2D: { x: pHit.x, y: pHit.y },
      targetType: 'edge',
      targetLabel:
        Math.abs(t3D - 0.5) < 1e-6 ? `trung điểm ${lineName}` : `đường thẳng ${lineName}`,
      constraint: {
        type: 'on_edge',
        from: edge.from,
        to: edge.to,
        t: t3D,
      },
      depth: pHit.depth,
    };

    if (isFrontOrUnoccluded) {
      if (
        !bestFrontEdgePick ||
        screenDist < bestFrontEdgeDist - 2 ||
        (Math.abs(screenDist - bestFrontEdgeDist) <= 2 && pHit.depth < bestFrontEdgePick.depth)
      ) {
        bestFrontEdgeDist = screenDist;
        bestFrontEdgePick = candidate;
      }
    } else if (screenDist <= occludedEdgeSnapPx) {
      if (
        !bestHiddenEdgePick ||
        screenDist < bestHiddenEdgeDist - 1.5 ||
        (Math.abs(screenDist - bestHiddenEdgeDist) <= 1.5 && pHit.depth < bestHiddenEdgePick.depth)
      ) {
        bestHiddenEdgeDist = screenDist;
        bestHiddenEdgePick = candidate;
      }
    }
  }

  if (bestFrontEdgePick) return bestFrontEdgePick;
  if (bestHiddenEdgePick) return bestHiddenEdgePick;
  return bestFacePick;
}

/**
 * Computes extended 3D endpoints for a user-drawn line (`user_line`) passing through A and B.
 */
export function getExtendedLineEndpoints(
  a: Vec3,
  b: Vec3,
  sceneRadius: number
): { start: Vec3; end: Vec3 } {
  const dir = normalize3(sub3(b, a));
  if (len3(dir) < 1e-10) return { start: a, end: b };
  const ext = Math.max(0.85, sceneRadius * 0.55);
  return {
    start: sub3(a, scale3(dir, ext)),
    end: add3(b, scale3(dir, ext)),
  };
}

/**
 * Adds a new user-placed point (on an existing edge/line or plane/face) to the model.
 */
export function addPointToModel(
  model: GeometryModel,
  pick: SurfacePointPick
): { model: GeometryModel; addedVertex: GeometryVertex } {
  const label = getNextPointLabel(model);
  const id = `U_${label}_${Date.now().toString(36).slice(-4)}`;
  const addedVertex: GeometryVertex = {
    id,
    label,
    pos: { ...pick.pos3D },
    kind: 'user',
    description: `Điểm dựng thêm thuộc ${pick.targetLabel}`,
    constraint: pick.constraint,
  };

  return {
    addedVertex,
    model: {
      ...model,
      vertices: [...model.vertices, addedVertex],
    },
  };
}

/**
 * Adds a user-drawn segment (`user_segment`) or extended line (`user_line`) between two vertices.
 * Deduplicates matching pairs and upgrades an existing user_segment to user_line when requested.
 */
export function addUserConnectionToModel(
  model: GeometryModel,
  fromId: string,
  toId: string,
  kind: 'user_segment' | 'user_line'
): { model: GeometryModel; addedEdge: GeometryEdge | null } {
  if (fromId === toId) return { model, addedEdge: null };
  const vFrom = model.vertices.find((v) => v.id === fromId);
  const vTo = model.vertices.find((v) => v.id === toId);
  if (!vFrom || !vTo) return { model, addedEdge: null };

  const existingIdx = model.edges.findIndex(
    (e) =>
      (e.kind === 'user_segment' || e.kind === 'user_line') &&
      ((e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId))
  );

  if (existingIdx >= 0) {
    const existing = model.edges[existingIdx];
    if (existing.kind === kind) {
      return { model, addedEdge: null };
    }
    const upgraded: GeometryEdge = {
      ...existing,
      kind,
      label:
        kind === 'user_line'
          ? `Đường thẳng ${vFrom.label}${vTo.label}`
          : `Đoạn thẳng ${vFrom.label}${vTo.label}`,
    };
    const nextEdges = [...model.edges];
    nextEdges[existingIdx] = upgraded;
    return {
      model: { ...model, edges: nextEdges },
      addedEdge: upgraded,
    };
  }

  const addedEdge: GeometryEdge = {
    id: `${kind}-${fromId}-${toId}-${Date.now().toString(36).slice(-4)}`,
    from: fromId,
    to: toId,
    kind,
    label:
      kind === 'user_line'
        ? `Đường thẳng ${vFrom.label}${vTo.label}`
        : `Đoạn thẳng ${vFrom.label}${vTo.label}`,
  };

  return {
    addedEdge,
    model: {
      ...model,
      edges: [...model.edges, addedEdge],
    },
  };
}
