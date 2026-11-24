import React, { useEffect, useRef, useState } from 'react';
import {
  BookMarked,
  Box,
  Download,
  Eraser,
  Loader2,
  Mic,
  Play,
} from 'lucide-react';
import {
  AnalyzedProblem,
  CameraState,
  DisplayOptions,
  ExamItem,
  GeometryModel,
  StepHighlight,
  Vec3,
} from './types/geometry';
import { PROBLEM_LIBRARY } from './geometry/library';
import { analyzeProblemDeterministic } from './geometry/parser';
import { verifyAnalyzedProblem } from './geometry/verifier';
import { moveVertexInModel } from './geometry/vertexDrag';
import {
  addPointToModel,
  addUserConnectionToModel,
  SurfacePointPick,
} from './geometry/interactiveDraw';
import { GeometryViewport3D } from './components/GeometryViewport3D';
import { SolutionDeck } from './components/SolutionDeck';
import { VoiceInputModal } from './components/VoiceInputModal';
import { ProblemLibraryModal } from './components/ProblemLibraryModal';
import { DocxExportModal } from './components/DocxExportModal';
import { GuideModal } from './components/GuideModal';

const QUICK_MATH_SYMBOLS = [
  { label: '⊥', value: ' ⊥ ', title: 'Vuông góc' },
  { label: '∥', value: ' ∥ ', title: 'Song song' },
  { label: '√', value: '√', title: 'Căn bậc hai' },
  { label: '°', value: '°', title: 'Độ' },
  { label: '△', value: '△', title: 'Tam giác' },
  { label: '∠', value: '∠', title: 'Góc' },
  { label: '′', value: "'", title: 'Dấu phẩy đỉnh' },
  { label: '²', value: '²', title: 'Bình phương' },
];

function cameraFromProblem(problem: AnalyzedProblem): CameraState {
  const def = problem.model?.defaultCamera ?? { yaw: -1.08, pitch: 0.32, zoom: 1.0 };
  return {
    yaw: def.yaw,
    pitch: def.pitch,
    zoom: def.zoom,
    panX: 0,
    panY: 0,
    projection: 'perspective',
  };
}

export default function App() {
  const initialProblem = PROBLEM_LIBRARY[0];

  const [inputText, setInputText] = useState(initialProblem.rawText);
  const [activeProblem, setActiveProblem] = useState<AnalyzedProblem>(initialProblem);
  const [originalModel, setOriginalModel] = useState<GeometryModel | null>(
    () => (initialProblem.model ? structuredClone(initialProblem.model) : null)
  );
  const [movedVertexIds, setMovedVertexIds] = useState<string[]>([]);
  const [drawingHistory, setDrawingHistory] = useState<GeometryModel[]>([]);
  const [camera, setCamera] = useState<CameraState>(() => cameraFromProblem(initialProblem));
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showLabels: true,
    showShadedPlanes: true,
    showAuxiliary: true,
    showMarks: true,
  });
  const [activeTab, setActiveTab] = useState<'goi_y' | 'bai_giai'>('goi_y');
  const [mobilePane, setMobilePane] = useState<'3d' | 'solver'>('3d');
  const [activeHighlight, setActiveHighlight] = useState<StepHighlight | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [examItems, setExamItems] = useState<ExamItem[]>([
    {
      uid: `exam-${initialProblem.id}`,
      problem: initialProblem,
    },
  ]);

  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [docxModalOpen, setDocxModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Keyboard Escape closes any open modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVoiceModalOpen(false);
        setLibraryModalOpen(false);
        setDocxModalOpen(false);
        setGuideModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const applyNewProblemState = (prob: AnalyzedProblem, syncText = true) => {
    if (syncText) setInputText(prob.rawText);
    setActiveProblem(prob);
    setOriginalModel(prob.model ? structuredClone(prob.model) : null);
    setMovedVertexIds([]);
    setDrawingHistory([]);
    setCamera(cameraFromProblem(prob));
    setActiveHighlight(null);
    setActiveTab('goi_y');
  };

  const handleMoveVertex = (vertexId: string, nextPos: Vec3) => {
    setActiveProblem((prev) => {
      if (!prev.model) return prev;
      return {
        ...prev,
        model: moveVertexInModel(prev.model, vertexId, nextPos),
      };
    });
    setMovedVertexIds((prev) => (prev.includes(vertexId) ? prev : [...prev, vertexId]));
  };

  const handleAddPoint = (pick: SurfacePointPick) => {
    if (!activeProblem.model) return;
    const prevSnapshot = structuredClone(activeProblem.model);
    const { model: nextModel } = addPointToModel(activeProblem.model, pick);
    setDrawingHistory((hist) => [...hist.slice(-19), prevSnapshot]);
    setActiveProblem((prev) => ({ ...prev, model: nextModel }));
  };

  const handleAddConnection = (
    fromId: string,
    toId: string,
    kind: 'user_segment' | 'user_line'
  ) => {
    if (!activeProblem.model) return;
    const prevSnapshot = structuredClone(activeProblem.model);
    const { model: nextModel, addedEdge } = addUserConnectionToModel(
      activeProblem.model,
      fromId,
      toId,
      kind
    );
    if (!addedEdge) return;
    setDrawingHistory((hist) => [...hist.slice(-19), prevSnapshot]);
    setActiveProblem((prev) => ({ ...prev, model: nextModel }));
  };

  const handleUndoDrawing = () => {
    if (drawingHistory.length === 0) return;
    const previousModel = drawingHistory[drawingHistory.length - 1];
    setDrawingHistory((hist) => hist.slice(0, -1));
    setActiveProblem((prev) => ({ ...prev, model: previousModel }));
  };

  const handleResetModel = () => {
    if (!originalModel) return;
    setActiveProblem((prev) => ({
      ...prev,
      model: structuredClone(originalModel),
    }));
    setMovedVertexIds([]);
    setDrawingHistory([]);
  };

  const handleAnalyze = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text) {
      setStatusMessage('Vui lòng nhập đề bài hoặc chọn một đề mẫu trước khi phân tích.');
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('Đang phân tích đề bài và kiểm tra giả thiết...');

    try {
      // Step 1: Deterministic geometry analysis & 3D model construction
      const baseResult = analyzeProblemDeterministic(text);

      // If matched a verified preset, or has a blocking contradiction/missing data, or already solved deterministically:
      if (
        baseResult.source === 'verified_preset' ||
        !baseResult.structured.canConclude ||
        baseResult.solution !== null
      ) {
        applyNewProblemState(baseResult, false);
        setStatusMessage(null);
        return;
      }

      // Step 2: For custom unsolved problems, request structured AI pedagogy via server route
      setStatusMessage('Đang đối chiếu phân tích nâng cao và kiểm chứng kết quả...');
      try {
        const resp = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: text }),
        });

        if (resp.ok) {
          const payload = await resp.json();
          const aiData = payload?.data;
          if (aiData && typeof aiData === 'object') {
            const merged: AnalyzedProblem = {
              ...baseResult,
              source: 'ai_assisted',
              structured: {
                ...baseResult.structured,
                canConclude:
                  typeof aiData.canConclude === 'boolean'
                    ? aiData.canConclude && baseResult.structured.canConclude
                    : baseResult.structured.canConclude,
                duKienDeBai:
                  Array.isArray(aiData.duKienDeBai) && aiData.duKienDeBai.length > 0
                    ? aiData.duKienDeBai
                    : baseResult.structured.duKienDeBai,
                ketQuaSuyRa:
                  Array.isArray(aiData.ketQuaSuyRa) && aiData.ketQuaSuyRa.length > 0
                    ? aiData.ketQuaSuyRa
                    : baseResult.structured.ketQuaSuyRa,
                yeuToPhu:
                  Array.isArray(aiData.yeuToPhu) && aiData.yeuToPhu.length > 0
                    ? aiData.yeuToPhu
                    : baseResult.structured.yeuToPhu,
                yeuCau:
                  Array.isArray(aiData.yeuCau) && aiData.yeuCau.length > 0
                    ? aiData.yeuCau
                    : baseResult.structured.yeuCau,
              },
              hints: aiData.hints
                ? {
                    phanTichDe: aiData.hints.phanTichDe || baseResult.hints?.phanTichDe || '',
                    kienThucCanDung: Array.isArray(aiData.hints.kienThucCanDung)
                      ? aiData.hints.kienThucCanDung
                      : baseResult.hints?.kienThucCanDung || [],
                    huongGiai: aiData.hints.huongGiai || baseResult.hints?.huongGiai || '',
                    progressiveLevels: Array.isArray(aiData.hints.progressiveLevels)
                      ? aiData.hints.progressiveLevels
                      : [],
                  }
                : baseResult.hints,
              solution:
                aiData.canConclude !== false && aiData.solution?.cacBuocGiai?.length
                  ? {
                      tomTatGiaThietKetLuan: {
                        giaThiet:
                          Array.isArray(aiData.duKienDeBai) && aiData.duKienDeBai.length > 0
                            ? aiData.duKienDeBai
                            : baseResult.structured.duKienDeBai,
                        ketLuan:
                          Array.isArray(aiData.yeuCau) && aiData.yeuCau.length > 0
                            ? aiData.yeuCau
                            : baseResult.structured.yeuCau,
                      },
                      yTuongChinh: aiData.solution.yTuongChinh || '',
                      cacBuocGiai: aiData.solution.cacBuocGiai.map(
                        (s: { title?: string; content?: string; justification?: string }, idx: number) => ({
                          id: `ai-step-${idx + 1}`,
                          title: s.title || `Bước ${idx + 1}`,
                          content: s.content || '',
                          justification: s.justification || '',
                        })
                      ),
                      ketLuanCuoiCung: aiData.solution.ketLuanCuoiCung || '',
                    }
                  : null,
            };
            merged.verification = verifyAnalyzedProblem(merged);
            applyNewProblemState(merged, false);
            setStatusMessage(null);
            return;
          }
        } else {
          const errBody = await resp.json().catch(() => null);
          baseResult.aiNote =
            errBody?.error ||
            'Hệ thống đã dựng mô hình 3D bằng bộ phân tích định danh; dịch vụ phân tích AI máy chủ hiện chưa phản hồi.';
        }
      } catch {
        baseResult.aiNote =
          'Không thể kết nối máy chủ phân tích AI. Ứng dụng đang hiển thị kết quả phân tích và mô hình 3D từ bộ xử lý cục bộ.';
      }

      applyNewProblemState(baseResult, false);
      setStatusMessage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInsertSymbol = (sym: string) => {
    const el = textareaRef.current;
    if (!el) {
      setInputText((prev) => prev + sym);
      return;
    }
    const start = el.selectionStart ?? inputText.length;
    const end = el.selectionEnd ?? inputText.length;
    const next = inputText.slice(0, start) + sym + inputText.slice(end);
    setInputText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + sym.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleClear = () => {
    setInputText('');
    setStatusMessage(null);
    textareaRef.current?.focus();
  };

  const handleAddProblemToExam = (prob: AnalyzedProblem) => {
    setExamItems((prev) => {
      if (prev.some((item) => item.problem.id === prob.id)) return prev;
      return [
        ...prev,
        {
          uid: `exam-${prob.id}-${Date.now()}`,
          problem: prob,
          customCamera: prob.id === activeProblem.id ? { ...camera } : undefined,
        },
      ];
    });
  };

  const examProblemIds = new Set(examItems.map((i) => i.problem.id));

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strictly 3-zone single-row Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <a
            href="#workspace"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Hình Học Không Gian THPT
          </a>

          {/* Zone 2: Concise single-line text nav links */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#workspace"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Giải toán
            </a>
            <button
              type="button"
              onClick={() => setLibraryModalOpen(true)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Kho đề mẫu ({PROBLEM_LIBRARY.length})
            </button>
            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Nhập giọng nói
            </button>
            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Hướng dẫn
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setDocxModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Xuất DOCX ({examItems.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main id="workspace" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Section 2: Problem Input Strip */}
        <section
          aria-label="Ô nhập đề bài toán hình học không gian"
          className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label htmlFor="problem-input" className="text-sm font-semibold text-slate-900">
                Nhập đề bài Hình học không gian
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Hỗ trợ tiếng Việt có dấu, ký hiệu toán học hoặc đọc trực tiếp bằng giọng nói
              </p>
            </div>

            {/* Quick Math Symbol Buttons */}
            <div className="flex flex-wrap items-center gap-1" aria-label="Chèn nhanh ký hiệu toán học">
              {QUICK_MATH_SYMBOLS.map((sym) => (
                <button
                  key={sym.label}
                  type="button"
                  title={sym.title}
                  aria-label={`Chèn ký hiệu ${sym.title}`}
                  onClick={() => handleInsertSymbol(sym.value)}
                  className="w-7 h-7 inline-flex items-center justify-center text-xs font-mono font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 hover:border-slate-300 transition-colors"
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            id="problem-input"
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ví dụ: Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD), SA = a√2. Gọi M là trung điểm của SC. Chứng minh BD vuông góc với mặt phẳng (SAC) và tính khoảng cách từ M đến mặt phẳng (ABCD)."
            className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50/50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 leading-relaxed resize-y"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => void handleAnalyze()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="w-4 h-4" aria-hidden="true" />
                )}
                Phân tích và dựng hình
              </button>

              <button
                type="button"
                onClick={() => setLibraryModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                <BookMarked className="w-4 h-4" aria-hidden="true" />
                Đề mẫu
              </button>

              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0"
              >
                <Mic className="w-4 h-4" aria-hidden="true" />
                Nhập giọng nói
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                <Eraser className="w-4 h-4" aria-hidden="true" />
                Xóa nội dung
              </button>
            </div>

            {statusMessage && (
              <span role="status" className="text-xs font-medium text-blue-700">
                {statusMessage}
              </span>
            )}
          </div>
        </section>

        {/* Mobile View Switcher (keeps mobile clean without vertical clutter) */}
        <div className="flex lg:hidden items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setMobilePane('3d')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              mobilePane === '3d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Box className="w-4 h-4" aria-hidden="true" />
            Hình vẽ 3D
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('solver')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              mobilePane === 'solver' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <BookMarked className="w-4 h-4" aria-hidden="true" />
            Gợi ý &amp; Bài giải
          </button>
        </div>

        {/* Section 3: Two-Column Workspace (Left ~53% 3D Stage, Right ~47% Pedagogy Deck) */}
        <div className="grid grid-cols-1 lg:grid-cols-[53fr_47fr] gap-5 items-start">
          <div className={mobilePane === '3d' ? 'block' : 'hidden lg:block'}>
            <GeometryViewport3D
              problem={activeProblem}
              referenceModel={originalModel}
              camera={camera}
              onCameraChange={setCamera}
              display={displayOptions}
              onDisplayChange={setDisplayOptions}
              highlight={activeHighlight}
              onClearHighlight={() => setActiveHighlight(null)}
              movedVertexIds={movedVertexIds}
              canUndoDrawing={drawingHistory.length > 0}
              onMoveVertex={handleMoveVertex}
              onAddPoint={handleAddPoint}
              onAddConnection={handleAddConnection}
              onUndoDrawing={handleUndoDrawing}
              onResetModel={handleResetModel}
            />
          </div>

          <div className={mobilePane === 'solver' ? 'block' : 'hidden lg:block'}>
            <SolutionDeck
              problem={activeProblem}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              activeHighlight={activeHighlight}
              onSelectHighlight={(hl) => {
                setActiveHighlight(hl);
                if (hl?.showAux && !displayOptions.showAuxiliary) {
                  setDisplayOptions((prev) => ({ ...prev, showAuxiliary: true }));
                }
              }}
              onAddToExam={() => handleAddProblemToExam(activeProblem)}
              isInExam={examProblemIds.has(activeProblem.id)}
              onQuickFixPrompt={(newPrompt) => {
                setInputText(newPrompt);
                void handleAnalyze(newPrompt);
              }}
            />
          </div>
        </div>
      </main>

      {/* Quiet Educational Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 space-y-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-600">
              Hình Học Không Gian THPT – Khám Phá và Giải Toán
            </span>
            <span>
              Mô hình 3D xử lý che khuất theo góc nhìn · Chương trình Toán THPT · Xuất tài liệu Word OMML
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 text-slate-600 leading-relaxed">
            Tác giả: <span className="font-medium text-slate-700">Thầy Trần Công Toàn</span> - Hiệu trưởng trường THPT Đắk Song - ĐT:{' '}
            <a href="tel:0987686733" className="hover:text-blue-700 hover:underline">
              0987686733
            </a>{' '}
            - Email:{' '}
            <a href="mailto:toandml76@gmail.com" className="hover:text-blue-700 hover:underline">
              toandml76@gmail.com
            </a>
            .
          </div>
        </div>
      </footer>

      {/* Modals */}
      <VoiceInputModal
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onApplyText={(text) => {
          setInputText(text);
          void handleAnalyze(text);
        }}
      />

      <ProblemLibraryModal
        open={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        onSelectProblem={(prob) => {
          const verified = { ...structuredClone(prob), verification: verifyAnalyzedProblem(prob) };
          applyNewProblemState(verified, true);
        }}
        onAddProblemToExam={handleAddProblemToExam}
        examProblemIds={examProblemIds}
      />

      <DocxExportModal
        open={docxModalOpen}
        onClose={() => setDocxModalOpen(false)}
        currentProblem={activeProblem}
        currentCamera={camera}
        displayOptions={displayOptions}
        examItems={examItems}
        onUpdateExamItems={setExamItems}
      />

      <GuideModal open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </div>
  );
}
