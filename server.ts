import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { normalizeVietnameseMathSpeech } from './src/voice/vietnameseMathSpeech.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
]);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    const ai = getGeminiClient();
    res.json({
      ok: true,
      aiConfigured: Boolean(ai),
    });
  });

  // Server-side Vietnamese spatial geometry AI assistant (gemini-4-hydrogen)
  app.post('/api/analyze', async (req, res) => {
    try {
      const rawText = typeof req.body?.rawText === 'string' ? req.body.rawText.trim() : '';
      if (!rawText || rawText.length > 3000) {
        res.status(400).json({ error: 'Đề bài không hợp lệ hoặc vượt quá 3000 ký tự.' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          aiConfigured: false,
          error:
            'Dịch vụ phân tích AI máy chủ chưa được cấu hình. Ứng dụng vẫn hoạt động đầy đủ với bộ phân tích hình học định danh, kho 12 đề chuẩn kiểm chứng và mô hình 3D tương tác.',
        });
        return;
      }

      const systemInstruction = `Bạn là giáo viên Toán THPT và chuyên gia kiểm chứng hình học không gian.
Nguyên tắc BẮT BUỘC:
1. KHÔNG tự bổ sung giả thiết chưa có trong đề (ví dụ: hình chóp có đáy hình vuông KHÔNG được tự xem là hình chóp đều hay tự cho SA vuông góc đáy).
2. Nếu đề thiếu dữ kiện hoặc mâu thuẫn, phải đặt canConclude=false, ghi rõ vấn đề trong issues và KHÔNG bịa đáp án.
3. Gợi ý (hints) TUYỆT ĐỐI không tiết lộ đáp số cuối cùng hay lời giải hoàn chỉnh; nội dung ngắn gọn 100-170 từ, nêu định lý cụ thể.
4. Lời giải (solution) dùng kiến thức THPT, ký hiệu toán học chuẩn bọc trong $...$ (ví dụ $SA \\perp (ABCD)$, $d\\bigl(M,(ABCD)\\bigr)$, $V = \\dfrac{1}{3} S_{\\text{đáy}} h$). Không dùng cụm từ "dễ thấy".`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Phân tích đề hình học không gian THPT sau và trả về JSON có cấu trúc:\n\n${rawText}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              canConclude: { type: Type.BOOLEAN },
              issues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    severity: { type: Type.STRING },
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                },
              },
              duKienDeBai: { type: Type.ARRAY, items: { type: Type.STRING } },
              ketQuaSuyRa: { type: Type.ARRAY, items: { type: Type.STRING } },
              yeuToPhu: { type: Type.ARRAY, items: { type: Type.STRING } },
              yeuCau: { type: Type.ARRAY, items: { type: Type.STRING } },
              hints: {
                type: Type.OBJECT,
                properties: {
                  phanTichDe: { type: Type.STRING },
                  kienThucCanDung: { type: Type.ARRAY, items: { type: Type.STRING } },
                  huongGiai: { type: Type.STRING },
                  progressiveLevels: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        level: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
              solution: {
                type: Type.OBJECT,
                properties: {
                  yTuongChinh: { type: Type.STRING },
                  cacBuocGiai: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        justification: { type: Type.STRING },
                      },
                    },
                  },
                  ketLuanCuoiCung: { type: Type.STRING },
                },
              },
            },
          },
        },
      });

      const jsonText = (response.text ?? '').trim();
      if (!jsonText) {
        res.status(502).json({ error: 'Phản hồi từ dịch vụ AI trống. Vui lòng thử lại.' });
        return;
      }

      const parsed = JSON.parse(jsonText);
      res.json({ ok: true, aiConfigured: true, data: parsed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi gọi dịch vụ phân tích.';
      res.status(500).json({ error: `Không thể hoàn tất phân tích AI: ${msg}` });
    }
  });

  // Server-side Vietnamese math audio transcription (gemini-3.5-transcribe)
  app.post('/api/transcribe', async (req, res) => {
    try {
      const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64 : '';
      const rawMime = typeof req.body?.mimeType === 'string' ? req.body.mimeType.toLowerCase() : 'audio/webm';
      const baseMime = rawMime.split(';')[0].trim();

      if (!audioBase64 || audioBase64.length > 8_000_000) {
        res.status(400).json({ error: 'Dữ liệu âm thanh không hợp lệ hoặc quá dung lượng cho phép.' });
        return;
      }
      if (!ALLOWED_AUDIO_MIMES.has(rawMime) && !ALLOWED_AUDIO_MIMES.has(baseMime)) {
        res.status(400).json({ error: `Định dạng âm thanh không được hỗ trợ (${baseMime}).` });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          aiConfigured: false,
          error:
            'Dịch vụ chép lời máy chủ chưa được cấu hình. Vui lòng sử dụng chế độ Nhận diện giọng nói trực tiếp của trình duyệt (Chrome/Edge) hoặc nhập trực tiếp.',
        });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: baseMime,
                data: audioBase64,
              },
            },
            {
              text: 'Chép lại chính xác lời đọc đề bài Toán Hình học không gian tiếng Việt trong đoạn ghi âm này. Giữ đúng tên hình (ví dụ S.ABCD, ABC.A\'B\'C\'), mặt phẳng (ABCD), ký hiệu căn bậc hai (a√2, a√3), góc (60°), phân số (a/2) và các thuật ngữ toán học THPT. Chỉ trả về nội dung đề bài đã chép.',
            },
          ],
        },
      });

      const rawTranscript = (response.text ?? '').trim();
      if (!rawTranscript) {
        res.status(422).json({
          error: 'Không nghe rõ nội dung đề bài trong đoạn ghi âm. Vui lòng đọc to, rõ ràng hơn và thử lại.',
        });
        return;
      }

      const normalized = normalizeVietnameseMathSpeech(rawTranscript);
      res.json({
        ok: true,
        rawTranscript,
        normalized,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi chép lời.';
      res.status(500).json({ error: `Không thể chép lời ghi âm: ${msg}` });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
