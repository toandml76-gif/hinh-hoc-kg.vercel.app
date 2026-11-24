import { AnalyzedProblem, GeometryModel } from '../types/geometry';
import { midpoint3, projectPointToPlane, vec3 } from './math3d';

const SQRT2 = Math.SQRT2;
const SQRT3 = Math.sqrt(3);

function buildPyramidSaPerpModel(): GeometryModel {
  const A = vec3(0, 0, 0);
  const B = vec3(2, 0, 0);
  const C = vec3(2, 2, 0);
  const D = vec3(0, 2, 0);
  const S = vec3(0, 0, 2 * SQRT2);
  const M = midpoint3(S, C);
  const O = midpoint3(A, C);
  const H = vec3(M.x, M.y, 0); // coincides with O since M is midpoint of SC and SA perp (ABCD)

  return {
    solidType: 'pyramid',
    solidTypeLabel: 'Hình chóp có cạnh bên vuông góc đáy',
    vertices: [
      { id: 'S', label: 'S', pos: S, kind: 'apex', description: 'Đỉnh hình chóp (SA ⊥ đáy)' },
      { id: 'A', label: 'A', pos: A, kind: 'base', description: 'Chân đường cao từ S' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'D', label: 'D', pos: D, kind: 'base' },
      { id: 'M', label: 'M', pos: M, kind: 'auxiliary', description: 'Trung điểm SC' },
      { id: 'O', label: 'O', pos: O, kind: 'auxiliary', description: 'Giao điểm AC và BD (hình chiếu của M lên đáy)' },
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
      { id: 'AC', from: 'A', to: 'C', kind: 'auxiliary', label: 'Đường chéo đáy AC' },
      { id: 'BD', from: 'B', to: 'D', kind: 'auxiliary', label: 'Đường chéo đáy BD' },
      { id: 'MO', from: 'M', to: 'O', kind: 'height', label: 'Đoạn vuông góc MO' },
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
        tint: 'rgba(29, 78, 216, 0.11)',
      },
    ],
    rightAngles: [
      { id: 'ra-SAB', vertex: 'A', armA: 'S', armB: 'B', basis: 'Giả thiết SA ⊥ (ABCD)' },
      { id: 'ra-SAD', vertex: 'A', armA: 'S', armB: 'D', basis: 'Giả thiết SA ⊥ (ABCD)' },
      { id: 'ra-AOD', vertex: 'O', armA: 'A', armB: 'D', basis: 'Hai đường chéo hình vuông ABCD vuông góc' },
      { id: 'ra-MOC', vertex: 'O', armA: 'M', armB: 'C', basis: 'Suy ra MO ∥ SA và SA ⊥ (ABCD)' },
    ],
    equalMarks: [
      { id: 'eq-SM', from: 'S', to: 'M', ticks: 1, basis: 'M là trung điểm SC' },
      { id: 'eq-MC', from: 'M', to: 'C', ticks: 1, basis: 'M là trung điểm SC' },
    ],
    midpoints: [
      { id: 'mp-M', point: 'M', from: 'S', to: 'C', basis: 'Giả thiết M là trung điểm của SC' },
      { id: 'mp-O', point: 'O', from: 'A', to: 'C', basis: 'Tâm hình vuông ABCD' },
    ],
    defaultCamera: { yaw: -1.08, pitch: 0.32, zoom: 1.0 },
    unitScaleNote: 'Đơn vị dựng hình: 1 đơn vị tọa độ = a/2 (a = 2)',
  };
}

function buildRegularPyramidModel(): GeometryModel {
  // Base side a = 2, lateral edge = a*sqrt(2) = 2*sqrt(2).
  // Half-diagonal OA = a*sqrt(2)/2 = sqrt(2). Height SO = sqrt(SA^2 - OA^2) = sqrt(8 - 2) = sqrt(6).
  const A = vec3(-1, -1, 0);
  const B = vec3(1, -1, 0);
  const C = vec3(1, 1, 0);
  const D = vec3(-1, 1, 0);
  const O = vec3(0, 0, 0);
  const S = vec3(0, 0, Math.sqrt(6));

  return {
    solidType: 'regular_pyramid',
    solidTypeLabel: 'Hình chóp tứ giác đều',
    vertices: [
      { id: 'S', label: 'S', pos: S, kind: 'apex', description: 'Đỉnh hình chóp đều' },
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'D', label: 'D', pos: D, kind: 'base' },
      { id: 'O', label: 'O', pos: O, kind: 'auxiliary', description: 'Tâm đáy ABCD (chân đường cao SO)' },
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
      { id: 'SO', from: 'S', to: 'O', kind: 'height', label: 'Đường cao SO' },
    ],
    faces: [
      { id: 'ABCD', label: '(ABCD)', vertices: ['A', 'B', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'SAB', label: '(SAB)', vertices: ['S', 'A', 'B'], kind: 'solid_boundary' },
      { id: 'SBC', label: '(SBC)', vertices: ['S', 'B', 'C'], kind: 'solid_boundary' },
      { id: 'SCD', label: '(SCD)', vertices: ['S', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'SDA', label: '(SDA)', vertices: ['S', 'D', 'A'], kind: 'solid_boundary' },
      {
        id: 'SOA',
        label: '△SOA',
        vertices: ['S', 'O', 'A'],
        kind: 'highlight_plane',
        defaultVisible: true,
        tint: 'rgba(13, 148, 136, 0.13)',
      },
    ],
    rightAngles: [
      { id: 'ra-SOA', vertex: 'O', armA: 'S', armB: 'A', basis: 'Tính chất hình chóp đều: SO ⊥ (ABCD)' },
    ],
    equalMarks: [],
    midpoints: [
      { id: 'mp-O', point: 'O', from: 'A', to: 'C', basis: 'Tâm hình vuông ABCD' },
    ],
    defaultCamera: { yaw: 0.72, pitch: 0.34, zoom: 1.0 },
  };
}

function buildOrthoTetrahedronModel(): GeometryModel {
  // OA = 2, OB = 2, OC = 2*sqrt(2) (scale a = 2)
  const O = vec3(0, 0, 0);
  const A = vec3(2, 0, 0);
  const B = vec3(0, 2, 0);
  const C = vec3(0, 0, 2 * SQRT2);
  const H = projectPointToPlane(O, A, B, C);
  // Foot of perpendicular from O to BC in plane (OBC): since OB=2, OC=2sqrt2
  // Let K be projection of O on BC: K = B + t(C-B), t = (O-B).(C-B)/|C-B|^2 = 4/(4+8)=1/3
  const K = vec3(0, 2 - 2 / 3, (2 * SQRT2) / 3);

  return {
    solidType: 'tetrahedron',
    solidTypeLabel: 'Tứ diện vuông tại O',
    vertices: [
      { id: 'O', label: 'O', pos: O, kind: 'base', description: 'Góc tam diện vuông (OA, OB, OC đôi một vuông góc)' },
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'apex' },
      { id: 'H', label: 'H', pos: H, kind: 'auxiliary', description: 'Hình chiếu vuông góc của O trên (ABC)' },
      { id: 'K', label: 'K', pos: K, kind: 'auxiliary', description: 'Hình chiếu của O lên BC (dựng phụ)' },
    ],
    edges: [
      { id: 'OA', from: 'O', to: 'A', kind: 'solid' },
      { id: 'OB', from: 'O', to: 'B', kind: 'solid' },
      { id: 'OC', from: 'O', to: 'C', kind: 'solid' },
      { id: 'AB', from: 'A', to: 'B', kind: 'solid' },
      { id: 'BC', from: 'B', to: 'C', kind: 'solid' },
      { id: 'CA', from: 'C', to: 'A', kind: 'solid' },
      { id: 'OH', from: 'O', to: 'H', kind: 'height', label: 'Đường cao OH' },
      { id: 'OK', from: 'O', to: 'K', kind: 'auxiliary' },
      { id: 'AK', from: 'A', to: 'K', kind: 'auxiliary' },
    ],
    faces: [
      { id: 'OAB', label: '(OAB)', vertices: ['O', 'A', 'B'], kind: 'solid_boundary' },
      { id: 'OBC', label: '(OBC)', vertices: ['O', 'B', 'C'], kind: 'solid_boundary' },
      { id: 'OCA', label: '(OCA)', vertices: ['O', 'C', 'A'], kind: 'solid_boundary' },
      { id: 'ABC', label: '(ABC)', vertices: ['A', 'B', 'C'], kind: 'solid_boundary' },
      {
        id: 'OAK',
        label: '(OAH)',
        vertices: ['O', 'A', 'K'],
        kind: 'highlight_plane',
        defaultVisible: true,
        tint: 'rgba(29, 78, 216, 0.12)',
      },
    ],
    rightAngles: [
      { id: 'ra-AOB', vertex: 'O', armA: 'A', armB: 'B', basis: 'Giả thiết OA ⊥ OB' },
      { id: 'ra-BOC', vertex: 'O', armA: 'B', armB: 'C', basis: 'Giả thiết OB ⊥ OC' },
      { id: 'ra-COA', vertex: 'O', armA: 'C', armB: 'A', basis: 'Giả thiết OC ⊥ OA' },
      { id: 'ra-OHA', vertex: 'H', armA: 'O', armB: 'A', basis: 'Giả thiết OH ⊥ (ABC)' },
    ],
    equalMarks: [],
    midpoints: [],
    defaultCamera: { yaw: 0.76, pitch: 0.35, zoom: 1.0 },
  };
}

function buildStandingPrismModel(): GeometryModel {
  // Equilateral triangle ABC side a = 2, height AA' = a*sqrt(3) = 2*sqrt(3)
  const A = vec3(0, 0, 0);
  const B = vec3(2, 0, 0);
  const C = vec3(1, SQRT3, 0);
  const h = 2 * SQRT3;
  const Ap = vec3(0, 0, h);
  const Bp = vec3(2, 0, h);
  const Cp = vec3(1, SQRT3, h);
  const M = midpoint3(B, C);

  return {
    solidType: 'regular_prism',
    solidTypeLabel: 'Lăng trụ đứng tam giác đều',
    vertices: [
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'A1', label: "A'", pos: Ap, kind: 'top' },
      { id: 'B1', label: "B'", pos: Bp, kind: 'top' },
      { id: 'C1', label: "C'", pos: Cp, kind: 'top' },
      { id: 'M', label: 'M', pos: M, kind: 'auxiliary', description: 'Trung điểm BC' },
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
      { id: 'AM', from: 'A', to: 'M', kind: 'auxiliary' },
      { id: 'A1M', from: 'A1', to: 'M', kind: 'height' },
    ],
    faces: [
      { id: 'ABC', label: '(ABC)', vertices: ['A', 'B', 'C'], kind: 'solid_boundary' },
      { id: 'A1B1C1', label: "(A'B'C')", vertices: ['A1', 'B1', 'C1'], kind: 'solid_boundary' },
      { id: 'ABB1A1', label: "(ABB'A')", vertices: ['A', 'B', 'B1', 'A1'], kind: 'solid_boundary' },
      { id: 'BCC1B1', label: "(BCC'B')", vertices: ['B', 'C', 'C1', 'B1'], kind: 'solid_boundary' },
      { id: 'CAA1C1', label: "(CAA'C')", vertices: ['C', 'A', 'A1', 'C1'], kind: 'solid_boundary' },
      {
        id: 'A1AM',
        label: "△A'AM",
        vertices: ['A1', 'A', 'M'],
        kind: 'highlight_plane',
        defaultVisible: true,
        tint: 'rgba(13, 148, 136, 0.14)',
      },
    ],
    rightAngles: [
      { id: 'ra-AMB', vertex: 'M', armA: 'A', armB: 'B', basis: 'Đường trung tuyến tam giác đều ABC vuông góc BC' },
      { id: 'ra-A1AM', vertex: 'A', armA: 'A1', armB: 'M', basis: "Lăng trụ đứng có AA' ⊥ (ABC)" },
    ],
    equalMarks: [
      { id: 'eq-BM', from: 'B', to: 'M', ticks: 1, basis: 'M là trung điểm BC' },
      { id: 'eq-MC', from: 'M', to: 'C', ticks: 1, basis: 'M là trung điểm BC' },
    ],
    midpoints: [
      { id: 'mp-M', point: 'M', from: 'B', to: 'C', basis: 'Giả thiết M là trung điểm BC' },
    ],
    defaultCamera: { yaw: -0.78, pitch: 0.34, zoom: 1.0 },
  };
}

function buildCubeSectionModel(): GeometryModel {
  const s = 2;
  const A = vec3(0, 0, 0);
  const B = vec3(s, 0, 0);
  const C = vec3(s, s, 0);
  const D = vec3(0, s, 0);
  const A1 = vec3(0, 0, s);
  const B1 = vec3(s, 0, s);
  const C1 = vec3(s, s, s);
  const D1 = vec3(0, s, s);
  const M = midpoint3(A, B);
  const N = midpoint3(A, D);

  return {
    solidType: 'cube',
    solidTypeLabel: 'Hình lập phương',
    vertices: [
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'D', label: 'D', pos: D, kind: 'base' },
      { id: 'A1', label: "A'", pos: A1, kind: 'top' },
      { id: 'B1', label: "B'", pos: B1, kind: 'top' },
      { id: 'C1', label: "C'", pos: C1, kind: 'top' },
      { id: 'D1', label: "D'", pos: D1, kind: 'top' },
      { id: 'M', label: 'M', pos: M, kind: 'auxiliary', description: 'Trung điểm AB' },
      { id: 'N', label: 'N', pos: N, kind: 'auxiliary', description: 'Trung điểm AD' },
    ],
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
      { id: 'MN', from: 'M', to: 'N', kind: 'section', label: 'Cạnh thiết diện MN' },
      { id: 'A1M', from: 'A1', to: 'M', kind: 'section', label: "Cạnh thiết diện A'M" },
      { id: 'A1N', from: 'A1', to: 'N', kind: 'section', label: "Cạnh thiết diện A'N" },
      { id: 'BD', from: 'B', to: 'D', kind: 'auxiliary', label: 'Đường chéo BD' },
    ],
    faces: [
      { id: 'ABCD', label: '(ABCD)', vertices: ['A', 'B', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'A1B1C1D1', label: "(A'B'C'D')", vertices: ['A1', 'B1', 'C1', 'D1'], kind: 'solid_boundary' },
      { id: 'ABB1A1', label: "(ABB'A')", vertices: ['A', 'B', 'B1', 'A1'], kind: 'solid_boundary' },
      { id: 'BCC1B1', label: "(BCC'B')", vertices: ['B', 'C', 'C1', 'B1'], kind: 'solid_boundary' },
      { id: 'CDD1C1', label: "(CDD'C')", vertices: ['C', 'D', 'D1', 'C1'], kind: 'solid_boundary' },
      { id: 'DAA1D1', label: "(DAA'D')", vertices: ['D', 'A', 'A1', 'D1'], kind: 'solid_boundary' },
      {
        id: 'sec-A1MN',
        label: "Thiết diện △A'MN",
        vertices: ['A1', 'M', 'N'],
        kind: 'cross_section',
        defaultVisible: true,
        tint: 'rgba(13, 148, 136, 0.22)',
      },
    ],
    rightAngles: [
      { id: 'ra-A1AB', vertex: 'A', armA: 'A1', armB: 'B', basis: 'Tính chất hình lập phương' },
      { id: 'ra-BAD', vertex: 'A', armA: 'B', armB: 'D', basis: 'Đáy ABCD là hình vuông' },
    ],
    equalMarks: [
      { id: 'eq-AM', from: 'A', to: 'M', ticks: 1, basis: 'M là trung điểm AB' },
      { id: 'eq-MB', from: 'M', to: 'B', ticks: 1, basis: 'M là trung điểm AB' },
      { id: 'eq-AN', from: 'A', to: 'N', ticks: 1, basis: 'N là trung điểm AD' },
      { id: 'eq-ND', from: 'N', to: 'D', ticks: 1, basis: 'N là trung điểm AD' },
    ],
    midpoints: [
      { id: 'mp-M', point: 'M', from: 'A', to: 'B', basis: 'Giả thiết M là trung điểm AB' },
      { id: 'mp-N', point: 'N', from: 'A', to: 'D', basis: 'Giả thiết N là trung điểm AD' },
    ],
    defaultCamera: { yaw: 0.68, pitch: 0.36, zoom: 1.0 },
  };
}

function buildRectBoxModel(): GeometryModel {
  const A = vec3(0, 0, 0);
  const B = vec3(2, 0, 0);
  const C = vec3(2, 2 * SQRT3, 0);
  const D = vec3(0, 2 * SQRT3, 0);
  const A1 = vec3(0, 0, 2);
  const B1 = vec3(2, 0, 2);
  const C1 = vec3(2, 2 * SQRT3, 2);
  const D1 = vec3(0, 2 * SQRT3, 2);

  return {
    solidType: 'rectangular_box',
    solidTypeLabel: 'Hình hộp chữ nhật',
    vertices: [
      { id: 'A', label: 'A', pos: A, kind: 'base' },
      { id: 'B', label: 'B', pos: B, kind: 'base' },
      { id: 'C', label: 'C', pos: C, kind: 'base' },
      { id: 'D', label: 'D', pos: D, kind: 'base' },
      { id: 'A1', label: "A'", pos: A1, kind: 'top' },
      { id: 'B1', label: "B'", pos: B1, kind: 'top' },
      { id: 'C1', label: "C'", pos: C1, kind: 'top' },
      { id: 'D1', label: "D'", pos: D1, kind: 'top' },
    ],
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
      { id: 'AC', from: 'A', to: 'C', kind: 'auxiliary' },
      { id: 'AC1', from: 'A', to: 'C1', kind: 'height', label: "Đường chéo AC'" },
    ],
    faces: [
      { id: 'ABCD', label: '(ABCD)', vertices: ['A', 'B', 'C', 'D'], kind: 'solid_boundary' },
      { id: 'A1B1C1D1', label: "(A'B'C'D')", vertices: ['A1', 'B1', 'C1', 'D1'], kind: 'solid_boundary' },
      { id: 'ABB1A1', label: "(ABB'A')", vertices: ['A', 'B', 'B1', 'A1'], kind: 'solid_boundary' },
      { id: 'BCC1B1', label: "(BCC'B')", vertices: ['B', 'C', 'C1', 'B1'], kind: 'solid_boundary' },
      { id: 'CDD1C1', label: "(CDD'C')", vertices: ['C', 'D', 'D1', 'C1'], kind: 'solid_boundary' },
      { id: 'DAA1D1', label: "(DAA'D')", vertices: ['D', 'A', 'A1', 'D1'], kind: 'solid_boundary' },
      {
        id: 'ACC1',
        label: "△ACC'",
        vertices: ['A', 'C', 'C1'],
        kind: 'highlight_plane',
        defaultVisible: true,
        tint: 'rgba(29, 78, 216, 0.12)',
      },
    ],
    rightAngles: [
      { id: 'ra-ABC', vertex: 'B', armA: 'A', armB: 'C', basis: 'Đáy ABCD là hình chữ nhật' },
      { id: 'ra-ACC1', vertex: 'C', armA: 'A', armB: 'C1', basis: "Cạnh bên CC' ⊥ (ABCD)" },
    ],
    equalMarks: [],
    midpoints: [],
    defaultCamera: { yaw: 0.65, pitch: 0.34, zoom: 1.0 },
  };
}

function buildAmbiguousSquareBasePyramidModel(): GeometryModel {
  // IMPORTANT: Intentionally oblique apex S (NOT over center (1,1,0) and NOT over A (0,0,0)!)
  // to avoid misleadingly turning an unconstrained pyramid into a regular pyramid or right-edge pyramid.
  const A = vec3(0, 0, 0);
  const B = vec3(2, 0, 0);
  const C = vec3(2, 2, 0);
  const D = vec3(0, 2, 0);
  const S = vec3(0.45, 0.72, 2.35);

  return {
    solidType: 'pyramid',
    solidTypeLabel: 'Hình chóp đáy hình vuông (đỉnh S tổng quát)',
    vertices: [
      { id: 'S', label: 'S', pos: S, kind: 'apex', description: 'Đỉnh chọn đại diện tổng quát (không nằm trên trục tâm đáy)' },
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
    rightAngles: [
      { id: 'ra-ABC', vertex: 'B', armA: 'A', armB: 'C', basis: 'Giả thiết đáy ABCD là hình vuông' },
    ],
    equalMarks: [],
    midpoints: [],
    defaultCamera: { yaw: -1.08, pitch: 0.34, zoom: 1.0 },
  };
}

export const PRESET_PROBLEMS: AnalyzedProblem[] = [
  {
    id: 'preset-pyramid-sa-perp',
    title: 'Hình chóp S.ABCD có SA ⊥ (ABCD), chứng minh vuông góc & tính khoảng cách',
    category: 'Hình chóp · Chứng minh & Khoảng cách',
    difficulty: 'co_ban',
    topics: ['Vuông góc', 'Khoảng cách'],
    gradeLevel: 'Lớp 11',
    rawText:
      'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD), SA = a√2. Gọi M là trung điểm của SC. Chứng minh BD vuông góc với mặt phẳng (SAC) và tính khoảng cách từ M đến mặt phẳng (ABCD).',
    structured: {
      solidType: 'pyramid',
      solidName: 'S.ABCD',
      solidTypeLabel: 'Hình chóp tứ giác (SA ⊥ đáy)',
      duKienDeBai: [
        'Đáy $ABCD$ là hình vuông cạnh $a$ ($a > 0$).',
        '$SA \\perp (ABCD)$ và $SA = a\\sqrt{2}$.',
        '$M$ là trung điểm của đoạn $SC$.',
      ],
      ketQuaSuyRa: [
        '$BD \\perp AC$ (hai đường chéo của hình vuông $ABCD$).',
        '$SA \\perp BD$ vì $SA \\perp (ABCD)$ và $BD \\subset (ABCD)$.',
        'Đoạn $MO$ là đường trung bình của $\\triangle SAC$, suy ra $MO \\parallel SA$ và $MO = \\dfrac{1}{2}SA$.',
      ],
      yeuToPhu: [
        'Gọi $O = AC \\cap BD$ là tâm hình vuông $ABCD$ (đồng thời là trung điểm $AC$).',
        'Kẻ đoạn $MO$ trong mặt phẳng $(SAC)$ để xác định khoảng cách từ $M$ đến $(ABCD)$.',
      ],
      thongSoBoTri: [
        'Chọn đơn vị dựng hình tỉ lệ $a = 2$ để quan sát rõ đáy hình vuông và chiều cao $SA = a\\sqrt{2}$.',
      ],
      yeuCau: [
        'Chứng minh $BD \\perp (SAC)$.',
        'Tính khoảng cách $d\\bigl(M, (ABCD)\\bigr)$.',
      ],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildPyramidSaPerpModel(),
    hints: {
      phanTichDe:
        'Bài toán cho hình chóp $S.ABCD$ có đáy là hình vuông cạnh $a$ và đường cao $SA = a\\sqrt{2}$. Cần giải quyết hai ý: chứng minh đường thẳng $BD$ vuông góc với mặt phẳng $(SAC)$ và tìm khoảng cách từ trung điểm $M$ của $SC$ đến mặt phẳng đáy $(ABCD)$.',
      kienThucCanDung: [
        'Định lý điều kiện để đường thẳng vuông góc với mặt phẳng: $d \\perp a$, $d \\perp b$ với $a, b \\subset (P)$ và $a \\cap b \\neq \\varnothing \\Rightarrow d \\perp (P)$.',
        'Tính chất đường chéo hình vuông: $AC \\perp BD$ tại trung điểm $O$ của mỗi đường.',
        'Định lý về quan hệ song song – vuông góc: nếu $a \\parallel b$ và $a \\perp (P)$ thì $b \\perp (P)$.',
        'Định lý đường trung bình trong tam giác.',
      ],
      huongGiai:
        'Ý 1: Tìm hai đường thẳng cắt nhau nằm trong $(SAC)$ cùng vuông góc với $BD$ (gợi ý chú ý cạnh bên $SA$ và đường chéo đáy $AC$). Ý 2: Gọi $O$ là tâm hình vuông $ABCD$, xét đường trung bình của $\\triangle SAC$ để xác định hình chiếu vuông góc của $M$ xuống mặt phẳng $(ABCD)$.',
      progressiveLevels: [
        {
          level: 1,
          title: 'Gợi ý bước 1: Hai đường thẳng trong (SAC) vuông góc với BD',
          content:
            'Trong $(SAC)$ có $AC$ (đường chéo hình vuông $ABCD$) và $SA$ (vuông góc với toàn bộ mặt đáy). Hãy kiểm tra vì sao $BD$ vuông góc với cả $AC$ và $SA$, rồi nêu rõ $AC$ và $SA$ cắt nhau tại $A$.',
          highlight: {
            vertices: ['S', 'A', 'B', 'C', 'D'],
            edges: [
              ['B', 'D'],
              ['A', 'C'],
              ['S', 'A'],
            ],
            planeVertices: ['S', 'A', 'C'],
            planeLabel: '(SAC)',
            showAux: true,
          },
        },
        {
          level: 2,
          title: 'Gợi ý bước 2: Dựng hình chiếu của M lên (ABCD)',
          content:
            'Gọi $O = AC \\cap BD$. Vì $O$ là trung điểm $AC$ và $M$ là trung điểm $SC$, hãy xét vị trí tương đối giữa $MO$ và $SA$ trong $\\triangle SAC$. Từ đó suy ra góc giữa $MO$ và mặt phẳng $(ABCD)$.',
          highlight: {
            vertices: ['S', 'A', 'C', 'M', 'O'],
            edges: [
              ['M', 'O'],
              ['S', 'A'],
              ['S', 'C'],
            ],
            planeVertices: ['S', 'A', 'C'],
            showAux: true,
          },
        },
        {
          level: 3,
          title: 'Gợi ý bước 3: Liên hệ độ dài đoạn vuông góc với SA',
          content:
            'Sau khi chứng minh được $MO \\perp (ABCD)$ tại $O$, khoảng cách $d\\bigl(M,(ABCD)\\bigr)$ chính là độ dài đoạn $MO$. Áp dụng tính chất đường trung bình của $\\triangle SAC$ để tính $MO$ theo $SA$.',
          highlight: {
            vertices: ['M', 'O', 'S', 'A'],
            edges: [['M', 'O']],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: [
          'Hình chóp $S.ABCD$, đáy $ABCD$ là hình vuông cạnh $a$ ($a > 0$).',
          '$SA \\perp (ABCD)$, $SA = a\\sqrt{2}$.',
          '$M$ là trung điểm của $SC$.',
        ],
        ketLuan: [
          'a) Chứng minh $BD \\perp (SAC)$.',
          'b) Tính $d\\bigl(M, (ABCD)\\bigr)$.',
        ],
      },
      yTuongChinh:
        'Sử dụng tiêu chuẩn đường thẳng vuông góc với hai đường thẳng cắt nhau trong mặt phẳng để chứng minh $BD \\perp (SAC)$; sau đó dùng đường trung bình $MO$ của $\\triangle SAC$ để dựng hình chiếu vuông góc của $M$ trên $(ABCD)$.',
      cacBuocGiai: [
        {
          id: 'step-1',
          title: 'Bước 1: Chứng minh $BD \\perp (SAC)$',
          content:
            'Vì $ABCD$ là hình vuông nên hai đường chéo vuông góc với nhau: $BD \\perp AC$.\nMặt khác, theo giả thiết $SA \\perp (ABCD)$ và $BD \\subset (ABCD)$ nên $SA \\perp BD$.\nTa có $AC \\subset (SAC)$, $SA \\subset (SAC)$ và $AC \\cap SA = A$.\nSuy ra $BD \\perp (SAC)$ (điều phải chứng minh).',
          justification: 'Áp dụng định lý điều kiện đường thẳng vuông góc với mặt phẳng (SGK Hình học 11).',
          highlight: {
            vertices: ['S', 'A', 'B', 'C', 'D'],
            edges: [
              ['B', 'D'],
              ['A', 'C'],
              ['S', 'A'],
            ],
            planeVertices: ['S', 'A', 'C'],
            planeLabel: '(SAC)',
            showAux: true,
          },
        },
        {
          id: 'step-2',
          title: 'Bước 2: Xác định hình chiếu vuông góc của $M$ lên $(ABCD)$',
          content:
            'Gọi $O = AC \\cap BD$. Vì $ABCD$ là hình vuông nên $O$ là trung điểm của $AC$.\nXét $\\triangle SAC$, ta có $M$ là trung điểm của $SC$ (giả thiết) và $O$ là trung điểm của $AC$, nên $MO$ là đường trung bình của $\\triangle SAC$.\nDo đó $MO \\parallel SA$ và $MO = \\dfrac{1}{2}SA$.',
          justification: 'Tính chất giao điểm hai đường chéo hình vuông và định lý đường trung bình tam giác.',
          highlight: {
            vertices: ['S', 'A', 'C', 'M', 'O'],
            edges: [
              ['M', 'O'],
              ['S', 'A'],
              ['S', 'C'],
              ['A', 'C'],
            ],
            planeVertices: ['S', 'A', 'C'],
            showAux: true,
          },
        },
        {
          id: 'step-3',
          title: 'Bước 3: Tính khoảng cách $d\\bigl(M, (ABCD)\\bigr)$',
          content:
            'Vì $SA \\perp (ABCD)$ và $MO \\parallel SA$ nên $MO \\perp (ABCD)$ tại $O \\in (ABCD)$.\nSuy ra $d\\bigl(M, (ABCD)\\bigr) = MO = \\dfrac{1}{2}SA = \\dfrac{1}{2} \\cdot a\\sqrt{2} = \\dfrac{a\\sqrt{2}}{2}$.',
          justification: 'Hai đường thẳng song song, một đường vuông góc với mặt phẳng thì đường kia cũng vuông góc với mặt phẳng đó.',
          highlight: {
            vertices: ['M', 'O'],
            edges: [['M', 'O']],
            planeVertices: ['A', 'B', 'C', 'D'],
            showAux: true,
          },
        },
      ],
      ketLuanCuoiCung:
        'Vậy $BD \\perp (SAC)$ và $d\\bigl(M, (ABCD)\\bigr) = \\dfrac{a\\sqrt{2}}{2}$ (với $a > 0$, cùng đơn vị độ dài với $a$).',
      cachGiaiKhac: {
        title: 'Kiểm tra nhanh bằng tỉ số khoảng cách',
        note: 'Dùng quy tắc đổi điểm trong hình học không gian (kiến thức THPT):',
        content:
          'Đường thẳng $SC$ cắt mặt phẳng $(ABCD)$ tại $C$ và $M$ là trung điểm $SC$ nên $\\dfrac{d\\bigl(M,(ABCD)\\bigr)}{d\\bigl(S,(ABCD)\\bigr)} = \\dfrac{MC}{SC} = \\dfrac{1}{2}$. Vì $SA \\perp (ABCD)$ nên $d\\bigl(S,(ABCD)\\bigr) = SA = a\\sqrt{2}$, suy ra $d\\bigl(M,(ABCD)\\bigr) = \\dfrac{a\\sqrt{2}}{2}$.',
      },
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng nhất quán giả thiết, điều kiện định lý và đối chiếu mô hình tọa độ 3D.',
      checks: [
        { id: 'c1', label: 'Nhất quán giả thiết', status: 'passed', detail: 'Đáy hình vuông và SA ⊥ (ABCD) hoàn toàn tương thích.' },
        { id: 'c2', label: 'Điều kiện định lý', status: 'passed', detail: 'AC và SA cắt nhau tại A và cùng thuộc (SAC).' },
        { id: 'c3', label: 'Kiểm tra đại số & tọa độ', status: 'passed', detail: 'Tích vô hướng BD·AC = 0, BD·SA = 0; d(M,(ABCD)) = a√2/2.' },
        { id: 'c4', label: 'Đồng bộ ký hiệu điểm', status: 'passed', detail: 'Các điểm S, A, B, C, D, M, O khớp giữa đề, hình và lời giải.' },
      ],
      coordinateChecks: [
        'Kiểm tra tọa độ với a = 2: BD·AC = 0, BD·SA = 0 (sai số < 10⁻⁶).',
        'Khoảng cách tọa độ d(M, (ABCD)) = 1.414214 = a√2/2.',
      ],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-regular-pyramid',
    title: 'Hình chóp tứ giác đều S.ABCD: tính góc cạnh bên với đáy và thể tích',
    category: 'Hình chóp đều · Góc & Thể tích',
    difficulty: 'co_ban',
    topics: ['Góc', 'Thể tích'],
    gradeLevel: 'Lớp 12',
    rawText:
      'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a, cạnh bên bằng a√2. Tính góc giữa cạnh bên SA và mặt phẳng (ABCD), và tính thể tích khối chóp S.ABCD.',
    structured: {
      solidType: 'regular_pyramid',
      solidName: 'S.ABCD',
      solidTypeLabel: 'Hình chóp tứ giác đều',
      duKienDeBai: [
        '$S.ABCD$ là hình chóp tứ giác đều.',
        'Cạnh đáy $AB = BC = CD = DA = a$ ($a > 0$).',
        'Cạnh bên $SA = SB = SC = SD = a\\sqrt{2}$.',
      ],
      ketQuaSuyRa: [
        'Đáy $ABCD$ là hình vuông cạnh $a$ nên $AC = a\\sqrt{2}$ và $OA = \\dfrac{a\\sqrt{2}}{2}$.',
        'Gọi $O = AC \\cap BD$ là tâm đáy thì $SO \\perp (ABCD)$ (tính chất hình chóp đều).',
      ],
      yeuToPhu: [
        'Gọi $O = AC \\cap BD$ và kẻ đường cao $SO$ của hình chóp.',
      ],
      thongSoBoTri: [
        'Chọn tỉ lệ dựng hình $a = 2$, đường cao thực tế $SO = \\dfrac{a\\sqrt{6}}{2}$.',
      ],
      yeuCau: [
        'Tính góc giữa cạnh bên $SA$ và mặt phẳng $(ABCD)$.',
        'Tính thể tích khối chóp $S.ABCD$.',
      ],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildRegularPyramidModel(),
    hints: {
      phanTichDe:
        'Hình chóp tứ giác đều $S.ABCD$ có đầy đủ tính đối xứng: đáy là hình vuông cạnh $a$ và chân đường cao hạ từ $S$ trùng với tâm $O$ của đáy. Cần tìm góc tạo bởi $SA$ với $(ABCD)$ và tính thể tích $V_{S.ABCD}$.',
      kienThucCanDung: [
        'Định nghĩa hình chóp tứ giác đều: đáy là hình vuông và hình chiếu của đỉnh trùng với tâm đáy ($SO \\perp (ABCD)$).',
        'Góc giữa đường thẳng cắt mặt phẳng là góc giữa đường thẳng đó và hình chiếu vuông góc của nó lên mặt phẳng.',
        'Định lý Py-ta-go trong $\\triangle SOA$ vuông tại $O$.',
        'Công thức thể tích khối chóp: $V = \\dfrac{1}{3} S_{\\text{đáy}} \\cdot h$.',
      ],
      huongGiai:
        'Gọi $O = AC \\cap BD$. Xác định hình chiếu của $SA$ lên $(ABCD)$ là $OA$, từ đó quy góc cần tìm về $\\widehat{SAO}$. Dùng tỉ số lượng giác $\\cos\\widehat{SAO}$ trong $\\triangle SOA$ vuông tại $O$, sau đó tính $SO$ để suy ra thể tích.',
      progressiveLevels: [
        {
          level: 1,
          title: 'Gợi ý bước 1: Xác định góc giữa SA và (ABCD)',
          content:
            'Vì $SO \\perp (ABCD)$ nên $O$ là hình chiếu vuông góc của $S$ lên $(ABCD)$, còn $A \\in (ABCD)$. Suy ra $OA$ là hình chiếu của $SA$ lên $(ABCD)$. Vậy góc giữa $SA$ và $(ABCD)$ là $\\widehat{SAO}$.',
          highlight: {
            vertices: ['S', 'O', 'A'],
            edges: [
              ['S', 'A'],
              ['S', 'O'],
              ['A', 'C'],
            ],
            planeVertices: ['S', 'O', 'A'],
            showAux: true,
          },
        },
        {
          level: 2,
          title: 'Gợi ý bước 2: Tính OA và tỉ số cos góc SAO',
          content:
            'Tính đường chéo $AC$ của hình vuông cạnh $a$, từ đó lấy $OA = \\dfrac{AC}{2}$. Trong $\\triangle SOA$ vuông tại $O$, tính $\\cos\\widehat{SAO} = \\dfrac{OA}{SA}$ và đối chiếu bảng giá trị lượng giác đặc biệt.',
          highlight: {
            vertices: ['S', 'O', 'A'],
            edges: [
              ['S', 'A'],
              ['S', 'O'],
            ],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: [
          'Hình chóp tứ giác đều $S.ABCD$, cạnh đáy $a$ ($a > 0$), cạnh bên $SA = a\\sqrt{2}$.',
        ],
        ketLuan: [
          'a) Tính góc giữa $SA$ và $(ABCD)$.',
          'b) Tính thể tích $V_{S.ABCD}$.',
        ],
      },
      yTuongChinh:
        'Khai thác tính chất đường cao $SO \\perp (ABCD)$ tại tâm $O$ của hình vuông đáy để quy cả góc và chiều cao về tam giác vuông $SOA$.',
      cacBuocGiai: [
        {
          id: 'reg-1',
          title: 'Bước 1: Xác định chân đường cao $O$ và tính $OA$',
          content:
            'Gọi $O = AC \\cap BD$. Vì $S.ABCD$ là hình chóp tứ giác đều nên đáy $ABCD$ là hình vuông cạnh $a$ và $SO \\perp (ABCD)$.\nĐường chéo $AC = a\\sqrt{2} \\Rightarrow OA = \\dfrac{AC}{2} = \\dfrac{a\\sqrt{2}}{2}$.',
          justification: 'Tính chất hình chóp tứ giác đều và đường chéo hình vuông.',
          highlight: {
            vertices: ['S', 'O', 'A', 'C'],
            edges: [
              ['S', 'O'],
              ['A', 'C'],
              ['B', 'D'],
            ],
            showAux: true,
          },
        },
        {
          id: 'reg-2',
          title: 'Bước 2: Tính góc giữa $SA$ và $(ABCD)$',
          content:
            'Vì $SO \\perp (ABCD)$ nên $OA$ là hình chiếu vuông góc của $SA$ lên $(ABCD)$.\nDo đó $\\bigl(SA, (ABCD)\\bigr) = (SA, OA) = \\widehat{SAO}$ (vì $\\triangle SOA$ vuông tại $O$ nên $\\widehat{SAO} < 90^\\circ$).\nXét $\\triangle SOA$ vuông tại $O$: $\\cos\\widehat{SAO} = \\dfrac{OA}{SA} = \\dfrac{\\frac{a\\sqrt{2}}{2}}{a\\sqrt{2}} = \\dfrac{1}{2} \\Rightarrow \\widehat{SAO} = 60^\\circ$.',
          justification: 'Định nghĩa góc giữa đường thẳng và mặt phẳng; tỉ số lượng giác trong tam giác vuông.',
          highlight: {
            vertices: ['S', 'O', 'A'],
            edges: [
              ['S', 'A'],
              ['S', 'O'],
            ],
            planeVertices: ['S', 'O', 'A'],
            showAux: true,
          },
        },
        {
          id: 'reg-3',
          title: 'Bước 3: Tính đường cao $SO$ và thể tích khối chóp',
          content:
            'Trong $\\triangle SOA$ vuông tại $O$, theo định lý Py-ta-go:\n$SO = \\sqrt{SA^2 - OA^2} = \\sqrt{2a^2 - \\dfrac{a^2}{2}} = \\sqrt{\\dfrac{3a^2}{2}} = \\dfrac{a\\sqrt{6}}{2}$.\nDiện tích đáy $S_{ABCD} = a^2$.\nThể tích khối chóp: $V_{S.ABCD} = \\dfrac{1}{3} S_{ABCD} \\cdot SO = \\dfrac{1}{3} \\cdot a^2 \\cdot \\dfrac{a\\sqrt{6}}{2} = \\dfrac{a^3\\sqrt{6}}{6}$.',
          justification: 'Định lý Py-ta-go (thỏa $SA > OA$ do $a\\sqrt{2} > \\frac{a\\sqrt{2}}{2}$) và công thức thể tích khối chóp.',
          highlight: {
            vertices: ['S', 'O', 'A', 'B', 'C', 'D'],
            edges: [['S', 'O']],
            planeVertices: ['A', 'B', 'C', 'D'],
            showAux: true,
          },
        },
      ],
      ketLuanCuoiCung:
        'Vậy góc giữa $SA$ và $(ABCD)$ bằng $60^\\circ$, và thể tích khối chóp là $V_{S.ABCD} = \\dfrac{a^3\\sqrt{6}}{6}$ (với $a > 0$, đơn vị thể tích theo $a^3$).',
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng điều kiện tồn tại hình chóp đều (SA > OA) và đối chiếu tọa độ 3D.',
      checks: [
        { id: 'c1', label: 'Điều kiện tồn tại', status: 'passed', detail: 'Cạnh bên a√2 > bán kính đường tròn ngoại tiếp đáy a√2/2.' },
        { id: 'c2', label: 'Kiểm chứng góc tọa độ', status: 'passed', detail: 'Góc(SA, (ABCD)) = 60.00° chính xác.' },
        { id: 'c3', label: 'Kiểm chứng thể tích', status: 'passed', detail: 'V = a³√6 / 6 khớp tuyệt đối với thể tích tọa độ.' },
      ],
      coordinateChecks: [
        'Góc tọa độ giữa SA và mặt phẳng z = 0 là 60.000°.',
        'Thể tích đa diện tọa độ (a = 2): 3.265986 = 8√6/6.',
      ],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-ortho-tetrahedron',
    title: 'Tứ diện vuông O.ABC: chứng minh BC ⊥ (OAH) và tính khoảng cách từ O đến (ABC)',
    category: 'Tứ diện · Vuông góc & Khoảng cách',
    difficulty: 'trung_binh',
    topics: ['Vuông góc', 'Khoảng cách'],
    gradeLevel: 'Lớp 11',
    rawText:
      'Cho tứ diện O.ABC có OA, OB, OC đôi một vuông góc với nhau, OA = a, OB = a, OC = a√2. Gọi H là hình chiếu vuông góc của O trên mặt phẳng (ABC). Chứng minh BC ⊥ (OAH) và tính khoảng cách từ O đến mặt phẳng (ABC).',
    structured: {
      solidType: 'tetrahedron',
      solidName: 'O.ABC',
      solidTypeLabel: 'Tứ diện vuông tại O',
      duKienDeBai: [
        'Tứ diện $O.ABC$ có $OA, OB, OC$ đôi một vuông góc.',
        '$OA = a$, $OB = a$, $OC = a\\sqrt{2}$ ($a > 0$).',
        '$H$ là hình chiếu vuông góc của $O$ trên mặt phẳng $(ABC)$, tức $OH \\perp (ABC)$ tại $H$.',
      ],
      ketQuaSuyRa: [
        '$OA \\perp (OBC)$ vì $OA \\perp OB$ và $OA \\perp OC$.',
        '$BC \\perp OA$ và $BC \\perp OH$, từ đó suy ra $BC \\perp (OAH)$.',
      ],
      yeuToPhu: [
        'Kẻ $OK \\perp BC$ tại $K \\in BC$ trong $\\triangle OBC$ vuông tại $O$, sau đó nối $AK$.',
      ],
      thongSoBoTri: [
        'Đặt $O$ tại gốc tọa độ, $OA, OB, OC$ dọc theo ba trục vuông góc với tỉ lệ $a = 2$.',
      ],
      yeuCau: [
        'Chứng minh $BC \\perp (OAH)$.',
        'Tính khoảng cách $d\\bigl(O, (ABC)\\bigr) = OH$.',
      ],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildOrthoTetrahedronModel(),
    hints: {
      phanTichDe:
        'Tứ diện vuông tại $O$ có ba cạnh $OA, OB, OC$ đôi một vuông góc. Cần chứng minh $BC \\perp (OAH)$ và tính độ dài đường cao $OH$ hạ từ $O$ xuống mặt phẳng $(ABC)$.',
      kienThucCanDung: [
        'Định lý đường thẳng vuông góc với mặt phẳng.',
        'Hệ thức lượng trong tam giác vuông: $\\dfrac{1}{h^2} = \\dfrac{1}{b^2} + \\dfrac{1}{c^2}$.',
        'Hệ quả cho tứ diện vuông $O.ABC$: $\\dfrac{1}{OH^2} = \\dfrac{1}{OA^2} + \\dfrac{1}{OB^2} + \\dfrac{1}{OC^2}$ (cần chứng minh qua hai tam giác vuông).',
      ],
      huongGiai:
        'Ý 1: Chứng minh $BC \\perp OA$ (nhờ $OA \\perp (OBC)$) và $BC \\perp OH$ (nhờ $OH \\perp (ABC)$). Ý 2: Trong $(OBC)$ kẻ $OK \\perp BC$, chứng minh $H \\in AK$ và $OH$ là đường cao của $\\triangle OAK$ vuông tại $O$.',
      progressiveLevels: [
        {
          level: 1,
          title: 'Gợi ý bước 1: Chỉ ra hai đường cắt nhau trong (OAH) vuông góc với BC',
          content:
            'Ta có $OA \\perp OB$ và $OA \\perp OC$ nên $OA \\perp (OBC) \\Rightarrow OA \\perp BC$. Lại có $OH \\perp (ABC) \\Rightarrow OH \\perp BC$. Hãy kiểm tra điều kiện hai đường $OA, OH$ cắt nhau.',
          highlight: {
            vertices: ['O', 'A', 'B', 'C', 'H'],
            edges: [
              ['B', 'C'],
              ['O', 'A'],
              ['O', 'H'],
            ],
            planeVertices: ['O', 'A', 'K'],
            showAux: true,
          },
        },
        {
          level: 2,
          title: 'Gợi ý bước 2: Dựng phụ OK ⊥ BC để dùng hệ thức lượng',
          content:
            'Kẻ $OK \\perp BC$ ($K \\in BC$). Vì $BC \\perp (OAK)$ và $OH \\perp (ABC)$ nên $OH$ nằm trong $(OAK)$ và $OH \\perp AK$. Áp dụng hệ thức lượng hai lần trong $\\triangle OBC$ vuông tại $O$ và $\\triangle OAK$ vuông tại $O$.',
          highlight: {
            vertices: ['O', 'A', 'K', 'H'],
            edges: [
              ['O', 'K'],
              ['A', 'K'],
              ['O', 'H'],
            ],
            planeVertices: ['O', 'A', 'K'],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: [
          'Tứ diện $O.ABC$: $OA, OB, OC$ đôi một vuông góc; $OA = OB = a$, $OC = a\\sqrt{2}$ ($a > 0$).',
          '$OH \\perp (ABC)$ tại $H$.',
        ],
        ketLuan: [
          'a) Chứng minh $BC \\perp (OAH)$.',
          'b) Tính $d\\bigl(O, (ABC)\\bigr)$.',
        ],
      },
      yTuongChinh:
        'Dùng quan hệ $OA \\perp (OBC)$ để chứng minh $BC \\perp (OAH)$, rồi dựng đường cao phụ $OK$ của $\\triangle OBC$ nhằm đưa $OH$ về đường cao của tam giác vuông $OAK$.',
      cacBuocGiai: [
        {
          id: 'tet-1',
          title: 'Bước 1: Chứng minh $BC \\perp (OAH)$',
          content:
            'Theo giả thiết, $OA \\perp OB$, $OA \\perp OC$ và $OB \\cap OC = O$ trong $(OBC)$ nên $OA \\perp (OBC)$.\nVì $BC \\subset (OBC)$ nên $OA \\perp BC$.\nMặt khác, $H$ là hình chiếu vuông góc của $O$ trên $(ABC)$ nên $OH \\perp (ABC)$, suy ra $OH \\perp BC$ (vì $BC \\subset (ABC)$).\nXét hai đường thẳng $OA$ và $OH$ cùng thuộc $(OAH)$ và cắt nhau tại $O$ (vì $H \\neq A$ do $OA$ không vuông góc với $(ABC)$). Suy ra $BC \\perp (OAH)$.',
          justification: 'Định lý đường thẳng vuông góc với mặt phẳng.',
          highlight: {
            vertices: ['O', 'A', 'B', 'C', 'H'],
            edges: [
              ['B', 'C'],
              ['O', 'A'],
              ['O', 'H'],
            ],
            planeVertices: ['O', 'A', 'K'],
            showAux: true,
          },
        },
        {
          id: 'tet-2',
          title: 'Bước 2: Thiết lập hệ thức tính $OH$',
          content:
            'Trong mặt phẳng $(OAH)$, gọi $K = AH \\cap BC$. Vì $BC \\perp (OAH)$ nên $BC \\perp OK$ và $BC \\perp AK$.\nDo $OH \\perp (ABC)$ và $AK \\subset (ABC)$ nên $OH \\perp AK$.\nXét $\\triangle OBC$ vuông tại $O$ có đường cao $OK$: $\\dfrac{1}{OK^2} = \\dfrac{1}{OB^2} + \\dfrac{1}{OC^2}$.\nXét $\\triangle OAK$ vuông tại $O$ (vì $OA \\perp (OBC) \\Rightarrow OA \\perp OK$) có đường cao $OH$:\n$\\dfrac{1}{OH^2} = \\dfrac{1}{OA^2} + \\dfrac{1}{OK^2} = \\dfrac{1}{OA^2} + \\dfrac{1}{OB^2} + \\dfrac{1}{OC^2}$.',
          justification: 'Hệ thức lượng trong hai tam giác vuông $\\triangle OBC$ và $\\triangle OAK$.',
          highlight: {
            vertices: ['O', 'A', 'K', 'H'],
            edges: [
              ['O', 'K'],
              ['A', 'K'],
              ['O', 'H'],
            ],
            planeVertices: ['O', 'A', 'K'],
            showAux: true,
          },
        },
        {
          id: 'tet-3',
          title: 'Bước 3: Thay số tính khoảng cách $d\\bigl(O, (ABC)\\bigr)$',
          content:
            'Thay $OA = a$, $OB = a$, $OC = a\\sqrt{2}$ vào hệ thức trên:\n$\\dfrac{1}{OH^2} = \\dfrac{1}{a^2} + \\dfrac{1}{a^2} + \\dfrac{1}{2a^2} = \\dfrac{5}{2a^2}$.\nSuy ra $OH^2 = \\dfrac{2a^2}{5} \\Rightarrow OH = \\dfrac{a\\sqrt{10}}{5}$.',
          justification: 'Biến đổi đại số với điều kiện $a > 0$.',
          highlight: {
            vertices: ['O', 'H'],
            edges: [['O', 'H']],
            showAux: true,
          },
        },
      ],
      ketLuanCuoiCung:
        'Vậy $BC \\perp (OAH)$ và $d\\bigl(O, (ABC)\\bigr) = \\dfrac{a\\sqrt{10}}{5}$ (với $a > 0$).',
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng vuông góc và khoảng cách bằng mô hình tọa độ 3D.',
      checks: [
        { id: 'c1', label: 'Nhất quán giả thiết', status: 'passed', detail: 'OA, OB, OC đôi một vuông góc và dương.' },
        { id: 'c2', label: 'Kiểm tra BC ⊥ (OAH)', status: 'passed', detail: 'BC·OA = 0 và BC·OH = 0.' },
        { id: 'c3', label: 'Kiểm tra khoảng cách', status: 'passed', detail: 'OH tọa độ khớp chính xác với a√10/5.' },
      ],
      coordinateChecks: [
        'Khoảng cách tọa độ d(O, (ABC)) với a = 2 là 1.264911 = 2√10/5.',
      ],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-standing-prism',
    title: "Lăng trụ đứng ABC.A'B'C': chứng minh AM ⊥ (BCC'B') và tính góc (A'M, (ABC))",
    category: 'Lăng trụ đứng · Vuông góc & Góc',
    difficulty: 'trung_binh',
    topics: ['Vuông góc', 'Góc'],
    gradeLevel: 'Lớp 11',
    rawText:
      "Cho lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác đều cạnh a, cạnh bên AA' = a√3. Gọi M là trung điểm của BC. Chứng minh AM ⊥ (BCC'B') và tính góc giữa A'M và mặt phẳng (ABC).",
    structured: {
      solidType: 'regular_prism',
      solidName: "ABC.A'B'C'",
      solidTypeLabel: 'Lăng trụ đứng đáy tam giác đều (lăng trụ tam giác đều)',
      duKienDeBai: [
        "Lăng trụ đứng $ABC.A'B'C'$ (tức $AA' \\perp (ABC)$ và $BB' \\perp (ABC)$).",
        'Đáy $ABC$ là tam giác đều cạnh $a$ ($a > 0$).',
        "Cạnh bên $AA' = a\\sqrt{3}$.",
        '$M$ là trung điểm cạnh $BC$.',
      ],
      ketQuaSuyRa: [
        '$AM \\perp BC$ và $AM = \\dfrac{a\\sqrt{3}}{2}$ (đường cao tam giác đều cạnh $a$).',
        "$BB' \\perp AM$ vì $BB' \\perp (ABC)$ và $AM \\subset (ABC)$.",
        "$AM$ là hình chiếu vuông góc của $A'M$ lên mặt phẳng $(ABC)$.",
      ],
      yeuToPhu: ['Nối đoạn $AM$ trên mặt đáy và đoạn $A\'M$ trong không gian.'],
      thongSoBoTri: ['Dựng lăng trụ đứng với tỉ lệ cạnh đáy $a = 2$, chiều cao $AA\' = 2\\sqrt{3}$.'],
      yeuCau: [
        "Chứng minh $AM \\perp (BCC'B')$.",
        "Tính góc giữa $A'M$ và mặt phẳng $(ABC)$.",
      ],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildStandingPrismModel(),
    hints: {
      phanTichDe:
        "Lăng trụ đứng $ABC.A'B'C'$ có các cạnh bên vuông góc với mặt đáy, đáy $ABC$ đều cạnh $a$ và $M$ là trung điểm $BC$. Cần chứng minh $AM \\perp (BCC'B')$ và tìm góc giữa $A'M$ với $(ABC)$.",
      kienThucCanDung: [
        "Tính chất lăng trụ đứng: các cạnh bên $AA', BB', CC'$ cùng vuông góc với mặt đáy $(ABC)$.",
        'Trong tam giác đều cạnh $a$, đường trung tuyến đồng thời là đường cao và có độ dài $\\dfrac{a\\sqrt{3}}{2}$.',
        'Góc giữa đường thẳng $A\'M$ và mặt phẳng $(ABC)$ bằng góc giữa $A\'M$ và hình chiếu của nó trên $(ABC)$.',
      ],
      huongGiai:
        "Ý 1: Chứng minh $AM$ vuông góc với hai đường cắt nhau $BC$ và $BB'$ trong $(BCC'B')$. Ý 2: Tìm hình chiếu của $A'$ lên $(ABC)$ là $A$, suy ra góc cần tìm là $\\widehat{A'MA}$ và dùng $\\tan\\widehat{A'MA}$ trong $\\triangle A'AM$ vuông tại $A$.",
      progressiveLevels: [
        {
          level: 1,
          title: "Gợi ý bước 1: Hai đường thẳng trong (BCC'B') vuông góc với AM",
          content:
            "Tam giác $ABC$ đều có $M$ là trung điểm $BC$ nên $AM \\perp BC$. Lăng trụ đứng có $BB' \\perp (ABC)$ nên $BB' \\perp AM$. Hai đường $BC, BB'$ cắt nhau tại $B$ trong $(BCC'B')$.",
          highlight: {
            vertices: ['A', 'B', 'C', 'M', 'B1', 'C1'],
            edges: [
              ['A', 'M'],
              ['B', 'C'],
              ['B', 'B1'],
            ],
            planeVertices: ['B', 'C', 'C1', 'B1'],
            showAux: true,
          },
        },
        {
          level: 2,
          title: "Gợi ý bước 2: Xét tam giác vuông A'AM",
          content:
            "Vì $A'A \\perp (ABC)$ nên hình chiếu của $A'M$ lên $(ABC)$ là $AM$. Trong $\\triangle A'AM$ vuông tại $A$, bạn đã biết $AA' = a\\sqrt{3}$ và $AM = \\dfrac{a\\sqrt{3}}{2}$. Tính $\\tan\\widehat{A'MA}$.",
          highlight: {
            vertices: ['A1', 'A', 'M'],
            edges: [
              ['A1', 'M'],
              ['A', 'M'],
              ['A', 'A1'],
            ],
            planeVertices: ['A1', 'A', 'M'],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: [
          "Lăng trụ đứng $ABC.A'B'C'$, $\\triangle ABC$ đều cạnh $a$ ($a > 0$), $AA' = a\\sqrt{3}$.",
          '$M$ là trung điểm của $BC$.',
        ],
        ketLuan: [
          "a) Chứng minh $AM \\perp (BCC'B')$.",
          "b) Tính góc giữa $A'M$ và $(ABC)$.",
        ],
      },
      yTuongChinh:
        "Sử dụng tính vuông góc của đường trung tuyến tam giác đều và cạnh bên lăng trụ đứng để chứng minh $AM \\perp (BCC'B')$, sau đó tính góc trong tam giác vuông $A'AM$.",
      cacBuocGiai: [
        {
          id: 'pr-1',
          title: "Bước 1: Chứng minh $AM \\perp (BCC'B')$",
          content:
            "Vì $\\triangle ABC$ đều và $M$ là trung điểm $BC$ nên $AM \\perp BC$.\nVì $ABC.A'B'C'$ là lăng trụ đứng nên $BB' \\perp (ABC)$, mà $AM \\subset (ABC)$ suy ra $BB' \\perp AM$.\nTrong $(BCC'B')$, hai đường thẳng $BC$ và $BB'$ cắt nhau tại $B$.\nDo đó $AM \\perp (BCC'B')$ (điều phải chứng minh).",
          justification: 'Định lý đường thẳng vuông góc với mặt phẳng và tính chất lăng trụ đứng.',
          highlight: {
            vertices: ['A', 'M', 'B', 'C', 'B1', 'C1'],
            edges: [
              ['A', 'M'],
              ['B', 'C'],
              ['B', 'B1'],
            ],
            planeVertices: ['B', 'C', 'C1', 'B1'],
            showAux: true,
          },
        },
        {
          id: 'pr-2',
          title: "Bước 2: Xác định và tính góc giữa $A'M$ và $(ABC)$",
          content:
            "Vì $AA' \\perp (ABC)$ nên $A$ là hình chiếu vuông góc của $A'$ lên $(ABC)$, còn $M \\in (ABC)$.\nSuy ra $AM$ là hình chiếu vuông góc của $A'M$ lên $(ABC)$, do đó $\\bigl(A'M, (ABC)\\bigr) = (A'M, AM) = \\widehat{A'MA}$.\nVì $\\triangle ABC$ đều cạnh $a$ nên $AM = \\dfrac{a\\sqrt{3}}{2}$.\nXét $\\triangle A'AM$ vuông tại $A$:\n$\\tan\\widehat{A'MA} = \\dfrac{AA'}{AM} = \\dfrac{a\\sqrt{3}}{\\frac{a\\sqrt{3}}{2}} = 2$.\nSuy ra $\\widehat{A'MA} = \\arctan(2) \\approx 63^\\circ 26'$.",
          justification: 'Định nghĩa góc giữa đường thẳng và mặt phẳng; công thức đường cao tam giác đều.',
          highlight: {
            vertices: ['A1', 'A', 'M'],
            edges: [
              ['A1', 'M'],
              ['A', 'M'],
              ['A', 'A1'],
            ],
            planeVertices: ['A1', 'A', 'M'],
            showAux: true,
          },
        },
      ],
      ketLuanCuoiCung:
        "Vậy $AM \\perp (BCC'B')$ và góc giữa $A'M$ với $(ABC)$ bằng $\\arctan(2) \\approx 63^\\circ 26'$.",
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng vuông góc và số đo góc qua tọa độ 3D.',
      checks: [
        { id: 'c1', label: 'Nhất quán giả thiết', status: 'passed', detail: 'Lăng trụ đứng đáy tam giác đều xác định duy nhất theo a.' },
        { id: 'c2', label: "Kiểm tra AM ⊥ (BCC'B')", status: 'passed', detail: "AM·BC = 0 và AM·BB' = 0." },
        { id: 'c3', label: 'Kiểm tra góc', status: 'passed', detail: "Góc tọa độ (A'M, (ABC)) = 63.4349° = arctan(2)." },
      ],
      coordinateChecks: [
        "Góc tọa độ giữa A'M và (ABC): 63.4349° = arctan(2).",
      ],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-cube-section',
    title: "Hình lập phương ABCD.A'B'C'D': chứng minh song song & tính diện tích thiết diện (A'MN)",
    category: 'Hình lập phương · Song song & Thiết diện',
    difficulty: 'nang_cao',
    topics: ['Song song', 'Thiết diện'],
    gradeLevel: 'Lớp 11',
    rawText:
      "Cho hình lập phương ABCD.A'B'C'D' cạnh a. Gọi M, N lần lượt là trung điểm của AB và AD. Chứng minh MN song song với (BB'D'D), xác định thiết diện cắt bởi mặt phẳng (A'MN) và tính diện tích thiết diện đó.",
    structured: {
      solidType: 'cube',
      solidName: "ABCD.A'B'C'D'",
      solidTypeLabel: 'Hình lập phương',
      duKienDeBai: [
        "Hình lập phương $ABCD.A'B'C'D'$ có tất cả các cạnh bằng $a$ ($a > 0$) và các mặt là hình vuông.",
        '$M$ là trung điểm $AB$, $N$ là trung điểm $AD$.',
      ],
      ketQuaSuyRa: [
        '$MN$ là đường trung bình của $\\triangle ABD$ nên $MN \\parallel BD$ và $MN = \\dfrac{1}{2}BD = \\dfrac{a\\sqrt{2}}{2}$.',
        "Ba giao tuyến của $(A'MN)$ với các mặt hình lập phương tạo thành tam giác cân $A'MN$.",
      ],
      yeuToPhu: [
        'Kẻ đường chéo $BD$ của mặt đáy $ABCD$.',
        "Nối các đoạn giao tuyến $MN$, $A'M$, $A'N$ tạo thành thiết diện $\\triangle A'MN$.",
      ],
      thongSoBoTri: ['Dựng hình lập phương với cạnh tỉ lệ $a = 2$.'],
      yeuCau: [
        "Chứng minh $MN \\parallel (BB'D'D)$.",
        "Xác định thiết diện của hình lập phương cắt bởi $(A'MN)$ và tính diện tích thiết diện.",
      ],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildCubeSectionModel(),
    hints: {
      phanTichDe:
        "Cho hình lập phương cạnh $a$ với $M, N$ là trung điểm $AB, AD$. Cần chứng minh $MN \\parallel (BB'D'D)$, chỉ rõ thiết diện tạo bởi mặt phẳng $(A'MN)$ và tính diện tích của thiết diện đó.",
      kienThucCanDung: [
        'Định lý đường thẳng song song mặt phẳng: $d \\not\\subset (P)$, $d \\parallel d\'$ và $d\' \\subset (P) \\Rightarrow d \\parallel (P)$.',
        'Tính chất đường trung bình trong tam giác $ABD$.',
        'Cách xác định thiết diện: tìm các đoạn giao tuyến của mặt phẳng cắt với các mặt của hình đa diện.',
        'Định lý Py-ta-go và công thức diện tích tam giác cân.',
      ],
      huongGiai:
        "Ý 1: So sánh $MN$ với đường chéo $BD \\subset (BB'D'D)$. Ý 2: Kiểm tra các đoạn $MN, A'M, A'N$ đã nằm trên ba mặt của hình lập phương tạo thành đa giác khép kín chưa, sau đó tính ba cạnh của tam giác $A'MN$ rồi tính diện tích.",
      progressiveLevels: [
        {
          level: 1,
          title: 'Gợi ý bước 1: Liên hệ MN với BD',
          content:
            "Xét $\\triangle ABD$: $M, N$ là trung điểm $AB, AD$ nên $MN \\parallel BD$. Lưu ý kiểm tra điều kiện $MN \\not\\subset (BB'D'D)$ trước khi kết luận $MN \\parallel (BB'D'D)$.",
          highlight: {
            vertices: ['M', 'N', 'B', 'D', 'B1', 'D1'],
            edges: [
              ['M', 'N'],
              ['B', 'D'],
            ],
            showAux: true,
          },
        },
        {
          level: 2,
          title: "Gợi ý bước 2: Kiểm tra thiết diện là △A'MN và tính các cạnh",
          content:
            "Các đoạn $MN \\subset (ABCD)$, $A'M \\subset (ABB'A')$, $A'N \\subset (ADD'A')$ đã khép kín thành $\\triangle A'MN$. Tính $A'M = \\sqrt{AA'^2 + AM^2}$, $A'N$ và $MN$, rồi hạ đường cao từ $A'$ xuống $MN$.",
          highlight: {
            vertices: ['A1', 'M', 'N'],
            edges: [
              ['A1', 'M'],
              ['A1', 'N'],
              ['M', 'N'],
            ],
            planeVertices: ['A1', 'M', 'N'],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: [
          "Hình lập phương $ABCD.A'B'C'D'$ cạnh $a$ ($a > 0$).",
          '$M, N$ là trung điểm của $AB, AD$.',
        ],
        ketLuan: [
          "a) Chứng minh $MN \\parallel (BB'D'D)$.",
          "b) Xác định và tính diện tích thiết diện cắt bởi $(A'MN)$.",
        ],
      },
      yTuongChinh:
        "Dùng đường trung bình $MN$ của $\\triangle ABD$ để chứng minh song song, sau đó xác định các đoạn giao tuyến khép kín của $(A'MN)$ với ba mặt kề đỉnh $A$ và tính diện tích tam giác cân $A'MN$.",
      cacBuocGiai: [
        {
          id: 'cube-1',
          title: "Bước 1: Chứng minh $MN \\parallel (BB'D'D)$",
          content:
            "Xét $\\triangle ABD$, vì $M$ là trung điểm $AB$ và $N$ là trung điểm $AD$ nên $MN$ là đường trung bình của $\\triangle ABD$, suy ra $MN \\parallel BD$.\nMặt khác $BD \\subset (BB'D'D)$ và $MN \\not\\subset (BB'D'D)$ (vì $M \\notin (BB'D'D)$).\nSuy ra $MN \\parallel (BB'D'D)$ (điều phải chứng minh).",
          justification: 'Định lý điều kiện đường thẳng song song với mặt phẳng.',
          highlight: {
            vertices: ['M', 'N', 'B', 'D'],
            edges: [
              ['M', 'N'],
              ['B', 'D'],
            ],
            showAux: true,
          },
        },
        {
          id: 'cube-2',
          title: "Bước 2: Xác định thiết diện của hình lập phương cắt bởi $(A'MN)$",
          content:
            "Ta tìm giao tuyến của $(A'MN)$ với các mặt của hình lập phương:\n• $(A'MN) \\cap (ABCD) = MN$.\n• $(A'MN) \\cap (ABB'A') = A'M$.\n• $(A'MN) \\cap (ADD'A') = A'N$.\nBa đoạn giao tuyến $MN, A'M, A'N$ nằm trọn trên các mặt của hình lập phương và tạo thành đa giác khép kín nên thiết diện là tam giác $A'MN$.",
          justification: 'Định nghĩa thiết diện của hình đa diện khi cắt bởi một mặt phẳng.',
          highlight: {
            vertices: ['A1', 'M', 'N'],
            edges: [
              ['A1', 'M'],
              ['A1', 'N'],
              ['M', 'N'],
            ],
            planeVertices: ['A1', 'M', 'N'],
            showAux: true,
          },
        },
        {
          id: 'cube-3',
          title: "Bước 3: Tính diện tích thiết diện $\\triangle A'MN$",
          content:
            "Ta có $AM = AN = \\dfrac{a}{2}$ và $AA' = a$.\nTrong $\\triangle A'AM$ vuông tại $A$: $A'M = \\sqrt{AA'^2 + AM^2} = \\sqrt{a^2 + \\dfrac{a^2}{4}} = \\dfrac{a\\sqrt{5}}{2}$.\nTương tự, $A'N = \\dfrac{a\\sqrt{5}}{2}$ nên $\\triangle A'MN$ cân tại $A'$.\nTrong $\\triangle AMN$ vuông cân tại $A$: $MN = \\sqrt{AM^2 + AN^2} = \\dfrac{a\\sqrt{2}}{2}$.\nGọi $I$ là trung điểm $MN$, đường cao $A'I$ của $\\triangle A'MN$ là:\n$A'I = \\sqrt{A'M^2 - \\left(\\dfrac{MN}{2}\\right)^2} = \\sqrt{\\dfrac{5a^2}{4} - \\dfrac{a^2}{8}} = \\sqrt{\\dfrac{9a^2}{8}} = \\dfrac{3a\\sqrt{2}}{4}$.\nDiện tích thiết diện: $S_{\\triangle A'MN} = \\dfrac{1}{2} \\cdot MN \\cdot A'I = \\dfrac{1}{2} \\cdot \\dfrac{a\\sqrt{2}}{2} \\cdot \\dfrac{3a\\sqrt{2}}{4} = \\dfrac{3a^2}{8}$.",
          justification: 'Định lý Py-ta-go và công thức diện tích tam giác cân.',
          highlight: {
            vertices: ['A1', 'M', 'N'],
            edges: [
              ['A1', 'M'],
              ['A1', 'N'],
              ['M', 'N'],
            ],
            planeVertices: ['A1', 'M', 'N'],
            showAux: true,
          },
        },
      ],
      ketLuanCuoiCung:
        "Vậy $MN \\parallel (BB'D'D)$, thiết diện là tam giác cân $A'MN$ và có diện tích $S = \\dfrac{3a^2}{8}$ (với $a > 0$, đơn vị diện tích theo $a^2$).",
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng song song và diện tích thiết diện bằng tọa độ 3D.',
      checks: [
        { id: 'c1', label: 'Quan hệ song song', status: 'passed', detail: 'Tích có hướng MN × BD = 0 và M ∉ (BB\'D\'D).' },
        { id: 'c2', label: 'Diện tích thiết diện', status: 'passed', detail: 'Diện tích tọa độ △A\'MN = 3a²/8 chính xác.' },
      ],
      coordinateChecks: [
        "Diện tích tọa độ △A'MN với a = 2 là 1.500000 = 3·4/8.",
      ],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-rect-box',
    title: "Hình hộp chữ nhật ABCD.A'B'C'D': tính đường chéo AC' và góc với mặt đáy",
    category: 'Hình hộp chữ nhật · Độ dài & Góc',
    difficulty: 'co_ban',
    topics: ['Góc', 'Vuông góc'],
    gradeLevel: 'Lớp 11',
    rawText:
      "Cho hình hộp chữ nhật ABCD.A'B'C'D' có AB = a, AD = a√3, AA' = a. Tính độ dài đường chéo AC' và góc giữa đường thẳng AC' với mặt phẳng (ABCD).",
    structured: {
      solidType: 'rectangular_box',
      solidName: "ABCD.A'B'C'D'",
      solidTypeLabel: 'Hình hộp chữ nhật',
      duKienDeBai: [
        "Hình hộp chữ nhật $ABCD.A'B'C'D'$.",
        "$AB = a$, $AD = a\\sqrt{3}$, $AA' = a$ ($a > 0$).",
      ],
      ketQuaSuyRa: [
        'Đáy $ABCD$ là hình chữ nhật nên $AC = \\sqrt{AB^2 + AD^2} = 2a$.',
        "$CC' = AA' = a$ và $CC' \\perp (ABCD)$.",
      ],
      yeuToPhu: ["Nối đường chéo mặt đáy $AC$ và đường chéo hình hộp $AC'$."],
      thongSoBoTri: ['Dựng hình hộp với kích thước tỉ lệ $a = 2$: $AB = 2$, $AD = 2\\sqrt{3}$, $AA\' = 2$.'],
      yeuCau: [
        "Tính độ dài đường chéo $AC'$.",
        "Tính góc giữa đường thẳng $AC'$ và mặt phẳng $(ABCD)$.",
      ],
      isRepresentativeConfig: false,
      issues: [],
      canConclude: true,
    },
    model: buildRectBoxModel(),
    hints: {
      phanTichDe:
        "Hình hộp chữ nhật có ba kích thước $a$, $a\\sqrt{3}$, $a$. Cần tính độ dài đường chéo lớn $AC'$ và góc tạo bởi $AC'$ với mặt phẳng đáy $(ABCD)$.",
      kienThucCanDung: [
        'Trong hình hộp chữ nhật, các cạnh bên vuông góc với hai đáy và mọi mặt đều là hình chữ nhật.',
        'Định lý Py-ta-go trong hai tam giác vuông $ABC$ và $ACC\'$.',
        'Định nghĩa góc giữa đường thẳng và mặt phẳng qua phép chiếu vuông góc.',
      ],
      huongGiai:
        "Tính trước đường chéo đáy $AC$ trong hình chữ nhật $ABCD$. Vì $CC' \\perp (ABCD)$ nên $AC$ là hình chiếu của $AC'$ trên $(ABCD)$; xét $\\triangle ACC'$ vuông tại $C$ để tìm cả $AC'$ và góc $\\widehat{C'AC}$.",
      progressiveLevels: [
        {
          level: 1,
          title: 'Gợi ý bước 1: Tính đường chéo đáy AC',
          content:
            'Trong hình chữ nhật $ABCD$, $\\triangle ABC$ vuông tại $B$ với $AB = a$, $BC = AD = a\\sqrt{3}$. Dùng định lý Py-ta-go tính $AC$.',
          highlight: {
            vertices: ['A', 'B', 'C'],
            edges: [
              ['A', 'C'],
              ['A', 'B'],
              ['B', 'C'],
            ],
            showAux: true,
          },
        },
        {
          level: 2,
          title: "Gợi ý bước 2: Xét tam giác vuông ACC'",
          content:
            "Vì $CC' \\perp (ABCD)$ nên $\\triangle ACC'$ vuông tại $C$ và góc giữa $AC'$ với $(ABCD)$ là $\\widehat{C'AC}$. Tính $AC'$ bằng Py-ta-go và tính $\\tan\\widehat{C'AC} = \\dfrac{CC'}{AC}$.",
          highlight: {
            vertices: ['A', 'C', 'C1'],
            edges: [
              ['A', 'C1'],
              ['A', 'C'],
              ['C', 'C1'],
            ],
            planeVertices: ['A', 'C', 'C1'],
            showAux: true,
          },
        },
      ],
    },
    solution: {
      tomTatGiaThietKetLuan: {
        giaThiet: [
          "Hình hộp chữ nhật $ABCD.A'B'C'D'$, $AB = a$, $AD = a\\sqrt{3}$, $AA' = a$ ($a > 0$).",
        ],
        ketLuan: [
          "a) Tính $AC'$.",
          "b) Tính góc $\\bigl(AC', (ABCD)\\bigr)$.",
        ],
      },
      yTuongChinh:
        "Quy bài toán về tam giác vuông $ACC'$ nhờ tính chất $CC' \\perp (ABCD)$ của hình hộp chữ nhật.",
      cacBuocGiai: [
        {
          id: 'box-1',
          title: 'Bước 1: Tính đường chéo đáy $AC$ và đường chéo hình hộp $AC\'$',
          content:
            "Đáy $ABCD$ là hình chữ nhật có $AB = a$, $BC = AD = a\\sqrt{3}$ nên:\n$AC = \\sqrt{AB^2 + BC^2} = \\sqrt{a^2 + 3a^2} = 2a$.\nVì $ABCD.A'B'C'D'$ là hình hộp chữ nhật nên $CC' = AA' = a$ và $CC' \\perp (ABCD)$, suy ra $CC' \\perp AC$.\nTrong $\\triangle ACC'$ vuông tại $C$:\n$AC' = \\sqrt{AC^2 + CC'^2} = \\sqrt{(2a)^2 + a^2} = a\\sqrt{5}$.",
          justification: 'Định lý Py-ta-go và tính chất hình hộp chữ nhật.',
          highlight: {
            vertices: ['A', 'C', 'C1'],
            edges: [
              ['A', 'C'],
              ['A', 'C1'],
              ['C', 'C1'],
            ],
            planeVertices: ['A', 'C', 'C1'],
            showAux: true,
          },
        },
        {
          id: 'box-2',
          title: "Bước 2: Tính góc giữa $AC'$ và $(ABCD)$",
          content:
            "Vì $CC' \\perp (ABCD)$ tại $C$ và $A \\in (ABCD)$ nên $AC$ là hình chiếu vuông góc của $AC'$ trên $(ABCD)$.\nSuy ra $\\bigl(AC', (ABCD)\\bigr) = (AC', AC) = \\widehat{C'AC}$.\nTrong $\\triangle ACC'$ vuông tại $C$: $\\tan\\widehat{C'AC} = \\dfrac{CC'}{AC} = \\dfrac{a}{2a} = \\dfrac{1}{2}$.\nSuy ra $\\widehat{C'AC} = \\arctan\\left(\\dfrac{1}{2}\\right) \\approx 26^\\circ 34'$.",
          justification: 'Định nghĩa góc giữa đường thẳng và mặt phẳng.',
          highlight: {
            vertices: ['A', 'C', 'C1'],
            edges: [
              ['A', 'C1'],
              ['A', 'C'],
            ],
            planeVertices: ['A', 'C', 'C1'],
            showAux: true,
          },
        },
      ],
      ketLuanCuoiCung:
        "Vậy $AC' = a\\sqrt{5}$ (với $a > 0$) và góc giữa $AC'$ với $(ABCD)$ bằng $\\arctan\\left(\\dfrac{1}{2}\\right) \\approx 26^\\circ 34'$.",
    },
    verification: {
      overallStatus: 'verified',
      summary: 'Đã kiểm chứng độ dài đường chéo và góc bằng tọa độ 3D.',
      checks: [
        { id: 'c1', label: 'Độ dài đường chéo', status: 'passed', detail: "AC' = √(a² + 3a² + a²) = a√5." },
        { id: 'c2', label: 'Góc với mặt đáy', status: 'passed', detail: "Góc tọa độ (AC', (ABCD)) = 26.565° = arctan(1/2)." },
      ],
      coordinateChecks: [
        "Độ dài tọa độ AC' (a = 2): 4.472136 = 2√5; góc = 26.565°.",
      ],
      unverifiedNotes: [],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-ambiguous-pyramid',
    title: 'Kiểm thử đề thiếu dữ kiện: Hình chóp đáy hình vuông chưa có vị trí đỉnh S',
    category: 'Đề có vấn đề · Thiếu dữ kiện',
    difficulty: 'co_ban',
    topics: ['Kiểm chứng đề', 'Thể tích'],
    gradeLevel: 'THPT',
    rawText:
      'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. Tính thể tích khối chóp S.ABCD.',
    structured: {
      solidType: 'pyramid',
      solidName: 'S.ABCD',
      solidTypeLabel: 'Hình chóp đáy hình vuông (chưa xác định vị trí đỉnh S)',
      duKienDeBai: [
        'Hình chóp $S.ABCD$.',
        'Đáy $ABCD$ là hình vuông cạnh $a$ ($a > 0$).',
      ],
      ketQuaSuyRa: [
        'Diện tích đáy $S_{ABCD} = a^2$.',
        'Chưa thể suy ra chiều cao $h = d\\bigl(S, (ABCD)\\bigr)$ cũng như vị trí chân đường cao của $S$.',
      ],
      yeuToPhu: [],
      thongSoBoTri: [
        'Để minh họa tổng quát, đỉnh $S$ được đặt lệch khỏi tâm đáy (không tự biến thành hình chóp đều và không tự giả định $SA \\perp (ABCD)$).',
      ],
      yeuCau: ['Tính thể tích khối chóp $S.ABCD$.'],
      isRepresentativeConfig: true,
      representativeNotice:
        'Hình minh họa là một cấu hình thỏa mãn giả thiết; các kích thước chưa được cho được chọn để dễ quan sát.',
      issues: [
        {
          severity: 'warning',
          code: 'ambiguous_apex',
          title: 'Chưa xác định vị trí đỉnh S và chiều cao hình chóp',
          detail:
            'Đề bài chỉ cho đáy ABCD là hình vuông cạnh a (KHÔNG phải hình chóp tứ giác đều). Không được tự giả thiết S nằm trên trục tâm đáy hay SA ⊥ (ABCD).',
          suggestedAction:
            'Bổ sung điều kiện về chiều cao hoặc đường vuông góc đáy (ví dụ: "SA vuông góc với mặt phẳng (ABCD), SA = a√2" hoặc "hình chóp tứ giác đều có cạnh bên bằng a√2").',
        },
        {
          severity: 'error',
          code: 'missing_data',
          title: 'Thiếu dữ kiện để tính giá trị xác định của thể tích',
          detail:
            'Với cùng một đáy hình vuông cạnh a, khi chiều cao h = d(S, (ABCD)) > 0 thay đổi thì thể tích V = (1/3)a²h nhận vô số giá trị khác nhau. Cần người dùng xác nhận và bổ sung giả thiết trước khi kết luận.',
          suggestedAction: 'Chỉnh sửa đề bài ở ô phía trên để bổ sung dữ kiện xác định chiều cao.',
        },
      ],
      canConclude: false,
    },
    model: buildAmbiguousSquareBasePyramidModel(),
    hints: {
      phanTichDe:
        'Đề bài mới xác định được diện tích đáy $S_{ABCD} = a^2$, nhưng chưa có bất kỳ dữ kiện nào ràng buộc chiều cao $h = d\\bigl(S, (ABCD)\\bigr)$ hoặc vị trí chân đường cao từ đỉnh $S$.',
      kienThucCanDung: [
        'Công thức thể tích khối chóp: $V = \\dfrac{1}{3} S_{\\text{đáy}} \\cdot h$.',
        'Phân biệt: "hình chóp có đáy là hình vuông" khác hoàn toàn với "hình chóp tứ giác đều".',
      ],
      huongGiai:
        'Kiểm tra lại đề bài xem có bị thiếu câu dữ kiện nào không (ví dụ cạnh bên vuông góc với đáy, mặt bên vuông góc với đáy, góc giữa cạnh bên và đáy, hoặc giả thiết hình chóp đều). Chỉ khi xác định được $h$ theo $a$ mới có thể tính giá trị số cụ thể của $V$.',
      progressiveLevels: [
        {
          level: 1,
          title: 'Phân biệt khái niệm hay nhầm lẫn',
          content:
            'Hình chóp có đáy là đa giác đều (như hình vuông) KHÔNG mặc nhiên là hình chóp đều. Hình chóp đều đòi hỏi thêm điều kiện tất cả các cạnh bên bằng nhau (tương đương chân đường cao trùng tâm đáy).',
          highlight: {
            vertices: ['S', 'A', 'B', 'C', 'D'],
            planeVertices: ['A', 'B', 'C', 'D'],
          },
        },
      ],
    },
    solution: null,
    verification: {
      overallStatus: 'blocked',
      summary: 'Không thể đưa ra kết luận thể tích vì đề bài thiếu dữ kiện về chiều cao $h$.',
      checks: [
        { id: 'c1', label: 'Nhất quán giả thiết', status: 'passed', detail: 'Các dữ kiện hiện có không mâu thuẫn.' },
        { id: 'c2', label: 'Tính đầy đủ dữ kiện', status: 'failed', detail: 'Thiếu điều kiện xác định chiều cao h = d(S, (ABCD)).' },
        { id: 'c3', label: 'Chống tự ý bổ sung giả thiết', status: 'passed', detail: 'Mô hình giữ đỉnh S tổng quát, không tự biến thành hình chóp đều.' },
      ],
      coordinateChecks: [],
      unverifiedNotes: [
        'Thể tích chỉ biểu diễn được dưới dạng phụ thuộc tham số h chưa biết: V = (1/3)a²h (h > 0). Vui lòng bổ sung giả thiết để giải tiếp.',
      ],
    },
    source: 'verified_preset',
  },

  {
    id: 'preset-contradictory-pyramid',
    title: 'Kiểm thử đề mâu thuẫn: SA ⊥ (ABCD), SA = a nhưng SB = a/2',
    category: 'Đề có vấn đề · Mâu thuẫn dữ kiện',
    difficulty: 'co_ban',
    topics: ['Kiểm chứng đề', 'Vuông góc'],
    gradeLevel: 'THPT',
    rawText:
      'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD), SA = a và SB = a/2. Tính thể tích khối chóp S.ABCD.',
    structured: {
      solidType: 'pyramid',
      solidName: 'S.ABCD',
      solidTypeLabel: 'Hình chóp có giả thiết mâu thuẫn',
      duKienDeBai: [
        'Đáy $ABCD$ là hình vuông cạnh $a$ ($a > 0$), suy ra $AB = a$.',
        '$SA \\perp (ABCD)$ và $SA = a$.',
        'Giả thiết bổ sung: $SB = \\dfrac{a}{2}$.',
      ],
      ketQuaSuyRa: [
        'Từ $SA \\perp (ABCD)$ suy ra $\\triangle SAB$ vuông tại $A$.',
        'Theo định lý Py-ta-go, cạnh huyền $SB = \\sqrt{SA^2 + AB^2} = \\sqrt{a^2 + a^2} = a\\sqrt{2}$.',
        'Mâu thuẫn trực tiếp với giả thiết $SB = \\dfrac{a}{2}$ (vì $a\\sqrt{2} > \\dfrac{a}{2}$ với mọi $a > 0$).',
      ],
      yeuToPhu: [],
      thongSoBoTri: [],
      yeuCau: ['Tính thể tích khối chóp $S.ABCD$.'],
      isRepresentativeConfig: false,
      issues: [
        {
          severity: 'error',
          code: 'contradiction',
          title: 'Phát hiện mâu thuẫn hình học trong giả thiết',
          detail:
            'Do SA ⊥ (ABCD) nên tam giác SAB vuông tại A, cạnh huyền SB phải bằng √(SA² + AB²) = a√2 > a. Do đó không tồn tại hình chóp nào có đồng thời SA = a, AB = a, SA ⊥ (ABCD) và SB = a/2.',
          suggestedAction:
            'Kiểm tra lại độ dài SB (hoặc bỏ điều kiện SB = a/2, hoặc sửa điều kiện vuông góc). Không thể dựng hình thỏa mãn toàn bộ giả thiết.',
        },
      ],
      canConclude: false,
    },
    model: null,
    hints: {
      phanTichDe:
        'Giả thiết của đề bài đang tự mâu thuẫn nhau trong tam giác vuông $SAB$. Cần kiểm tra lại các độ dài được cho trước khi tìm thể tích.',
      kienThucCanDung: [
        'Trong tam giác vuông, cạnh huyền luôn lớn hơn mỗi cạnh góc vuông và thỏa mãn $SB^2 = SA^2 + AB^2$.',
      ],
      huongGiai:
        'Xét $\\triangle SAB$ vuông tại $A$ (vì $SA \\perp (ABCD)$), tính $SB$ từ $SA = a$ và $AB = a$, sau đó so sánh với giá trị $SB = \\dfrac{a}{2}$ trong đề để chỉ ra sự vô lý và đề nghị hiệu chỉnh đề.',
      progressiveLevels: [],
    },
    solution: null,
    verification: {
      overallStatus: 'blocked',
      summary: 'Hệ thống phát hiện mâu thuẫn toán học và từ chối dựng hình / suy ra kết quả sai.',
      checks: [
        { id: 'c1', label: 'Nhất quán giả thiết', status: 'failed', detail: 'Mâu thuẫn định lý Py-ta-go trong △SAB vuông tại A: a√2 ≠ a/2.' },
        { id: 'c2', label: 'Điều kiện tồn tại hình', status: 'failed', detail: 'Không tồn tại cấu hình 3D thỏa mãn đồng thời mọi dữ kiện.' },
      ],
      coordinateChecks: [],
      unverifiedNotes: [
        'Đề bài không có hình thỏa mãn nên không thể tính thể tích. Vui lòng sửa lại giả thiết.',
      ],
    },
    source: 'verified_preset',
  },
];
