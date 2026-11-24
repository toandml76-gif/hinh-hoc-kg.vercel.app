import {
  CameraState,
  DisplayOptions,
  GeometryEdge,
  GeometryModel,
  StepHighlight,
  Vec2,
  Vec3,
} from '../types/geometry';
import { CameraBasis, computeModelHLR, ProjectedPoint, projectPoint } from './hlr';
import { add3, centroid3, dist3, isPerpendicular, len3, midpoint3, normalize3, scale3, sub3 } from './math3d';

export interface RenderInteractionState {
  hoveredVertexId?: string | null;
  draggedVertexId?: string | null;
  movedVertexIds?: string[];
  referenceBounds?: { target: Vec3; sceneRadius: number } | null;
  pointPreview?: {
    pos2D: Vec2;
    targetType: 'edge' | 'face';
    nextLabel: string;
  } | null;
  lineDraft?: {
    from2D: Vec2;
    to2D: Vec2;
    snappedToVertexId?: string | null;
    mode: 'segment' | 'line';
  } | null;
}

export interface RenderSummary {
  visibleSpanCount: number;
  occludedSpanCount: number;
  partiallyOccludedEdges: number;
  projectedVertices: Map<string, ProjectedPoint>;
  cameraBasis: CameraBasis;
}

function edgeMatchesHighlight(edge: GeometryEdge, hl?: StepHighlight): boolean {
  if (!hl?.edges) return false;
  return hl.edges.some(
    ([a, b]) =>
      (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a)
  );
}

/**
 * Renders the 3D solid onto any 2D Canvas context with:
 * - Analytical hidden-line removal (solid visible spans, dashed occluded spans)
 * - Distinct styling for auxiliary / height / cross-section lines
 * - Lightly shaded planes & highlighted step planes
 * - 3D-projected right-angle markers & equal-length ticks (only when grounded!)
 * - Non-overlapping vertex labels kept inside canvas bounds
 */
export function renderGeometryToCanvas(
  ctx: CanvasRenderingContext2D,
  model: GeometryModel,
  camera: CameraState,
  display: DisplayOptions,
  width: number,
  height: number,
  highlight?: StepHighlight | null,
  backgroundHex = '#FFFFFF',
  interaction?: RenderInteractionState | null
): RenderSummary {
  ctx.save();
  ctx.fillStyle = backgroundHex;
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural drafting dot grid for spatial orientation (only on screen, subtle on white)
  ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
  const gridStep = 28;
  for (let gx = gridStep; gx < width; gx += gridStep) {
    for (let gy = gridStep; gy < height; gy += gridStep) {
      ctx.fillRect(gx, gy, 1.2, 1.2);
    }
  }

  const hlr = computeModelHLR(model, camera, width, height, interaction?.referenceBounds);
  const vMap = new Map<string, Vec3>();
  for (const v of model.vertices) {
    vMap.set(v.id, v.pos);
  }

  // 1. Draw shaded faces (painter's order: farthest first)
  if (display.showShadedPlanes) {
    for (const item of hlr.sortedFaces) {
      const { face, points2D } = item;
      if (points2D.length < 3) continue;

      if (face.kind === 'solid_boundary') {
        ctx.beginPath();
        ctx.moveTo(points2D[0].x, points2D[0].y);
        for (let i = 1; i < points2D.length; i++) {
          ctx.lineTo(points2D[i].x, points2D[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(241, 245, 249, 0.34)';
        ctx.fill();
      } else if (face.kind === 'cross_section' || face.kind === 'highlight_plane') {
        if (!display.showAuxiliary && face.kind === 'highlight_plane') continue;
        ctx.beginPath();
        ctx.moveTo(points2D[0].x, points2D[0].y);
        for (let i = 1; i < points2D.length; i++) {
          ctx.lineTo(points2D[i].x, points2D[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = face.tint ?? 'rgba(29, 78, 216, 0.12)';
        ctx.fill();
      }
    }
  }

  // Active step highlighted plane overlay
  if (highlight?.planeVertices && highlight.planeVertices.length >= 3) {
    const pts2D = highlight.planeVertices
      .map((vid) => hlr.projectedVertices.get(vid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (pts2D.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(pts2D[0].x, pts2D[0].y);
      for (let i = 1; i < pts2D.length; i++) {
        ctx.lineTo(pts2D[i].x, pts2D[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.17)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.45)';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([]);
      ctx.stroke();
    }
  }

  // 2. Draw right-angle markers projected accurately in 3D plane
  if (display.showMarks) {
    const markerSize = Math.max(0.16, hlr.cameraBasis.sceneRadius * 0.11);
    for (const ra of model.rightAngles) {
      const pV = vMap.get(ra.vertex);
      const pA = vMap.get(ra.armA);
      const pB = vMap.get(ra.armB);
      if (!pV || !pA || !pB) continue;

      // Skip right angle involving auxiliary point if auxiliary hidden
      const vObj = model.vertices.find((v) => v.id === ra.vertex);
      const aObj = model.vertices.find((v) => v.id === ra.armA);
      const bObj = model.vertices.find((v) => v.id === ra.armB);
      const usesAux =
        vObj?.kind === 'auxiliary' || aObj?.kind === 'auxiliary' || bObj?.kind === 'auxiliary';
      if (usesAux && !display.showAuxiliary && !highlight?.showAux) continue;

      // Mathematical honesty: only render a 90° marker if the 3D angle is genuinely ~90°
      const armVecA = sub3(pA, pV);
      const armVecB = sub3(pB, pV);
      if (!isPerpendicular(armVecA, armVecB, 0.035)) continue;

      const uA = normalize3(armVecA);
      const uB = normalize3(armVecB);
      const q1 = add3(pV, scale3(uA, markerSize));
      const q2 = add3(q1, scale3(uB, markerSize));
      const q3 = add3(pV, scale3(uB, markerSize));

      const s1 = projectPoint(q1, hlr.cameraBasis);
      const s2 = projectPoint(q2, hlr.cameraBasis);
      const s3 = projectPoint(q3, hlr.cameraBasis);

      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.lineTo(s3.x, s3.y);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([]);
      ctx.stroke();
    }
  }

  // 3. Draw HLR edges — occluded spans first, then visible spans on top
  let visibleSpanCount = 0;
  let occludedSpanCount = 0;
  let partiallyOccludedEdges = 0;

  const drawPass = (wantVisible: boolean) => {
    for (const item of hlr.edgeResults) {
      const { edge, spans } = item;
      const isUserEdge = edge.kind === 'user_segment' || edge.kind === 'user_line';
      const isAux = edge.kind !== 'solid' && !isUserEdge;
      if (isAux && !display.showAuxiliary && !highlight?.showAux && !edgeMatchesHighlight(edge, highlight ?? undefined)) {
        continue;
      }

      if (!wantVisible) {
        const hasVis = spans.some((s) => s.visible);
        const hasOcc = spans.some((s) => !s.visible);
        if (hasVis && hasOcc) partiallyOccludedEdges++;
      }

      const isHighlighted = edgeMatchesHighlight(edge, highlight ?? undefined);

      for (const span of spans) {
        if (span.visible !== wantVisible) continue;
        if (wantVisible) visibleSpanCount++;
        else occludedSpanCount++;

        ctx.beginPath();
        ctx.moveTo(span.start2D.x, span.start2D.y);
        ctx.lineTo(span.end2D.x, span.end2D.y);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isHighlighted) {
          ctx.strokeStyle = '#1D4ED8';
          ctx.lineWidth = wantVisible ? 3.1 : 2.2;
          ctx.setLineDash(wantVisible ? [] : [7, 5]);
        } else if (isUserEdge) {
          // User-drawn segments & lines strictly follow HLR: SOLID when visible, DASHED when occluded!
          ctx.strokeStyle = wantVisible ? '#4338CA' : '#6366F1';
          ctx.lineWidth = wantVisible ? 2.25 : 1.7;
          ctx.setLineDash(wantVisible ? [] : [6, 5]);
        } else if (edge.kind === 'solid') {
          ctx.strokeStyle = wantVisible ? '#0F172A' : '#475569';
          ctx.lineWidth = wantVisible ? 2.15 : 1.55;
          ctx.setLineDash(wantVisible ? [] : [6, 5]);
        } else if (edge.kind === 'section') {
          ctx.strokeStyle = wantVisible ? '#0F766E' : '#14B8A6';
          ctx.lineWidth = wantVisible ? 2.4 : 1.7;
          ctx.setLineDash(wantVisible ? [] : [5, 4]);
        } else if (edge.kind === 'height') {
          ctx.strokeStyle = '#0D9488';
          ctx.lineWidth = wantVisible ? 2.0 : 1.65;
          // Distinct dash-dot pattern for auxiliary heights/lines vs hidden solid edges
          ctx.setLineDash(wantVisible ? [9, 4, 2, 4] : [5, 4, 2, 4]);
        } else {
          ctx.strokeStyle = '#2563EB';
          ctx.lineWidth = wantVisible ? 1.7 : 1.35;
          ctx.setLineDash(wantVisible ? [8, 4, 2, 4] : [4, 4]);
        }

        ctx.stroke();
      }
    }
  };

  drawPass(false);
  drawPass(true);
  ctx.setLineDash([]);

  // 4. Draw equal-length tick marks (only grounded marks)
  if (display.showMarks) {
    for (const eq of model.equalMarks) {
      const pA = hlr.projectedVertices.get(eq.from);
      const pB = hlr.projectedVertices.get(eq.to);
      if (!pA || !pB) continue;

      const vA = model.vertices.find((v) => v.id === eq.from);
      const vB = model.vertices.find((v) => v.id === eq.to);
      if (
        (vA?.kind === 'auxiliary' || vB?.kind === 'auxiliary') &&
        !display.showAuxiliary &&
        !highlight?.showAux
      ) {
        continue;
      }

      // If this equal-length tick belongs to a midpoint that was directly moved off the midpoint, hide false tick
      const mpMatch = model.midpoints.find(
        (mp) =>
          (eq.from === mp.from && eq.to === mp.point) ||
          (eq.from === mp.point && eq.to === mp.to)
      );
      if (mpMatch) {
        const wFrom = vMap.get(mpMatch.from);
        const wTo = vMap.get(mpMatch.to);
        const wPt = vMap.get(mpMatch.point);
        if (wFrom && wTo && wPt && dist3(wPt, midpoint3(wFrom, wTo)) > 0.08) {
          continue;
        }
      }

      const mx = (pA.x + pB.x) * 0.5;
      const my = (pA.y + pB.y) * 0.5;
      const dx = pB.x - pA.x;
      const dy = pB.y - pA.y;
      const l = Math.hypot(dx, dy);
      if (l < 16) continue;
      const nx = -dy / l;
      const ny = dx / l;

      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 1.5;
      for (let t = 0; t < eq.ticks; t++) {
        const offset = (t - (eq.ticks - 1) * 0.5) * 4;
        const cx = mx + (dx / l) * offset;
        const cy = my + (dy / l) * offset;
        ctx.beginPath();
        ctx.moveTo(cx - nx * 4.5, cy - ny * 4.5);
        ctx.lineTo(cx + nx * 4.5, cy + ny * 4.5);
        ctx.stroke();
      }
    }
  }

  // 5. Draw vertex dots and smart non-overlapping labels
  const center3D = centroid3(model.vertices.map((v) => v.pos));
  const center2D = projectPoint(center3D, hlr.cameraBasis);

  interface PlacedLabel {
    id: string;
    label: string;
    vx: number;
    vy: number;
    x: number;
    y: number;
    isAux: boolean;
    isHighlighted: boolean;
  }

  const labels: PlacedLabel[] = [];
  for (const v of model.vertices) {
    const isAux = v.kind === 'auxiliary';
    const isUser = v.kind === 'user';
    const isHl = Boolean(highlight?.vertices?.includes(v.id) || highlight?.vertices?.includes(v.label));
    if (isAux && !display.showAuxiliary && !highlight?.showAux && !isHl) continue;

    const proj = hlr.projectedVertices.get(v.id);
    if (!proj) continue;

    const isDragged = interaction?.draggedVertexId === v.id;
    const isHovered =
      interaction?.hoveredVertexId === v.id || interaction?.lineDraft?.snappedToVertexId === v.id;
    const isMoved = Boolean(interaction?.movedVertexIds?.includes(v.id));

    // Interactive hover / active drag halo ring
    if (isDragged || isHovered) {
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, isDragged ? 11 : 9, 0, Math.PI * 2);
      ctx.fillStyle = isDragged ? 'rgba(29, 78, 216, 0.18)' : 'rgba(67, 56, 202, 0.13)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isDragged ? '#1D4ED8' : 'rgba(67, 56, 202, 0.72)';
      ctx.stroke();
    }

    // Draw vertex point
    ctx.beginPath();
    ctx.arc(
      proj.x,
      proj.y,
      isDragged ? 5.6 : isHovered ? 5.0 : isHl ? 4.8 : isUser ? 4.2 : isAux ? 3.6 : 3.2,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = isDragged
      ? '#1D4ED8'
      : isHovered
        ? '#4338CA'
        : isMoved
          ? '#D97706'
          : isUser
            ? '#4338CA'
            : isHl
              ? '#1D4ED8'
              : isAux
                ? '#0F766E'
                : '#0F172A';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    if (display.showLabels) {
      let rx = proj.x - center2D.x;
      let ry = proj.y - center2D.y;
      const rl = Math.hypot(rx, ry);
      if (rl < 1e-3) {
        rx = 0;
        ry = -1;
      } else {
        rx /= rl;
        ry /= rl;
      }
      const distOff = v.kind === 'apex' ? 18 : 16;
      labels.push({
        id: v.id,
        label: v.label,
        vx: proj.x,
        vy: proj.y,
        x: proj.x + rx * distOff,
        y: proj.y + ry * distOff,
        isAux: isAux || isUser,
        isHighlighted: isHl || isUser,
      });
    }
  }

  // Iterative pairwise repulsion to prevent label overlap + clamp strictly inside canvas
  for (let iter = 0; iter < 12; iter++) {
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minSep = 22;
        if (d < minSep) {
          const ux = d > 1e-3 ? dx / d : 1;
          const uy = d > 1e-3 ? dy / d : 0;
          const push = (minSep - d) * 0.5;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
      // Clamp within safe padding
      const pad = 18;
      labels[i].x = Math.max(pad, Math.min(width - pad, labels[i].x));
      labels[i].y = Math.max(pad, Math.min(height - pad, labels[i].y));
    }
  }

  // Render labels with crisp white halo for instant legibility over lines
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const lb of labels) {
    const isUserLabel = model.vertices.find((v) => v.id === lb.id)?.kind === 'user';
    ctx.font = lb.isHighlighted
      ? '700 15px "Plus Jakarta Sans", sans-serif'
      : '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.strokeText(lb.label, lb.x, lb.y);
    ctx.fillStyle = isUserLabel
      ? '#4338CA'
      : lb.isHighlighted
        ? '#1D4ED8'
        : lb.isAux
          ? '#0F766E'
          : '#0F172A';
    ctx.fillText(lb.label, lb.x, lb.y);
  }

  // 6. Live interactive drawing previews (point placement & rubber-band line/segment draft)
  if (interaction?.pointPreview) {
    const { pos2D, targetType, nextLabel } = interaction.pointPreview;
    ctx.beginPath();
    ctx.arc(pos2D.x, pos2D.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = targetType === 'edge' ? 'rgba(67, 56, 202, 0.16)' : 'rgba(13, 148, 136, 0.16)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = targetType === 'edge' ? '#4338CA' : '#0D9488';
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pos2D.x, pos2D.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = targetType === 'edge' ? '#4338CA' : '#0D9488';
    ctx.fill();

    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeText(nextLabel, pos2D.x + 14, pos2D.y - 12);
    ctx.fillStyle = targetType === 'edge' ? '#4338CA' : '#0D9488';
    ctx.fillText(nextLabel, pos2D.x + 14, pos2D.y - 12);
  }

  if (interaction?.lineDraft) {
    const { from2D, to2D, mode } = interaction.lineDraft;
    let drawStart = from2D;
    let drawEnd = to2D;
    if (mode === 'line') {
      const dx = to2D.x - from2D.x;
      const dy = to2D.y - from2D.y;
      const l = Math.hypot(dx, dy);
      if (l > 4) {
        const extPx = 42;
        drawStart = { x: from2D.x - (dx / l) * extPx, y: from2D.y - (dy / l) * extPx };
        drawEnd = { x: to2D.x + (dx / l) * extPx, y: to2D.y + (dy / l) * extPx };
      }
    }
    ctx.beginPath();
    ctx.moveTo(drawStart.x, drawStart.y);
    ctx.lineTo(drawEnd.x, drawEnd.y);
    ctx.strokeStyle = '#4338CA';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
  return {
    visibleSpanCount,
    occludedSpanCount,
    partiallyOccludedEdges,
    projectedVertices: hlr.projectedVertices,
    cameraBasis: hlr.cameraBasis,
  };
}

/**
 * Renders a crisp high-DPI PNG (base64 data without header) for embedding inside DOCX.
 */
export function exportModelToPngBase64(
  model: GeometryModel,
  camera: CameraState,
  display: DisplayOptions,
  width = 960,
  height = 680
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  renderGeometryToCanvas(ctx, model, camera, display, width, height, null, '#FFFFFF');
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}
