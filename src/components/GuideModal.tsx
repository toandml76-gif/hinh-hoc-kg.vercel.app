import React from 'react';
import { X } from 'lucide-react';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <h2 id="guide-modal-title" className="text-base font-semibold text-slate-900">
            Hướng dẫn sử dụng &amp; Nguyên tắc toán học
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hướng dẫn"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-sm text-slate-700 leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900">1. Nhập đề bằng văn bản hoặc giọng nói</h3>
            <p>
              Nhập đề bài tiếng Việt vào ô phía trên (có hỗ trợ chèn nhanh các ký hiệu ⊥, ∥, √, °, △,
              ′), hoặc nhấn <strong>Nhập giọng nói</strong> để đọc đề bằng tiếng Việt. Hệ thống tự
              động chuẩn hóa tên khối (ví dụ <em>S.ABCD</em>, <em>ABC.A&apos;B&apos;C&apos;</em>),
              mặt phẳng <em>(ABCD)</em> và căn thức <em>a√2</em>.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900">2. Quan sát hình 3D &amp; nét khuất tự động</h3>
            <p>
              Kéo chuột hoặc chạm để xoay khối 360°, cuộn để phóng to/thu nhỏ, giữ{' '}
              <strong>Shift + kéo</strong> để di chuyển. Thuật toán xử lý che khuất theo góc nhìn thực
              tế sẽ chia tự động mỗi cạnh thành phần nhìn thấy (<strong>nét liền</strong>) và phần bị
              bề mặt khối che khuất (<strong>nét đứt</strong>). Đường phụ và thiết diện được phân biệt
              bằng màu xanh riêng.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900">3. Nguyên tắc chính xác toán học</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Không tự bổ sung giả thiết ẩn: hình chóp có đáy là hình vuông sẽ{' '}
                <strong>không</strong> bị biến thành hình chóp đều nếu đề không cho điều kiện đỉnh.
              </li>
              <li>
                Khi đề thiếu dữ kiện hoặc mâu thuẫn, hệ thống chỉ rõ nguyên nhân và yêu cầu xác nhận
                trước khi kết luận.
              </li>
              <li>
                Chế độ <strong>Gợi ý</strong> chỉ mở định hướng và định lý cần dùng, không tiết lộ
                ngay bài giải hay đáp số.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900">4. Tạo đề thi &amp; Xuất Word (.docx)</h3>
            <p>
              Nhấn <strong>Thêm vào đề thi</strong> trên các bài toán bạn muốn tổng hợp, sau đó mở{' '}
              <strong>Xuất DOCX</strong> để sắp xếp thứ tự câu, chọn 1 trong 4 chế độ xuất và tải tệp
              Word chuẩn khổ A4, Times New Roman cỡ 13 kèm phương trình OMML chỉnh sửa trực tiếp.
            </p>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
