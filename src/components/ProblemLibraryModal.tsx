import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AnalyzedProblem, DifficultyLevel } from '../types/geometry';
import {
  ALL_LIBRARY_TOPICS,
  DIFFICULTY_LABELS,
  filterProblemLibrary,
  PROBLEM_LIBRARY,
} from '../geometry/library';

interface ProblemLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelectProblem: (problem: AnalyzedProblem) => void;
  onAddProblemToExam: (problem: AnalyzedProblem) => void;
  examProblemIds: Set<string>;
}

export const ProblemLibraryModal: React.FC<ProblemLibraryModalProps> = ({
  open,
  onClose,
  onSelectProblem,
  onAddProblemToExam,
  examProblemIds,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('Tất cả');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');

  const filtered = useMemo(
    () =>
      filterProblemLibrary(PROBLEM_LIBRARY, {
        search,
        topic: selectedTopic,
        difficulty: selectedDifficulty,
      }),
    [search, selectedTopic, selectedDifficulty]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
    >
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 id="library-modal-title" className="text-base font-semibold text-slate-900">
              Thư viện bài toán Hình học không gian THPT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {PROBLEM_LIBRARY.length} đề bài đã kiểm chứng mô hình 3D, gợi ý sư phạm và lời giải chi tiết (bao gồm đề kiểm thử thiếu dữ kiện &amp; mâu thuẫn)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thư viện đề mẫu"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Tìm kiếm bài toán theo tên khối, chủ đề hoặc từ khóa"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo từ khóa (ví dụ: hình chóp đều, thiết diện, lăng trụ, chéo nhau, thiếu dữ kiện...)"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg shrink-0">
              {(
                [
                  { id: 'all', label: 'Tất cả mức độ' },
                  { id: 'co_ban', label: 'Cơ bản' },
                  { id: 'trung_binh', label: 'Trung bình' },
                  { id: 'nang_cao', label: 'Nâng cao' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedDifficulty(opt.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedDifficulty === opt.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {ALL_LIBRARY_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  selectedTopic === topic
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Hiển thị <strong className="text-slate-900 tabular-nums">{filtered.length}</strong> /{' '}
              {PROBLEM_LIBRARY.length} bài toán
            </span>
            {(search || selectedTopic !== 'Tất cả' || selectedDifficulty !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedTopic('Tất cả');
                  setSelectedDifficulty('all');
                }}
                className="text-blue-700 hover:underline font-medium"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">
              Không tìm thấy bài toán phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
              {filtered.map((p) => {
                const inExam = examProblemIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{p.gradeLevel ?? 'THPT'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{DIFFICULTY_LABELS[p.difficulty]}</span>
                        <span aria-hidden="true">·</span>
                        <span>{p.topics.join(', ')}</span>
                        <span aria-hidden="true">·</span>
                        {p.verification.overallStatus === 'verified' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Đã kiểm chứng
                          </span>
                        ) : p.structured.issues.some((i) => i.code === 'contradiction') ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                            Kiểm thử mâu thuẫn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            Kiểm thử thiếu dữ kiện
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900">{p.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {p.rawText}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProblem(p);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap"
                      >
                        Mở bài toán
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddProblemToExam(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                          inExam
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
                        {inExam ? 'Đã thêm vào đề' : 'Thêm vào đề thi'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
