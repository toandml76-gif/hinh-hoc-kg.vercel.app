import {
  AnalyzedProblem,
  GeometryModel,
  ProblemIssue,
  SolidType,
  SolutionStep,
} from '../types/geometry';
import { ADVANCED_PRESET_PROBLEMS } from './advancedPresets';
import { midpoint3, vec3 } from './math3d';
import { PRESET_PROBLEMS } from './presets';
import { verifyAnalyzedProblem } from './verifier';

function normalizeCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/vuông góc với mặt phẳng/g, '⊥')
    .replace(/vuông góc với/g, '⊥')
    .replace(/song song với/g, '∥')
    .replace(/mặt phẳng/g, '')
    .replace(/[.,;:]/g, '')
    .trim();
}

/**
 * Parses numeric multiplier for expressions like "a", "2a", "a√2", "a√3", "a/2", "3a/2", "2"
 */
export function parseLengthMultiplier(expr: string): { value: number; latex: string; hasParamA: boolean } | null {
  const cleaned = expr.replace(/\s+/g, '').replace(/,/g, '.');
  const hasParamA = /a/i.test(cleaned);

  // e.g. a√2/2, 2a√3, a/2, a√2, 3a, a
  const m = cleaned.match(/^(-?\d*(?:\.\d+)?)?a?(?:√(\d+))?(?:\/(\d+(?:\.\d+)?))?$/i);
  if (!m) return null;

  const numStr = m[1];
  const radStr = m[2];
  const denStr = m[3];

  if (!numStr && !hasParamA && !radStr) return null;

  let coeff = 1;
  if (numStr === '-') coeff = -1;
  else if (numStr && numStr !== '') coeff = parseFloat(numStr);

  const rad = radStr ? Math.sqrt(parseFloat(radStr)) : 1;
  const den = denStr ? parseFloat(denStr) : 1;
  if (den === 0) return null;

  const val = (coeff * rad) / den;
  let latex = '';
  const coeffText =
    coeff === 1 && (hasParamA || radStr)
      ? ''
      : coeff === -1 && (hasParamA || radStr)
        ? '-'
        : `${coeff}`;
  const numPart = `${coeffText}${hasParamA ? 'a' : ''}${radStr ? `\\sqrt{${radStr}}` : ''}` || '1';
  latex = denStr ? `\\dfrac{${numPart}}{${denStr}}` : numPart;

  return { value: val, latex, hasParamA };
}

function extractSegmentLength(
  text: string,
  segName: string
): { value: number; latex: string; raw: string; hasParamA: boolean } | null {
  const escaped = segName.replace(/'/g, "'");
  const re = new RegExp(`\\b${escaped}\\s*(?:=|bằng)\\s*(-?[0-9a-zA-Z√./]+)`, 'i');
  const m = text.match(re);
  if (!m) return null;
  const parsed = parseLengthMultiplier(m[1]);
  if (!parsed) return null;
  return { value: parsed.value, latex: parsed.latex, raw: m[1], hasParamA: parsed.hasParamA };
}

function detectSolidType(text: string): {
  solidType: SolidType;
  solidTypeLabel: string;
  solidName: string;
  baseShape: 'square' | 'rectangle' | 'equilateral_triangle' | 'right_triangle' | 'triangle' | 'unknown';
} {
  const lower = text.toLowerCase();

  if (lower.includes('hình lập phương')) {
    const nameMatch = text.match(/hình lập phương\s+([A-Z']+\.[A-Z']+)/i);
    return {
      solidType: 'cube',
      solidTypeLabel: 'Hình lập phương',
      solidName: nameMatch?.[1] ?? "ABCD.A'B'C'D'",
      baseShape: 'square',
    };
  }

  if (lower.includes('hình hộp chữ nhật')) {
    const nameMatch = text.match(/hình hộp chữ nhật\s+([A-Z']+\.[A-Z']+)/i);
    return {
      solidType: 'rectangular_box',
      solidTypeLabel: 'Hình hộp chữ nhật',
      solidName: nameMatch?.[1] ?? "ABCD.A'B'C'D'",
      baseShape: 'rectangle',
    };
  }

  if (lower.includes('hình hộp')) {
    const nameMatch = text.match(/hình hộp\s+([A-Z']+\.[A-Z']+)/i);
    return {
      solidType: 'general_box',
      solidTypeLabel: 'Hình hộp',
      solidName: nameMatch?.[1] ?? "ABCD.A'B'C'D'",
      baseShape: 'unknown',
    };
  }

  if (lower.includes('lăng trụ đều') || (lower.includes('lăng trụ đứng') && lower.includes('tam giác đều'))) {
    const nameMatch = text.match(/lăng trụ(?:\s+đứng|\s+đều)?\s+([A-Z']+\.[A-Z']+)/i);
    return {
      solidType: 'regular_prism',
      solidTypeLabel: 'Lăng trụ đều',
      solidName: nameMatch?.[1] ?? "ABC.A'B'C'",
      baseShape: 'equilateral_triangle',
    };
  }

  if (lower.includes('lăng trụ đứng')) {
    const nameMatch = text.match(/lăng trụ đứng\s+([A-Z']+\.[A-Z']+)/i);
    return {
      solidType: 'standing_prism',
      solidTypeLabel: 'Lăng trụ đứng',
      solidName: nameMatch?.[1] ?? "ABC.A'B'C'",
      baseShape: lower.includes('tam giác vuông')
        ? 'right_triangle'
        : lower.includes('tam giác đều')
          ? 'equilateral_triangle'
          : 'triangle',
    };
  }

  if (lower.includes('lăng trụ')) {
    const nameMatch = text.match(/lăng trụ\s+([A-Z']+\.[A-Z']+)/i);
    return {
      solidType: 'prism',
      solidTypeLabel: 'Lăng trụ xiên (tổng quát)',
      solidName: nameMatch?.[1] ?? "ABC.A'B'C'",
      baseShape: 'triangle',
    };
  }

  if (lower.includes('tứ diện')) {
    const nameMatch = text.match(/tứ diện(?:\s+đều)?\s+([A-Z]\.?[A-Z]{3})/i);
    return {
      solidType: 'tetrahedron',
      solidTypeLabel: lower.includes('tứ diện đều') ? 'Tứ diện đều' : 'Tứ diện',
      solidName: nameMatch?.[1] ?? 'S.ABC',
      baseShape: lower.includes('tứ diện đều') ? 'equilateral_triangle' : 'triangle',
    };
  }

  // Crucial distinction: regular pyramid vs pyramid with regular polygon base!
  if (/hình chóp\s+(tứ giác\s+|tam giác\s+)?đều/i.test(text)) {
    const isTri = /hình chóp\s+tam giác\s+đều/i.test(text);
    const nameMatch = text.match(/hình chóp(?:\s+tứ giác|\s+tam giác)?\s+đều\s+([A-Z]\.[A-Z]{3,4})/i);
    return {
      solidType: 'regular_pyramid',
      solidTypeLabel: isTri ? 'Hình chóp tam giác đều' : 'Hình chóp tứ giác đều',
      solidName: nameMatch?.[1] ?? (isTri ? 'S.ABC' : 'S.ABCD'),
      baseShape: isTri ? 'equilateral_triangle' : 'square',
    };
  }

  const nameMatch = text.match(/hình chóp\s+([A-Z]\.[A-Z]{3,4})/i);
  const solidName = nameMatch?.[1] ?? 'S.ABCD';
  const baseShape = lower.includes('hình vuông')
    ? 'square'
    : lower.includes('hình chữ nhật')
      ? 'rectangle'
      : lower.includes('tam giác đều')
        ? 'equilateral_triangle'
        : lower.includes('tam giác vuông')
          ? 'right_triangle'
          : solidName.split('.')[1]?.length === 3
            ? 'triangle'
            : 'square';

  return {
    solidType: 'pyramid',
    solidTypeLabel: 'Hình chóp',
    solidName,
    baseShape,
  };
}

/**
 * Deterministic geometry parser and analyzer for arbitrary Vietnamese THPT spatial geometry text.
 * Enforces strict mathematical honesty:
 * - Never invents missing assumptions (e.g. never turns a square-base pyramid into a regular pyramid).
 * - Detects algebraic/geometric contradictions immediately.
 * - Cross-verifies all built 3D coordinates via verifyAnalyzedProblem().
 */
export function analyzeProblemDeterministic(rawTextInput: string): AnalyzedProblem {
  const rawText = rawTextInput.trim();

  // 1. Check exact / normalized match against verified presets (base + advanced library)
  const normInput = normalizeCompare(rawText);
  for (const preset of [...PRESET_PROBLEMS, ...ADVANCED_PRESET_PROBLEMS]) {
    if (normalizeCompare(preset.rawText) === normInput) {
      const cloned: AnalyzedProblem = structuredClone(preset);
      cloned.verification = verifyAnalyzedProblem(cloned);
      return cloned;
    }
  }

  // 2. General deterministic parsing
  const lower = rawText.toLowerCase();
  const detected = detectSolidType(rawText);
  const issues: ProblemIssue[] = [];
  const duKienDeBai: string[] = [];
  const ketQuaSuyRa: string[] = [];
  const yeuToPhu: string[] = [];
  const thongSoBoTri: string[] = [];
  const yeuCau: string[] = [];

  // Extract requested goals
  if (/chứng minh/i.test(rawText)) {
    const cmMatch = rawText.match(/chứng minh\s+([^.;]+?)(?:\s+và\s+(?:tính|xác định)|\.|$)/i);
    yeuCau.push(`Chứng minh ${cmMatch ? cmMatch[1].trim() : 'quan hệ hình học theo đề bài'}.`);
  }
  if (/khoảng cách/i.test(rawText)) {
    const kcMatch = rawText.match(/khoảng cách\s+([^.;]+)/i);
    yeuCau.push(`Tính khoảng cách ${kcMatch ? kcMatch[1].trim() : 'theo yêu cầu đề bài'}.`);
  }
  if (/tính góc|xác định góc|góc giữa/i.test(rawText) && /tính|xác định/i.test(rawText)) {
    const gMatch = rawText.match(/góc giữa\s+([^.;]+)/i);
    if (gMatch) yeuCau.push(`Tính góc giữa ${gMatch[1].trim()}.`);
  }
  if (/thể tích/i.test(rawText)) {
    yeuCau.push(`Tính thể tích khối ${detected.solidName}.`);
  }
  if (/thiết diện/i.test(rawText)) {
    yeuCau.push('Xác định thiết diện và tính diện tích thiết diện (nếu có).');
  }
  if (yeuCau.length === 0) {
    yeuCau.push('Quan sát và phân tích cấu trúc hình học không gian từ giả thiết.');
  }

  // Check obvious contradictions: negative or zero lengths
  const negativeLengthMatch = rawText.match(/\b([A-Z]{2}'?)\s*=\s*(-\d+(?:\.\d+)?a?|-a|0)\b/);
  if (negativeLengthMatch) {
    issues.push({
      severity: 'error',
      code: 'contradiction',
      title: `Độ dài cạnh ${negativeLengthMatch[1]} không hợp lệ (${negativeLengthMatch[2]})`,
      detail: 'Độ dài mọi đoạn thẳng trong hình học không gian phải lớn hơn 0.',
      suggestedAction: 'Kiểm tra lại giá trị độ dài trong đề bài.',
    });
  }

  // Simultaneous parallel and perpendicular on same pair (e.g., "AB song song CD và AB vuông góc CD")
  const paraMatch = rawText.match(/\b([A-Z]{2})\s*(?:song song với|song song|∥)\s*([A-Z]{2})\b/i);
  const perpPairMatch = rawText.match(/\b([A-Z]{2})\s*(?:vuông góc với|vuông góc|⊥)\s*([A-Z]{2})\b/i);
  if (
    paraMatch &&
    perpPairMatch &&
    ((paraMatch[1] === perpPairMatch[1] && paraMatch[2] === perpPairMatch[2]) ||
      (paraMatch[1] === perpPairMatch[2] && paraMatch[2] === perpPairMatch[1]))
  ) {
    issues.push({
      severity: 'error',
      code: 'contradiction',
      title: `Mâu thuẫn quan hệ giữa ${paraMatch[1]} và ${paraMatch[2]}`,
      detail: `Hai đường thẳng ${paraMatch[1]} và ${paraMatch[2]} không thể vừa song song vừa vuông góc với nhau.`,
      suggestedAction: 'Hiệu chỉnh lại quan hệ song song/vuông góc trong đề bài.',
    });
  }

  // Check equilateral triangle with right angle contradiction
  if (lower.includes('tam giác đều') && lower.includes('vuông tại')) {
    issues.push({
      severity: 'error',
      code: 'contradiction',
      title: 'Mâu thuẫn: Tam giác đều không thể có góc vuông',
      detail: 'Mọi góc trong tam giác đều bằng 60°, không thể đồng thời là tam giác vuông (90°).',
      suggestedAction: 'Kiểm tra lại tính chất tam giác đáy trong đề bài.',
    });
  }

  // Extract common lengths
  const baseSideMatch = rawText.match(/(?:hình vuông|tam giác đều|hình lập phương|cạnh đáy)\s*(?:[A-Z']+\s*)?(?:có\s+)?(?:cạnh\s*(?:bằng\s*)?|bằng\s*)([0-9a-zA-Z√./]+)/i);
  const baseSide = baseSideMatch ? parseLengthMultiplier(baseSideMatch[1]) : null;
  const saLen = extractSegmentLength(rawText, 'SA');
  const sbLen = extractSegmentLength(rawText, 'SB');
  const abLen = extractSegmentLength(rawText, 'AB') ?? baseSide;
  const adLen = extractSegmentLength(rawText, 'AD') ?? (detected.baseShape === 'square' ? abLen : null);
  const aa1Len = extractSegmentLength(rawText, "AA'") ?? (detected.solidType === 'cube' ? abLen : null);

  const hasSaPerpBase = /SA\s*(?:vuông góc với mặt phẳng|vuông góc với|vuông góc|⊥)\s*\(?ABCD\)?|SA\s*(?:vuông góc với|⊥)\s*(?:đáy|mặt phẳng đáy|\(?ABC\)?)/i.test(rawText);

  // Check Pythagorean contradiction for SA ⊥ (ABCD) with given SA, AB, SB
  if (hasSaPerpBase && saLen && abLen && sbLen) {
    const expectedSb = Math.hypot(saLen.value, abLen.value);
    if (Math.abs(expectedSb - sbLen.value) > 1e-3) {
      issues.push({
        severity: 'error',
        code: 'contradiction',
        title: 'Mâu thuẫn định lý Py-ta-go trong △SAB vuông tại A',
        detail: `Do SA ⊥ đáy nên SB phải bằng √(SA² + AB²) ≈ ${expectedSb.toFixed(3)}${saLen.hasParamA ? 'a' : ''}, mâu thuẫn với giả thiết SB = ${sbLen.raw}.`,
        suggestedAction: 'Kiểm tra lại độ dài SA, AB, SB trong đề bài.',
      });
    }
  }

  // Check if regular pyramid has lateral edge <= circumradius
  const lateralSideMatch = rawText.match(/cạnh bên\s*(?:bằng|=)\s*([0-9a-zA-Z√./]+)/i);
  const lateralSide = lateralSideMatch ? parseLengthMultiplier(lateralSideMatch[1]) : saLen;
  if (detected.solidType === 'regular_pyramid' && abLen && lateralSide) {
    const rCirc =
      detected.baseShape === 'square'
        ? (abLen.value * Math.SQRT2) / 2
        : (abLen.value * Math.sqrt(3)) / 3;
    if (lateralSide.value <= rCirc + 1e-6) {
      issues.push({
        severity: 'error',
        code: 'contradiction',
        title: 'Cạnh bên hình chóp đều nhỏ hơn hoặc bằng bán kính đường tròn ngoại tiếp đáy',
        detail: 'Trong hình chóp đều, cạnh bên bắt buộc phải lớn hơn bán kính đường tròn ngoại tiếp đáy để chiều cao SO > 0.',
        suggestedAction: 'Tăng độ dài cạnh bên hoặc kiểm tra lại cạnh đáy.',
      });
    }
  }

  // Check if any solid keyword is recognized
  const hasAnySolid = /(hình chóp|tứ diện|lăng trụ|hình hộp|hình lập phương)/i.test(rawText);
  if (!hasAnySolid) {
    issues.push({
      severity: 'error',
      code: 'ambiguous_notation',
      title: 'Chưa nhận diện được loại khối hình học không gian',
      detail:
        'Đề bài cần nêu rõ loại khối (ví dụ: hình chóp S.ABCD, tứ diện O.ABC, lăng trụ đứng ABC.A\'B\'C\', hình hộp chữ nhật, hình lập phương).',
      suggestedAction: 'Bổ sung tên khối hình hoặc chọn một đề mẫu để bắt đầu.',
    });
  }

  // Build structured givens
  duKienDeBai.push(`Loại hình: ${detected.solidTypeLabel} $${detected.solidName}$.`);
  if (detected.baseShape === 'square') {
    duKienDeBai.push(`Đáy là hình vuông${abLen ? ` cạnh $${abLen.latex}$` : ''}.`);
  } else if (detected.baseShape === 'rectangle') {
    duKienDeBai.push(
      `Đáy là hình chữ nhật${abLen ? ` có $AB = ${abLen.latex}$` : ''}${adLen ? `, $AD = ${adLen.latex}$` : ''}.`
    );
  } else if (detected.baseShape === 'equilateral_triangle') {
    duKienDeBai.push(`Đáy là tam giác đều${abLen ? ` cạnh $${abLen.latex}$` : ''}.`);
  }
  if (hasSaPerpBase) {
    duKienDeBai.push(`$SA \\perp (\\text{đáy})$${saLen ? ` với $SA = ${saLen.latex}$` : ''}.`);
  }
  if (aa1Len && (detected.solidType === 'standing_prism' || detected.solidType === 'regular_prism' || detected.solidType === 'rectangular_box')) {
    duKienDeBai.push(`Cạnh bên $AA' = ${aa1Len.latex}$.`);
  }

  // Midpoint detection
  const midpointMatch = rawText.match(/(?:gọi\s+)?([A-Z])\s+là trung điểm(?: của)?\s+([A-Z]{2}'?)/i);
  if (midpointMatch) {
    duKienDeBai.push(`$${midpointMatch[1].toUpperCase()}$ là trung điểm của đoạn $${midpointMatch[2].toUpperCase()}$.`);
  }

  // CRITICAL PRINCIPLE: Square/regular base pyramid WITHOUT apex constraint!
  const isUnconstrainedPyramid =
    detected.solidType === 'pyramid' &&
    !hasSaPerpBase &&
    !/SB\s*⊥|SC\s*⊥|SD\s*⊥|SH\s*⊥|SO\s*⊥|vuông góc với đáy|vuông góc với mặt phẳng đáy|cạnh bên bằng nhau/i.test(rawText);

  let isRepresentativeConfig = false;
  let representativeNotice: string | undefined;

  if (isUnconstrainedPyramid && !issues.some((i) => i.severity === 'error')) {
    isRepresentativeConfig = true;
    representativeNotice =
      'Hình minh họa là một cấu hình thỏa mãn giả thiết; các kích thước chưa được cho được chọn để dễ quan sát.';
    thongSoBoTri.push(
      'Đỉnh S chưa bị ràng buộc vị trí nên được bố trí ở vị trí lệch tổng quát (không tự đặt trên trục tâm đáy để tránh nhầm với hình chóp đều).'
    );
    issues.push({
      severity: 'warning',
      code: 'ambiguous_apex',
      title: 'Chưa xác định vị trí đỉnh S và chiều cao khối chóp',
      detail:
        'Đề bài không nêu điều kiện ràng buộc đường cao hay vị trí chân đường cao từ đỉnh S. Không được tự biến thành hình chóp đều hay tự giả thiết SA ⊥ đáy.',
      suggestedAction: 'Xác nhận cấu hình tổng quát hoặc bổ sung điều kiện về đường cao/cạnh bên.',
    });

    if (/thể tích|khoảng cách|góc/i.test(rawText)) {
      issues.push({
        severity: 'error',
        code: 'missing_data',
        title: 'Thiếu dữ kiện để tính giá trị số xác định',
        detail:
          'Yêu cầu tính thể tích, khoảng cách hoặc góc liên quan đến đỉnh S không có giá trị duy nhất khi chưa biết chiều cao và vị trí hình chiếu của S.',
        suggestedAction: 'Bổ sung chiều cao/điều kiện vuông góc rồi nhấn "Phân tích và dựng hình" lại.',
      });
    }
  }

  // If contradiction or missing solid -> cannot build valid 3D model
  const hasBlockingError = issues.some((i) => i.severity === 'error');
  const canBuildModel = hasAnySolid && !issues.some((i) => i.code === 'contradiction' || i.code === 'ambiguous_notation');

  let model: GeometryModel | null = null;
  if (canBuildModel) {
    model = buildGenericModel(detected, {
      ab: abLen?.value ?? 1,
      ad: adLen?.value ?? (detected.baseShape === 'rectangle' ? 1.5 : abLen?.value ?? 1),
      h: saLen?.value ?? aa1Len?.value ?? 1.4,
      lateral: lateralSide?.value,
      hasSaPerpBase,
      isObliqueApex: isUnconstrainedPyramid,
      midpoint: midpointMatch
        ? { label: midpointMatch[1].toUpperCase(), seg: midpointMatch[2].toUpperCase() }
        : undefined,
    });
  }

  // Build deterministic solution for clean standard configurations (e.g., SA ⊥ (ABCD) pyramid with known SA & AB asking volume or distance)
  let solution: AnalyzedProblem['solution'] = null;
  let hints: AnalyzedProblem['hints'] = null;

  if (!hasBlockingError && model && detected.solidType === 'pyramid' && detected.baseShape === 'square' && hasSaPerpBase && abLen && saLen) {
    const aVal = abLen.value;
    const hVal = saLen.value;
    const volFormula = `\\dfrac{1}{3} \\cdot (${abLen.latex})^2 \\cdot ${saLen.latex}`;
    const wantsVol = /thể tích/i.test(rawText);
    const wantsDistM = midpointMatch && /khoảng cách/i.test(rawText);

    if (wantsVol || wantsDistM) {
      ketQuaSuyRa.push(`Diện tích đáy $S_{ABCD} = (${abLen.latex})^2$.`);
      ketQuaSuyRa.push(`Đường cao của hình chóp là $SA = ${saLen.latex}$.`);
      const steps: SolutionStep[] = [];
      if (wantsVol) {
        steps.push({
          id: 'dyn-vol',
          title: 'Bước 1: Tính diện tích đáy và thể tích khối chóp',
          content: `Đáy $ABCD$ là hình vuông cạnh $${abLen.latex}$ nên $S_{ABCD} = (${abLen.latex})^2$.\nVì $SA \\perp (ABCD)$ nên chiều cao khối chóp là $h = SA = ${saLen.latex}$.\nThể tích khối chóp: $V_{S.ABCD} = \\dfrac{1}{3} S_{ABCD} \\cdot SA = ${volFormula}$ (giá trị tỉ lệ khi $a=1$: $V \\approx ${((aVal * aVal * hVal) / 3).toFixed(4)}$).`,
          justification: 'Công thức thể tích khối chóp $V = \\dfrac{1}{3} S_{\\text{đáy}} \\cdot h$.',
          highlight: {
            vertices: ['S', 'A', 'B', 'C', 'D'],
            edges: [['S', 'A']],
            planeVertices: ['A', 'B', 'C', 'D'],
          },
        });
      }
      if (wantsDistM && midpointMatch) {
        const mLabel = midpointMatch[1].toUpperCase();
        steps.push({
          id: 'dyn-dist',
          title: `Tính khoảng cách từ $${mLabel}$ đến $(ABCD)$`,
          content: `Vì $${mLabel}$ là trung điểm của $${midpointMatch[2].toUpperCase()}$ và $SA \\perp (ABCD)$ nên khoảng cách từ $${mLabel}$ đến $(ABCD)$ bằng $\\dfrac{1}{2}SA = \\dfrac{1}{2} \\cdot ${saLen.latex}$.`,
          justification: 'Quy tắc tỉ số khoảng cách khi đoạn thẳng cắt mặt phẳng.',
          highlight: {
            vertices: ['S', 'A', mLabel],
            showAux: true,
          },
        });
      }

      hints = {
        phanTichDe: `Hình chóp $${detected.solidName}$ có đáy hình vuông cạnh $${abLen.latex}$ và đường cao $SA = ${saLen.latex}$.`,
        kienThucCanDung: [
          'Công thức diện tích hình vuông $S = c^2$ và thể tích khối chóp $V = \\dfrac{1}{3}S_{\\text{đáy}}h$.',
          'Định lý đường thẳng vuông góc với mặt phẳng và tỉ số khoảng cách.',
        ],
        huongGiai:
          'Xác định rõ diện tích đáy $S_{ABCD}$ và nhận dạng đường cao $SA$ đã vuông góc sẵn với mặt đáy trước khi thay vào công thức.',
        progressiveLevels: [
          {
            level: 1,
            title: 'Gợi ý chi tiết hơn',
            content: `Vì $SA \\perp (ABCD)$ nên không cần dựng thêm đường cao từ $S$: chiều cao chính là $SA = ${saLen.latex}$.`,
          },
        ],
      };

      solution = {
        tomTatGiaThietKetLuan: {
          giaThiet: duKienDeBai,
          ketLuan: yeuCau,
        },
        yTuongChinh: 'Khai thác trực tiếp đường cao $SA \\perp (ABCD)$ và tính chất hình vuông đáy.',
        cacBuocGiai: steps,
        ketLuanCuoiCung: wantsVol
          ? `Vậy $V_{S.ABCD} = ${volFormula}$ (với điều kiện tham số dương).`
          : `Vậy $d\\bigl(${midpointMatch?.[1].toUpperCase() ?? 'M'}, (ABCD)\\bigr) = \\dfrac{1}{2} \\cdot ${saLen.latex}$.`,
      };
    }
  }

  // Generic pedagogy hint when deterministic full proof is not available yet
  if (!hints) {
    hints = {
      phanTichDe: `Hệ thống đã nhận diện khối ${detected.solidTypeLabel} $${detected.solidName}$ cùng các giả thiết chính và yêu cầu của bài toán.`,
      kienThucCanDung: [
        'Quan hệ vuông góc giữa đường thẳng và mặt phẳng (SGK Hình học 11).',
        'Quan hệ song song trong không gian và phép chiếu vuông góc.',
        'Công thức tính góc, khoảng cách và thể tích khối đa diện THPT.',
      ],
      huongGiai: hasBlockingError
        ? 'Hãy kiểm tra và bổ sung/hiệu chỉnh các giả thiết đang thiếu hoặc mâu thuẫn được cảnh báo phía trên trước khi lập luận tiếp.'
        : 'Bắt đầu bằng việc xác định chân đường cao (nếu có), kiểm tra các tam giác vuông đặc biệt trên hình 3D và chọn mặt phẳng phụ phù hợp.',
      progressiveLevels: [],
    };
  }

  const analyzed: AnalyzedProblem = {
    id: `custom-${Date.now()}`,
    title: `${detected.solidTypeLabel} ${detected.solidName}`,
    category: detected.solidTypeLabel,
    difficulty: 'trung_binh',
    topics: hasBlockingError ? ['Kiểm chứng đề'] : ['Vuông góc'],
    gradeLevel: 'THPT',
    rawText,
    structured: {
      solidType: detected.solidType,
      solidName: detected.solidName,
      solidTypeLabel: detected.solidTypeLabel,
      duKienDeBai,
      ketQuaSuyRa,
      yeuToPhu,
      thongSoBoTri,
      yeuCau,
      isRepresentativeConfig,
      representativeNotice,
      issues,
      canConclude: !hasBlockingError,
    },
    model,
    hints,
    solution,
    verification: {
      overallStatus: 'partial',
      summary: '',
      checks: [],
      coordinateChecks: [],
      unverifiedNotes: [],
    },
    source: 'deterministic_engine',
  };

  analyzed.verification = verifyAnalyzedProblem(analyzed);
  return analyzed;
}

function buildGenericModel(
  detected: ReturnType<typeof detectSolidType>,
  dims: {
    ab: number;
    ad: number;
    h: number;
    lateral?: number;
    hasSaPerpBase: boolean;
    isObliqueApex: boolean;
    midpoint?: { label: string; seg: string };
  }
): GeometryModel {
  const scale = 2 / Math.max(0.5, dims.ab);
  const w = dims.ab * scale;
  const d = dims.ad * scale;
  const h = Math.max(0.8, Math.min(5, dims.h * scale));

  if (detected.solidType === 'cube' || detected.solidType === 'rectangular_box' || detected.solidType === 'general_box') {
    const shearX = detected.solidType === 'general_box' ? 0.55 : 0;
    const shearY = detected.solidType === 'general_box' ? 0.35 : 0;
    const zh = detected.solidType === 'cube' ? w : h;
    const yd = detected.solidType === 'cube' ? w : d;

    const vertices = [
      { id: 'A', label: 'A', pos: vec3(0, 0, 0), kind: 'base' as const },
      { id: 'B', label: 'B', pos: vec3(w, 0, 0), kind: 'base' as const },
      { id: 'C', label: 'C', pos: vec3(w, yd, 0), kind: 'base' as const },
      { id: 'D', label: 'D', pos: vec3(0, yd, 0), kind: 'base' as const },
      { id: 'A1', label: "A'", pos: vec3(shearX, shearY, zh), kind: 'top' as const },
      { id: 'B1', label: "B'", pos: vec3(w + shearX, shearY, zh), kind: 'top' as const },
      { id: 'C1', label: "C'", pos: vec3(w + shearX, yd + shearY, zh), kind: 'top' as const },
      { id: 'D1', label: "D'", pos: vec3(shearX, yd + shearY, zh), kind: 'top' as const },
    ];

    const model: GeometryModel = {
      solidType: detected.solidType,
      solidTypeLabel: detected.solidTypeLabel,
      vertices,
      edges: [
        { id: 'AB', from: 'A', to: 'B', kind: 'solid' },
        { id: 'BC', from: 'B', to: 'C', kind: 'solid' },
        { id: 'CD', from: 'C', to: 'D', kind: 'solid' },
        { id: 'DA', from: 'D', to: 'A', kind: 'solid' },
        { id: 'A1B1', from: 'A1', to: 'B1', kind: 'solid' },
        { id: 'B1C1', from: 'B1', to: 'C1', kind: 'solid' },
        { id: 'C1D1', from: 'C1', to: 'D1', kind: 'solid' },
        { id: 'D1A1', from: 'D1', to: 'A1', kind: 'solid' },
        { id: 'AA1', from: 'A', to: 'A1', kind: 'solid' },
        { id: 'BB1', from: 'B', to: 'B1', kind: 'solid' },
        { id: 'CC1', from: 'C', to: 'C1', kind: 'solid' },
        { id: 'DD1', from: 'D', to: 'D1', kind: 'solid' },
      ],
      faces: [
        { id: 'ABCD', label: '(ABCD)', vertices: ['A', 'B', 'C', 'D'], kind: 'solid_boundary' },
        { id: 'A1B1C1D1', label: "(A'B'C'D')", vertices: ['A1', 'B1', 'C1', 'D1'], kind: 'solid_boundary' },
        { id: 'ABB1A1', label: "(ABB'A')", vertices: ['A', 'B', 'B1', 'A1'], kind: 'solid_boundary' },
        { id: 'BCC1B1', label: "(BCC'B')", vertices: ['B', 'C', 'C1', 'B1'], kind: 'solid_boundary' },
        { id: 'CDD1C1', label: "(CDD'C')", vertices: ['C', 'D', 'D1', 'C1'], kind: 'solid_boundary' },
        { id: 'DAA1D1', label: "(DAA'D')", vertices: ['D', 'A', 'A1', 'D1'], kind: 'solid_boundary' },
      ],
      rightAngles:
        detected.solidType !== 'general_box'
          ? [{ id: 'ra-A', vertex: 'A', armA: 'A1', armB: 'B', basis: 'Tính chất hình hộp chữ nhật / lập phương' }]
          : [],
      equalMarks: [],
      midpoints: [],
      defaultCamera: { yaw: 0.65, pitch: 0.35, zoom: 1.0 },
    };
    attachOptionalMidpoint(model, dims.midpoint);
    return model;
  }

  if (detected.solidType === 'prism' || detected.solidType === 'standing_prism' || detected.solidType === 'regular_prism') {
    const shearX = detected.solidType === 'prism' ? 0.6 : 0;
    const shearY = detected.solidType === 'prism' ? 0.3 : 0;
    const A = vec3(0, 0, 0);
    const B = vec3(w, 0, 0);
    const C =
      detected.baseShape === 'right_triangle'
        ? vec3(0, d, 0)
        : vec3(w * 0.5, (w * Math.sqrt(3)) / 2, 0);

    const model: GeometryModel = {
      solidType: detected.solidType,
      solidTypeLabel: detected.solidTypeLabel,
      vertices: [
        { id: 'A', label: 'A', pos: A, kind: 'base' },
        { id: 'B', label: 'B', pos: B, kind: 'base' },
        { id: 'C', label: 'C', pos: C, kind: 'base' },
        { id: 'A1', label: "A'", pos: vec3(A.x + shearX, A.y + shearY, h), kind: 'top' },
        { id: 'B1', label: "B'", pos: vec3(B.x + shearX, B.y + shearY, h), kind: 'top' },
        { id: 'C1', label: "C'", pos: vec3(C.x + shearX, C.y + shearY, h), kind: 'top' },
      ],
      edges: [
        { id: 'AB', from: 'A', to: 'B', kind: 'solid' },
        { id: 'BC', from: 'B', to: 'C', kind: 'solid' },
        { id: 'CA', from: 'C', to: 'A', kind: 'solid' },
        { id: 'A1B1', from: 'A1', to: 'B1', kind: 'solid' },
        { id: 'B1C1', from: 'B1', to: 'C1', kind: 'solid' },
        { id: 'C1A1', from: 'C1', to: 'A1', kind: 'solid' },
        { id: 'AA1', from: 'A', to: 'A1', kind: 'solid' },
        { id: 'BB1', from: 'B', to: 'B1', kind: 'solid' },
        { id: 'CC1', from: 'C', to: 'C1', kind: 'solid' },
      ],
      faces: [
        { id: 'ABC', label: '(ABC)', vertices: ['A', 'B', 'C'], kind: 'solid_boundary' },
        { id: 'A1B1C1', label: "(A'B'C')", vertices: ['A1', 'B1', 'C1'], kind: 'solid_boundary' },
        { id: 'ABB1A1', label: "(ABB'A')", vertices: ['A', 'B', 'B1', 'A1'], kind: 'solid_boundary' },
        { id: 'BCC1B1', label: "(BCC'B')", vertices: ['B', 'C', 'C1', 'B1'], kind: 'solid_boundary' },
        { id: 'CAA1C1', label: "(CAA'C')", vertices: ['C', 'A', 'A1', 'C1'], kind: 'solid_boundary' },
      ],
      rightAngles:
        detected.solidType !== 'prism'
          ? [{ id: 'ra-AA1B', vertex: 'A', armA: 'A1', armB: 'B', basis: 'Tính chất lăng trụ đứng' }]
          : [],
      equalMarks: [],
      midpoints: [],
      defaultCamera: { yaw: -0.75, pitch: 0.34, zoom: 1.0 },
    };
    attachOptionalMidpoint(model, dims.midpoint);
    return model;
  }

  if (detected.solidType === 'tetrahedron' || detected.baseShape === 'triangle' || detected.baseShape === 'equilateral_triangle' || detected.baseShape === 'right_triangle') {
    const A = vec3(0, 0, 0);
    const B = vec3(w, 0, 0);
    const C =
      detected.baseShape === 'right_triangle'
        ? vec3(0, d, 0)
        : vec3(w * 0.5, (w * Math.sqrt(3)) / 2, 0);
    const isRegular = detected.solidType === 'regular_pyramid' || detected.solidTypeLabel === 'Tứ diện đều';
    const center = vec3((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3, 0);
    const apexZ = isRegular
      ? dims.lateral
        ? Math.sqrt(Math.max(0.4, (dims.lateral * scale) ** 2 - (w / Math.sqrt(3)) ** 2))
        : w * Math.sqrt(2 / 3)
      : h;
    const S = dims.hasSaPerpBase
      ? vec3(A.x, A.y, apexZ)
      : isRegular
        ? vec3(center.x, center.y, apexZ)
        : vec3(center.x * 0.65, center.y * 0.55, apexZ);

    const model: GeometryModel = {
      solidType: detected.solidType,
      solidTypeLabel: detected.solidTypeLabel,
      vertices: [
        { id: 'S', label: 'S', pos: S, kind: 'apex' },
        { id: 'A', label: 'A', pos: A, kind: 'base' },
        { id: 'B', label: 'B', pos: B, kind: 'base' },
        { id: 'C', label: 'C', pos: C, kind: 'base' },
      ],
      edges: [
        { id: 'AB', from: 'A', to: 'B', kind: 'solid' },
        { id: 'BC', from: 'B', to: 'C', kind: 'solid' },
        { id: 'CA', from: 'C', to: 'A', kind: 'solid' },
        { id: 'SA', from: 'S', to: 'A', kind: 'solid' },
        { id: 'SB', from: 'S', to: 'B', kind: 'solid' },
        { id: 'SC', from: 'S', to: 'C', kind: 'solid' },
      ],
      faces: [
        { id: 'ABC', label: '(ABC)', vertices: ['A', 'B', 'C'], kind: 'solid_boundary' },
        { id: 'SAB', label: '(SAB)', vertices: ['S', 'A', 'B'], kind: 'solid_boundary' },
        { id: 'SBC', label: '(SBC)', vertices: ['S', 'B', 'C'], kind: 'solid_boundary' },
        { id: 'SCA', label: '(SCA)', vertices: ['S', 'C', 'A'], kind: 'solid_boundary' },
      ],
      rightAngles: dims.hasSaPerpBase
        ? [
            { id: 'ra-SAB', vertex: 'A', armA: 'S', armB: 'B', basis: 'Giả thiết SA ⊥ đáy' },
            { id: 'ra-SAC', vertex: 'A', armA: 'S', armB: 'C', basis: 'Giả thiết SA ⊥ đáy' },
          ]
        : [],
      equalMarks: [],
      midpoints: [],
      defaultCamera: { yaw: 0.72, pitch: 0.34, zoom: 1.0 },
    };
    attachOptionalMidpoint(model, dims.midpoint);
    return model;
  }

  // Quadrilateral pyramid S.ABCD
  const A = vec3(0, 0, 0);
  const B = vec3(w, 0, 0);
  const C = vec3(w, d, 0);
  const D = vec3(0, d, 0);
  let S = vec3(w * 0.24, d * 0.36, h); // Oblique by default! Never centered unless regular_pyramid!
  if (dims.hasSaPerpBase) {
    S = vec3(0, 0, h);
  } else if (detected.solidType === 'regular_pyramid') {
    const oa = Math.hypot(w / 2, d / 2);
    const lat = dims.lateral ? dims.lateral * scale : oa * 1.65;
    const regH = Math.sqrt(Math.max(0.5, lat * lat - oa * oa));
    S = vec3(w / 2, d / 2, regH);
  }

  const model: GeometryModel = {
    solidType: detected.solidType,
    solidTypeLabel: detected.solidTypeLabel,
    vertices: [
      { id: 'S', label: 'S', pos: S, kind: 'apex' },
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'D', label: 'D', pos: D, kind: 'base' },
    ],
    edges: [
      { id: 'AB', from: 'A', to: 'B', kind: 'solid' },
      { id: 'BC', from: 'B', to: 'C', kind: 'solid' },
      { id: 'CD', from: 'C', to: 'D', kind: 'solid' },
      { id: 'DA', from: 'D', to: 'A', kind: 'solid' },
      { id: 'SA', from: 'S', to: 'A', kind: 'solid' },
      { id: 'SB', from: 'S', to: 'B', kind: 'solid' },
      { id: 'SC', from: 'S', to: 'C', kind: 'solid' },
      { id: 'SD', from: 'S', to: 'D', kind: 'solid' },
    ],
    faces: [
      { id: 'ABCD', label: '(ABCD)', vertices: ['A', 'B', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'SAB', label: '(SAB)', vertices: ['S', 'A', 'B'], kind: 'solid_boundary' },
      { id: 'SBC', label: '(SBC)', vertices: ['S', 'B', 'C'], kind: 'solid_boundary' },
      { id: 'SCD', label: '(SCD)', vertices: ['S', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'SDA', label: '(SDA)', vertices: ['S', 'D', 'A'], kind: 'solid_boundary' },
    ],
    rightAngles: dims.hasSaPerpBase
      ? [
          { id: 'ra-SAB', vertex: 'A', armA: 'S', armB: 'B', basis: 'Giả thiết SA ⊥ (ABCD)' },
          { id: 'ra-SAD', vertex: 'A', armA: 'S', armB: 'D', basis: 'Giả thiết SA ⊥ (ABCD)' },
        ]
      : detected.baseShape === 'square' || detected.baseShape === 'rectangle'
        ? [{ id: 'ra-ABC', vertex: 'B', armA: 'A', armB: 'C', basis: 'Tính chất góc vuông ở đáy' }]
        : [],
    equalMarks: [],
    midpoints: [],
    defaultCamera: { yaw: -1.08, pitch: 0.34, zoom: 1.0 },
  };
  attachOptionalMidpoint(model, dims.midpoint);
  return model;
}

function attachOptionalMidpoint(
  model: GeometryModel,
  midpoint?: { label: string; seg: string }
): void {
  if (!midpoint || midpoint.seg.length < 2) return;
  const tokens = midpoint.seg.match(/[A-Z]'?/g);
  if (!tokens || tokens.length !== 2) return;
  const vA = model.vertices.find((v) => v.label === tokens[0] || v.id === tokens[0]);
  const vB = model.vertices.find((v) => v.label === tokens[1] || v.id === tokens[1]);
  if (!vA || !vB) return;

  if (!model.vertices.some((v) => v.label === midpoint.label)) {
    model.vertices.push({
      id: midpoint.label,
      label: midpoint.label,
      pos: midpoint3(vA.pos, vB.pos),
      kind: 'auxiliary',
      description: `Trung điểm ${vA.label}${vB.label}`,
    });
    model.midpoints.push({
      id: `mp-${midpoint.label}`,
      point: midpoint.label,
      from: vA.id,
      to: vB.id,
      basis: `Giả thiết ${midpoint.label} là trung điểm của ${vA.label}${vB.label}`,
    });
    model.equalMarks.push(
      { id: `eq-${vA.id}-${midpoint.label}`, from: vA.id, to: midpoint.label, ticks: 1, basis: `${midpoint.label} là trung điểm` },
      { id: `eq-${midpoint.label}-${vB.id}`, from: midpoint.label, to: vB.id, ticks: 1, basis: `${midpoint.label} là trung điểm` }
    );
  }
}
