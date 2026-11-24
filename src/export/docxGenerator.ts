import JSZip from 'jszip';
import { AnalyzedProblem, DocxExportMode } from '../types/geometry';
import { richTextToWordRunsXml } from './omml';

export interface DocxProblemInput {
  problem: AnalyzedProblem;
  diagramPngBase64?: string; // raw base64 without data:image/png;base64, prefix
  diagramWidthPx?: number;
  diagramHeightPx?: number;
  diagramCaption?: string;
}

export interface DocxBuildOptions {
  title: string;
  subtitle?: string;
  mode: DocxExportMode;
  items: DocxProblemInput[];
}

function escapeXmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeParagraph(
  runsXml: string,
  opts?: {
    align?: 'left' | 'center' | 'both';
    firstLineIndent?: number;
    spaceBefore?: number;
    spaceAfter?: number;
    keepNext?: boolean;
    keepLines?: boolean;
  }
): string {
  const jc = opts?.align ?? 'both';
  const before = opts?.spaceBefore ?? 60;
  const after = opts?.spaceAfter ?? 100;
  const indent = opts?.firstLineIndent ? `<w:ind w:firstLine="${opts.firstLineIndent}"/>` : '';
  const keepNext = opts?.keepNext ? '<w:keepNext/>' : '';
  const keepLines = opts?.keepLines ? '<w:keepLines/>' : '';

  return `<w:p><w:pPr><w:jc w:val="${jc}"/>${keepNext}${keepLines}<w:spacing w:before="${before}" w:after="${after}" w:line="300" w:lineRule="auto"/>${indent}</w:pPr>${runsXml}</w:p>`;
}

function makeTextParagraph(
  text: string,
  opts?: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    align?: 'left' | 'center' | 'both';
    firstLineIndent?: number;
    spaceBefore?: number;
    spaceAfter?: number;
    keepNext?: boolean;
    keepLines?: boolean;
  }
): string {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return '';
  return lines
    .map((line) =>
      makeParagraph(
        richTextToWordRunsXml(line.trim(), {
          bold: opts?.bold,
          italic: opts?.italic,
          color: opts?.color,
        }),
        opts
      )
    )
    .join('');
}

function makeInlineImageParagraph(
  relId: string,
  imgId: number,
  widthPx: number,
  heightPx: number,
  altText: string
): string {
  // Max width on A4 with 2cm margins = 17cm ≈ 6,120,000 EMU; target crisp 11.5cm = 4,140,000 EMU
  const maxWidthEmu = 4_140_000;
  const maxHeightEmu = 3_100_000;
  const ratio = widthPx > 0 && heightPx > 0 ? widthPx / heightPx : 4 / 3;

  let cx = maxWidthEmu;
  let cy = Math.round(cx / ratio);
  if (cy > maxHeightEmu) {
    cy = maxHeightEmu;
    cx = Math.round(cy * ratio);
  }

  return `<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${imgId}" name="Hinh_${imgId}" descr="${escapeXmlAttr(altText)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${imgId}" name="image${imgId}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

const MODE_LABELS: Record<DocxExportMode, string> = {
  de_bai: 'ĐỀ BÀI / ĐỀ KIỂM TRA',
  huong_dan: 'HƯỚNG DẪN GIẢI & GỢI Ý',
  bai_giai: 'ĐỀ BÀI VÀ BÀI GIẢI CHI TIẾT',
  tong_hop: 'BỘ TÀI LIỆU TỔNG HỢP (ĐỀ BÀI – HÌNH VẼ – GỢI Ý – BÀI GIẢI)',
};

/**
 * Generates a real, Microsoft Word-compatible `.docx` file (OpenXML ZIP archive)
 * formatted on A4 paper, Times New Roman 13pt, justified text, editable OMML math equations,
 * and embedded high-DPI PNG geometry figures.
 */
export async function generateDocxUint8Array(options: DocxBuildOptions): Promise<Uint8Array> {
  const zip = new JSZip();

  const imageEntries: Array<{ relId: string; filename: string; base64: string }> = [];
  let bodyXml = '';

  // Document header block
  bodyXml += makeTextParagraph(options.title.trim() || 'TÀI LIỆU HÌNH HỌC KHÔNG GIAN THPT', {
    bold: true,
    align: 'center',
    spaceBefore: 0,
    spaceAfter: 60,
    keepNext: true,
  });

  bodyXml += makeTextParagraph(options.subtitle?.trim() || MODE_LABELS[options.mode], {
    italic: true,
    color: '334155',
    align: 'center',
    spaceBefore: 0,
    spaceAfter: 200,
    keepNext: true,
  });

  options.items.forEach((item, index) => {
    const qNum = index + 1;
    const p = item.problem;

    // Question Heading (keepNext so question heading never orphans at bottom of page)
    bodyXml += makeTextParagraph(`Câu ${qNum}. ${p.rawText}`, {
      bold: true,
      align: 'both',
      spaceBefore: index === 0 ? 60 : 220,
      spaceAfter: 100,
      keepNext: options.mode !== 'de_bai',
      keepLines: true,
    });

    // Include diagram when available (especially in tong_hop, huong_dan, bai_giai, or if provided)
    const shouldIncludeDiagram =
      Boolean(item.diagramPngBase64) &&
      (options.mode === 'tong_hop' || options.mode === 'bai_giai' || options.mode === 'huong_dan');

    if (shouldIncludeDiagram && item.diagramPngBase64) {
      const imgIdx = imageEntries.length + 1;
      const relId = `rIdImg${imgIdx}`;
      const filename = `image${imgIdx}.png`;
      imageEntries.push({
        relId,
        filename,
        base64: item.diagramPngBase64.replace(/^data:image\/\w+;base64,/, ''),
      });
      bodyXml += makeInlineImageParagraph(
        relId,
        imgIdx,
        item.diagramWidthPx ?? 960,
        item.diagramHeightPx ?? 720,
        `Hình minh họa Câu ${qNum}`
      );
      bodyXml += makeTextParagraph(
        item.diagramCaption || `Hình ${qNum}: Mô hình không gian ${p.structured.solidName}`,
        {
          italic: true,
          color: '475569',
          align: 'center',
          spaceBefore: 20,
          spaceAfter: 140,
        }
      );
    }

    // Representative notice if ambiguous
    if (p.structured.isRepresentativeConfig && p.structured.representativeNotice && options.mode !== 'de_bai') {
      bodyXml += makeTextParagraph(`Lưu ý hình vẽ: ${p.structured.representativeNotice}`, {
        italic: true,
        color: '92400E',
        firstLineIndent: 567,
        spaceBefore: 40,
        spaceAfter: 100,
      });
    }

    // Problem issues (missing data / contradiction)
    if (p.structured.issues.length > 0 && options.mode !== 'de_bai') {
      bodyXml += makeTextParagraph('Nhận xét về giả thiết đề bài:', {
        bold: true,
        color: '991B1B',
        spaceBefore: 80,
        spaceAfter: 40,
        keepNext: true,
      });
      for (const issue of p.structured.issues) {
        bodyXml += makeTextParagraph(`• ${issue.title}: ${issue.detail}`, {
          firstLineIndent: 360,
          spaceBefore: 20,
          spaceAfter: 60,
        });
      }
    }

    // HINTS section (for huong_dan and tong_hop)
    if ((options.mode === 'huong_dan' || options.mode === 'tong_hop') && p.hints) {
      bodyXml += makeTextParagraph('Hướng dẫn và gợi ý tự giải:', {
        bold: true,
        color: '0F766E',
        spaceBefore: 120,
        spaceAfter: 60,
        keepNext: true,
      });
      bodyXml += makeTextParagraph(`a) Phân tích đề: ${p.hints.phanTichDe}`, {
        firstLineIndent: 567,
        spaceBefore: 40,
        spaceAfter: 60,
      });
      bodyXml += makeTextParagraph('b) Kiến thức cần dùng:', {
        bold: true,
        firstLineIndent: 567,
        spaceBefore: 40,
        spaceAfter: 40,
        keepNext: true,
      });
      for (const k of p.hints.kienThucCanDung) {
        bodyXml += makeTextParagraph(`– ${k}`, {
          firstLineIndent: 720,
          spaceBefore: 20,
          spaceAfter: 40,
        });
      }
      bodyXml += makeTextParagraph(`c) Hướng giải: ${p.hints.huongGiai}`, {
        firstLineIndent: 567,
        spaceBefore: 40,
        spaceAfter: 120,
      });
    }

    // FULL SOLUTION section (for bai_giai and tong_hop)
    if (options.mode === 'bai_giai' || options.mode === 'tong_hop') {
      if (p.solution) {
        bodyXml += makeTextParagraph('Bài giải chi tiết:', {
          bold: true,
          color: '1D4ED8',
          spaceBefore: 140,
          spaceAfter: 60,
          keepNext: true,
        });
        bodyXml += makeTextParagraph(`Ý tưởng chính: ${p.solution.yTuongChinh}`, {
          italic: true,
          firstLineIndent: 567,
          spaceBefore: 40,
          spaceAfter: 80,
        });
        for (const step of p.solution.cacBuocGiai) {
          bodyXml += makeTextParagraph(step.title, {
            bold: true,
            spaceBefore: 80,
            spaceAfter: 40,
            keepNext: true,
          });
          bodyXml += makeTextParagraph(step.content, {
            firstLineIndent: 567,
            spaceBefore: 20,
            spaceAfter: 60,
            keepLines: true,
          });
        }
        bodyXml += makeTextParagraph(p.solution.ketLuanCuoiCung, {
          bold: true,
          firstLineIndent: 567,
          spaceBefore: 60,
          spaceAfter: 120,
        });
        if (p.solution.cachGiaiKhac) {
          bodyXml += makeTextParagraph(
            `${p.solution.cachGiaiKhac.title} (${p.solution.cachGiaiKhac.note})`,
            {
              bold: true,
              italic: true,
              spaceBefore: 40,
              spaceAfter: 40,
              keepNext: true,
            }
          );
          bodyXml += makeTextParagraph(p.solution.cachGiaiKhac.content, {
            firstLineIndent: 567,
            spaceBefore: 20,
            spaceAfter: 100,
          });
        }
      } else {
        bodyXml += makeTextParagraph(
          'Chưa xuất lời giải đầy đủ do đề bài còn thiếu dữ kiện hoặc có mâu thuẫn cần xác nhận trước khi kết luận.',
          {
            italic: true,
            color: '991B1B',
            firstLineIndent: 567,
            spaceBefore: 60,
            spaceAfter: 120,
          }
        );
      }
    }
  });

  // A4 section properties: 210mm x 297mm = 11906 x 16838 twips, 2cm margins = 1134 twips
  const sectPr =
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14">
  <w:body>
    ${bodyXml}
    ${sectPr}
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
        <w:lang w:val="vi-VN"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="100" w:line="300" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsList = [
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    ...imageEntries.map(
      (img) =>
        `<Relationship Id="${img.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.filename}"/>`
    ),
  ];

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${docRelsList.join('\n  ')}
</Relationships>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', rootRelsXml);
  zip.file('word/document.xml', documentXml);
  zip.file('word/styles.xml', stylesXml);
  zip.file('word/_rels/document.xml.rels', docRelsXml);

  for (const img of imageEntries) {
    zip.file(`word/media/${img.filename}`, img.base64, { base64: true });
  }

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
