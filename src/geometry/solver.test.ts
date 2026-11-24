import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProblemDeterministic } from './parser';
import { PROBLEM_LIBRARY, filterProblemLibrary } from './library';
import { verifyAnalyzedProblem } from './verifier';
import { dist3, pointToPlaneDistance, triangleArea3 } from './math3d';

test('Classic S.ABCD (SA perp ABCD, SA = a√2, M midpoint SC) passes full coordinate verification and hint hides final answer', () => {
  const res = analyzeProblemDeterministic(
    'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD), SA = a√2. Gọi M là trung điểm của SC. Chứng minh BD vuông góc với mặt phẳng (SAC) và tính khoảng cách từ M đến mặt phẳng (ABCD).'
  );
  assert.equal(res.verification.overallStatus, 'verified');
  assert.equal(res.structured.canConclude, true);
  assert.ok(res.model);

  // Verify numeric distance d(M, (ABCD)) = a√2 / 2 (with scale a = 2 => √2)
  const v = new Map(res.model.vertices.map((pt) => [pt.id, pt.pos]));
  const dM = pointToPlaneDistance(v.get('M')!, v.get('A')!, v.get('B')!, v.get('C')!);
  assert.ok(Math.abs(dM - Math.SQRT2) < 1e-6);

  // Pedagogical check: Hint MUST NOT spoil the final numeric answer "a√2/2"
  assert.ok(res.hints);
  const hintBlob = `${res.hints.phanTichDe} ${res.hints.huongGiai} ${res.hints.kienThucCanDung.join(' ')}`;
  assert.equal(hintBlob.includes('\\dfrac{a\\sqrt{2}}{2}'), false, 'Hints must not leak final numeric result');
});

test('CRITICAL: Square-base pyramid WITHOUT apex condition MUST NOT turn into a regular pyramid', () => {
  const res = analyzeProblemDeterministic(
    'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. Tính thể tích khối chóp S.ABCD.'
  );
  assert.equal(res.structured.canConclude, false);
  assert.equal(res.structured.isRepresentativeConfig, true);
  assert.equal(
    res.structured.representativeNotice,
    'Hình minh họa là một cấu hình thỏa mãn giả thiết; các kích thước chưa được cho được chọn để dễ quan sát.'
  );
  assert.equal(res.solution, null, 'Must not fabricate a volume solution without height');
  assert.equal(res.verification.overallStatus, 'blocked');

  // Verify apex S is NOT over base center O = (1, 1, 0) and NOT over A = (0, 0, 0)
  assert.ok(res.model);
  const S = res.model.vertices.find((v) => v.id === 'S')!.pos;
  const distToCenter = Math.hypot(S.x - 1, S.y - 1);
  const distToA = Math.hypot(S.x - 0, S.y - 0);
  assert.ok(distToCenter > 0.2, 'Apex S must NOT be placed directly over base center (would fake regular pyramid)');
  assert.ok(distToA > 0.2, 'Apex S must NOT be placed directly over A (would fake SA ⊥ base)');
});

test('Contradictory pyramid (SA perp base, SA = a, SB = a/2) is rejected cleanly', () => {
  const res = analyzeProblemDeterministic(
    'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD), SA = a và SB = a/2. Tính thể tích khối chóp S.ABCD.'
  );
  assert.equal(res.structured.canConclude, false);
  assert.equal(res.model, null);
  assert.equal(res.solution, null);
  assert.ok(res.structured.issues.some((i) => i.code === 'contradiction'));
});

test('All 10 solvable THPT library problems pass independent 3D coordinate verification', () => {
  const solvable = PROBLEM_LIBRARY.filter((p) => p.structured.canConclude);
  assert.ok(solvable.length >= 10, `Expected at least 10 solvable problems, got ${solvable.length}`);
  for (const p of solvable) {
    const report = verifyAnalyzedProblem(p);
    assert.equal(report.overallStatus, 'verified', `Library problem ${p.id} failed verification: ${report.summary}`);
  }

  // Spot-check cube cross-section area △A'MN = 3a²/8 (for a = 2 => 1.5)
  const cube = PROBLEM_LIBRARY.find((p) => p.id === 'preset-cube-section')!;
  const vm = new Map(cube.model!.vertices.map((pt) => [pt.id, pt.pos]));
  const area = triangleArea3(vm.get('A1')!, vm.get('M')!, vm.get('N')!);
  assert.ok(Math.abs(area - 1.5) < 1e-6);

  // Spot-check skew distance OK = a√6/6 (for a = 2 => 2√6/6 = √6/3)
  const skew = PROBLEM_LIBRARY.find((p) => p.id === 'preset-skew-distance')!;
  const vs = new Map(skew.model!.vertices.map((pt) => [pt.id, pt.pos]));
  const okLen = dist3(vs.get('O')!, vs.get('K')!);
  assert.ok(Math.abs(okLen - Math.sqrt(6) / 3) < 1e-6);
});

test('Problem library search & filter works accent-insensitively by topic and difficulty', () => {
  const bySearch = filterProblemLibrary(PROBLEM_LIBRARY, { search: 'thiet dien' });
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 'preset-cube-section');

  const byTopicAndDiff = filterProblemLibrary(PROBLEM_LIBRARY, {
    topic: 'Khoảng cách',
    difficulty: 'nang_cao',
  });
  assert.ok(byTopicAndDiff.some((p) => p.id === 'preset-skew-distance'));
  assert.equal(byTopicAndDiff.every((p) => p.difficulty === 'nang_cao' && p.topics.includes('Khoảng cách')), true);
});
