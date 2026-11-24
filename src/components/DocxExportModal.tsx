import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  AnalyzedProblem,
  CameraState,
  DisplayOptions,
  DocxExportMode,
  ExamItem,
} from '../types/geometry';
import { exportModelToPngBase64 } from '../geometry/canvasRenderer';
import { generateDocxUint8Array } from '../export/docxGenerator';

interface DocxExportModalProps {
  open: boolean;
  onClose: () => void;
  currentProblem: AnalyzedProblem;
  currentCamera: CameraState;
  displayOptions: DisplayOptions;
  examItems: ExamItem[];
  onUpdateExamItems: (items: ExamItem[]) => void;
}

const EXPORT_MODES: Array<{ id: DocxExportMode; label: string; desc: string }> = [
  {
    id: 'de_bai',
    label: '1. Đề bài / Đề thi',
    desc: 'Chỉ gồm danh sách câu hỏi đã chọn, đánh số thứ tự để in phát cho học sinh.',
  },
  {
    id: 'huong_dan',
    label: '2. Hướng dẫn giải',
    desc: 'Đề bài kèm hình vẽ và phần phân tích, kiến thức cần dùng, hướng giải (không lộ đáp án).',
  },
  {
    id: 'bai_giai',
    label: '3. Bài giải đầy đủ',
    desc: 'Đề bài kèm hình vẽ và lời giải chi tiết có công thức Word OMML chỉnh sửa được.',
  },
  {
    id: 'tong_hop',
    label: '4. Bộ tài liệu tổng hợp',
    desc: 'Đầy đủ Đề bài, Hình vẽ sắc nét, Gợi ý tự giải và Bài giải chi tiết.',
  },
];

export const DocxExportModal: React.FC<DocxExportModalProps> = ({
  open,
  onClose,
  currentProblem,
  currentCamera,
  displayOptions,
  examItems,
  onUpdateExamItems,
}) => {
  const [docTitle, setDocTitle] = useState('BỘ BÀI TẬP HÌNH HỌC KHÔNG GIAN THPT');
  const [docSubtitle, setDocSubtitle] = useState('Khổ A4 · Times New Roman cỡ 13 · Công thức Word OMML');
  const [exportMode, setExportMode] = useState<DocxExportMode>('tong_hop');
  const [diagramAngle, setDiagramAngle] = useState<'current' | 'standard'>('current');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  if (!open) return null;

  const currentInList = examItems.some((item) => item.problem.id === currentProblem.id);

  const handleAddCurrent = () => {
    if (currentInList) return;
    onUpdateExamItems([
      ...examItems,
      {
        uid: `${currentProblem.id}-${Date.now()}`,
        problem: currentProblem,
        customCamera: { ...currentCamera },
      },
    ]);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= examItems.length) return;
    const copy = [...examItems];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    onUpdateExamItems(copy);
  };

  const removeItem = (uid: string) => {
    onUpdateExamItems(examItems.filter((item) => item.uid !== uid));
  };

  const handleExport = async () => {
    const sourceList: ExamItem[] =
      examItems.length > 0
        ? examItems
        : [{ uid: 'current', problem: currentProblem, customCamera: currentCamera }];

    setIsExporting(true);
    setExportStatus('Đang kết xuất hình 3D sắc nét và tạo tệp Word (.docx)...');

    try {
      const docxItems = sourceList.map((item, idx) => {
        const model = item.problem.model;
        let diagramPngBase64: string | undefined;
        let diagramCaption: string | undefined;

        if (model) {
          const cam: CameraState =
            diagramAngle === 'current' && item.problem.id === currentProblem.id
              ? currentCamera
              : diagramAngle === 'current' && item.customCamera
                ? item.customCamera
                : {
                    yaw: model.defaultCamera.yaw,
                    pitch: model.defaultCamera.pitch,
                    zoom: model.defaultCamera.zoom,
                    panX: 0,
                    panY: 0,
                    projection: 'perspective',
                  };

          diagramPngBase64 = exportModelToPngBase64(model, cam, displayOptions, 960, 680);
          diagramCaption = `Hình ${idx + 1}: Mô hình ${item.problem.structured.solidName} (${
            diagramAngle === 'current' ? 'góc nhìn đã chọn' : 'góc nhìn chuẩn'
          })`;
        }

        return {
          problem: item.problem,
          diagramPngBase64,
          diagramWidthPx: 960,
          diagramHeightPx: 680,
          diagramCaption,
        };
      });

      const bytes = await generateDocxUint8Array({
        title: docTitle,
        subtitle: docSubtitle,
        mode: exportMode,
        items: docxItems,
      });

      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = docTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      a.href = url;
      a.download = `${safeName || 'hinh-hoc-khong-gian-thpt'}-${exportMode}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      setExportStatus(
        `Đã xuất thành công tệp DOCX (${sourceList.length} câu, chuẩn A4 Times New Roman 13pt, công thức OMML).`
      );
    } catch {
      setExportStatus('Có lỗi xảy ra khi tạo tệp DOCX. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="docx-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 id="docx-modal-title" className="text-base font-semibold text-slate-900">
              Tạo đề thi &amp; Xuất tài liệu Word (.docx)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Khổ giấy A4 · Times New Roman cỡ 13 · Căn đều · Phương trình Word OMML chỉnh sửa trực tiếp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ xuất DOCX"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Exam Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="docx-title-input" className="block text-xs font-semibold text-slate-700">
                Tiêu đề tài liệu / đề thi
              </label>
              <input
                id="docx-title-input"
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="docx-subtitle-input" className="block text-xs font-semibold text-slate-700">
                Phụ đề / Lớp / Thời gian làm bài
              </label>
              <input
                id="docx-subtitle-input"
                type="text"
                value={docSubtitle}
                onChange={(e) => setDocSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Export Mode Radio Grid */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700">
              Chọn nội dung cần xuất
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EXPORT_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setExportMode(m.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    exportMode === m.id
                      ? 'bg-blue-50/70 border-blue-600 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-900">{m.label}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Image Camera View Option */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-800">
              Góc nhìn hình vẽ 3D chèn vào Word:
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => setDiagramAngle('current')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  diagramAngle === 'current'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Góc nhìn hiện tại
              </button>
              <button
                type="button"
                onClick={() => setDiagramAngle('standard')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  diagramAngle === 'standard'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Góc nhìn chuẩn
              </button>
            </div>
          </div>

          {/* Selected Questions List (Reorder / Remove / Add Current) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Danh sách câu hỏi sẽ xuất ({examItems.length > 0 ? examItems.length : 1} câu)
              </span>
              {!currentInList && (
                <button
                  type="button"
                  onClick={handleAddCurrent}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Thêm bài đang xem vào danh sách
                </button>
              )}
            </div>

            {examItems.length === 0 ? (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-600 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Mặc định xuất bài đang mở: <strong className="text-slate-800">{currentProblem.title}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddCurrent}
                  className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  Lưu vào danh sách
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
                {examItems.map((item, idx) => (
                  <div
                    key={item.uid}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        Câu {idx + 1}. {item.problem.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.problem.rawText}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItem(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Đưa Câu ${idx + 1} lên trên`}
                        className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100"
                      >
                        <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(idx, 1)}
                        disabled={idx === examItems.length - 1}
                        aria-label={`Đưa Câu ${idx + 1} xuống dưới`}
                        className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100"
                      >
                        <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.uid)}
                        aria-label={`Xóa Câu ${idx + 1} khỏi danh sách`}
                        className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {exportStatus && (
            <p role="status" className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {exportStatus}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => void handleExport()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            {isExporting ? 'Đang tạo tệp DOCX...' : 'Tải xuống tệp DOCX'}
          </button>
        </div>
      </div>
    </div>
  );
};
