import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_PROBLEMS } from './presets';
import { buildCameraBasis, computeModelHLR, projectPoint } from './hlr';
import { dist3, midpoint3, vec3 } from './math3d';
import {
  computeDraggedVertexPosition,
  computeModelReferenceBounds,
  findClosestVertexAtScreenPos,
  moveVertexInModel,
} from './vertexDrag';
import { CameraState, DisplayOptions } from '../types/geometry';

const DEFAULT_DISPLAY: DisplayOptions = {
  showLabels: true,
  showShadedPlanes: true,
  showAuxiliary: true,
  showMarks: true,
};

function makeCamera(yaw = -1.08, pitch = 0.32, projection: 'perspective' | 'orthographic' = 'perspective'): CameraState {
  return { yaw, pitch, zoom: 1, panX: 0, panY: 0, projection };
}

test('findClosestVertexAtScreenPos detects vertex under pointer and respects showAuxiliary toggle', () => {
  const model = PRESET_PROBLEMS[0].model!;
  const camState = makeCamera();
  const hlr = computeModelHLR(model, camState, 640, 410);

  const projS = hlr.projectedVertices.get('S')!;
  const projM = hlr.projectedVertices.get('M')!;

  assert.equal(
    findClosestVertexAtScreenPos({ x: projS.x + 3, y: projS.y - 4 }, model, hlr.projectedVertices, DEFAULT_DISPLAY),
    'S'
  );
  assert.equal(
    findClosestVertexAtScreenPos({ x: projM.x, y: projM.y }, model, hlr.projectedVertices, DEFAULT_DISPLAY),
    'M'
  );

  // When auxiliary vertices are hidden, M must not be hit-tested
  const hiddenAuxDisplay: DisplayOptions = { ...DEFAULT_DISPLAY, showAuxiliary: false };
  assert.notEqual(
    findClosestVertexAtScreenPos({ x: projM.x, y: projM.y }, model, hlr.projectedVertices, hiddenAuxDisplay),
    'M'
  );

  // Far corner returns null
  assert.equal(
    findClosestVertexAtScreenPos({ x: 5, y: 5 }, model, hlr.projectedVertices, DEFAULT_DISPLAY),
    null
  );
});

test('computeDraggedVertexPosition achieves 1:1 screen-space cursor tracking in perspective and orthographic views', () => {
  const model = PRESET_PROBLEMS[0].model!;
  const bounds = computeModelReferenceBounds(model);
  const sOrig = model.vertices.find((v) => v.id === 'S')!.pos;

  for (const projection of ['perspective', 'orthographic'] as const) {
    const camBasis = buildCameraBasis(model, makeCamera(-1.08, 0.32, projection), 640, 410, bounds);
    const start2D = projectPoint(sOrig, camBasis);

    const delta = { x: 48, y: 32 };
    const nextPos = computeDraggedVertexPosition(sOrig, delta, camBasis);
    const end2D = projectPoint(nextPos, camBasis);

    assert.ok(
      Math.abs(end2D.x - (start2D.x + delta.x)) < 0.5,
      `Expected x=${start2D.x + delta.x}, got ${end2D.x} (${projection})`
    );
    assert.ok(
      Math.abs(end2D.y - (start2D.y + delta.y)) < 0.5,
      `Expected y=${start2D.y + delta.y}, got ${end2D.y} (${projection})`
    );
  }
});

test('moveVertexInModel updates target vertex, automatically recalculates dependent midpoints, and preserves unrelated vertices', () => {
  const model = PRESET_PROBLEMS[0].model!;
  const origA = model.vertices.find((v) => v.id === 'A')!.pos;
  const origC = model.vertices.find((v) => v.id === 'C')!.pos;

  // Move apex S to a new position
  const nextS = vec3(1.5, 0.8, 3.6);
  const updated = moveVertexInModel(model, 'S', nextS);

  const newS = updated.vertices.find((v) => v.id === 'S')!.pos;
  const newM = updated.vertices.find((v) => v.id === 'M')!.pos;
  const newA = updated.vertices.find((v) => v.id === 'A')!.pos;

  assert.ok(dist3(newS, nextS) < 1e-9);
  assert.ok(dist3(newA, origA) < 1e-9, 'Unrelated vertex A must remain unchanged');

  // M is midpoint of SC, so M must automatically update to midpoint(nextS, origC)
  const expectedM = midpoint3(nextS, origC);
  assert.ok(
    dist3(newM, expectedM) < 1e-9,
    `Dependent midpoint M should automatically update to midpoint(S, C)`
  );
});

test('moveVertexInModel allows directly moving a midpoint vertex (M) without snapping it back', () => {
  const model = PRESET_PROBLEMS[0].model!;
  const customM = vec3(2.4, 1.1, 1.9);
  const updated = moveVertexInModel(model, 'M', customM);

  const newM = updated.vertices.find((v) => v.id === 'M')!.pos;
  assert.ok(
    dist3(newM, customM) < 1e-9,
    'Directly dragging an auxiliary midpoint vertex must move it freely'
  );
});
