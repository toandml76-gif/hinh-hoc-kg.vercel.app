import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_PROBLEMS } from './presets';
import { computeModelHLR, projectPoint } from './hlr';
import { dist3, lerp3, pointToLineDistance, pointToPlaneDistance } from './math3d';
import {
  addPointToModel,
  addUserConnectionToModel,
  getNextPointLabel,
  pickPointOnEdgeOrFace,
} from './interactiveDraw';
import { moveVertexInModel } from './vertexDrag';
import { CameraState, DisplayOptions } from '../types/geometry';

const DEFAULT_DISPLAY: DisplayOptions = {
  showLabels: true,
  showShadedPlanes: true,
  showAuxiliary: true,
  showMarks: true,
};

const DEFAULT_CAM: CameraState = {
  yaw: -1.08,
  pitch: 0.32,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  projection: 'perspective',
};

test('pickPointOnEdgeOrFace places a point strictly on an existing edge and assigns next textbook label', () => {
  const model = PRESET_PROBLEMS[0].model!;
  const hlr = computeModelHLR(model, DEFAULT_CAM, 640, 380);

  const pS = model.vertices.find((v) => v.id === 'S')!.pos;
  const pB = model.vertices.find((v) => v.id === 'B')!.pos;
  // Pick a 3D point 35% along edge SB and project it to screen
  const target3D = lerp3(pS, pB, 0.35);
  const target2D = projectPoint(target3D, hlr.cameraBasis);

  const pick = pickPointOnEdgeOrFace(
    { x: target2D.x, y: target2D.y },
    model,
    hlr.projectedVertices,
    hlr.cameraBasis,
    DEFAULT_DISPLAY
  );

  assert.ok(pick, 'Should pick edge SB');
  assert.equal(pick.targetType, 'edge');
  assert.equal(pick.constraint.type, 'on_edge');
  assert.ok(
    pointToLineDistance(pick.pos3D, pS, pB) < 1e-4,
    'Picked point must lie strictly on 3D line SB'
  );

  assert.equal(getNextPointLabel(model), 'E');
  const { model: nextModel, addedVertex } = addPointToModel(model, pick);
  assert.equal(addedVertex.label, 'E');
  assert.equal(addedVertex.kind, 'user');
  assert.equal(nextModel.vertices.length, model.vertices.length + 1);
});

test('pickPointOnEdgeOrFace raycasts accurately onto the front-most plane/face when clicking away from edges', () => {
  const model = PRESET_PROBLEMS[0].model!;
  const hlr = computeModelHLR(model, DEFAULT_CAM, 640, 380);

  const pS = model.vertices.find((v) => v.id === 'S')!.pos;
  const pB = model.vertices.find((v) => v.id === 'B')!.pos;
  const pC = model.vertices.find((v) => v.id === 'C')!.pos;

  // Interior point of front face (SBC)
  const interior3D = {
    x: (pS.x + pB.x + pC.x) / 3,
    y: (pS.y + pB.y + pC.y) / 3,
    z: (pS.z + pB.z + pC.z) / 3,
  };
  const interior2D = projectPoint(interior3D, hlr.cameraBasis);

  const pick = pickPointOnEdgeOrFace(
    { x: interior2D.x, y: interior2D.y },
    model,
    hlr.projectedVertices,
    hlr.cameraBasis,
    DEFAULT_DISPLAY
  );

  assert.ok(pick, 'Should hit front face (SBC)');
  assert.equal(pick.targetType, 'face');
  assert.equal(pick.constraint.type, 'on_face');
  assert.ok(
    pointToPlaneDistance(pick.pos3D, pS, pB, pC) < 1e-4,
    'Picked point must lie strictly in plane (SBC)'
  );
  if (pick.constraint.type === 'on_face') {
    const sumBary = pick.constraint.bary[0] + pick.constraint.bary[1] + pick.constraint.bary[2];
    assert.ok(Math.abs(sumBary - 1) < 1e-5, 'Barycentric coordinates must sum to 1');
  }
});

test('User-placed points on edges and faces automatically follow parent vertex movements', () => {
  const base = PRESET_PROBLEMS[0].model!;
  const hlr = computeModelHLR(base, DEFAULT_CAM, 640, 380);

  const pS = base.vertices.find((v) => v.id === 'S')!.pos;
  const pB = base.vertices.find((v) => v.id === 'B')!.pos;
  const pC = base.vertices.find((v) => v.id === 'C')!.pos;

  // Add point E on edge SB
  const edge2D = projectPoint(lerp3(pS, pB, 0.35), hlr.cameraBasis);
  const edgePick = pickPointOnEdgeOrFace(edge2D, base, hlr.projectedVertices, hlr.cameraBasis, DEFAULT_DISPLAY)!;
  const step1 = addPointToModel(base, edgePick);

  // Add point F on face (SBC)
  const face2D = projectPoint(
    { x: (pS.x + pB.x + pC.x) / 3, y: (pS.y + pB.y + pC.y) / 3, z: (pS.z + pB.z + pC.z) / 3 },
    hlr.cameraBasis
  );
  const facePick = pickPointOnEdgeOrFace(face2D, step1.model, hlr.projectedVertices, hlr.cameraBasis, DEFAULT_DISPLAY)!;
  const step2 = addPointToModel(step1.model, facePick);

  // Now move apex S to a completely new 3D position
  const movedS = { x: 1.6, y: 0.7, z: 3.5 };
  const deformed = moveVertexInModel(step2.model, 'S', movedS);

  const newS = deformed.vertices.find((v) => v.id === 'S')!.pos;
  const newB = deformed.vertices.find((v) => v.id === 'B')!.pos;
  const newC = deformed.vertices.find((v) => v.id === 'C')!.pos;
  const newE = deformed.vertices.find((v) => v.id === step1.addedVertex.id)!.pos;
  const newF = deformed.vertices.find((v) => v.id === step2.addedVertex.id)!.pos;

  assert.ok(pointToLineDistance(newE, newS, newB) < 1e-4, 'Point E must stay on deformed edge SB');
  assert.ok(dist3(newE, step1.addedVertex.pos) > 0.2, 'Point E must actually move with S');
  assert.ok(pointToPlaneDistance(newF, newS, newB, newC) < 1e-4, 'Point F must stay in deformed plane (SBC)');
});

test('User-drawn segments and extended lines obey real analytical HLR (solid when visible, dashed when occluded)', () => {
  const base = PRESET_PROBLEMS[0].model!;
  const hlr0 = computeModelHLR(base, DEFAULT_CAM, 640, 380);
  const pS = base.vertices.find((v) => v.id === 'S')!.pos;
  const pB = base.vertices.find((v) => v.id === 'B')!.pos;
  const pC = base.vertices.find((v) => v.id === 'C')!.pos;

  // Point E on front edge SB, point F inside front face (SBC)
  const ePick = pickPointOnEdgeOrFace(
    projectPoint(lerp3(pS, pB, 0.4), hlr0.cameraBasis),
    base,
    hlr0.projectedVertices,
    hlr0.cameraBasis,
    DEFAULT_DISPLAY
  )!;
  const { model: m1, addedVertex: vE } = addPointToModel(base, ePick);

  const fPick = pickPointOnEdgeOrFace(
    projectPoint(
      { x: (pS.x + pB.x + pC.x) / 3, y: (pS.y + pB.y + pC.y) / 3, z: (pS.z + pB.z + pC.z) / 3 },
      hlr0.cameraBasis
    ),
    m1,
    hlr0.projectedVertices,
    hlr0.cameraBasis,
    DEFAULT_DISPLAY
  )!;
  const { model: m2, addedVertex: vF } = addPointToModel(m1, fPick);

  // 1. Segment EF lies on visible front face (SBC) => must be SOLID (visible)
  const { model: m3, addedEdge: segEF } = addUserConnectionToModel(m2, vE.id, vF.id, 'user_segment');
  // 2. Segment DE cuts through the opaque pyramid interior from back vertex D to E => must be DASHED (occluded)
  const { model: m4, addedEdge: segDE } = addUserConnectionToModel(m3, 'D', vE.id, 'user_segment');
  // 3. Extended line DF pierces through the solid and extends outside => must have BOTH visible (solid) and occluded (dashed) spans!
  const { model: m5, addedEdge: lineDF } = addUserConnectionToModel(m4, 'D', vF.id, 'user_line');

  const hlrFinal = computeModelHLR(m5, DEFAULT_CAM, 640, 380);
  const efRes = hlrFinal.edgeResults.find((r) => r.edge.id === segEF!.id)!;
  const deRes = hlrFinal.edgeResults.find((r) => r.edge.id === segDE!.id)!;
  const dfRes = hlrFinal.edgeResults.find((r) => r.edge.id === lineDF!.id)!;

  assert.ok(efRes.spans.every((sp) => sp.visible), 'Front-face segment EF must be completely visible (solid)');
  assert.ok(deRes.spans.some((sp) => !sp.visible), 'Interior segment DE must be occluded (dashed)');
  assert.ok(
    dfRes.spans.some((sp) => sp.visible) && dfRes.spans.some((sp) => !sp.visible),
    'Extended line DF piercing the pyramid must split into solid (visible) and dashed (occluded) spans'
  );
});
