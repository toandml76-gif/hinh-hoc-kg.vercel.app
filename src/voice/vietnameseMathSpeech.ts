export interface SpeechNormalizationResult {
  rawTranscript: string;
  normalizedText: string;
  appliedTransformations: string[];
  warnings: string[];
  confidenceScore: 'high' | 'medium' | 'low';
}

const VIETNAMESE_NUMBER_WORDS: Record<string, string> = {
  'một': '1',
  'hai': '2',
  'ba': '3',
  'bốn': '4',
  'tư': '4',
  'năm': '5',
  'sáu': '6',
  'bảy': '7',
  'tám': '8',
  'chín': '9',
  'mười': '10',
  'ba mươi': '30',
  'bốn lăm': '45',
  'bốn mươi lăm': '45',
  'bốn mươi năm': '45',
  'sáu mươi': '60',
  'chín mươi': '90',
  'một trăm hai mươi': '120',
};

const SPOKEN_LETTER_MAP: Record<string, string> = {
  a: 'A',
  b: 'B',
  bê: 'B',
  c: 'C',
  xê: 'C',
  d: 'D',
  đê: 'D',
  e: 'E',
  g: 'G',
  h: 'H',
  hát: 'H',
  i: 'I',
  k: 'K',
  m: 'M',
  mờ: 'M',
  n: 'N',
  nờ: 'N',
  o: 'O',
  p: 'P',
  q: 'Q',
  s: 'S',
  ét: 'S',
  sờ: 'S',
};

// Unicode-safe single spoken letter token (prevents matching the 'c' inside 'có')
const LETTER_TOK = `(?:(?:[a-zA-Z]|bê|xê|đê|hát|mờ|nờ|ét|sờ)(?![\\p{L}])(?:\\s*phẩy|')?)`;

function formatPointSequence(rawSeq: string): string {
  const cleaned = rawSeq
    .trim()
    .replace(/(?<![\p{L}])phẩy(?![\p{L}])/giu, "'")
    .replace(/\s+'/g, "'");

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const out: string[] = [];

  for (const tok of tokens) {
    const hasPrime = tok.endsWith("'");
    const base = (hasPrime ? tok.slice(0, -1) : tok).toLowerCase();
    const mapped = SPOKEN_LETTER_MAP[base];
    if (mapped) {
      out.push(mapped + (hasPrime ? "'" : ''));
    } else if (/^[a-z]'?$/i.test(tok)) {
      out.push(tok.toUpperCase());
    } else if (/^[a-z']{2,8}$/i.test(tok)) {
      out.push(tok.toUpperCase());
    } else {
      out.push(tok);
    }
  }
  return out.join('');
}

/**
 * Normalizes spoken Vietnamese geometry dictation into clean mathematical Vietnamese
 * ready for the structured geometry parser. Uses Unicode-aware boundaries for Vietnamese diacritics.
 */
export function normalizeVietnameseMathSpeech(rawInput: string): SpeechNormalizationResult {
  const rawTranscript = rawInput.trim();
  const appliedTransformations: string[] = [];
  const warnings: string[] = [];

  if (!rawTranscript) {
    return {
      rawTranscript: '',
      normalizedText: '',
      appliedTransformations: [],
      warnings: ['Chưa có nội dung giọng nói để chuyển đổi.'],
      confidenceScore: 'low',
    };
  }

  let text = rawTranscript.replace(/\s+/g, ' ');

  // 1. Common Vietnamese ASR homophones in geometry (Unicode-safe boundaries)
  const homophoneFixes: Array<[RegExp, string, string]> = [
    [/(?<![\p{L}])hình chốt(?![\p{L}])/giu, 'hình chóp', 'Sửa nhận diện "hình chốt" → "hình chóp"'],
    [/(?<![\p{L}])tứ diễn(?![\p{L}])/giu, 'tứ diện', 'Sửa nhận diện "tứ diễn" → "tứ diện"'],
    [/(?<![\p{L}])lăn trụ(?![\p{L}])/giu, 'lăng trụ', 'Sửa nhận diện "lăn trụ" → "lăng trụ"'],
    [/(?<![\p{L}])lăng chủ(?![\p{L}])/giu, 'lăng trụ', 'Sửa nhận diện "lăng chủ" → "lăng trụ"'],
    [/(?<![\p{L}])thiết diễn(?![\p{L}])/giu, 'thiết diện', 'Sửa nhận diện "thiết diễn" → "thiết diện"'],
    [/(?<![\p{L}])hình lập hướng(?![\p{L}])/giu, 'hình lập phương', 'Sửa nhận diện "hình lập hướng" → "hình lập phương"'],
    [/(?<![\p{L}])vuông góc\s+với\s+đấy(?![\p{L}])/giu, 'vuông góc với đáy', 'Sửa nhận diện "đấy" → "đáy"'],
    [/(?<![\p{L}])có\s+đấy(?![\p{L}])/giu, 'có đáy', 'Sửa nhận diện "đấy" → "đáy"'],
  ];
  for (const [pattern, replacement, note] of homophoneFixes) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
      appliedTransformations.push(note);
    }
  }

  // 2. Spoken solid names with dot separator:
  // "hình chóp s chấm a b c d" -> "hình chóp S.ABCD"
  // "lăng trụ đứng a b c chấm a phẩy b phẩy c phẩy" -> "lăng trụ đứng ABC.A'B'C'"
  const solidDotRe = new RegExp(
    `(?<![\\p{L}])(hình chóp(?:\\s+tứ giác đều|\\s+tam giác đều|\\s+đều)?|lăng trụ(?:\\s+đứng|\\s+đều)?|hình hộp(?:\\s+chữ nhật)?|hình lập phương|tứ diện(?:\\s+đều)?)\\s+(${LETTER_TOK}(?:\\s+${LETTER_TOK}){0,3})\\s*(?:chấm|\\.)\\s*(${LETTER_TOK}(?:\\s+${LETTER_TOK}){2,4})(?=[\\s,.;]|$)`,
    'giu'
  );
  text = text.replace(solidDotRe, (_m, solidPrefix: string, part1: string, part2: string) => {
    const left = formatPointSequence(part1);
    const right = formatPointSequence(part2);
    appliedTransformations.push(`Chuẩn hóa tên khối ${left}.${right}`);
    return `${solidPrefix} ${left}.${right}`;
  });

  // "tứ diện a b c d" (without dot) -> "tứ diện ABCD"
  const tetNoDotRe = new RegExp(
    `(?<![\\p{L}])(tứ diện(?:\\s+đều)?)\\s+(${LETTER_TOK}(?:\\s+${LETTER_TOK}){3})(?=[\\s,.;]|$)`,
    'giu'
  );
  text = text.replace(tetNoDotRe, (_m, prefix: string, pts: string) => {
    const formatted = formatPointSequence(pts);
    appliedTransformations.push(`Chuẩn hóa tên tứ diện ${formatted}`);
    return `${prefix} ${formatted}`;
  });

  // 3. Spoken plane names: "mặt phẳng a b c d" -> "mặt phẳng (ABCD)"
  const planeRe = new RegExp(
    `(?<![\\p{L}])mặt phẳng\\s+(?:mở ngoặc\\s+)?(${LETTER_TOK}(?:\\s+${LETTER_TOK}){2,3})(?:\\s+đóng ngoặc)?(?=[\\s,.;]|$)`,
    'giu'
  );
  text = text.replace(planeRe, (_m, pts: string) => {
    const formatted = formatPointSequence(pts);
    appliedTransformations.push(`Chuẩn hóa mặt phẳng (${formatted})`);
    return `mặt phẳng (${formatted})`;
  });

  // 4. Base / polygon names: "đáy a b c d", "tam giác a b c", "hình vuông a b c d"
  const polyRe = new RegExp(
    `(?<![\\p{L}])(đáy|tam giác|hình vuông|hình chữ nhật|hình thoi|hình bình hành)\\s+(${LETTER_TOK}(?:\\s+${LETTER_TOK}){2,3})(?=[\\s,.;]|$)`,
    'giu'
  );
  text = text.replace(polyRe, (_m, kw: string, pts: string) => {
    const formatted = formatPointSequence(pts);
    appliedTransformations.push(`Chuẩn hóa tên đa giác ${formatted}`);
    return `${kw} ${formatted}`;
  });

  // 5. Two-letter segment / line names in geometric contexts
  const segAfterKwRe = new RegExp(
    `(?<![\\p{L}])(cạnh bên|cạnh|đoạn thẳng|đường thẳng|đường chéo|của|chứng minh|giữa|và|từ|đến|đoạn)\\s+(${LETTER_TOK})\\s+(${LETTER_TOK})(?=[\\s,.;]|$)`,
    'giu'
  );
  text = text.replace(segAfterKwRe, (_m, kw: string, p1: string, p2: string) => {
    const seg = formatPointSequence(`${p1} ${p2}`);
    if (seg.length >= 2 && seg.length <= 4) {
      appliedTransformations.push(`Chuẩn hóa đoạn thẳng ${seg}`);
      return `${kw} ${seg}`;
    }
    return _m;
  });

  // Standalone spaced pair right before "vuông góc", "song song", "bằng", "="
  const segBeforeRelRe = new RegExp(
    `(?:^|(?<=[\\s,;]))(${LETTER_TOK})\\s+(${LETTER_TOK})\\s+(?=(?:vuông góc|song song|bằng|=|⊥|∥))`,
    'giu'
  );
  text = text.replace(segBeforeRelRe, (_m, p1: string, p2: string) => {
    const seg = formatPointSequence(`${p1} ${p2}`);
    appliedTransformations.push(`Chuẩn hóa cạnh ${seg}`);
    return `${seg} `;
  });

  // Single point after "gọi", "điểm", "từ"
  const singlePtRe = new RegExp(
    `(?<![\\p{L}])(gọi|điểm|từ)\\s+([a-z]|bê|xê|đê|hát|mờ|nờ|ét|sờ)(?![\\p{L}])(?=\\s+(?:là|đến|thuộc|trên|lần lượt))`,
    'giu'
  );
  text = text.replace(singlePtRe, (_m, kw: string, pt: string) => {
    const formatted = formatPointSequence(pt);
    appliedTransformations.push(`Chuẩn hóa điểm ${formatted}`);
    return `${kw} ${formatted}`;
  });

  // 6. Spoken mathematical expressions: degrees, roots, powers, fractions, equality
  for (const [word, num] of Object.entries(VIETNAMESE_NUMBER_WORDS)) {
    const degRe = new RegExp(`(?<![\\p{L}])${word}\\s+độ(?![\\p{L}])`, 'giu');
    if (degRe.test(text)) {
      text = text.replace(degRe, `${num}°`);
      appliedTransformations.push(`Chuyển "${word} độ" → "${num}°"`);
    }
  }
  text = text.replace(/(?<![\p{N}])(\d+)\s+độ(?![\p{L}])/giu, '$1°');

  // Square roots: "a căn bậc hai của 2" or "a căn 2" -> "a√2"
  text = text.replace(
    /(?<![\p{L}])a\s+căn(?:\s+bậc\s+(?:hai|2))?(?:\s+của)?\s+(hai|ba|năm|sáu|bảy|\d+)(?![\p{L}\p{N}])/giu,
    (_m, n: string) => {
      const digit = VIETNAMESE_NUMBER_WORDS[n.toLowerCase()] ?? n;
      appliedTransformations.push(`Chuyển căn thức → a√${digit}`);
      return `a√${digit}`;
    }
  );
  text = text.replace(
    /(?<![\p{L}])căn(?:\s+bậc\s+(?:hai|2))?(?:\s+của)?\s+(hai|ba|năm|sáu|bảy|\d+)(?![\p{L}\p{N}])/giu,
    (_m, n: string) => {
      const digit = VIETNAMESE_NUMBER_WORDS[n.toLowerCase()] ?? n;
      appliedTransformations.push(`Chuyển căn thức → √${digit}`);
      return `√${digit}`;
    }
  );

  // Powers: "a bình phương" / "a mũ 2" -> "a²"
  if (/(?<![\p{L}])a\s+(?:bình phương|mũ hai|mũ 2)(?![\p{L}\p{N}])/giu.test(text)) {
    text = text.replace(/(?<![\p{L}])a\s+(?:bình phương|mũ hai|mũ 2)(?![\p{L}\p{N}])/giu, 'a²');
    appliedTransformations.push('Chuyển lũy thừa → a²');
  }
  if (/(?<![\p{L}])a\s+(?:lập phương|mũ ba|mũ 3)(?![\p{L}\p{N}])/giu.test(text)) {
    text = text.replace(/(?<![\p{L}])a\s+(?:lập phương|mũ ba|mũ 3)(?![\p{L}\p{N}])/giu, 'a³');
    appliedTransformations.push('Chuyển lũy thừa → a³');
  }

  // Spoken fractions: "a phần 2", "một phần hai"
  text = text.replace(
    /(?<![\p{L}])a\s+(?:phần|trên|chia)\s+(hai|ba|bốn|năm|\d+)(?![\p{L}\p{N}])/giu,
    (_m, d: string) => {
      const digit = VIETNAMESE_NUMBER_WORDS[d.toLowerCase()] ?? d;
      appliedTransformations.push(`Chuyển phân số → a/${digit}`);
      return `a/${digit}`;
    }
  );
  text = text.replace(
    /(?<![\p{L}\p{N}])(một|hai|ba|bốn|năm|\d+)\s+phần\s+(hai|ba|bốn|năm|\d+)(?![\p{L}\p{N}])/giu,
    (_m, num: string, den: string) => {
      const n = VIETNAMESE_NUMBER_WORDS[num.toLowerCase()] ?? num;
      const d = VIETNAMESE_NUMBER_WORDS[den.toLowerCase()] ?? den;
      appliedTransformations.push(`Chuyển phân số → ${n}/${d}`);
      return `${n}/${d}`;
    }
  );

  // "SA bằng a√2" -> "SA = a√2"
  text = text.replace(
    /(?<![\p{L}])([A-Z]'?[A-Z]'?)\s+bằng\s+([0-9a-z√/²³]+)/gu,
    (_m, seg: string, val: string) => {
      appliedTransformations.push(`Chuẩn hóa đẳng thức ${seg} = ${val}`);
      return `${seg} = ${val}`;
    }
  );

  // Clean spacing around punctuation & capitalize first letter
  text = text
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.?!]$/.test(text)) {
      text += '.';
    }
  }

  // 7. Detect potential transcription errors / ambiguities
  const hasSolidKeyword = /(hình chóp|tứ diện|lăng trụ|hình hộp|hình lập phương)/i.test(text);
  if (!hasSolidKeyword) {
    warnings.push(
      'Chưa nhận diện rõ tên khối hình (ví dụ: hình chóp, tứ diện, lăng trụ, hình hộp, hình lập phương). Hãy kiểm tra lại phần đầu câu.'
    );
  }

  const hasGoalKeyword = /(chứng minh|tính|xác định|tìm)/i.test(text);
  if (!hasGoalKeyword) {
    warnings.push(
      'Chưa thấy rõ yêu cầu bài toán (ví dụ: "Chứng minh...", "Tính khoảng cách...", "Tính góc...", "Tính thể tích...").'
    );
  }

  const isolatedLetters = text.match(/(?:^|\s)[b-df-hj-np-tv-z](?=\s+[b-df-hj-np-tv-z](?:\s|$))/g);
  if (isolatedLetters && isolatedLetters.length > 0) {
    warnings.push(
      'Phát hiện chữ cái đơn lẻ chưa được ghép thành tên điểm/đoạn thẳng. Bạn nên đọc chậm từng tên điểm hoặc sửa trực tiếp ở ô bên dưới.'
    );
  }

  const uniqueTransforms = Array.from(new Set(appliedTransformations));
  const confidenceScore: 'high' | 'medium' | 'low' =
    warnings.length === 0 && hasSolidKeyword && hasGoalKeyword
      ? 'high'
      : warnings.length <= 1
        ? 'medium'
        : 'low';

  return {
    rawTranscript,
    normalizedText: text,
    appliedTransformations: uniqueTransforms,
    warnings,
    confidenceScore,
  };
}
