import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CornerUpLeft,
  Eye,
  EyeOff,
  Hand,
  Layers,
  Maximize2,
  Minus,
  Move,
  RotateCcw,
  ShieldAlert,
  Spline,
  Tag,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AnalyzedProblem,
  CameraState,
  DisplayOptions,
  GeometryModel,
  StepHighlight,
  Vec2,
  Vec3,
} from '../types/geometry';
import { renderGeometryToCanvas } from '../geometry/canvasRenderer';
import { CameraBasis, ProjectedPoint } from '../geometry/hlr';
import {
  computeDraggedVertexPosition,
  computeModelReferenceBounds,
  findClosestVertexAtScreenPos,
} from '../geometry/vertexDrag';
import {
  getNextPointLabel,
  pickPointOnEdgeOrFace,
  SurfacePointPick,
} from '../geometry/interactiveDraw';

export type ViewportToolMode = 'drag' | 'add_point' | 'draw_segment' | 'draw_line';

interface GeometryViewport3DProps {
  problem: AnalyzedProblem;
  referenceModel?: GeometryModel | null;
  camera: CameraState;
  onCameraChange: (next: CameraState) => void;
  display: DisplayOptions;
  onDisplayChange: (next: DisplayOptions) => void;
  highlight: StepHighlight | null;
  onClearHighlight?: () => void;
  movedVertexIds?: string[];
  canUndoDrawing?: boolean;
  onMoveVertex?: (vertexId: string, nextPos: Vec3) => void;
  onAddPoint?: (pick: SurfacePointPick) => void;
  onAddConnection?: (fromId: string, toId: string, kind: 'user_segment' | 'user_line') => void;
  onUndoDrawing?: () => void;
  onResetModel?: () => void;
}

export const GeometryViewport3D: React.FC<GeometryViewport3DProps> = ({
  problem,
  referenceModel,
  camera,
  onCameraChange,
  display,
  onDisplayChange,
  highlight,
  onClearHighlight,
  movedVertexIds = [],
  canUndoDrawing = false,
  onMoveVertex,
  onAddPoint,
  onAddConnection,
  onUndoDrawing,
  onResetModel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastProjectionRef = useRef<{
    projectedVertices: Map<string, ProjectedPoint>;
    cameraBasis: CameraBasis;
  } | null>(null);
  const dragRef = useRef<{
    active: boolean;
    mode: 'orbit' | 'pan' | 'vertex' | 'draw';
    lastX: number;
    lastY: number;
    vertexId?: string;
    startClientX?: number;
    startClientY?: number;
    initialWorldPos?: Vec3;
    frozenCamBasis?: CameraBasis;
    drawFromId?: string;
    drawFrom2D?: Vec2;
  }>({ active: false, mode: 'orbit', lastX: 0, lastY: 0 });
  const pinchDistRef = useRef<number | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 375 });
  const [toolMode, setToolMode] = useState<ViewportToolMode>('drag');
  const [hoveredVertexId, setHoveredVertexId] = useState<string | null>(null);
  const [draggedVertexId, setDraggedVertexId] = useState<string | null>(null);
  const [pointPreview, setPointPreview] = useState<SurfacePointPick | null>(null);
  const [lineDraft, setLineDraft] = useState<{
    fromId: string;
    from2D: Vec2;
    to2D: Vec2;
    snappedToVertexId: string | null;
    mode: 'segment' | 'line';
  } | null>(null);
  const [vertexScreenJson, setVertexScreenJson] = useState('{}');
  const [hlrSummary, setHlrSummary] = useState<{
    visibleSpanCount: number;
    occludedSpanCount: number;
    partiallyOccludedEdges: number;
  }>({
    visibleSpanCount: 0,
    occludedSpanCount: 0,
    partiallyOccludedEdges: 0,
  });

  const model = problem.model;
  const userVertices = useMemo(
    () => model?.vertices.filter((v) => v.kind === 'user') ?? [],
    [model]
  );
  const userEdges = useMemo(
    () =>
      model?.edges.filter((e) => e.kind === 'user_segment' || e.kind === 'user_line') ?? [],
    [model]
  );
  const hasCustomEdits =
    movedVertexIds.length > 0 || userVertices.length > 0 || userEdges.length > 0;
  const nextPointLabel = useMemo(() => (model ? getNextPointLabel(model) : 'E'), [model]);

  // Keep camera target & auto-scale anchored to the original problem geometry so dragging/drawing
  // keeps every other vertex rock-steady on screen without centroid or zoom drift.
  const referenceBounds = useMemo(() => {
    const base = referenceModel ?? model;
    return base ? computeModelReferenceBounds(base) : null;
  }, [referenceModel, model ? problem.id : null]);

  // Observe container resize for crisp high-DPI rendering
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(280, Math.floor(rect.width));
      const h = Math.max(290, Math.min(378, Math.floor(w * 0.53)));
      setCanvasSize({ width: w, height: h });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clear transient hover/draft overlays when tool mode or problem changes
  useEffect(() => {
    setPointPreview(null);
    setLineDraft(null);
    setHoveredVertexId(null);
  }, [toolMode, problem.id]);

  // Re-render canvas whenever model, camera, display options, size, highlight, or interactive state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !model) {
      lastProjectionRef.current = null;
      return;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvasSize.width * dpr);
    canvas.height = Math.floor(canvasSize.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const summary = renderGeometryToCanvas(
      ctx,
      model,
      camera,
      display,
      canvasSize.width,
      canvasSize.height,
      highlight,
      '#FFFFFF',
      {
        hoveredVertexId: toolMode !== 'add_point' ? hoveredVertexId : null,
        draggedVertexId,
        movedVertexIds,
        referenceBounds,
        pointPreview:
          toolMode === 'add_point' && pointPreview
            ? {
                pos2D: pointPreview.pos2D,
                targetType: pointPreview.targetType,
                nextLabel: nextPointLabel,
              }
            : null,
        lineDraft: lineDraft
          ? {
              from2D: lineDraft.from2D,
              to2D: lineDraft.to2D,
              snappedToVertexId: lineDraft.snappedToVertexId,
              mode: lineDraft.mode,
            }
          : null,
      }
    );
    lastProjectionRef.current = {
      projectedVertices: summary.projectedVertices,
      cameraBasis: summary.cameraBasis,
    };

    const screenMap: Record<string, [number, number]> = {};
    summary.projectedVertices.forEach((pt, id) => {
      screenMap[id] = [Math.round(pt.x), Math.round(pt.y)];
    });
    setVertexScreenJson(JSON.stringify(screenMap));
    setHlrSummary({
      visibleSpanCount: summary.visibleSpanCount,
      occludedSpanCount: summary.occludedSpanCount,
      partiallyOccludedEdges: summary.partiallyOccludedEdges,
    });
  }, [
    model,
    camera,
    display,
    canvasSize,
    highlight,
    toolMode,
    hoveredVertexId,
    draggedVertexId,
    movedVertexIds,
    referenceBounds,
    pointPreview,
    nextPointLabel,
    lineDraft,
  ]);

  const getLocalCoords = (e: React.PointerEvent<HTMLCanvasElement>): Vec2 => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!model) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const isPan = e.button === 2 || e.shiftKey;
    const local = getLocalCoords(e);
    const hitRadius = e.pointerType === 'touch' ? 22 : 16;

    // 1. Add Point mode: click on an edge or plane to place a new point immediately
    if (toolMode === 'add_point' && !isPan && onAddPoint && lastProjectionRef.current) {
      const pick = pickPointOnEdgeOrFace(
        local,
        model,
        lastProjectionRef.current.projectedVertices,
        lastProjectionRef.current.cameraBasis,
        display,
        13
      );
      if (pick) {
        onAddPoint(pick);
        setPointPreview(null);
        return;
      }
      // Clicked empty space -> allow orbit smoothly
    }

    // 2. Draw Segment / Line mode: drag from one point to another
    if (
      (toolMode === 'draw_segment' || toolMode === 'draw_line') &&
      !isPan &&
      onAddConnection &&
      lastProjectionRef.current
    ) {
      const hitId = findClosestVertexAtScreenPos(
        local,
        model,
        lastProjectionRef.current.projectedVertices,
        display,
        hitRadius + 2
      );
      if (hitId) {
        const proj = lastProjectionRef.current.projectedVertices.get(hitId);
        if (proj) {
          const from2D = { x: proj.x, y: proj.y };
          dragRef.current = {
            active: true,
            mode: 'draw',
            lastX: e.clientX,
            lastY: e.clientY,
            drawFromId: hitId,
            drawFrom2D: from2D,
          };
          setLineDraft({
            fromId: hitId,
            from2D,
            to2D: local,
            snappedToVertexId: null,
            mode: toolMode === 'draw_line' ? 'line' : 'segment',
          });
          return;
        }
      }
    }

    // 3. Drag Point mode: grab any existing point directly
    if (toolMode === 'drag' && !isPan && onMoveVertex && lastProjectionRef.current) {
      const hitId = findClosestVertexAtScreenPos(
        local,
        model,
        lastProjectionRef.current.projectedVertices,
        display,
        hitRadius
      );
      if (hitId) {
        const targetVertex = model.vertices.find((v) => v.id === hitId);
        if (targetVertex) {
          dragRef.current = {
            active: true,
            mode: 'vertex',
            lastX: e.clientX,
            lastY: e.clientY,
            vertexId: hitId,
            startClientX: e.clientX,
            startClientY: e.clientY,
            initialWorldPos: { ...targetVertex.pos },
            frozenCamBasis: lastProjectionRef.current.cameraBasis,
          };
          setDraggedVertexId(hitId);
          setHoveredVertexId(hitId);
          return;
        }
      }
    }

    dragRef.current = {
      active: true,
      mode: isPan ? 'pan' : 'orbit',
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!model) return;
    const local = getLocalCoords(e);

    if (!dragRef.current.active) {
      if (!lastProjectionRef.current) return;

      if (toolMode === 'add_point') {
        const pick = pickPointOnEdgeOrFace(
          local,
          model,
          lastProjectionRef.current.projectedVertices,
          lastProjectionRef.current.cameraBasis,
          display,
          13
        );
        setPointPreview(pick);
        return;
      }

      if (
        (toolMode === 'drag' && onMoveVertex) ||
        ((toolMode === 'draw_segment' || toolMode === 'draw_line') && onAddConnection)
      ) {
        const hitId = findClosestVertexAtScreenPos(
          local,
          model,
          lastProjectionRef.current.projectedVertices,
          display,
          toolMode === 'drag' ? 16 : 18
        );
        if (hitId !== hoveredVertexId) {
          setHoveredVertexId(hitId);
        }
      } else if (hoveredVertexId !== null) {
        setHoveredVertexId(null);
      }
      return;
    }

    // Active drag-to-draw line/segment
    if (
      dragRef.current.mode === 'draw' &&
      dragRef.current.drawFromId &&
      dragRef.current.drawFrom2D &&
      lastProjectionRef.current
    ) {
      const targetHit = findClosestVertexAtScreenPos(
        local,
        model,
        lastProjectionRef.current.projectedVertices,
        display,
        20
      );
      const validSnapId = targetHit && targetHit !== dragRef.current.drawFromId ? targetHit : null;
      const snapProj = validSnapId
        ? lastProjectionRef.current.projectedVertices.get(validSnapId)
        : null;
      setLineDraft({
        fromId: dragRef.current.drawFromId,
        from2D: dragRef.current.drawFrom2D,
        to2D: snapProj ? { x: snapProj.x, y: snapProj.y } : local,
        snappedToVertexId: validSnapId,
        mode: toolMode === 'draw_line' ? 'line' : 'segment',
      });
      return;
    }

    // Active vertex drag
    if (
      dragRef.current.mode === 'vertex' &&
      dragRef.current.vertexId &&
      dragRef.current.initialWorldPos &&
      dragRef.current.frozenCamBasis &&
      onMoveVertex
    ) {
      const totalDx = e.clientX - (dragRef.current.startClientX ?? e.clientX);
      const totalDy = e.clientY - (dragRef.current.startClientY ?? e.clientY);
      const nextPos = computeDraggedVertexPosition(
        dragRef.current.initialWorldPos,
        { x: totalDx, y: totalDy },
        dragRef.current.frozenCamBasis
      );
      onMoveVertex(dragRef.current.vertexId, nextPos);
      return;
    }

    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    if (dragRef.current.mode === 'pan') {
      const maxPan = Math.min(canvasSize.width, canvasSize.height) * 0.35;
      onCameraChange({
        ...camera,
        panX: Math.max(-maxPan, Math.min(maxPan, camera.panX + dx)),
        panY: Math.max(-maxPan, Math.min(maxPan, camera.panY + dy)),
      });
    } else {
      const nextPitch = Math.max(
        -Math.PI / 2 + 0.08,
        Math.min(Math.PI / 2 - 0.08, camera.pitch + dy * 0.0085)
      );
      onCameraChange({
        ...camera,
        yaw: camera.yaw - dx * 0.0095,
        pitch: nextPitch,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (
      dragRef.current.active &&
      dragRef.current.mode === 'draw' &&
      dragRef.current.drawFromId &&
      onAddConnection &&
      model &&
      lastProjectionRef.current
    ) {
      const local = getLocalCoords(e);
      const hitEndId = findClosestVertexAtScreenPos(
        local,
        model,
        lastProjectionRef.current.projectedVertices,
        display,
        22
      );
      if (hitEndId && hitEndId !== dragRef.current.drawFromId) {
        onAddConnection(
          dragRef.current.drawFromId,
          hitEndId,
          toolMode === 'draw_line' ? 'user_line' : 'user_segment'
        );
      }
      setLineDraft(null);
    }

    dragRef.current.active = false;
    setDraggedVertexId(null);
  };

  const handlePointerLeave = () => {
    if (!dragRef.current.active) {
      setHoveredVertexId(null);
      setPointPreview(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!model) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.09 : 0.92;
    const nextZoom = Math.max(0.55, Math.min(2.2, camera.zoom * factor));
    onCameraChange({ ...camera, zoom: nextZoom });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && model) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (pinchDistRef.current !== null && pinchDistRef.current > 0) {
        const scale = dist / pinchDistRef.current;
        onCameraChange({
          ...camera,
          zoom: Math.max(0.55, Math.min(2.2, camera.zoom * scale)),
        });
      }
      pinchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    pinchDistRef.current = null;
  };

  const resetCamera = () => {
    const def = model?.defaultCamera ?? { yaw: -1.08, pitch: 0.32, zoom: 1 };
    onCameraChange({
      yaw: def.yaw,
      pitch: def.pitch,
      zoom: def.zoom,
      panX: 0,
      panY: 0,
      projection: 'perspective',
    });
  };

  const setTopView = () => {
    onCameraChange({
      ...camera,
      yaw: 0.02,
      pitch: Math.PI / 2 - 0.06,
      panX: 0,
      panY: 0,
      projection: 'orthographic',
    });
  };

  const setFrontView = () => {
    onCameraChange({
      ...camera,
      yaw: Math.PI / 2,
      pitch: 0.04,
      panX: 0,
      panY: 0,
      projection: 'orthographic',
    });
  };

  const setPerspectiveView = () => {
    const def = model?.defaultCamera ?? { yaw: -1.08, pitch: 0.32, zoom: 1 };
    onCameraChange({
      yaw: def.yaw,
      pitch: def.pitch,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      projection: 'perspective',
    });
  };

  const adjustZoom = (delta: number) => {
    onCameraChange({
      ...camera,
      zoom: Math.max(0.55, Math.min(2.2, Number((camera.zoom + delta).toFixed(2)))),
    });
  };

  const getInteractiveHintText = (): string => {
    if (!model) return '';
    if (toolMode === 'add_point') {
      if (pointPreview) {
        return `Nhấn để đặt điểm ${nextPointLabel} thuộc ${pointPreview.targetLabel}`;
      }
      return 'Di chuột vào một cạnh hoặc mặt phẳng bất kỳ trên hình rồi nhấn để đặt điểm mới';
    }
    if (toolMode === 'draw_segment' || toolMode === 'draw_line') {
      const shapeName = toolMode === 'draw_line' ? 'đường thẳng' : 'đoạn thẳng';
      if (lineDraft) {
        const fromLabel = model.vertices.find((v) => v.id === lineDraft.fromId)?.label ?? '';
        const toLabel = lineDraft.snappedToVertexId
          ? model.vertices.find((v) => v.id === lineDraft.snappedToVertexId)?.label
          : null;
        return toLabel
          ? `Thả chuột để vẽ ${shapeName} ${fromLabel}${toLabel} (tự động xử lý nét liền / nét đứt)`
          : `Đang kéo từ điểm ${fromLabel} — đưa tới một điểm khác rồi thả chuột để vẽ ${shapeName}`;
      }
      if (hoveredVertexId) {
        const hLabel = model.vertices.find((v) => v.id === hoveredVertexId)?.label ?? '';
        return `Nhấn giữ tại điểm ${hLabel} và kéo đến điểm khác để vẽ ${shapeName}`;
      }
      return `Nhấn giữ từ một điểm và kéo đến điểm khác để vẽ ${shapeName} (nét đứt nếu khuất, nét liền nếu thấy)`;
    }

    const activeV = draggedVertexId
      ? model.vertices.find((v) => v.id === draggedVertexId)
      : hoveredVertexId
        ? model.vertices.find((v) => v.id === hoveredVertexId)
        : null;
    if (draggedVertexId && activeV) {
      return `Đang di chuyển điểm ${activeV.label} (${activeV.pos.x.toFixed(2)}, ${activeV.pos.y.toFixed(2)}, ${activeV.pos.z.toFixed(2)})`;
    }
    if (hoveredVertexId && activeV) {
      return `Kéo điểm ${activeV.label} để di chuyển trực tiếp trên hình 3D`;
    }
    return 'Kéo trực tiếp điểm để thay đổi hình · Kéo vùng trống để xoay 360° · Shift + kéo để dịch khung';
  };

  return (
    <section
      aria-label="Khung hình vẽ 3D tương tác"
      className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Row 1: Camera Presets, Undo/Reset & Zoom */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3.5 py-2 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={resetCamera}
            title="Góc nhìn ban đầu"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Góc gốc
          </button>
          <button
            type="button"
            onClick={setTopView}
            className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Trên xuống
          </button>
          <button
            type="button"
            onClick={setFrontView}
            className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Phía trước
          </button>
          <button
            type="button"
            onClick={setPerspectiveView}
            className={`px-2 py-1 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
              camera.projection === 'perspective'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Phối cảnh
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {canUndoDrawing && onUndoDrawing && (
            <button
              type="button"
              onClick={onUndoDrawing}
              title="Hoàn tác nét vẽ vừa tạo"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              <CornerUpLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Hoàn tác
            </button>
          )}
          {hasCustomEdits && onResetModel && (
            <button
              type="button"
              onClick={onResetModel}
              title="Khôi phục hình gốc"
              aria-label="Khôi phục hình gốc"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              Khôi phục
            </button>
          )}
          <button
            type="button"
            onClick={() => adjustZoom(-0.15)}
            aria-label="Thu nhỏ hình 3D"
            className="p-1 text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
          >
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => adjustZoom(0.15)}
            aria-label="Phóng to hình 3D"
            className="p-1 text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Row 2: Interactive 3D Drawing Tools Strip */}
      {model && (onMoveVertex || onAddPoint || onAddConnection) && (
        <div
          role="toolbar"
          aria-label="Công cụ tương tác và vẽ trên hình 3D"
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-200 bg-white"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Công cụ:</span>
            <button
              type="button"
              aria-pressed={toolMode === 'drag'}
              onClick={() => setToolMode('drag')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                toolMode === 'drag'
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Hand className="w-3.5 h-3.5" aria-hidden="true" />
              Kéo điểm
            </button>
            {onAddPoint && (
              <button
                type="button"
                aria-pressed={toolMode === 'add_point'}
                onClick={() => setToolMode('add_point')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  toolMode === 'add_point'
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CircleDot className="w-3.5 h-3.5" aria-hidden="true" />
                Thêm điểm
              </button>
            )}
            {onAddConnection && (
              <>
                <button
                  type="button"
                  aria-pressed={toolMode === 'draw_segment'}
                  onClick={() => setToolMode('draw_segment')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    toolMode === 'draw_segment'
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  Đoạn thẳng
                </button>
                <button
                  type="button"
                  aria-pressed={toolMode === 'draw_line'}
                  onClick={() => setToolMode('draw_line')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    toolMode === 'draw_line'
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Spline className="w-3.5 h-3.5" aria-hidden="true" />
                  Đường thẳng
                </button>
              </>
            )}
          </div>

          {(userVertices.length > 0 || userEdges.length > 0) && (
            <span className="text-[11px] font-medium text-indigo-700 tabular-nums whitespace-nowrap">
              Đã vẽ: {userVertices.length} điểm · {userEdges.length} nét nối
            </span>
          )}
        </div>
      )}

      {/* Interactive 3D Canvas Stage */}
      <div ref={containerRef} className="relative w-full bg-white select-none">
        {model ? (
          <>
            <canvas
              ref={canvasRef}
              data-testid="geometry-canvas"
              data-tool-mode={toolMode}
              data-hlr-visible={hlrSummary.visibleSpanCount}
              data-hlr-occluded={hlrSummary.occludedSpanCount}
              data-camera-yaw={camera.yaw.toFixed(2)}
              data-camera-pitch={camera.pitch.toFixed(2)}
              data-moved-vertices={movedVertexIds.join(',')}
              data-user-vertices={userVertices.map((v) => v.label).join(',')}
              data-user-edges={userEdges.map((e) => `${e.kind}:${e.from}-${e.to}`).join(',')}
              data-vertex-screen={vertexScreenJson}
              style={{ width: canvasSize.width, height: canvasSize.height }}
              className={`block w-full touch-none ${
                toolMode === 'add_point'
                  ? pointPreview
                    ? 'cursor-crosshair'
                    : 'cursor-default'
                  : toolMode === 'draw_segment' || toolMode === 'draw_line'
                    ? 'cursor-crosshair'
                    : draggedVertexId
                      ? 'cursor-grabbing'
                      : hoveredVertexId
                        ? 'cursor-move'
                        : 'cursor-grab active:cursor-grabbing'
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onWheel={handleWheel}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
            />

            {/* Subtle interaction hint bottom-left */}
            <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-2 text-[11px] text-slate-600 bg-white/92 px-2 py-0.5 rounded">
              <Move className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>{getInteractiveHintText()}</span>
            </div>

            {highlight && onClearHighlight && (
              <div className="absolute top-2.5 right-3 flex items-center gap-2 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md text-xs text-blue-800">
                <span>Đang làm nổi bật đối tượng của bước giải</span>
                <button
                  type="button"
                  onClick={onClearHighlight}
                  className="font-semibold underline hover:text-blue-950"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16 min-h-[340px] bg-slate-50/60">
            <ShieldAlert className="w-10 h-10 text-red-600 mb-3" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Không thể dựng hình 3D thỏa mãn toàn bộ giả thiết
            </h3>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              {problem.structured.issues[0]?.detail ||
                'Đề bài có mâu thuẫn hình học hoặc chưa đủ thông tin xác định khối đa diện. Vui lòng chỉnh lại đề bài ở ô phía trên.'}
            </p>
          </div>
        )}
      </div>

      {/* Display Toggles Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-slate-200 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={display.showLabels}
            onClick={() => onDisplayChange({ ...display, showLabels: !display.showLabels })}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              display.showLabels
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-3.5 h-3.5" aria-hidden="true" />
            Tên điểm
          </button>

          <button
            type="button"
            aria-pressed={display.showShadedPlanes}
            onClick={() =>
              onDisplayChange({ ...display, showShadedPlanes: !display.showShadedPlanes })
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              display.showShadedPlanes
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            Mặt phẳng
          </button>

          <button
            type="button"
            aria-pressed={display.showAuxiliary}
            onClick={() => onDisplayChange({ ...display, showAuxiliary: !display.showAuxiliary })}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              display.showAuxiliary
                ? 'bg-teal-700 text-white border-teal-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {display.showAuxiliary ? (
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Đường phụ
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            onCameraChange({
              ...camera,
              panX: 0,
              panY: 0,
              zoom: 1.0,
            })
          }
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
        >
          <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          Căn giữa khung
        </button>
      </div>

      {/* Legend & Verification Footer */}
      <div className="px-4 py-2.5 border-t border-slate-200 bg-white space-y-2">
        {/* Visual Key for Solid vs Hidden vs Auxiliary */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-600">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block w-5 h-0.5 bg-slate-900 rounded" aria-hidden="true" />
            <span>Nét liền: Thấy</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="inline-block w-5 border-t-2 border-dashed border-slate-500"
              aria-hidden="true"
            />
            <span>Nét đứt: Khuất</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="inline-block w-5 border-t-2 border-dotted border-teal-600"
              aria-hidden="true"
            />
            <span>Xanh: Đường phụ</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block w-5 h-0.5 bg-indigo-700 rounded" aria-hidden="true" />
            <span>Chàm: Tự vẽ (liền/đứt)</span>
          </span>
        </div>

        {/* Representative configuration warning if under-constrained */}
        {problem.structured.isRepresentativeConfig && problem.structured.representativeNotice && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{problem.structured.representativeNotice}</span>
          </div>
        )}

        {/* Verification status line (explicit icon + text, zero decorative pulsing dots) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            {movedVertexIds.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                <span className="font-medium text-amber-800">
                  Khám phá trực quan (đã di chuyển điểm:{' '}
                  {movedVertexIds
                    .map((id) => model?.vertices.find((v) => v.id === id)?.label ?? id)
                    .join(', ')}
                  ) — có thể khác giả thiết ban đầu
                </span>
              </>
            ) : problem.verification.overallStatus === 'verified' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span className="font-medium text-emerald-800">
                  Đã kiểm chứng hình học &amp; tọa độ 3D
                </span>
              </>
            ) : problem.verification.overallStatus === 'partial' ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                <span className="font-medium text-amber-800">
                  Cần đối chiếu thêm giả thiết / bước chứng minh
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                <span className="font-medium text-red-800">
                  Chặn kết luận: đề thiếu dữ kiện hoặc mâu thuẫn
                </span>
              </>
            )}
          </div>
          <span className="text-slate-500">
            {problem.structured.solidTypeLabel} · {problem.structured.solidName}
          </span>
        </div>
      </div>
    </section>
  );
};
