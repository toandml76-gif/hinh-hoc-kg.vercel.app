import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  FilePlus2,
  Lightbulb,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { AnalyzedProblem, StepHighlight } from '../types/geometry';
import { MathText } from './MathText';

interface SolutionDeckProps {
  problem: AnalyzedProblem;
  activeTab: 'goi_y' | 'bai_giai';
  onTabChange: (tab: 'goi_y' | 'bai_giai') => void;
  activeHighlight: StepHighlight | null;
  onSelectHighlight: (hl: StepHighlight | null) => void;
  onAddToExam: () => void;
  isInExam: boolean;
  onQuickFixPrompt?: (suggestionText: string) => void;
}

export const SolutionDeck: React.FC<SolutionDeckProps> = ({
  problem,
  activeTab,
  onTabChange,
  activeHighlight,
  onSelectHighlight,
  onAddToExam,
  isInExam,
  onQuickFixPrompt,
}) => {
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showSummaryDetails, setShowSummaryDetails] = useState(true);

  // Reset hint reveal depth & highlighted step whenever problem changes (no stale state!)
  useEffect(() => {
    setRevealedHintCount(0);
    setSelectedStepId(null);
  }, [problem.id, problem.rawText]);

  const { structured, hints, solution, verification } = problem;
  const totalProgressiveHints = hints?.progressiveLevels.length ?? 0;

  return (
    <section
      aria-label="Nội dung hỗ trợ giải toán"
      className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Header with Two Main Buttons: Gợi ý & Bài giải + Add to Exam */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70">
        <div role="tablist" aria-label="Chế độ học tập" className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'goi_y'}
            onClick={() => {
              onTabChange('goi_y');
              setSelectedStepId(null);
              onSelectHighlight(null);
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'goi_y'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lightbulb className="w-4 h-4" aria-hidden="true" />
            Gợi ý
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bai_giai'}
            onClick={() => {
              onTabChange('bai_giai');
              setSelectedStepId(null);
              onSelectHighlight(null);
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'bai_giai'
                ? 'bg-white text-blue-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Bài giải
          </button>
        </div>

        <button
          type="button"
          onClick={onAddToExam}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
            isInExam
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
          {isInExam ? 'Đã có trong đề thi' : 'Thêm vào đề thi'}
        </button>
      </div>

      {/* Scrollable Pedagogical Body */}
      <div className="p-5 space-y-5 overflow-y-auto max-h-[760px]">
        {/* Issues / Ambiguity / Contradiction Alert Section */}
        {structured.issues.length > 0 && (
          <div
            role="alert"
            className="space-y-2.5 p-4 rounded-lg bg-red-50/70 border border-red-200"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
              <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
              <span>Cần kiểm tra &amp; xác nhận giả thiết đề bài</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-800">
              {structured.issues.map((issue, idx) => (
                <li key={idx} className="space-y-1">
                  <p className="font-semibold text-slate-900">{issue.title}</p>
                  <p className="text-slate-700 leading-relaxed">{issue.detail}</p>
                  {issue.suggestedAction && (
                    <p className="text-xs text-slate-600">
                      Đề xuất: {issue.suggestedAction}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {problem.id === 'preset-ambiguous-pyramid' && onQuickFixPrompt && (
              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onQuickFixPrompt(
                      'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD), SA = a√2. Gọi M là trung điểm của SC. Chứng minh BD vuông góc với mặt phẳng (SAC) và tính khoảng cách từ M đến mặt phẳng (ABCD).'
                    )
                  }
                  className="px-3 py-1.5 text-xs font-medium text-blue-800 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Thử bổ sung: SA ⊥ (ABCD), SA = a√2
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onQuickFixPrompt(
                      'Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a, cạnh bên bằng a√2. Tính góc giữa cạnh bên SA và mặt phẳng (ABCD), và tính thể tích khối chóp S.ABCD.'
                    )
                  }
                  className="px-3 py-1.5 text-xs font-medium text-blue-800 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Thử chuyển thành: Hình chóp tứ giác đều
                </button>
              </div>
            )}
          </div>
        )}

        {/* Structured Givens / Conclusions Summary */}
        <div className="border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setShowSummaryDetails((s) => !s)}
            aria-expanded={showSummaryDetails}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Tóm tắt Giả thiết – Kết luận
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân biệt rõ dữ kiện đề cho, yếu tố phụ dựng thêm và thông số minh họa
              </p>
            </div>
            <ChevronRight
              className={`w-4 h-4 text-slate-400 transition-transform ${
                showSummaryDetails ? 'rotate-90' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showSummaryDetails && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-500">Dữ kiện đề bài cho</h3>
                <ul className="space-y-1 text-slate-800 list-disc pl-4 leading-relaxed">
                  {structured.duKienDeBai.map((item, i) => (
                    <li key={i}>
                      <MathText text={item} />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-500">Yêu cầu cần giải quyết</h3>
                <ul className="space-y-1 text-slate-800 list-disc pl-4 leading-relaxed">
                  {structured.yeuCau.map((item, i) => (
                    <li key={i}>
                      <MathText text={item} />
                    </li>
                  ))}
                </ul>
              </div>

              {structured.yeuToPhu.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-teal-700">Yếu tố phụ được dựng để giải</h3>
                  <ul className="space-y-1 text-slate-700 list-disc pl-4 leading-relaxed text-[13px]">
                    {structured.yeuToPhu.map((item, i) => (
                      <li key={i}>
                        <MathText text={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {structured.thongSoBoTri.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-slate-500">Thông số bố trí hình minh họa</h3>
                  <ul className="space-y-1 text-slate-600 list-disc pl-4 leading-relaxed text-[13px]">
                    {structured.thongSoBoTri.map((item, i) => (
                      <li key={i}>
                        <MathText text={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODE 1: GỢI Ý (Strictly hides full solution!) */}
        {activeTab === 'goi_y' && (
          <div className="space-y-4" data-testid="hints-panel">
            {hints ? (
              <>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-teal-900">a) Phân tích đề</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <MathText text={hints.phanTichDe} />
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-teal-900">b) Kiến thức cần dùng</h3>
                  <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5 leading-relaxed">
                    {hints.kienThucCanDung.map((k, idx) => (
                      <li key={idx}>
                        <MathText text={k} />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-teal-900">c) Hướng giải</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <MathText text={hints.huongGiai} />
                  </p>
                </div>

                {/* Progressive Hints ("Gợi ý thêm") */}
                {totalProgressiveHints > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    {hints.progressiveLevels.slice(0, revealedHintCount).map((lvl) => (
                      <div
                        key={lvl.level}
                        className="p-3.5 rounded-lg bg-teal-50/60 border border-teal-200/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-teal-900">{lvl.title}</h4>
                          {lvl.highlight && (
                            <button
                              type="button"
                              onClick={() => onSelectHighlight(lvl.highlight ?? null)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 hover:underline whitespace-nowrap shrink-0"
                            >
                              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                              Xem trên hình 3D
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          <MathText text={lvl.content} />
                        </p>
                      </div>
                    ))}

                    {revealedHintCount < totalProgressiveHints && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = revealedHintCount + 1;
                          setRevealedHintCount(next);
                          const hl = hints.progressiveLevels[next - 1]?.highlight ?? null;
                          if (hl) onSelectHighlight(hl);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                      >
                        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                        Gợi ý thêm (Mức {revealedHintCount + 1}/{totalProgressiveHints})
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-500 pt-2">
                  Chế độ Gợi ý không hiển thị bài giải chi tiết và đáp số cuối cùng để bạn tự rèn tư duy.
                  Khi sẵn sàng đối chiếu, hãy nhấn nút <strong className="text-slate-700">Bài giải</strong>.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Chưa có gợi ý cho đề bài hiện tại. Hãy nhấn &ldquo;Phân tích và dựng hình&rdquo; sau khi nhập đề.
              </p>
            )}
          </div>
        )}

        {/* MODE 2: BÀI GIẢI ĐẦY ĐỦ */}
        {activeTab === 'bai_giai' && (
          <div className="space-y-5" data-testid="solution-panel">
            {solution ? (
              <>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">1. Ý tưởng chính</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <MathText text={solution.yTuongChinh} />
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      2. Các bước giải chi tiết
                    </h3>
                    <span className="text-xs text-slate-500">
                      Nhấn vào từng bước để làm nổi bật trên hình 3D
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {solution.cacBuocGiai.map((step) => {
                      const isSelected = selectedStepId === step.id;
                      return (
                        <div
                          key={step.id}
                          className={`p-3.5 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-300'
                              : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-sm font-semibold text-slate-900">
                              <MathText text={step.title} />
                            </h4>
                            {step.highlight && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSelected && activeHighlight) {
                                    setSelectedStepId(null);
                                    onSelectHighlight(null);
                                  } else {
                                    setSelectedStepId(step.id);
                                    onSelectHighlight(step.highlight ?? null);
                                  }
                                }}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-700 text-white border-blue-700'
                                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                                }`}
                              >
                                <Compass className="w-3 h-3" aria-hidden="true" />
                                {isSelected ? 'Đang chiếu hình' : 'Chiếu lên hình 3D'}
                              </button>
                            )}
                          </div>

                          <div className="text-sm text-slate-800 leading-relaxed">
                            <MathText text={step.content} />
                          </div>

                          {step.justification && (
                            <p className="mt-2 text-xs text-slate-500">
                              Căn cứ: <MathText text={step.justification} />
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Conclusion */}
                <div className="p-3.5 rounded-lg bg-slate-900 text-white space-y-1">
                  <h3 className="text-xs font-semibold text-slate-300">3. Kết luận</h3>
                  <p className="text-sm leading-relaxed">
                    <MathText text={solution.ketLuanCuoiCung} />
                  </p>
                </div>

                {/* Alternative Method if available */}
                {solution.cachGiaiKhac && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <h4 className="text-xs font-semibold text-slate-900">
                      {solution.cachGiaiKhac.title}
                    </h4>
                    <p className="text-xs text-slate-500">{solution.cachGiaiKhac.note}</p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      <MathText text={solution.cachGiaiKhac.content} />
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                  <span>Chưa thể đưa ra lời giải hoàn chỉnh</span>
                </div>
                <p className="text-sm text-amber-900/90 leading-relaxed">
                  {structured.issues.length > 0
                    ? 'Đề bài hiện đang thiếu dữ kiện hoặc có mâu thuẫn hình học nên hệ thống không tự suy diễn kết quả. Hãy chỉnh sửa lại đề bài theo gợi ý ở khung cảnh báo phía trên.'
                    : problem.aiNote ||
                      'Hệ thống đã dựng mô hình 3D và phân tích cấu trúc cơ bản. Với bài toán tự nhập nâng cao ngoài kho chuẩn, hãy kích hoạt dịch vụ phân tích AI máy chủ hoặc đối chiếu từ gợi ý phương pháp.'}
                </p>
              </div>
            )}

            {/* Independent Verification Breakdown */}
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                <span>Báo cáo kiểm chứng toán học &amp; tọa độ</span>
              </div>
              <p className="text-xs text-slate-600">{verification.summary}</p>
              <ul className="space-y-1.5 text-xs">
                {verification.checks.map((chk) => (
                  <li key={chk.id} className="flex items-start gap-2 text-slate-700">
                    {chk.status === 'passed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : chk.status === 'failed' ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span>
                      <strong className="font-medium text-slate-900">{chk.label}:</strong>{' '}
                      {chk.detail}
                    </span>
                  </li>
                ))}
              </ul>
              {verification.unverifiedNotes.length > 0 && (
                <div className="text-xs text-amber-800 bg-amber-50/70 border border-amber-200 rounded-md p-2.5 space-y-1">
                  {verification.unverifiedNotes.map((n, i) => (
                    <p key={i}>• {n}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
