# Hình Học Không Gian THPT – Khám Phá và Giải Toán

Ứng dụng web học tập hình học không gian THPT tập trung vào tính chính xác toán học, mô hình 3D tương tác xử lý nét khuất thực tế, nhập đề bằng giọng nói tiếng Việt, gợi ý sư phạm không lộ đáp án, kiểm chứng tọa độ và xuất tài liệu Word (`.docx`) chuẩn A4 với công thức Word OMML chỉnh sửa trực tiếp.

## 1. Kiến trúc hệ thống

- `src/types/geometry.ts`: Biểu diễn có cấu trúc cho khối đa diện, giả thiết, kết luận, yếu tố phụ, thông số bố trí, gợi ý, bài giải và báo cáo kiểm chứng.
- `src/geometry/math3d.ts` & `src/geometry/hlr.ts`: Công cụ toán học 3D và thuật toán xử lý che khuất giải tích (Hidden-Line Removal) cắt cạnh chính xác bằng mặt phẳng nhìn (viewing plane) kết hợp kiểm tra tia cắt tam giác Möller–Trumbore.
- `src/geometry/canvasRenderer.ts`: Bộ vẽ 2D độ phân giải cao (nét liền/nét đứt động, đường phụ riêng biệt, ký hiệu góc vuông chiếu trong mặt phẳng 3D, chống chồng nhãn điểm và xuất ảnh PNG sắc nét cho DOCX).
- `src/geometry/parser.ts`, `src/geometry/verifier.ts`, `src/geometry/presets.ts`, `src/geometry/advancedPresets.ts`, `src/geometry/library.ts`: Bộ phân tích đề tiếng Việt, phát hiện thiếu dữ kiện / mâu thuẫn, thư viện 12 đề THPT kiểm chứng có tìm kiếm và lọc theo chủ đề/mức độ.
- `src/voice/vietnameseMathSpeech.ts` & `src/components/VoiceInputModal.tsx`: Nhận diện giọng nói tiếng Việt (Web Speech API `vi-VN` + ghi âm máy chủ qua `gemini-3.5-transcribe`), chuẩn hóa ký hiệu toán học (`S.ABCD`, `(ABCD)`, `a√2`, `60°`, `A'B'C'`) và cảnh báo lỗi nhận diện.
- `src/export/omml.ts` & `src/export/docxGenerator.ts`: Xuất tệp `.docx` OpenXML chuẩn khổ A4, Times New Roman cỡ 13, căn đều, công thức Word OMML (`<m:oMath>`) và ảnh hình vẽ chèn giữ đúng tỉ lệ.
- `server.ts`: Máy chủ Express gắn Vite middleware và các tuyến API bảo mật phía máy chủ (`/api/analyze`, `/api/transcribe`, `/api/health`).

## 2. Cài đặt và vận hành

```bash
npm install
npm run dev
```

Ứng dụng chạy tại `http://localhost:3000`.

### Cấu hình biến môi trường

Sao chép `.env.example` thành `.env` và thiết lập `GEMINI_API_KEY` (chỉ đọc ở máy chủ, không bao giờ gửi xuống trình duyệt) nếu muốn bật thêm phân tích AI cho đề tự nhập ngoài kho chuẩn và chế độ ghi âm chép lời máy chủ.

### Kiểm thử tự động

```bash
npx --yes tsx --test src/geometry/hlr.test.ts src/geometry/solver.test.ts src/voice/vietnameseMathSpeech.test.ts src/export/docxGenerator.test.ts
npm run lint
npm run build
```
