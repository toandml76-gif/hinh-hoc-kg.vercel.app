import test from 'node:test';
import assert from 'node:assert/strict';
import { computeModelHLR } from './hlr';
import { PRESET_PROBLEMS } from './presets';
import { CameraState, GeometryModel } from '../types/geometry';
import { vec3 } from './math3d';

test('HLR accurately splits a partially occluded edge into visible solid and occluded dashed spans', () => {
  // Unit cube [0,2]^3 + an edge extending from behind the cube to outside the cube
  const cubeModel: GeometryModel = {
    solidType: 'cube',
    solidTypeLabel: 'Hình lập phương kiểm thử',
    vertices: [
      { id: 'A', label: 'A', pos: vec3(0, 0, 0), kind: 'base' },
      { id: 'B', label: 'B', pos: vec3(2, 0, 0), kind: 'base' },
      { id: 'C', label: 'C', pos: vec3(2, 2, 0), kind: 'base' },
      { id: 'D', label: 'D', pos: vec3(0, 2, 0), kind: 'base' },
      { id: 'A1', label: "A'", pos: vec3(0, 0, 2), kind: 'top' },
      { id: 'B1', label: "B'", pos: vec3(2, 0, 2), kind: 'top' },
      { id: 'C1', label: "C'", pos: vec3(2, 2, 2), kind: 'top' },
      { id: 'D1', label: "D'", pos: vec3(0, 2, 2), kind: 'top' },
      // External test segment crossing BEHIND the cube along Y from (-1, 1, 1) to (-1, 4, 1) when viewed from +X
      { id: 'P', label: 'P', pos: vec3(-1, 1, 1), kind: 'auxiliary' },
      { id: 'Q', label: 'Q', pos: vec3(-1, 4, 1), kind: 'auxiliary' },
    ],
    edges: [{ id: 'PQ', from: 'P', to: 'Q', kind: 'auxiliary' }],
    faces: [
      { id: 'ABCD', label: '(ABCD)', vertices: ['A', 'B', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'A1B1C1D1', label: "(A'B'C'D')", vertices: ['A1', 'B1', 'C1', 'D1'], kind: 'solid_boundary' },
      { id: 'ABB1A1', label: "(ABB'A')", vertices: ['A', 'B', 'B1', 'A1'], kind: 'solid_boundary' },
      { id: 'BCC1B1', label: "(BCC'B')", vertices: ['B', 'C', 'C1', 'B1'], kind: 'solid_boundary' },
      { id: 'CDD1C1', label: "(CDD'C')", vertices: ['C', 'D', 'D1', 'C1'], kind: 'solid_boundary' },
      { id: 'DAA1D1', label: "(DAA'D')", vertices: ['D', 'A', 'A1', 'D1'], kind: 'solid_boundary' },
    ],
    rightAngles: [],
    equalMarks: [],
    midpoints: [],
    defaultCamera: { yaw: 0, pitch: 0, zoom: 1 },
  };

  // Look directly from +X toward -X (yaw = 0, pitch = 0): P is hidden behind cube, Q is outside in open air!
  const cam: CameraState = {
    yaw: 0,
    pitch: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    projection: 'orthographic',
  };

  const res = computeModelHLR(cubeModel, cam, 800, 600);
  const pq = res.edgeResults.find((e) => e.edge.id === 'PQ');
  assert.ok(pq, 'Segment PQ must exist in HLR output');
  assert.equal(pq.spans.length, 2, 'Partially occluded segment PQ must split into exactly 2 spans');
  assert.equal(pq.spans[0].visible, false, 'First portion behind the cube must be occluded (dashed)');
  assert.equal(pq.spans[1].visible, true, 'Second portion outside the cube must be visible (solid)');
  // Boundary is at y = 2 -> t = (2 - 1) / (4 - 1) = 1/3
  assert.ok(Math.abs(pq.spans[0].t1 - 1 / 3) < 0.02, `Split t should be ~0.333, got ${pq.spans[0].t1}`);
});

test('Rotating the camera dynamically flips solid/dashed visibility of pyramid edges (never hardcoded)', () => {
  const pyramid = PRESET_PROBLEMS[0].model!;
  const camFront: CameraState = {
    yaw: 0.78, // viewing from (+X, +Y) looking toward A(0,0,0) which is at the back
    pitch: 0.35,
    zoom: 1,
    panX: 0,
    panY: 0,
    projection: 'perspective',
  };
  const camBack: CameraState = {
    yaw: 0.78 + Math.PI, // rotated 180 degrees: now A(0,0,0) is in front and C(2,2,0) is at the back
    pitch: 0.35,
    zoom: 1,
    panX: 0,
    panY: 0,
    projection: 'perspective',
  };

  const frontRes = computeModelHLR(pyramid, camFront, 800, 600);
  const backRes = computeModelHLR(pyramid, camBack, 800, 600);

  const saFront = frontRes.edgeResults.find((e) => e.edge.id === 'SA')!;
  const saBack = backRes.edgeResults.find((e) => e.edge.id === 'SA')!;
  const scFront = frontRes.edgeResults.find((e) => e.edge.id === 'SC')!;
  const scBack = backRes.edgeResults.find((e) => e.edge.id === 'SC')!;

  assert.equal(saFront.spans.every((s) => !s.visible), true, 'SA should be hidden when viewing from (+X,+Y)');
  assert.equal(saBack.spans.every((s) => s.visible), true, 'SA must become visible after rotating 180°');
  assert.equal(scFront.spans.every((s) => s.visible), true, 'SC should be visible from (+X,+Y)');
  assert.equal(scBack.spans.every((s) => !s.visible), true, 'SC must become hidden after rotating 180°');
});
