import { AnalyzedProblem, GeometryModel } from '../types/geometry';
import { midpoint3, vec3 } from './math3d';

const SQRT2 = Math.SQRT2;
const SQRT3 = Math.sqrt(3);

function buildSkewDistancePyramidModel(): GeometryModel {
  // Square ABCD side a = 2, SA = a = 2, SA perp (ABCD).
  // BD perp (SAC) at O = midpoint(A,C) = (1,1,0).
  // Foot K of perpendicular from O to SC:
  // S = (0,0,2), C = (2,2,0), SC = (2,2,-2), |SC|^2 = 12.
  // O - S = (1,1,-2). t = ((O-S)·SC)/|SC|^2 = (2+2+4)/12 = 8/12 = 2/3.
  // K = S + (2/3)(C-S) = (4/3, 4/3, 2/3).
  // OK = (1/3, 1/3, 2/3), |OK| = sqrt(6)/3 = a*sqrt(6)/6 (for a=2 -> 2*sqrt(6)/6 = sqrt(6)/3).
  const A = vec3(0, 0, 0);
  const B = vec3(2, 0, 0);
  const C = vec3(2, 2, 0);
  const D = vec3(0, 2, 0);
  const S = vec3(0, 0, 2);
  const O = midpoint3(A, C);
  const K = vec3(4 / 3, 4 / 3, 2 / 3);

  return {
    solidType: 'pyramid',
    solidTypeLabel: 'Hình chóp S.ABCD (SA ⊥ đáy)',
    vertices: [
      { id: 'S', label: 'S', pos: S, kind: 'apex' },
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'D', label: 'D', pos: D, kind: 'base' },
      { id: 'O', label: 'O', pos: O, kind: 'auxiliary', description: 'Tâm hình vuông ABCD' },
      { id: 'K', label: 'K', pos: K, kind: 'auxiliary', description: 'Hình chiếu của O lên SC (đoạn vuông góc chung OK)' },
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
      { id: 'AC', from: 'A', to: 'C', kind: 'auxiliary' },
      { id: 'BD', from: 'B', to: 'D', kind: 'auxiliary' },
      { id: 'OK', from: 'O', to: 'K', kind: 'height', label: 'Đoạn vuông góc chung OK' },
    ],
    faces: [
      { id: 'ABCD', label: '(ABCD)', vertices: ['A', 'B', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'SAB', label: '(SAB)', vertices: ['S', 'A', 'B'], kind: 'solid_boundary' },
      { id: 'SBC', label: '(SBC)', vertices: ['S', 'B', 'C'], kind: 'solid_boundary' },
      { id: 'SCD', label: '(SCD)', vertices: ['S', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'SDA', label: '(SDA)', vertices: ['S', 'D', 'A'], kind: 'solid_boundary' },
      {
        id: 'SAC',
        label: '(SAC)',
        vertices: ['S', 'A', 'C'],
        kind: 'highlight_plane',
        defaultVisible: true,
        tint: 'rgba(13, 148, 136, 0.13)',
      },
    ],
    rightAngles: [
      { id: 'ra-SAB', vertex: 'A', armA: 'S', armB: 'B', basis: 'Giả thiết SA ⊥ (ABCD)' },
      { id: 'ra-OKC', vertex: 'K', armA: 'O', armB: 'C', basis: 'Dựng OK ⊥ SC tại K' },
      { id: 'ra-OKB', vertex: 'O', armA: 'K', armB: 'B', basis: 'BD ⊥ (SAC) ⇒ BD ⊥ OK' },
    ],
    equalMarks: [],
    midpoints: [{ id: 'mp-O', point: 'O', from: 'A', to: 'C', basis: 'Tâm hình vuông ABCD' }],
    defaultCamera: { yaw: -1.08, pitch: 0.32, zoom: 1.0 },
  };
}

function buildRegularTetrahedronModel(): GeometryModel {
  // Regular tetrahedron S.ABC of edge a = 2
  const A = vec3(0, 0, 0);
  const B = vec3(2, 0, 0);
  const C = vec3(1, SQRT3, 0);
  const G = vec3(1, SQRT3 / 3, 0);
  const h = 2 * Math.sqrt(2 / 3);
  const S = vec3(1, SQRT3 / 3, h);
  const M = midpoint3(B, C);

  return {
    solidType: 'tetrahedron',
    solidTypeLabel: 'Tứ diện đều',
    vertices: [
      { id: 'S', label: 'S', pos: S, kind: 'apex' },
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'G', label: 'G', pos: G, kind: 'auxiliary', description: 'Trọng tâm đáy ABC (chân đường cao SG)' },
      { id: 'M', label: 'M', pos: M, kind: 'auxiliary', description: 'Trung điểm BC' },
    ],
    edges: [
      { id: 'AB', from: 'A', to: 'B', kind: 'solid' },
      { id: 'BC', from: 'B', to: 'C', kind: 'solid' },
      { id: 'CA', from: 'C', to: 'A', kind: 'solid' },
      { id: 'SA', from: 'S', to: 'A', kind: 'solid' },
      { id: 'SB', from: 'S', to: 'B', kind: 'solid' },
      { id: 'SC', from: 'S', to: 'C', kind: 'solid' },
      { id: 'SG', from: 'S', to: 'G', kind: 'height', label: 'Đường cao SG' },
      { id: 'AM', from: 'A', to: 'M', kind: 'auxiliary' },
      { id: 'SM', from: 'S', to: 'M', kind: 'auxiliary' },
    ],
    faces: [
      { id: 'ABC', label: '(ABC)', vertices: ['A', 'B', 'C'], kind: 'solid_boundary' },
      { id: 'SAB', label: '(SAB)', vertices: ['S', 'A', 'B'], kind: 'solid_boundary' },
      { id: 'SBC', label: '(SBC)', vertices: ['S', 'B', 'C'], kind: 'solid_boundary' },
      { id: 'SCA', label: '(SCA)', vertices: ['S', 'C', 'A'], kind: 'solid_boundary' },
      {
        id: 'SGM',
        label: '△SGM',
        vertices: ['S', 'G', 'M'],
        kind: 'highlight_plane',
        defaultVisible: true,
        tint: 'rgba(29, 78, 216, 0.13)',
      },
    ],
    rightAngles: [
      { id: 'ra-SGM', vertex: 'G', armA: 'S', armB: 'M', basis: 'SG ⊥ (ABC)' },
      { id: 'ra-AMB', vertex: 'M', armA: 'A', armB: 'B', basis: '△ABC đều, M là trung điểm BC' },
    ],
    equalMarks: [
      { id: 'eq-BM', from: 'B', to: 'M', ticks: 1, basis: 'M là trung điểm BC' },
      { id: 'eq-MC', from: 'M', to: 'C', ticks: 1, basis: 'M là trung điểm BC' },
    ],
    midpoints: [{ id: 'mp-M', point: 'M', from: 'B', to: 'C', basis: 'M là trung điểm BC' }],
    defaultCamera: { yaw: 0.78, pitch: 0.34, zoom: 1.0 },
  };
}

function buildPerpFacePyramidModel(): GeometryModel {
  // Base rectangle ABCD: AB = a = 2, AD = a*sqrt(3) = 2*sqrt(3).
  // (SAB) is equilateral triangle of side a = 2 in plane perpendicular to (ABCD).
  // H = midpoint(A, B) = (1, 0, 0), SH = a*sqrt(3)/2 = sqrt(3), SH perp (ABCD).
  // K = midpoint(C, D) = (1, 2*sqrt(3), 0).
  const A = vec3(0, 0, 0);
  const B = vec3(2, 0, 0);
  const C = vec3(2, 2 * SQRT3, 0);
  const D = vec3(0, 2 * SQRT3, 0);
  const H = midpoint3(A, B);
  const S = vec3(1, 0, SQRT3);
  const K = midpoint3(C, D);

  return {
    solidType: 'pyramid',
    solidTypeLabel: 'Hình chóp có mặt bên vuông góc đáy',
    vertices: [
      { id: 'S', label: 'S', pos: S, kind: 'apex' },
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'D', label: 'D', pos: D, kind: 'base' },
      { id: 'H', label: 'H', pos: H, kind: 'auxiliary', description: 'Trung điểm AB (chân đường cao SH)' },
      { id: 'K', label: 'K', pos: K, kind: 'auxiliary', description: 'Trung điểm CD (HK ⊥ CD)' },
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
      { id: 'SH', from: 'S', to: 'H', kind: 'height', label: 'Đường cao SH' },
      { id: 'HK', from: 'H', to: 'K', kind: 'auxiliary' },
      { id: 'SK', from: 'S', to: 'K', kind: 'auxiliary' },
    ],
    faces: [
      { id: 'ABCD', label: '(ABCD)', vertices: ['A', 'B', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'SAB', label: '(SAB)', vertices: ['S', 'A', 'B'], kind: 'solid_boundary' },
      { id: 'SBC', label: '(SBC)', vertices: ['S', 'B', 'C'], kind: 'solid_boundary' },
      { id: 'SCD', label: '(SCD)', vertices: ['S', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'SDA', label: '(SDA)', vertices: ['S', 'D', 'A'], kind: 'solid_boundary' },
      {
        id: 'SHK',
        label: '△SHK',
        vertices: ['S', 'H', 'K'],
        kind: 'highlight_plane',
        defaultVisible: true,
        tint: 'rgba(13, 148, 136, 0.14)',
      },
    ],
    rightAngles: [
      { id: 'ra-SHK', vertex: 'H', armA: 'S', armB: 'K', basis: '(SAB) ⊥ (ABCD) và SH ⊥ AB ⇒ SH ⊥ (ABCD)' },
      { id: 'ra-HKC', vertex: 'K', armA: 'H', armB: 'C', basis: 'HK ∥ AD và AD ⊥ CD' },
    ],
    equalMarks: [
      { id: 'eq-AH', from: 'A', to: 'H', ticks: 1, basis: 'H là trung điểm AB' },
      { id: 'eq-HB', from: 'H', to: 'B', ticks: 1, basis: 'H là trung điểm AB' },
    ],
    midpoints: [
      { id: 'mp-H', point: 'H', from: 'A', to: 'B', basis: 'H là trung điểm AB' },
      { id: 'mp-K', point: 'K', from: 'C', to: 'D', basis: 'K là trung điểm CD' },
    ],
    defaultCamera: { yaw: 0.64, pitch: 0.34, zoom: 1.0 },
  };
}

function buildRightIsoscelesPrismModel(): GeometryModel {
  // Standing prism ABC.A'B'C', base right-isosceles at B: BA = BC = a = 2, AA' = a*sqrt(2) = 2*sqrt(2).
  // M = midpoint(A, C). BM perp AC and BM perp AA' => BM perp (ACC'A').
  const B = vec3(0, 0, 0);
  const A = vec3(2, 0, 0);
  const C = vec3(0, 2, 0);
  const h = 2 * SQRT2;
  const B1 = vec3(0, 0, h);
  const A1 = vec3(2, 0, h);
  const C1 = vec3(0, 2, h);
  const M = midpoint3(A, C);

  return {
    solidType: 'standing_prism',
    solidTypeLabel: 'Lăng trụ đứng đáy tam giác vuông cân',
    vertices: [
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'A1', label: "A'", pos: A1, kind: 'top' },
      { id: 'B1', label: "B'", pos: B1, kind: 'top' },
      { id: 'C1', label: "C'", pos: C1, kind: 'top' },
      { id: 'M', label: 'M', pos: M, kind: 'auxiliary', description: "Trung điểm AC (BM ⊥ (ACC'A'))" },
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
      { id: 'BM', from: 'B', to: 'M', kind: 'height', label: 'Đoạn khoảng cách BM' },
    ],
    faces: [
      { id: 'ABC', label: '(ABC)', vertices: ['A', 'B', 'C'], kind: 'solid_boundary' },
      { id: 'A1B1C1', label: "(A'B'C')", vertices: ['A1', 'B1', 'C1'], kind: 'solid_boundary' },
      { id: 'ABB1A1', label: "(ABB'A')", vertices: ['A', 'B', 'B1', 'A1'], kind: 'solid_boundary' },
      { id: 'BCC1B1', label: "(BCC'B')", vertices: ['B', 'C', 'C1', 'B1'], kind: 'solid_boundary' },
      { id: 'CAA1C1', label: "(CAA'C')", vertices: ['C', 'A', 'A1', 'C1'], kind: 'solid_boundary' },
      {
        id: 'hl-ACC1A1',
        label: "(ACC'A')",
        vertices: ['A', 'C', 'C1', 'A1'],
        kind: 'highlight_plane',
        defaultVisible: true,
        tint: 'rgba(29, 78, 216, 0.11)',
      },
    ],
    rightAngles: [
      { id: 'ra-ABC', vertex: 'B', armA: 'A', armB: 'C', basis: '△ABC vuông cân tại B' },
      { id: 'ra-BMA', vertex: 'M', armA: 'B', armB: 'A', basis: 'BM là trung tuyến tam giác cân BAC' },
      { id: 'ra-BB1A', vertex: 'B', armA: 'B1', armB: 'A', basis: 'Lăng trụ đứng' },
    ],
    equalMarks: [
      { id: 'eq-AM', from: 'A', to: 'M', ticks: 1, basis: 'M là trung điểm AC' },
      { id: 'eq-MC', from: 'M', to: 'C', ticks: 1, basis: 'M là trung điểm AC' },
    ],
    midpoints: [{ id: 'mp-M', point: 'M', from: 'A', to: 'C', basis: 'M là trung điểm AC' }],
    defaultCamera: { yaw: 0.76, pitch: 0.33, zoom: 1.0 },
  };
}

export const ADVANCED_PRESET_PROBLEMS: AnalyzedProblem[] = [
  {
    id: 'preset-skew-distance',
    title: 'Hình chóp S.ABCD (SA ⊥ đáy): tính khoảng cách giữa hai đường thẳng chéo nhau BD và SC',
    category: 'Hình chóp · Khoảng cách 2 đường chéo nhau',
    difficulty: 'nang_cao',
    topics: ['Khoảng cách', 'Vuông góc'],
    gradeLevel: 'Lớp 11',
    rawText:
      'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD) và SA = a. Tính khoảng cách giữa hai đường thẳng chéo nhau BD và SC.',
    structured: {
      solidType: 'pyramid',
      solidName: 'S.ABCD',
      solidTypeLabel: 'Hình chóp tứ giác (SA ⊥ đáy)',
      duKienDeBai: [
        'Đáy $ABCD$ là hình vuông cạnh $a$ ($a > 0$).',
        '$SA \\perp (ABCD)$ và $SA = a$.',
      ],
      ketQuaSuyRa: [
        '$BD \\perp (SAC)$ tại tâm $O = AC \\cap BD$ của đáy.',
        'Mọi đường thẳng qua $O$ và nằm trong $(SAC)$ đều vuông góc với $BD$.',
      ],
      yeuToPhu: [
        'Gọi $O = AC \\cap BD$. Trong mặt phẳng $(SAC)$, kẻ $OK \\perp SC$ tại $K \\in SC$.',
      ],
      thongSoBoTri: ['Chọn tỉ lệ dựng hình $a = 2$ để quan sát rõ đoạn vuông góc chung $OK$.'],
      yeuCau: ['Tính khoảng cách $d(BD, SC)$.'],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildSkewDistancePyramidModel(),
    hints: {
      phanTichDe:
        'Hai đường thẳng $BD$ và $SC$ chéo nhau nhưng có tính chất rất đẹp: $BD$ vuông góc với cả mặt phẳng $(SAC)$ chứa $SC$. Điều này cho phép dựng trực tiếp đoạn vuông góc chung của $BD$ và $SC$.',
      kienThucCanDung: [
        'Đoạn vuông góc chung của hai đường thẳng chéo nhau $d_1, d_2$ là đoạn $OK$ ($O \\in d_1, K \\in d_2$) thỏa $OK \\perp d_1$ và $OK \\perp d_2$.',
        'Định lý đường thẳng vuông góc mặt phẳng: $BD \\perp (SAC)$.',
        'Tam giác đồng dạng trong $\\triangle SAC$ vuông tại $A$.',
      ],
      huongGiai:
        'Chứng minh $BD \\perp (SAC)$ tại $O = AC \\cap BD$. Trong $(SAC)$, hạ $OK \\perp SC$ ($K \\in SC$), suy ra $OK$ chính là đoạn vuông góc chung của $BD$ và $SC$. Tính $OK$ bằng cặp tam giác đồng dạng $\\triangle CKO \\sim \\triangle CAS$.',
      progressiveLevels: [
        {
          level: 1,
          title: 'Gợi ý bước 1: Dựng đoạn vuông góc chung OK',
          content:
            'Vì $BD \\perp (SAC)$ tại $O$, nếu kẻ $OK \\perp SC$ trong $(SAC)$ thì $OK$ vừa nằm trong $(SAC)$ (nên $OK \\perp BD$) vừa vuông góc với $SC$. Vậy $d(BD, SC) = OK$.',
          highlight: {
            vertices: ['O', 'K', 'S', 'C', 'B', 'D'],
            edges: [
              ['O', 'K'],
              ['B', 'D'],
              ['S', 'C'],
            ],
            planeVertices: ['S', 'A', 'C'],
            showAux: true,
          },
        },
        {
          level: 2,
          title: 'Gợi ý bước 2: Tính OK bằng tam giác đồng dạng',
          content:
            'Trong $\\triangle SAC$ vuông tại $A$: tính $AC = a\\sqrt{2}$, $OC = \\dfrac{a\\sqrt{2}}{2}$, và $SC = \\sqrt{SA^2 + AC^2}$. Dùng $\\triangle CKO \\sim \\triangle CAS$ để suy ra $\\dfrac{OK}{SA} = \\dfrac{OC}{SC}$.',
          highlight: {
            vertices: ['S', 'A', 'C', 'O', 'K'],
            edges: [
              ['O', 'K'],
              ['S', 'A'],
              ['A', 'C'],
              ['S', 'C'],
            ],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: ['Hình chóp $S.ABCD$, đáy hình vuông cạnh $a$ ($a > 0$), $SA \\perp (ABCD)$, $SA = a$.'],
        ketLuan: ['Tính $d(BD, SC)$.'],
      },
      yTuongChinh:
        'Dựng trực tiếp đoạn vuông góc chung $OK$ nhờ tính chất $BD \\perp (SAC)$ tại $O$, sau đó tính $OK$ qua tam giác đồng dạng trong mặt phẳng $(SAC)$.',
      cacBuocGiai: [
        {
          id: 'sk-1',
          title: 'Bước 1: Chứng minh $BD \\perp (SAC)$ và dựng đoạn vuông góc chung $OK$',
          content:
            'Gọi $O = AC \\cap BD$. Vì $ABCD$ là hình vuông nên $BD \\perp AC$.\nMặt khác $SA \\perp (ABCD) \\Rightarrow SA \\perp BD$. Do $AC \\cap SA = A$ trong $(SAC)$ nên $BD \\perp (SAC)$ tại $O$.\nTrong $(SAC)$, kẻ $OK \\perp SC$ ($K \\in SC$). Vì $OK \\subset (SAC)$ và $BD \\perp (SAC)$ nên $OK \\perp BD$.\nVậy $OK$ là đoạn vuông góc chung của $BD$ và $SC$, suy ra $d(BD, SC) = OK$.',
          justification: 'Định nghĩa đoạn vuông góc chung của hai đường thẳng chéo nhau.',
          highlight: {
            vertices: ['S', 'A', 'C', 'B', 'D', 'O', 'K'],
            edges: [
              ['B', 'D'],
              ['S', 'C'],
              ['O', 'K'],
            ],
            planeVertices: ['S', 'A', 'C'],
            showAux: true,
          },
        },
        {
          id: 'sk-2',
          title: 'Bước 2: Tính độ dài $OK$',
          content:
            'Đáy hình vuông cạnh $a$ có $AC = a\\sqrt{2} \\Rightarrow OC = \\dfrac{a\\sqrt{2}}{2}$.\nTrong $\\triangle SAC$ vuông tại $A$: $SC = \\sqrt{SA^2 + AC^2} = \\sqrt{a^2 + 2a^2} = a\\sqrt{3}$.\nXét $\\triangle CKO$ và $\\triangle CAS$ có $\\widehat{CKO} = \\widehat{CAS} = 90^\\circ$ và góc $\\widehat{C}$ chung, nên $\\triangle CKO \\sim \\triangle CAS$ (g.g).\nSuy ra $\\dfrac{OK}{SA} = \\dfrac{OC}{SC} \\Rightarrow OK = \\dfrac{SA \\cdot OC}{SC} = \\dfrac{a \\cdot \\frac{a\\sqrt{2}}{2}}{a\\sqrt{3}} = \\dfrac{a\\sqrt{6}}{6}$.',
          justification: 'Tam giác đồng dạng và định lý Py-ta-go (với $a > 0$).',
          highlight: {
            vertices: ['O', 'K', 'C', 'S', 'A'],
            edges: [['O', 'K']],
            showAux: true,
          },
        },
      ],
      ketLuanCuoiCung: 'Vậy khoảng cách giữa hai đường thẳng chéo nhau $BD$ và $SC$ bằng $\\dfrac{a\\sqrt{6}}{6}$ (với $a > 0$).',
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng đoạn vuông góc chung OK và khoảng cách chéo nhau bằng tọa độ 3D.',
      checks: [
        { id: 'c1', label: 'Đoạn vuông góc chung OK', status: 'passed', detail: 'OK·BD = 0 và OK·SC = 0.' },
        { id: 'c2', label: 'Độ dài OK', status: 'passed', detail: 'OK = a√6/6 khớp với mô hình 3D.' },
      ],
      coordinateChecks: ['Khoảng cách tọa độ |OK| với a = 2 là 0.816497 = 2√6/6.'],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-regular-tetrahedron-dihedral',
    title: 'Tứ diện đều S.ABC cạnh a: tính góc giữa mặt bên (SBC) với đáy và thể tích',
    category: 'Tứ diện đều · Góc nhị diện & Thể tích',
    difficulty: 'trung_binh',
    topics: ['Góc', 'Thể tích'],
    gradeLevel: 'Lớp 12',
    rawText:
      'Cho tứ diện đều S.ABC có tất cả các cạnh bằng a. Tính côsin góc giữa hai mặt phẳng (SBC) và (ABC), và tính thể tích khối tứ diện đều S.ABC.',
    structured: {
      solidType: 'tetrahedron',
      solidName: 'S.ABC',
      solidTypeLabel: 'Tứ diện đều',
      duKienDeBai: ['Tứ diện đều $S.ABC$ có $SA = SB = SC = AB = BC = CA = a$ ($a > 0$).'],
      ketQuaSuyRa: [
        'Gọi $G$ là trọng tâm $\\triangle ABC$ đều, khi đó $SG \\perp (ABC)$.',
        'Gọi $M$ là trung điểm $BC$, khi đó $AM \\perp BC$ và $SM \\perp BC$.',
      ],
      yeuToPhu: ['Dựng trung điểm $M$ của $BC$, đường trung tuyến $AM, SM$ và đường cao $SG$.'],
      thongSoBoTri: ['Dựng tứ diện đều cạnh tỉ lệ $a = 2$, chiều cao $SG = \\dfrac{a\\sqrt{6}}{3}$.'],
      yeuCau: [
        'Tính $\\cos\\bigl((SBC), (ABC)\\bigr)$.',
        'Tính thể tích $V_{S.ABC}$.',
      ],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildRegularTetrahedronModel(),
    hints: {
      phanTichDe:
        'Tứ diện đều $S.ABC$ có mọi mặt là tam giác đều cạnh $a$. Cần xác định góc nhị diện tạo bởi $(SBC)$ và $(ABC)$ dọc theo giao tuyến $BC$, rồi tính thể tích khối tứ diện.',
      kienThucCanDung: [
        'Cách xác định góc giữa hai mặt phẳng cắt nhau theo giao tuyến $d$: tìm hai đường thẳng lần lượt thuộc hai mặt phẳng cùng vuông góc với $d$ tại một điểm.',
        'Trong tứ diện đều cạnh $a$, chân đường cao $G$ trùng với trọng tâm (tâm đường tròn ngoại tiếp) của đáy đều $ABC$.',
        'Tính chất trọng tâm tam giác đều: $GM = \\dfrac{1}{3}AM$.',
      ],
      huongGiai:
        'Gọi $M$ là trung điểm $BC$ và $G$ là trọng tâm $\\triangle ABC$. Chứng minh góc giữa $(SBC)$ và $(ABC)$ là $\\widehat{SMG}$. Dùng $\\cos\\widehat{SMG} = \\dfrac{GM}{SM}$ trong $\\triangle SGM$ vuông tại $G$, sau đó tính $SG$ bằng Py-ta-go để tính thể tích.',
      progressiveLevels: [
        {
          level: 1,
          title: 'Gợi ý bước 1: Xác định góc giữa hai mặt phẳng',
          content:
            'Giao tuyến của $(SBC)$ và $(ABC)$ là $BC$. Với $M$ là trung điểm $BC$, các tam giác đều $SBC, ABC$ cho ta $SM \\perp BC$ và $AM \\perp BC$. Suy ra góc giữa hai mặt phẳng là $\\widehat{SMA} = \\widehat{SMG}$.',
          highlight: {
            vertices: ['S', 'G', 'M', 'B', 'C'],
            edges: [
              ['S', 'M'],
              ['A', 'M'],
              ['S', 'G'],
            ],
            planeVertices: ['S', 'G', 'M'],
            showAux: true,
          },
        },
        {
          level: 2,
          title: 'Gợi ý bước 2: Tính tỉ số GM/SM và chiều cao SG',
          content:
            'Vì $\\triangle SBC$ và $\\triangle ABC$ cùng đều cạnh $a$ nên $SM = AM = \\dfrac{a\\sqrt{3}}{2}$, còn $GM = \\dfrac{1}{3}AM$. Từ đó tìm ngay $\\cos\\widehat{SMG}$ và tính $SG = \\sqrt{SM^2 - GM^2}$.',
          highlight: {
            vertices: ['S', 'G', 'M'],
            edges: [
              ['S', 'G'],
              ['S', 'M'],
            ],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: ['Tứ diện đều $S.ABC$ cạnh $a$ ($a > 0$).'],
        ketLuan: ['a) Tính $\\cos\\bigl((SBC), (ABC)\\bigr)$.', 'b) Tính $V_{S.ABC}$.'],
      },
      yTuongChinh:
        'Sử dụng trung điểm $M$ của giao tuyến $BC$ và trọng tâm $G$ của đáy để quy góc giữa hai mặt phẳng và chiều cao tứ diện đều về tam giác vuông $SGM$.',
      cacBuocGiai: [
        {
          id: 'rt-1',
          title: 'Bước 1: Xác định và tính côsin góc giữa $(SBC)$ và $(ABC)$',
          content:
            'Gọi $M$ là trung điểm của $BC$ và $G$ là trọng tâm $\\triangle ABC$. Vì $S.ABC$ là tứ diện đều nên $SG \\perp (ABC)$.\nTa có $(SBC) \\cap (ABC) = BC$. Do $\\triangle SBC$ và $\\triangle ABC$ đều nên $SM \\perp BC$ và $AM \\perp BC$.\nSuy ra góc giữa $(SBC)$ và $(ABC)$ là góc nhọn $\\widehat{SMG}$ của $\\triangle SGM$ vuông tại $G$.\nVì $SM = AM = \\dfrac{a\\sqrt{3}}{2}$ và $GM = \\dfrac{1}{3}AM = \\dfrac{a\\sqrt{3}}{6}$ nên:\n$\\cos\\widehat{SMG} = \\dfrac{GM}{SM} = \\dfrac{\\frac{1}{3}AM}{AM} = \\dfrac{1}{3}$.',
          justification: 'Định nghĩa góc giữa hai mặt phẳng và tính chất trọng tâm tam giác đều.',
          highlight: {
            vertices: ['S', 'G', 'M', 'A', 'B', 'C'],
            edges: [
              ['S', 'G'],
              ['S', 'M'],
              ['A', 'M'],
            ],
            planeVertices: ['S', 'G', 'M'],
            showAux: true,
          },
        },
        {
          id: 'rt-2',
          title: 'Bước 2: Tính chiều cao $SG$ và thể tích $V_{S.ABC}$',
          content:
            'Trong $\\triangle SGM$ vuông tại $G$:\n$SG = \\sqrt{SM^2 - GM^2} = \\sqrt{\\dfrac{3a^2}{4} - \\dfrac{a^2}{12}} = \\sqrt{\\dfrac{8a^2}{12}} = \\dfrac{a\\sqrt{6}}{3}$.\nDiện tích đáy đều $S_{ABC} = \\dfrac{a^2\\sqrt{3}}{4}$.\nThể tích tứ diện đều: $V_{S.ABC} = \\dfrac{1}{3} S_{ABC} \\cdot SG = \\dfrac{1}{3} \\cdot \\dfrac{a^2\\sqrt{3}}{4} \\cdot \\dfrac{a\\sqrt{6}}{3} = \\dfrac{a^3\\sqrt{2}}{12}$.',
          justification: 'Định lý Py-ta-go và công thức thể tích khối chóp.',
          highlight: {
            vertices: ['S', 'G'],
            edges: [['S', 'G']],
            planeVertices: ['A', 'B', 'C'],
            showAux: true,
          },
        },
      ],
      ketLuanCuoiCung:
        'Vậy $\\cos\\bigl((SBC), (ABC)\\bigr) = \\dfrac{1}{3}$ (góc khoảng $70^\\circ 32\'$) và $V_{S.ABC} = \\dfrac{a^3\\sqrt{2}}{12}$ (với $a > 0$).',
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng cos góc nhị diện và thể tích tứ diện đều bằng tọa độ 3D.',
      checks: [
        { id: 'c1', label: 'Độ dài 6 cạnh bằng nhau', status: 'passed', detail: 'Tất cả 6 cạnh đều bằng a.' },
        { id: 'c2', label: 'Góc giữa (SBC) và (ABC)', status: 'passed', detail: 'cos = 1/3 ≈ 0.333333.' },
        { id: 'c3', label: 'Thể tích tứ diện đều', status: 'passed', detail: 'V = a³√2/12 khớp tọa độ 3D.' },
      ],
      coordinateChecks: ['Thể tích tọa độ (a = 2): 0.942809 = 8√2/12.'],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-perp-face-pyramid',
    title: 'Hình chóp S.ABCD có mặt bên (SAB) vuông góc đáy: góc giữa (SCD) và đáy',
    category: 'Hình chóp · Mặt bên vuông góc đáy & Góc',
    difficulty: 'nang_cao',
    topics: ['Vuông góc', 'Góc', 'Thể tích'],
    gradeLevel: 'Lớp 12',
    rawText:
      'Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật với AB = a, AD = a√3. Mặt bên SAB là tam giác đều và nằm trong mặt phẳng vuông góc với mặt phẳng (ABCD). Tính góc giữa hai mặt phẳng (SCD) và (ABCD), và tính thể tích khối chóp S.ABCD.',
    structured: {
      solidType: 'pyramid',
      solidName: 'S.ABCD',
      solidTypeLabel: 'Hình chóp có mặt bên vuông góc đáy',
      duKienDeBai: [
        'Đáy $ABCD$ là hình chữ nhật có $AB = a$, $AD = a\\sqrt{3}$ ($a > 0$).',
        '$\\triangle SAB$ đều cạnh $a$ và $(SAB) \\perp (ABCD)$.',
      ],
      ketQuaSuyRa: [
        'Gọi $H$ là trung điểm $AB$. Vì $\\triangle SAB$ đều nên $SH \\perp AB$ và $SH = \\dfrac{a\\sqrt{3}}{2}$.',
        'Do $(SAB) \\perp (ABCD)$ theo giao tuyến $AB$ nên $SH \\perp (ABCD)$.',
      ],
      yeuToPhu: [
        'Gọi $H$ là trung điểm $AB$, $K$ là trung điểm $CD$; nối $SH, HK, SK$.',
      ],
      thongSoBoTri: ['Dựng đáy hình chữ nhật $2 \\times 2\\sqrt{3}$ và đường cao $SH = \\sqrt{3}$ tại trung điểm $H$ của $AB$.'],
      yeuCau: [
        'Tính góc giữa hai mặt phẳng $(SCD)$ và $(ABCD)$.',
        'Tính thể tích khối chóp $S.ABCD$.',
      ],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildPerpFacePyramidModel(),
    hints: {
      phanTichDe:
        'Đề bài không cho sẵn cạnh bên vuông góc đáy mà cho mặt bên $(SAB)$ vuông góc với đáy $(ABCD)$. Cần dùng định lý hai mặt phẳng vuông góc để xác định đường cao $SH$ trước.',
      kienThucCanDung: [
        'Định lý hai mặt phẳng vuông góc: nếu $(P) \\perp (Q)$ theo giao tuyến $d$, đường thẳng $a \\subset (P)$ và $a \\perp d$ thì $a \\perp (Q)$.',
        'Cách xác định góc giữa mặt bên $(SCD)$ và đáy $(ABCD)$ từ chân đường cao $H$: kẻ $HK \\perp CD$, khi đó góc cần tìm là $\\widehat{SKH}$.',
        'Công thức thể tích khối chóp $V = \\dfrac{1}{3} S_{ABCD} \\cdot SH$.',
      ],
      huongGiai:
        'Gọi $H$ là trung điểm $AB$ để chứng minh $SH \\perp (ABCD)$. Từ $H$ kẻ $HK \\perp CD$ ($K$ là trung điểm $CD$), suy ra $HK = AD = a\\sqrt{3}$ và góc giữa $(SCD)$ với $(ABCD)$ là $\\widehat{SKH}$. Xét $\\triangle SHK$ vuông tại $H$.',
      progressiveLevels: [
        {
          level: 1,
          title: 'Gợi ý bước 1: Tìm đường cao SH của hình chóp',
          content:
            'Trong tam giác đều $SAB$, gọi $H$ là trung điểm $AB$ thì $SH \\perp AB$. Vì $(SAB) \\perp (ABCD)$ và giao tuyến là $AB$ nên $SH \\perp (ABCD)$, với $SH = \\dfrac{a\\sqrt{3}}{2}$.',
          highlight: {
            vertices: ['S', 'A', 'B', 'H'],
            edges: [['S', 'H']],
            planeVertices: ['S', 'A', 'B'],
            showAux: true,
          },
        },
        {
          level: 2,
          title: 'Gợi ý bước 2: Kẻ HK ⊥ CD và xét △SHK vuông tại H',
          content:
            'Gọi $K$ là trung điểm $CD$. Vì $ABCD$ là hình chữ nhật nên $HK \\parallel AD \\Rightarrow HK \\perp CD$ và $HK = AD = a\\sqrt{3}$. Chứng minh $CD \\perp (SHK)$ để suy ra $CD \\perp SK$ và tính $\\tan\\widehat{SKH} = \\dfrac{SH}{HK}$.',
          highlight: {
            vertices: ['S', 'H', 'K', 'C', 'D'],
            edges: [
              ['S', 'H'],
              ['H', 'K'],
              ['S', 'K'],
            ],
            planeVertices: ['S', 'H', 'K'],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: [
          'Hình chóp $S.ABCD$, đáy hình chữ nhật $AB = a$, $AD = a\\sqrt{3}$ ($a > 0$).',
          '$\\triangle SAB$ đều, $(SAB) \\perp (ABCD)$.',
        ],
        ketLuan: ['a) Tính góc $\\bigl((SCD), (ABCD)\\bigr)$.', 'b) Tính $V_{S.ABCD}$.'],
      },
      yTuongChinh:
        'Dựng trung điểm $H$ của $AB$ để lấy đường cao $SH \\perp (ABCD)$, sau đó kẻ $HK \\perp CD$ tạo mặt phẳng $(SHK)$ vuông góc với giao tuyến $CD$.',
      cacBuocGiai: [
        {
          id: 'pf-1',
          title: 'Bước 1: Chứng minh $SH \\perp (ABCD)$ và tính $SH$',
          content:
            'Gọi $H$ là trung điểm của $AB$. Vì $\\triangle SAB$ đều cạnh $a$ nên $SH \\perp AB$ và $SH = \\dfrac{a\\sqrt{3}}{2}$.\nTa có $(SAB) \\perp (ABCD)$, $(SAB) \\cap (ABCD) = AB$, $SH \\subset (SAB)$ và $SH \\perp AB$.\nSuy ra $SH \\perp (ABCD)$.',
          justification: 'Định lý về hai mặt phẳng vuông góc.',
          highlight: {
            vertices: ['S', 'H', 'A', 'B'],
            edges: [['S', 'H']],
            showAux: true,
          },
        },
        {
          id: 'pf-2',
          title: 'Bước 2: Xác định và tính góc giữa $(SCD)$ và $(ABCD)$',
          content:
            'Gọi $K$ là trung điểm của $CD$. Do $ABCD$ là hình chữ nhật nên $HK \\parallel AD$, suy ra $HK \\perp CD$ và $HK = AD = a\\sqrt{3}$.\nVì $SH \\perp (ABCD)$ nên $SH \\perp CD$. Kết hợp $HK \\perp CD$ và $SH \\cap HK = H$ suy ra $CD \\perp (SHK)$, do đó $CD \\perp SK$.\nTa có $(SCD) \\cap (ABCD) = CD$, $SK \\perp CD$ và $HK \\perp CD$, nên góc giữa $(SCD)$ và $(ABCD)$ là $\\widehat{SKH}$.\nTrong $\\triangle SHK$ vuông tại $H$:\n$\\tan\\widehat{SKH} = \\dfrac{SH}{HK} = \\dfrac{\\frac{a\\sqrt{3}}{2}}{a\\sqrt{3}} = \\dfrac{1}{2} \\Rightarrow \\widehat{SKH} = \\arctan\\left(\\dfrac{1}{2}\\right) \\approx 26^\\circ 34\'$.',
          justification: 'Định nghĩa góc giữa hai mặt phẳng và tỉ số lượng giác trong tam giác vuông.',
          highlight: {
            vertices: ['S', 'H', 'K', 'C', 'D'],
            edges: [
              ['S', 'H'],
              ['H', 'K'],
              ['S', 'K'],
            ],
            planeVertices: ['S', 'H', 'K'],
            showAux: true,
          },
        },
        {
          id: 'pf-3',
          title: 'Bước 3: Tính thể tích khối chóp $S.ABCD$',
          content:
            'Diện tích đáy hình chữ nhật: $S_{ABCD} = AB \\cdot AD = a \\cdot a\\sqrt{3} = a^2\\sqrt{3}$.\nThể tích khối chóp: $V_{S.ABCD} = \\dfrac{1}{3} S_{ABCD} \\cdot SH = \\dfrac{1}{3} \\cdot a^2\\sqrt{3} \\cdot \\dfrac{a\\sqrt{3}}{2} = \\dfrac{a^3}{2}$.',
          justification: 'Công thức thể tích khối chóp (với $a > 0$).',
          highlight: {
            vertices: ['S', 'H', 'A', 'B', 'C', 'D'],
            edges: [['S', 'H']],
            planeVertices: ['A', 'B', 'C', 'D'],
            showAux: true,
          },
        },
      ],
      ketLuanCuoiCung:
        'Vậy góc giữa $(SCD)$ và $(ABCD)$ bằng $\\arctan\\left(\\dfrac{1}{2}\\right) \\approx 26^\\circ 34\'$, và thể tích khối chóp là $V_{S.ABCD} = \\dfrac{a^3}{2}$ (với $a > 0$).',
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng đường cao SH, góc nhị diện và thể tích bằng tọa độ 3D.',
      checks: [
        { id: 'c1', label: 'Đường cao SH ⊥ (ABCD)', status: 'passed', detail: 'SH vuông góc với cả AB và HK.' },
        { id: 'c2', label: 'Góc giữa (SCD) và (ABCD)', status: 'passed', detail: 'tan = 1/2 ⇒ góc ≈ 26.565°.' },
        { id: 'c3', label: 'Thể tích khối chóp', status: 'passed', detail: 'V = a³/2 khớp tuyệt đối.' },
      ],
      coordinateChecks: ['Thể tích tọa độ (a = 2): 4.000000 = 2³/2.'],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-right-isosceles-prism',
    title: "Lăng trụ đứng ABC.A'B'C' đáy vuông cân: tính khoảng cách từ B đến (ACC'A') và thể tích",
    category: 'Lăng trụ đứng · Khoảng cách & Thể tích',
    difficulty: 'trung_binh',
    topics: ['Khoảng cách', 'Vuông góc', 'Thể tích'],
    gradeLevel: 'Lớp 12',
    rawText:
      "Cho lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác vuông cân tại B, BA = BC = a, cạnh bên AA' = a√2. Tính khoảng cách từ điểm B đến mặt phẳng (ACC'A') và thể tích khối lăng trụ ABC.A'B'C'.",
    structured: {
      solidType: 'standing_prism',
      solidName: "ABC.A'B'C'",
      solidTypeLabel: 'Lăng trụ đứng đáy tam giác vuông cân',
      duKienDeBai: [
        "Lăng trụ đứng $ABC.A'B'C'$ có $AA' \\perp (ABC)$ và $AA' = a\\sqrt{2}$.",
        '$\\triangle ABC$ vuông cân tại $B$ với $BA = BC = a$ ($a > 0$).',
      ],
      ketQuaSuyRa: [
        'Cạnh huyền $AC = a\\sqrt{2}$ và diện tích đáy $S_{ABC} = \\dfrac{1}{2}a^2$.',
        "Mặt phẳng $(ACC'A')$ vuông góc với đáy $(ABC)$ vì chứa $AA' \\perp (ABC)$.",
      ],
      yeuToPhu: ['Gọi $M$ là trung điểm $AC$, kẻ đoạn $BM$ trong mặt phẳng đáy.'],
      thongSoBoTri: ['Dựng lăng trụ đứng với $BA = BC = 2$, $AA\' = 2\\sqrt{2}$.'],
      yeuCau: [
        "Tính khoảng cách $d\\bigl(B, (ACC'A')\\bigr)$.",
        "Tính thể tích khối lăng trụ $V_{ABC.A'B'C'}$.",
      ],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildRightIsoscelesPrismModel(),
    hints: {
      phanTichDe:
        "Trong lăng trụ đứng, mặt bên $(ACC'A')$ luôn vuông góc với mặt đáy $(ABC)$. Do đó để tìm khoảng cách từ $B \\in (ABC)$ đến $(ACC'A')$, chỉ cần hạ đường vuông góc từ $B$ xuống giao tuyến $AC$.",
      kienThucCanDung: [
        "Định lý đường thẳng vuông góc với mặt phẳng: chứng minh $BM \\perp AC$ và $BM \\perp AA'$.",
        'Trong tam giác vuông cân cạnh góc vuông $a$, đường cao ứng với cạnh huyền bằng $\\dfrac{a\\sqrt{2}}{2}$.',
        'Thể tích khối lăng trụ: $V = S_{\\text{đáy}} \\cdot h$ (lưu ý KHÔNG có hệ số $\\dfrac{1}{3}$).',
      ],
      huongGiai:
        "Gọi $M$ là trung điểm $AC$. Chứng minh $BM \\perp (ACC'A')$, từ đó suy ra khoảng cách bằng $BM$. Sau đó tính $S_{ABC}$ và nhân với chiều cao $AA'$ để có thể tích khối lăng trụ.",
      progressiveLevels: [
        {
          level: 1,
          title: "Gợi ý bước 1: Chứng minh BM ⊥ (ACC'A')",
          content:
            "Vì $\\triangle ABC$ vuông cân tại $B$ nên trung tuyến $BM$ cũng là đường cao ($BM \\perp AC$). Lại có $AA' \\perp (ABC)$ nên $AA' \\perp BM$. Từ hai điều này suy ra $BM \\perp (ACC'A')$.",
          highlight: {
            vertices: ['B', 'M', 'A', 'C', 'A1', 'C1'],
            edges: [
              ['B', 'M'],
              ['C', 'A'],
              ['A', 'A1'],
            ],
            planeVertices: ['A', 'C', 'C1', 'A1'],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: [
          "Lăng trụ đứng $ABC.A'B'C'$, $\\triangle ABC$ vuông cân tại $B$, $BA = BC = a$, $AA' = a\\sqrt{2}$ ($a > 0$).",
        ],
        ketLuan: ["a) Tính $d\\bigl(B, (ACC'A')\\bigr)$.", "b) Tính $V_{ABC.A'B'C'}$."],
      },
      yTuongChinh:
        "Dựng trung tuyến $BM$ của tam giác vuông cân đáy để lấy hình chiếu vuông góc của $B$ lên mặt bên $(ACC'A')$, sau đó áp dụng công thức thể tích lăng trụ đứng.",
      cacBuocGiai: [
        {
          id: 'rip-1',
          title: "Bước 1: Tính khoảng cách từ $B$ đến $(ACC'A')$",
          content:
            "Gọi $M$ là trung điểm của $AC$. Vì $\\triangle ABC$ vuông cân tại $B$ nên $BM \\perp AC$ và $BM = \\dfrac{AC}{2} = \\dfrac{a\\sqrt{2}}{2}$.\nDo $ABC.A'B'C'$ là lăng trụ đứng nên $AA' \\perp (ABC)$, mà $BM \\subset (ABC)$ suy ra $AA' \\perp BM$.\nTrong $(ACC'A')$, $AC$ và $AA'$ cắt nhau tại $A$, do đó $BM \\perp (ACC'A')$ tại $M$.\nVậy $d\\bigl(B, (ACC'A')\\bigr) = BM = \\dfrac{a\\sqrt{2}}{2}$.",
          justification: 'Định lý đường thẳng vuông góc với mặt phẳng và tính chất đường trung tuyến ứng với cạnh huyền.',
          highlight: {
            vertices: ['B', 'M', 'A', 'C', 'A1', 'C1'],
            edges: [['B', 'M']],
            planeVertices: ['A', 'C', 'C1', 'A1'],
            showAux: true,
          },
        },
        {
          id: 'rip-2',
          title: "Bước 2: Tính thể tích khối lăng trụ $ABC.A'B'C'$",
          content:
            "Diện tích tam giác đáy vuông cân tại $B$: $S_{ABC} = \\dfrac{1}{2} BA \\cdot BC = \\dfrac{a^2}{2}$.\nVì lăng trụ đứng có chiều cao $h = AA' = a\\sqrt{2}$ nên:\n$V_{ABC.A'B'C'} = S_{ABC} \\cdot AA' = \\dfrac{a^2}{2} \\cdot a\\sqrt{2} = \\dfrac{a^3\\sqrt{2}}{2}$.",
          justification: 'Công thức thể tích khối lăng trụ $V = S_{\\text{đáy}} \\cdot h$ (với $a > 0$).',
          highlight: {
            vertices: ['A', 'B', 'C', 'A1', 'B1', 'C1'],
            planeVertices: ['A', 'B', 'C'],
          },
        },
      ],
      ketLuanCuoiCung:
        "Vậy $d\\bigl(B, (ACC'A')\\bigr) = \\dfrac{a\\sqrt{2}}{2}$ và $V_{ABC.A'B'C'} = \\dfrac{a^3\\sqrt{2}}{2}$ (với $a > 0$).",
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng khoảng cách BM và thể tích lăng trụ đứng bằng tọa độ 3D.',
      checks: [
        { id: 'c1', label: "BM ⊥ (ACC'A')", status: 'passed', detail: "BM·AC = 0 và BM·AA' = 0." },
        { id: 'c2', label: 'Khoảng cách & Thể tích', status: 'passed', detail: 'd = a√2/2 và V = a³√2/2 chính xác.' },
      ],
      coordinateChecks: ['Khoảng cách tọa độ |BM| (a = 2): 1.414214 = √2; V = 5.656854 = 4√2.'],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },
];
