export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type SolidType =
  | 'pyramid'
  | 'regular_pyramid'
  | 'tetrahedron'
  | 'prism'
  | 'standing_prism'
  | 'regular_prism'
  | 'rectangular_box'
  | 'cube'
  | 'general_box';

export type VertexConstraint =
  | {
      type: 'on_edge';
      from: string;
      to: string;
      t: number;
    }
  | {
      type: 'on_face';
      faceId: string;
      faceLabel: string;
      triVertices: [string, string, string];
      bary: [number, number, number];
    };

export interface GeometryVertex {
  id: string;
  label: string;
  pos: Vec3;
  kind: 'base' | 'apex' | 'top' | 'auxiliary' | 'user';
  description?: string;
  constraint?: VertexConstraint;
}

export interface GeometryEdge {
  id: string;
  from: string;
  to: string;
  kind: 'solid' | 'auxiliary' | 'height' | 'section' | 'extension' | 'user_segment' | 'user_line';
  label?: string;
}

export interface GeometryFace {
  id: string;
  label: string;
  vertices: string[];
  kind: 'solid_boundary' | 'cross_section' | 'highlight_plane';
  defaultVisible?: boolean;
  tint?: string;
}

export interface RightAngleMark {
  id: string;
  vertex: string;
  armA: string;
  armB: string;
  basis: string;
}

export interface EqualLengthMark {
  id: string;
  from: string;
  to: string;
  ticks: 1 | 2 | 3;
  basis: string;
}

export interface MidpointMark {
  id: string;
  point: string;
  from: string;
  to: string;
  basis: string;
}

export interface GeometryModel {
  solidType: SolidType;
  solidTypeLabel: string;
  vertices: GeometryVertex[];
  edges: GeometryEdge[];
  faces: GeometryFace[];
  rightAngles: RightAngleMark[];
  equalMarks: EqualLengthMark[];
  midpoints: MidpointMark[];
  defaultCamera: {
    yaw: number;
    pitch: number;
    zoom: number;
  };
  unitScaleNote?: string;
}

export interface ProblemIssue {
  severity: 'error' | 'warning' | 'info';
  code:
    | 'missing_data'
    | 'contradiction'
    | 'ambiguous_apex'
    | 'ambiguous_notation'
    | 'representative_config'
    | 'unverified_step';
  title: string;
  detail: string;
  suggestedAction?: string;
}

export interface StructuredProblem {
  solidType: SolidType;
  solidName: string;
  solidTypeLabel: string;
  duKienDeBai: string[];
  ketQuaSuyRa: string[];
  yeuToPhu: string[];
  thongSoBoTri: string[];
  yeuCau: string[];
  isRepresentativeConfig: boolean;
  representativeNotice?: string;
  issues: ProblemIssue[];
  canConclude: boolean;
}

export interface HintLevel {
  level: number;
  title: string;
  content: string;
  highlight?: StepHighlight;
}

export interface HintData {
  phanTichDe: string;
  kienThucCanDung: string[];
  huongGiai: string;
  progressiveLevels: HintLevel[];
}

export interface StepHighlight {
  vertices?: string[];
  edges?: Array<[string, string]>;
  planeVertices?: string[];
  planeLabel?: string;
  showAux?: boolean;
}

export interface SolutionStep {
  id: string;
  title: string;
  content: string;
  justification: string;
  highlight?: StepHighlight;
}

export interface SolutionData {
  tomTatGiaThietKetLuan: {
    giaThiet: string[];
    ketLuan: string[];
  };
  yTuongChinh: string;
  cacBuocGiai: SolutionStep[];
  ketLuanCuoiCung: string;
  cachGiaiKhac?: {
    title: string;
    note: string;
    content: string;
  };
}

export interface VerificationCheckItem {
  id: string;
  label: string;
  status: 'passed' | 'warning' | 'failed' | 'unverified';
  detail: string;
}

export interface VerificationReport {
  overallStatus: 'verified' | 'partial' | 'blocked';
  summary: string;
  checks: VerificationCheckItem[];
  coordinateChecks: string[];
  unverifiedNotes: string[];
}

export type DifficultyLevel = 'co_ban' | 'trung_binh' | 'nang_cao';

export interface AnalyzedProblem {
  id: string;
  title: string;
  category: string;
  difficulty: DifficultyLevel;
  topics: string[];
  gradeLevel?: 'Lớp 11' | 'Lớp 12' | 'THPT';
  rawText: string;
  structured: StructuredProblem;
  model: GeometryModel | null;
  hints: HintData | null;
  solution: SolutionData | null;
  verification: VerificationReport;
  source: 'verified_preset' | 'deterministic_engine' | 'ai_assisted';
  aiNote?: string;
}

export interface CameraState {
  yaw: number;
  pitch: number;
  zoom: number;
  panX: number;
  panY: number;
  projection: 'perspective' | 'orthographic';
}

export interface DisplayOptions {
  showLabels: boolean;
  showShadedPlanes: boolean;
  showAuxiliary: boolean;
  showMarks: boolean;
}

export type DocxExportMode = 'de_bai' | 'huong_dan' | 'bai_giai' | 'tong_hop';

export interface ExamItem {
  uid: string;
  problem: AnalyzedProblem;
  customCamera?: CameraState;
}
