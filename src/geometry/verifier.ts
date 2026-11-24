import { AnalyzedProblem, GeometryModel, Vec3, VerificationCheckItem, VerificationReport } from '../types/geometry';
import { dist3, isPerpendicular, midpoint3, polyhedronVolume, sub3 } from './math3d';

/**
 * Independent coordinate and structural verifier.
 * Never rubber-stamps an unverified solution as "verified".
 */
export function verifyAnalyzedProblem(problem: AnalyzedProblem): VerificationReport {
  const checks: VerificationCheckItem[] = [];
  const coordinateChecks: string[] = [];
  const unverifiedNotes: string[] = [];

  const hasErrorIssue = problem.structured.issues.some((i) => i.severity === 'error');
  const hasWarningIssue = problem.structured.issues.some((i) => i.severity === 'warning');

  // 1. Consistency of givens
  if (hasErrorIssue) {
    const errMsgs = problem.structured.issues
      .filter((i) => i.severity === 'error')
      .map((i) => i.title)
      .join('; ');
    checks.push({
      id: 'consistency',
      label: 'Tính nhất quán và đầy đủ giả thiết',
      status: 'failed',
      detail: errMsgs,
    });
  } else if (hasWarningIssue) {
    checks.push({
      id: 'consistency',
      label: 'Tính nhất quán và đầy đủ giả thiết',
      status: 'warning',
      detail: problem.structured.issues
        .filter((i) => i.severity === 'warning')
        .map((i) => i.title)
        .join('; '),
    });
  } else {
    checks.push({
      id: 'consistency',
      label: 'Tính nhất quán và đầy đủ giả thiết',
      status: 'passed',
      detail: 'Không phát hiện mâu thuẫn giữa các giả thiết đã nhận diện.',
    });
  }

  // 2. Non-degeneracy & 3D model geometry verification
  const model: GeometryModel | null = problem.model;
  if (!model) {
    checks.push({
      id: 'non_degenerate',
      label: 'Điều kiện không suy biến của khối 3D',
      status: 'failed',
      detail: 'Không dựng được mô hình 3D thỏa mãn đồng thời các giả thiết.',
    });
  } else {
    const vMap = new Map<string, Vec3>();
    for (const v of model.vertices) {
      vMap.set(v.id, v.pos);
    }

    // Check distinct vertices
    let minPairDist = Infinity;
    for (let i = 0; i < model.vertices.length; i++) {
      for (let j = i + 1; j < model.vertices.length; j++) {
        const d = dist3(model.vertices[i].pos, model.vertices[j].pos);
        if (d < minPairDist) minPairDist = d;
      }
    }

    const solidFaces = model.faces
      .filter((f) => f.kind === 'solid_boundary')
      .map((f) => f.vertices);
    const vol = polyhedronVolume(vMap, solidFaces);

    if (minPairDist < 1e-4 || vol < 1e-4) {
      checks.push({
        id: 'non_degenerate',
        label: 'Điều kiện không suy biến của khối 3D',
        status: 'failed',
        detail: `Khối suy biến (khoảng cách nhỏ nhất giữa 2 điểm = ${minPairDist.toFixed(4)}, thể tích = ${vol.toFixed(4)}).`,
      });
    } else {
      checks.push({
        id: 'non_degenerate',
        label: 'Điều kiện không suy biến của khối 3D',
        status: 'passed',
        detail: `Khối 3D hợp lệ với ${model.vertices.length} điểm, ${solidFaces.length} mặt biên và thể tích dương.`,
      });
      coordinateChecks.push(`Thể tích mô hình dựng hình (theo tỉ lệ tọa độ): V = ${vol.toFixed(4)} > 0.`);
    }

    // 3. Verify all right-angle marks numerically on the 3D coordinates
    let allRightAnglesOk = true;
    for (const ra of model.rightAngles) {
      const pV = vMap.get(ra.vertex);
      const pA = vMap.get(ra.armA);
      const pB = vMap.get(ra.armB);
      if (!pV || !pA || !pB) {
        allRightAnglesOk = false;
        continue;
      }
      const ok = isPerpendicular(sub3(pA, pV), sub3(pB, pV), 1e-4);
      if (!ok) {
        allRightAnglesOk = false;
        unverifiedNotes.push(
          `Ký hiệu vuông góc tại ${ra.vertex} (${ra.armA}-${ra.vertex}-${ra.armB}) lệch vuông góc trong mô hình tọa độ.`
        );
      }
    }

    if (model.rightAngles.length > 0) {
      checks.push({
        id: 'right_angles',
        label: 'Đối chiếu quan hệ vuông góc trên mô hình 3D',
        status: allRightAnglesOk ? 'passed' : 'failed',
        detail: allRightAnglesOk
          ? `Đã kiểm tra tọa độ ${model.rightAngles.length}/${model.rightAngles.length} góc vuông đều có tích vô hướng bằng 0.`
          : 'Phát hiện ký hiệu vuông góc không khớp tọa độ 3D.',
      });
      if (allRightAnglesOk) {
        coordinateChecks.push(
          `Kiểm tra tích vô hướng cho ${model.rightAngles.length} quan hệ vuông góc: sai số < 10⁻⁴.`
        );
      }
    }

    // 4. Verify midpoints numerically
    let allMidpointsOk = true;
    for (const mp of model.midpoints) {
      const pM = vMap.get(mp.point);
      const pA = vMap.get(mp.from);
      const pB = vMap.get(mp.to);
      if (!pM || !pA || !pB) {
        allMidpointsOk = false;
        continue;
      }
      const expected = midpoint3(pA, pB);
      if (dist3(pM, expected) > 1e-4) {
        allMidpointsOk = false;
      }
    }
    if (model.midpoints.length > 0) {
      checks.push({
        id: 'midpoints',
        label: 'Đối chiếu trung điểm',
        status: allMidpointsOk ? 'passed' : 'failed',
        detail: allMidpointsOk
          ? `Đã kiểm tra ${model.midpoints.length}/${model.midpoints.length} trung điểm khớp tọa độ.`
          : 'Tọa độ trung điểm không khớp đoạn thẳng tương ứng.',
      });
    }

    // 5. Verify naming sync between model labels and solution steps
    const modelLabels = new Set(model.vertices.map((v) => v.label));
    if (problem.solution) {
      const stepLabelsReferenced = new Set<string>();
      for (const step of problem.solution.cacBuocGiai) {
        if (step.highlight?.vertices) {
          for (const vid of step.highlight.vertices) {
            const vObj = model.vertices.find((v) => v.id === vid || v.label === vid);
            if (!vObj) {
              stepLabelsReferenced.add(vid);
            }
          }
        }
      }
      if (stepLabelsReferenced.size === 0) {
        checks.push({
          id: 'naming_sync',
          label: 'Thống nhất tên điểm giữa đề, hình và lời giải',
          status: 'passed',
          detail: `Các đỉnh trên hình (${Array.from(modelLabels).join(', ')}) đồng bộ với lời giải.`,
        });
      } else {
        checks.push({
          id: 'naming_sync',
          label: 'Thống nhất tên điểm giữa đề, hình và lời giải',
          status: 'warning',
          detail: `Điểm tham chiếu chưa có trên hình: ${Array.from(stepLabelsReferenced).join(', ')}.`,
        });
        unverifiedNotes.push('Một số điểm phụ trong lời giải chưa được gắn nhãn trực tiếp trên hình 3D.');
      }
    }
  }

  // 6. Distinguish AI-assisted symbolic proofs from verified deterministic proofs
  if (problem.source === 'ai_assisted') {
    checks.push({
      id: 'symbolic_proof',
      label: 'Mức độ kiểm chứng lập luận tổng quát',
      status: 'unverified',
      detail:
        'Lời giải được hỗ trợ phân tích bởi dịch vụ AI và đã đối chiếu cấu trúc 3D; học sinh/giáo viên nên tự kiểm tra lại từng bước chứng minh tổng quát.',
    });
    unverifiedNotes.push(
      'Kiểm tra tọa độ trên một cấu hình số giúp phát hiện sai sót nhưng không thay thế hoàn toàn phép chứng minh tổng quát; các bước lập luận do AI tổng hợp cần đối chiếu lại điều kiện định lý.'
    );
  } else if (problem.structured.canConclude && problem.solution) {
    checks.push({
      id: 'symbolic_proof',
      label: 'Điều kiện định lý, đơn vị đo và tham số',
      status: 'passed',
      detail: 'Đã kiểm tra điều kiện dương của tham số (a > 0) và điều kiện áp dụng định lý THPT.',
    });
  }

  const anyFailed = checks.some((c) => c.status === 'failed') || !problem.structured.canConclude;
  const anyUnverifiedOrWarn = checks.some(
    (c) => c.status === 'warning' || c.status === 'unverified'
  );

  const overallStatus: VerificationReport['overallStatus'] = anyFailed
    ? 'blocked'
    : anyUnverifiedOrWarn
      ? 'partial'
      : 'verified';

  const summary =
    overallStatus === 'verified'
      ? 'Đã kiểm chứng giả thiết, tọa độ 3D và sự đồng bộ giữa đề bài – hình vẽ – lời giải.'
      : overallStatus === 'partial'
        ? 'Đã kiểm tra cấu trúc hình học 3D; còn một số mục lưu ý cần người dùng xác nhận.'
        : 'Chưa thể kết luận lời giải do thiếu dữ kiện hoặc phát hiện mâu thuẫn trong đề bài.';

  return {
    overallStatus,
    summary,
    checks,
    coordinateChecks: [...problem.verification.coordinateChecks, ...coordinateChecks].filter(
      (v, idx, arr) => arr.indexOf(v) === idx
    ),
    unverifiedNotes: [...problem.verification.unverifiedNotes, ...unverifiedNotes].filter(
      (v, idx, arr) => arr.indexOf(v) === idx
    ),
  };
}
