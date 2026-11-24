import { DisplayOptions, GeometryModel, Vec2, Vec3 } from '../types/geometry';
import { CameraBasis, ProjectedPoint } from './hlr';
import { add3, centroid3, dist3, dot3, len3, lerp3, midpoint3, scale3, sub3 } from './math3d';

export interface ModelReferenceBounds {
  target: Vec3;
  sceneRadius: number;
}

/**
 * Computes stable reference bounds (centroid + bounding radius) from a base model
 * so dragging a single vertex never causes the camera target or auto-zoom to drift.
 */
export function computeModelReferenceBounds(model: GeometryModel): ModelReferenceBounds {
  const pts = model.vertices.map((v) => v.pos);
  const target = centroid3(pts);
  let maxR = 0.5;
  for (const p of pts) {
    const r = dist3(p, target);
    if (r > maxR) maxR = r;
  }
  return { target, sceneRadius: maxR };
}

/**
 * Hit-tests visible vertices in 2D canvas coordinates and returns the closest vertex ID
 * within `hitRadiusPx`, or null if no vertex is near the pointer.
 */
export function findClosestVertexAtScreenPos(
  screenPos: Vec2,
  model: GeometryModel,
  projectedVertices: Map<string, ProjectedPoint>,
  display: DisplayOptions,
  hitRadiusPx = 16
): string | null {
  let bestId: string | null = null;
  let bestDist = hitRadiusPx;
  let bestDepth = Infinity;

  for (const v of model.vertices) {
    if (v.kind === 'auxiliary' && !display.showAuxiliary) continue;
    const proj = projectedVertices.get(v.id);
    if (!proj) continue;
    const d = Math.hypot(proj.x - screenPos.x, proj.y - screenPos.y);
    // Prefer closer screen distance; break near-ties by camera depth (front-most vertex wins)
    if (d <= bestDist - 1 || (Math.abs(d - bestDist) <= 1 && d <= hitRadiusPx && proj.depth < bestDepth)) {
      bestDist = d;
      bestDepth = proj.depth;
      bestId = v.id;
    }
  }

  return bestId;
}

/**
 * Unprojects a 2D screen drag delta `(dx, dy)` onto the 3D view plane passing through
 * `initialWorldPos` parallel to the camera's image plane, providing exact 1:1 cursor tracking.
 */
export function computeDraggedVertexPosition(
  initialWorldPos: Vec3,
  screenDelta: Vec2,
  cam: CameraBasis,
  maxRadiusMultiplier = 3.5
): Vec3 {
  const rel = sub3(initialWorldPos, cam.eye);
  const depth = Math.max(0.05, dot3(rel, cam.forward));
  const scale =
    cam.projection === 'perspective'
      ? cam.focalLength / depth
      : cam.focalLength / cam.distance;

  if (scale < 1e-6) return initialWorldPos;

  const worldDx = screenDelta.x / scale;
  const worldDy = -screenDelta.y / scale; // Canvas Y grows downward; camera up grows upward

  const candidate = add3(
    initialWorldPos,
    add3(scale3(cam.right, worldDx), scale3(cam.up, worldDy))
  );

  // Guard against extreme out-of-bounds drag distances
  const maxDist = Math.max(2, cam.sceneRadius * maxRadiusMultiplier);
  const fromTarget = sub3(candidate, cam.target);
  const distFromTarget = len3(fromTarget);
  if (distFromTarget > maxDist) {
    return add3(cam.target, scale3(fromTarget, maxDist / distFromTarget));
  }

  return candidate;
}

/**
 * Returns a new GeometryModel with `vertexId` moved to `nextPos`,
 * automatically recalculating any dependent midpoints whose parent endpoints moved
 * (while allowing a midpoint vertex itself to be dragged directly when targeted).
 */
export function moveVertexInModel(
  model: GeometryModel,
  vertexId: string,
  nextPos: Vec3
): GeometryModel {
  const nextVertices = model.vertices.map((v) =>
    v.id === vertexId
      ? { ...v, pos: { ...nextPos }, constraint: undefined }
      : { ...v, pos: { ...v.pos } }
  );

  const posMap = new Map<string, Vec3>();
  for (const v of nextVertices) {
    posMap.set(v.id, v.pos);
  }

  // Propagate midpoint & user surface constraints (2 passes handle chained dependencies)
  // Never overwrite the vertex that the user is directly dragging!
  for (let pass = 0; pass < 2; pass++) {
    for (const mp of model.midpoints) {
      if (mp.point === vertexId) continue;
      const pA = posMap.get(mp.from);
      const pB = posMap.get(mp.to);
      if (!pA || !pB) continue;
      posMap.set(mp.point, midpoint3(pA, pB));
    }

    for (const v of nextVertices) {
      if (v.id === vertexId || !v.constraint) continue;
      if (v.constraint.type === 'on_edge') {
        const pFrom = posMap.get(v.constraint.from);
        const pTo = posMap.get(v.constraint.to);
        if (pFrom && pTo) {
          posMap.set(v.id, lerp3(pFrom, pTo, v.constraint.t));
        }
      } else if (v.constraint.type === 'on_face') {
        const [i0, i1, i2] = v.constraint.triVertices;
        const [b0, b1, b2] = v.constraint.bary;
        const p0 = posMap.get(i0);
        const p1 = posMap.get(i1);
        const p2 = posMap.get(i2);
        if (p0 && p1 && p2) {
          posMap.set(v.id, {
            x: b0 * p0.x + b1 * p1.x + b2 * p2.x,
            y: b0 * p0.y + b1 * p1.y + b2 * p2.y,
            z: b0 * p0.z + b1 * p1.z + b2 * p2.z,
          });
        }
      }
    }
  }

  const syncedVertices = nextVertices.map((v) => {
    const synced = posMap.get(v.id);
    return synced ? { ...v, pos: synced } : v;
  });

  return {
    ...model,
    vertices: syncedVertices,
  };
}
