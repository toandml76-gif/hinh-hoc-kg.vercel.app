import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVietnameseMathSpeech } from './vietnameseMathSpeech';

test('Normalizes spoken Vietnamese pyramid problem with roots, planes, and segments', () => {
  const input =
    'cho hình chóp s chấm a b c d có đáy a b c d là hình vuông cạnh a, s a vuông góc với mặt phẳng a b c d, s a bằng a căn 2. Gọi m là trung điểm của s c. Chứng minh b d vuông góc với mặt phẳng s a c và tính khoảng cách từ m đến mặt phẳng a b c d';

  const res = normalizeVietnameseMathSpeech(input);
  assert.ok(res.normalizedText.includes('hình chóp S.ABCD'), `Got: ${res.normalizedText}`);
  assert.ok(res.normalizedText.includes('đáy ABCD'), `Got: ${res.normalizedText}`);
  assert.ok(res.normalizedText.includes('SA vuông góc với mặt phẳng (ABCD)'), `Got: ${res.normalizedText}`);
  assert.ok(res.normalizedText.includes('SA = a√2'), `Got: ${res.normalizedText}`);
  assert.ok(res.normalizedText.includes('trung điểm của SC'), `Got: ${res.normalizedText}`);
  assert.ok(res.normalizedText.includes('BD vuông góc với mặt phẳng (SAC)'), `Got: ${res.normalizedText}`);
  assert.equal(res.confidenceScore, 'high');
});

test('Normalizes prime notation (phẩy), degrees, fractions, and ASR homophones', () => {
  const input =
    'cho lăn trụ đứng a b c chấm a phẩy b phẩy c phẩy có cạnh bên a a phẩy bằng a phần 2, góc 60 độ, tính thể tích';
  const res = normalizeVietnameseMathSpeech(input);
  assert.ok(res.normalizedText.includes("lăng trụ đứng ABC.A'B'C'"), `Got: ${res.normalizedText}`);
  assert.ok(res.normalizedText.includes('a/2'), `Got: ${res.normalizedText}`);
  assert.ok(res.normalizedText.includes('60°'), `Got: ${res.normalizedText}`);
});

test('Flags low-confidence or incomplete dictation with clear Vietnamese warnings', () => {
  const res = normalizeVietnameseMathSpeech('cho đoạn thẳng m n bằng 3');
  assert.ok(res.warnings.length >= 2);
  assert.equal(res.confidenceScore, 'low');
});
