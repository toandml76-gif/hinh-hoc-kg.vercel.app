import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  HelpCircle,
  Mic,
  MicOff,
  Radio,
  RefreshCw,
  Square,
  X,
} from 'lucide-react';
import {
  normalizeVietnameseMathSpeech,
  SpeechNormalizationResult,
} from '../voice/vietnameseMathSpeech';

interface VoiceInputModalProps {
  open: boolean;
  onClose: () => void;
  onApplyText: (text: string) => void;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const VOICE_GUIDE_EXAMPLES = [
  {
    spoken: 'hình chóp s chấm a b c d',
    result: 'hình chóp S.ABCD',
  },
  {
    spoken: 'mặt phẳng a b c d',
    result: 'mặt phẳng (ABCD)',
  },
  {
    spoken: 's a vuông góc với mặt phẳng a b c d',
    result: 'SA vuông góc với mặt phẳng (ABCD)',
  },
  {
    spoken: 's a bằng a căn 2',
    result: 'SA = a√2',
  },
  {
    spoken: 'lăng trụ đứng a b c chấm a phẩy b phẩy c phẩy',
    result: "lăng trụ đứng ABC.A'B'C'",
  },
  {
    spoken: 'góc 60 độ, cạnh bằng a phần 2',
    result: 'góc 60°, cạnh bằng a/2',
  },
];

const SAMPLE_SPOKEN_TEST =
  'cho hình chóp s chấm a b c d có đáy a b c d là hình vuông cạnh a, s a vuông góc với mặt phẳng a b c d, s a bằng a căn 2. Gọi m là trung điểm của s c. Chứng minh b d vuông góc với mặt phẳng s a c và tính khoảng cách từ m đến mặt phẳng a b c d';

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  open,
  onClose,
  onApplyText,
}) => {
  const [mode, setMode] = useState<'browser' | 'record'>(() =>
    getSpeechRecognitionCtor() ? 'browser' : 'record'
  );
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [normResult, setNormResult] = useState<SpeechNormalizationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const browserSupported = Boolean(getSpeechRecognitionCtor());

  useEffect(() => {
    if (!open) {
      stopAllCapture();
    }
    return () => stopAllCapture();
  }, [open]);

  // Re-normalize whenever rawTranscript changes
  useEffect(() => {
    if (!rawTranscript.trim()) {
      setNormResult(null);
      return;
    }
    const res = normalizeVietnameseMathSpeech(rawTranscript);
    setNormResult(res);
    setEditedText(res.normalizedText);
  }, [rawTranscript]);

  const stopAllCapture = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setInterimText('');
  };

  const mapSpeechError = (code: string): string => {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Trình duyệt đã chặn quyền micro. Hãy cấp quyền Micro trong thanh địa chỉ trình duyệt rồi thử lại.';
      case 'audio-capture':
        return 'Không tìm thấy thiết bị micro trên máy tính/điện thoại của bạn.';
      case 'no-speech':
        return 'Chưa nghe thấy giọng nói. Hãy đọc gần micro hơn, rõ ràng từng ký hiệu điểm và thử lại.';
      case 'network':
        return 'Lỗi kết nối mạng khi nhận diện giọng nói trực tuyến. Kiểm tra mạng hoặc chuyển sang chế độ Ghi âm chuẩn hóa.';
      default:
        return `Lỗi nhận diện giọng nói (${code}). Bạn có thể thử lại hoặc sửa trực tiếp ở ô kết quả bên dưới.`;
    }
  };

  const startBrowserSpeech = () => {
    setErrorMessage(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setErrorMessage(
        'Trình duyệt hiện tại không hỗ trợ Web Speech API. Hãy chuyển sang chế độ "Ghi âm chuẩn hóa" hoặc sử dụng Chrome/Edge.'
      );
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = 'vi-VN';
      rec.continuous = true;
      rec.interimResults = true;

      let committed = rawTranscript ? `${rawTranscript} ` : '';

      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            committed += `${piece} `;
          } else {
            interim += piece;
          }
        }
        setRawTranscript(committed.trim());
        setInterimText(interim.trim());
      };

      rec.onerror = (event) => {
        setErrorMessage(mapSpeechError(event.error));
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch {
      setErrorMessage('Không thể khởi động nhận diện giọng nói trực tiếp. Vui lòng kiểm tra quyền micro.');
      setIsListening(false);
    }
  };

  const startAudioRecording = async () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Trình duyệt không hỗ trợ ghi âm micro (getUserMedia).');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 200) {
          setErrorMessage('Đoạn ghi âm quá ngắn hoặc không có âm thanh. Vui lòng thử lại.');
          return;
        }
        await uploadAudioForTranscription(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMessage(
          'Bạn chưa cấp quyền truy cập micro. Hãy bật quyền micro cho trang này rồi nhấn ghi âm lại.'
        );
      } else if (name === 'NotFoundError') {
        setErrorMessage('Không tìm thấy micro kết nối với thiết bị.');
      } else {
        setErrorMessage('Không thể mở micro để ghi âm. Vui lòng kiểm tra thiết bị âm thanh.');
      }
    }
  };

  const uploadAudioForTranscription = async (blob: Blob) => {
    setIsProcessingAudio(true);
    setErrorMessage(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const str = typeof reader.result === 'string' ? reader.result : '';
          resolve(str.split(',')[1] ?? '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const resp = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: blob.type || 'audio/webm',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMessage(data?.error || 'Không thể chép lời ghi âm. Vui lòng thử lại.');
        return;
      }
      if (typeof data.rawTranscript === 'string') {
        setRawTranscript(data.rawTranscript);
      }
      if (data.normalized) {
        setNormResult(data.normalized);
        setEditedText(data.normalized.normalizedText);
      }
    } catch {
      setErrorMessage(
        'Lỗi kết nối máy chủ khi xử lý tệp âm thanh. Kiểm tra kết nối mạng hoặc thử chế độ Nhận diện trực tiếp.'
      );
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handleToggleCapture = () => {
    if (isListening) {
      stopAllCapture();
      return;
    }
    if (mode === 'browser') {
      startBrowserSpeech();
    } else {
      void startAudioRecording();
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 id="voice-modal-title" className="text-base font-semibold text-slate-900">
              Nhập đề toán bằng giọng nói tiếng Việt
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động chuyển thuật ngữ và ký hiệu toán học (S.ABCD, (ABCD), a√2, 60°, A&apos;B&apos;C&apos;)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ nhập giọng nói"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Capture Mode Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  stopAllCapture();
                  setMode('browser');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'browser'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nhận diện trực tiếp (vi-VN)
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAllCapture();
                  setMode('record');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'record'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ghi âm chuẩn hóa AI
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide((g) => !g)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              {showGuide ? 'Ẩn hướng dẫn đọc' : 'Xem hướng dẫn đọc ký hiệu'}
            </button>
          </div>

          {!browserSupported && mode === 'browser' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
              <span>
                Trình duyệt của bạn chưa hỗ trợ Web Speech API trực tiếp. Hãy chuyển sang tab{' '}
                <strong>Ghi âm chuẩn hóa AI</strong> hoặc dùng Chrome / Edge.
              </span>
            </div>
          )}

          {/* Clear Instructions & Math Dictation Cheat Sheet */}
          {showGuide && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-900">
                Hướng dẫn đọc đề để đạt độ chính xác cao
              </h3>
              <ol className="text-xs text-slate-700 list-decimal pl-4 space-y-1 leading-relaxed">
                <li>Đọc chậm, ngắt nhịp rõ giữa tên khối, giả thiết và yêu cầu.</li>
                <li>
                  Đọc rõ chữ <strong>&ldquo;chấm&rdquo;</strong> cho dấu chấm khối (ví dụ{' '}
                  <em>&ldquo;hình chóp S chấm A B C D&rdquo;</em>) và chữ{' '}
                  <strong>&ldquo;phẩy&rdquo;</strong> cho dấu phẩy đỉnh (<em>&ldquo;A phẩy&rdquo;</em>).
                </li>
                <li>
                  Sau khi dừng đọc, luôn kiểm tra lại ô văn bản chuẩn hóa ở dưới để sửa nhanh lỗi
                  nhận diện (nếu môi trường có tiếng ồn).
                </li>
              </ol>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                {VOICE_GUIDE_EXAMPLES.map((ex, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-0.5 px-2.5 py-2 bg-white border border-slate-200 rounded"
                  >
                    <span className="text-slate-600 leading-snug">&ldquo;{ex.spoken}&rdquo;</span>
                    <span className="font-mono font-medium text-blue-800 leading-snug">
                      → {ex.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary Microphone Control */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleCapture}
                disabled={isProcessingAudio}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isListening
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50'
                }`}
              >
                {isListening ? (
                  <>
                    <Square className="w-4 h-4" aria-hidden="true" />
                    Dừng ghi giọng nói
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" aria-hidden="true" />
                    {mode === 'browser' ? 'Bắt đầu đọc đề' : 'Bắt đầu ghi âm'}
                  </>
                )}
              </button>

              <div className="text-xs text-slate-600">
                {isProcessingAudio ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-blue-700">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    Đang chuyển giọng nói thành ký hiệu toán học...
                  </span>
                ) : isListening ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
                    <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                    Đang lắng nghe tiếng Việt... Hãy đọc đề bài
                  </span>
                ) : (
                  <span>Nhấn nút để bắt đầu đọc đề bài bằng micro</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setRawTranscript(SAMPLE_SPOKEN_TEST);
              }}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline whitespace-nowrap shrink-0"
            >
              Thử câu đọc mẫu
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed"
            >
              <MicOff className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold">Không thể hoàn tất nhận diện giọng nói</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Raw Transcript Input / Review (allows correcting raw dictation directly) */}
          <div className="space-y-1.5">
            <label htmlFor="raw-speech-input" className="block text-xs font-semibold text-slate-700">
              Lời thoại thô ghi nhận được {interimText ? `(đang nghe: "${interimText}")` : ''}
            </label>
            <textarea
              id="raw-speech-input"
              rows={2}
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="Nội dung bạn vừa đọc sẽ hiện tại đây..."
              className="w-full px-3 py-2 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          {/* Normalized Math Text Editor & Error Warnings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="normalized-math-input"
                className="block text-xs font-semibold text-slate-900"
              >
                Văn bản đề bài đã chuẩn hóa ký hiệu toán (có thể chỉnh sửa trước khi chèn)
              </label>
              {normResult && (
                <span
                  className={`text-xs font-medium ${
                    normResult.confidenceScore === 'high'
                      ? 'text-emerald-700'
                      : normResult.confidenceScore === 'medium'
                        ? 'text-amber-700'
                        : 'text-red-700'
                  }`}
                >
                  Độ rõ cấu trúc đề:{' '}
                  {normResult.confidenceScore === 'high'
                    ? 'Cao'
                    : normResult.confidenceScore === 'medium'
                      ? 'Trung bình'
                      : 'Cần kiểm tra lại'}
                </span>
              )}
            </div>

            <textarea
              id="normalized-math-input"
              rows={3}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="Văn bản toán học chuẩn hóa sẽ hiển thị tại đây để bạn rà soát lỗi chính tả, tên điểm..."
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />

            {normResult && normResult.appliedTransformations.length > 0 && (
              <p className="text-xs text-slate-500">
                Đã tự động chuẩn hóa: {normResult.appliedTransformations.slice(0, 5).join(' · ')}
              </p>
            )}

            {normResult && normResult.warnings.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Cảnh báo khả năng nhận diện nhầm:</p>
                {normResult.warnings.map((w, idx) => (
                  <p key={idx}>• {w}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setRawTranscript('');
              setEditedText('');
              setNormResult(null);
              setErrorMessage(null);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Xóa bản ghi
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!editedText.trim()}
              onClick={() => {
                onApplyText(editedText.trim());
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-45 transition-colors"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              Đưa vào ô nhập đề
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
