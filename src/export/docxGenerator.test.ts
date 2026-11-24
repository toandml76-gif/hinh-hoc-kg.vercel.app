import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { latexToOmml } from './omml';
import { generateDocxUint8Array } from './docxGenerator';
import { PRESET_PROBLEMS } from '../geometry/presets';

// Minimal valid 1x1 transparent PNG base64 for unit test image embedding
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1cAAAAASUVORK5CYII=';

test('OMML converter transforms fractions, square roots, superscripts, hats, and vectors into native Word XML', () => {
  const omml = latexToOmml('V = \\dfrac{1}{3} S_{\\text{đáy}} h + \\sqrt{2} a^2 + \\widehat{SCA} + \\overrightarrow{AB}');
  assert.ok(omml.startsWith('<m:oMath>'));
  assert.ok(omml.includes('<m:f>'), 'Must emit native OMML fraction');
  assert.ok(omml.includes('<m:rad>'), 'Must emit native OMML radical');
  assert.ok(omml.includes('<m:sSub>'), 'Must emit native OMML subscript');
  assert.ok(omml.includes('<m:sSup>'), 'Must emit native OMML superscript');
  assert.ok(omml.includes('<m:acc>'), 'Must emit native OMML accent for angle/vector');
  assert.equal(omml.includes('\\dfrac'), false, 'No raw LaTeX may remain in OMML output');
  assert.equal(omml.includes('\\sqrt'), false, 'No raw LaTeX may remain in OMML output');
});

test('DOCX generator produces valid A4 Times New Roman 13pt OpenXML package with OMML and embedded PNG', async () => {
  const bytes = await generateDocxUint8Array({
    title: 'ĐỀ KIỂM TRA HÌNH HỌC KHÔNG GIAN THPT',
    mode: 'tong_hop',
    items: [
      {
        problem: PRESET_PROBLEMS[0],
        diagramPngBase64: TINY_PNG_BASE64,
        diagramWidthPx: 960,
        diagramHeightPx: 680,
      },
    ],
  });

  assert.ok(bytes.length > 500, 'Generated DOCX must be a non-empty binary zip');
  const zip = await JSZip.loadAsync(bytes);

  assert.ok(zip.file('[Content_Types].xml'));
  assert.ok(zip.file('_rels/.rels'));
  assert.ok(zip.file('word/document.xml'));
  assert.ok(zip.file('word/styles.xml'));
  assert.ok(zip.file('word/media/image1.png'));

  const docXml = await zip.file('word/document.xml')!.async('string');
  assert.ok(docXml.includes('w:w="11906" w:h="16838"'), 'Page size must be A4');
  assert.ok(docXml.includes('Times New Roman'), 'Font must be Times New Roman');
  assert.ok(docXml.includes('w:sz w:val="26"'), 'Font size must be 13pt (26 half-points)');
  assert.ok(docXml.includes('w:jc w:val="both"'), 'Body paragraphs must be justified');
  assert.ok(docXml.includes('<m:oMath>'), 'Document must contain native Word OMML equations');
  assert.ok(docXml.includes('r:embed="rIdImg1"'), 'Document must reference embedded PNG image');
  assert.equal(docXml.includes('\\dfrac'), false, 'Document must never leak raw LaTeX');
  assert.equal(docXml.includes('\\perp'), false, 'Document must never leak raw LaTeX');
});
