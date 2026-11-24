/**
 * Converts standard LaTeX math fragments into valid Microsoft Word
 * Office Math Markup Language (OMML, namespace `m:`) so equations in
 * exported `.docx` documents remain 100% natively editable in Word.
 */

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function ommlRun(text: string, normal = false): string {
  if (!text) return '';
  const rPr = normal ? '<m:rPr><m:nor/></m:rPr>' : '';
  return `<m:r>${rPr}<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><m:t xml:space="preserve">${escapeXml(text)}</m:t></m:r>`;
}

interface ParseRes {
  xml: string;
  next: number;
}

function readBalancedGroup(src: string, start: number): { content: string; next: number } {
  let i = start;
  while (i < src.length && src[i] === ' ') i++;
  if (i >= src.length) return { content: '', next: i };
  if (src[i] !== '{') {
    // Single command or single character
    if (src[i] === '\\') {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z]/.test(src[j])) j++;
      if (j === i + 1 && j < src.length) j++;
      return { content: src.slice(i, j), next: j };
    }
    return { content: src[i], next: i + 1 };
  }
  let depth = 0;
  let j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) {
        return { content: src.slice(i + 1, j), next: j + 1 };
      }
    }
  }
  return { content: src.slice(i + 1), next: src.length };
}

const SYMBOL_MAP: Record<string, string> = {
  perp: '⊥',
  parallel: '∥',
  triangle: '△',
  angle: '∠',
  circ: '°',
  cdot: '·',
  times: '×',
  pm: '±',
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  neq: '≠',
  approx: '≈',
  Rightarrow: '⇒',
  Leftrightarrow: '⇔',
  rightarrow: '→',
  in: '∈',
  notin: '∉',
  subset: '⊂',
  nsubseteq: '⊄',
  cap: '∩',
  cup: '∪',
  varnothing: '∅',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  varphi: 'φ',
  phi: 'φ',
  pi: 'π',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  cot: 'cot',
  arctan: 'arctan',
  arcsin: 'arcsin',
  arccos: 'arccos',
  sim: '∽',
  equiv: '≡',
  bigl: '',
  bigr: '',
  left: '',
  right: '',
  not: '',
};

function parseAtom(src: string, idx: number): ParseRes {
  let i = idx;
  while (i < src.length && src[i] === ' ') i++;
  if (i >= src.length) return { xml: '', next: i };

  const ch = src[i];

  if (ch === '{') {
    const grp = readBalancedGroup(src, i);
    return { xml: parseExpression(grp.content), next: grp.next };
  }

  if (ch === '\\') {
    let j = i + 1;
    while (j < src.length && /[a-zA-Z]/.test(src[j])) j++;
    const cmd = src.slice(i + 1, j);

    if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
      const num = readBalancedGroup(src, j);
      const den = readBalancedGroup(src, num.next);
      return {
        xml: `<m:f><m:num>${parseExpression(num.content)}</m:num><m:den>${parseExpression(den.content)}</m:den></m:f>`,
        next: den.next,
      };
    }

    if (cmd === 'sqrt') {
      let cursor = j;
      let degXml = '';
      if (src[cursor] === '[') {
        const endBr = src.indexOf(']', cursor);
        if (endBr !== -1) {
          degXml = `<m:deg>${parseExpression(src.slice(cursor + 1, endBr))}</m:deg>`;
          cursor = endBr + 1;
        }
      }
      const rad = readBalancedGroup(src, cursor);
      const radPr = degXml ? '' : '<m:radPr><m:degHide m:val="1"/></m:radPr>';
      return {
        xml: `<m:rad>${radPr}${degXml}<m:e>${parseExpression(rad.content)}</m:e></m:rad>`,
        next: rad.next,
      };
    }

    if (cmd === 'widehat' || cmd === 'hat') {
      const arg = readBalancedGroup(src, j);
      return {
        xml: `<m:acc><m:accPr><m:chr m:val="^"/></m:accPr><m:e>${parseExpression(arg.content)}</m:e></m:acc>`,
        next: arg.next,
      };
    }

    if (cmd === 'overrightarrow' || cmd === 'vec') {
      const arg = readBalancedGroup(src, j);
      return {
        xml: `<m:acc><m:accPr><m:chr m:val="→"/></m:accPr><m:e>${parseExpression(arg.content)}</m:e></m:acc>`,
        next: arg.next,
      };
    }

    if (cmd === 'text' || cmd === 'mathrm') {
      const arg = readBalancedGroup(src, j);
      return {
        xml: ommlRun(arg.content, true),
        next: arg.next,
      };
    }

    // Handle \not\subset -> ⊄
    if (cmd === 'not') {
      const rest = src.slice(j).trimStart();
      if (rest.startsWith('\\subset')) {
        const consumed = src.indexOf('\\subset', j) + '\\subset'.length;
        return { xml: ommlRun('⊄', true), next: consumed };
      }
    }

    if (cmd === 'left' || cmd === 'right' || cmd === 'bigl' || cmd === 'bigr') {
      // consume delimiter char right after
      const delim = src[j] ?? '';
      if (delim === '(' || delim === ')' || delim === '[' || delim === ']' || delim === '|') {
        return { xml: ommlRun(delim, true), next: j + 1 };
      }
      return { xml: '', next: j };
    }

    if (cmd in SYMBOL_MAP) {
      const sym = SYMBOL_MAP[cmd];
      const isFunc = ['sin', 'cos', 'tan', 'cot', 'arctan', 'arcsin', 'arccos'].includes(cmd);
      return { xml: sym ? ommlRun(sym, isFunc) : '', next: j };
    }

    // Fallback escaped char
    if (j === i + 1 && j < src.length) {
      return { xml: ommlRun(src[j], true), next: j + 1 };
    }
    return { xml: ommlRun(cmd, true), next: j };
  }

  // Plain alphanumeric run or single punctuation
  if (/[A-Za-z0-9']/.test(ch)) {
    let j = i + 1;
    // Keep digits together; stop before ^ or _ so superscripts attach to right token
    if (/[0-9]/.test(ch)) {
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      return { xml: ommlRun(src.slice(i, j), true), next: j };
    }
    // Single letter + optional prime(s) so `a^2` attaches `^2` strictly to `a`
    while (j < src.length && src[j] === "'") j++;
    return { xml: ommlRun(src.slice(i, j), false), next: j };
  }

  return { xml: ommlRun(ch, true), next: i + 1 };
}

function parseExpression(latex: string): string {
  const src = latex.trim();
  let i = 0;
  let out = '';

  while (i < src.length) {
    while (i < src.length && src[i] === ' ') i++;
    if (i >= src.length) break;

    const base = parseAtom(src, i);
    i = base.next;
    let supXml = '';
    let subXml = '';

    // Check for trailing ^ and _
    let loop = true;
    while (loop && i < src.length) {
      while (i < src.length && src[i] === ' ') i++;
      if (src[i] === '^') {
        const g = readBalancedGroup(src, i + 1);
        supXml = parseExpression(g.content);
        i = g.next;
      } else if (src[i] === '_') {
        const g = readBalancedGroup(src, i + 1);
        subXml = parseExpression(g.content);
        i = g.next;
      } else {
        loop = false;
      }
    }

    if (supXml && subXml) {
      out += `<m:sSubSup><m:e>${base.xml}</m:e><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup></m:sSubSup>`;
    } else if (supXml) {
      out += `<m:sSup><m:e>${base.xml}</m:e><m:sup>${supXml}</m:sup></m:sSup>`;
    } else if (subXml) {
      out += `<m:sSub><m:e>${base.xml}</m:e><m:sub>${subXml}</m:sub></m:sSub>`;
    } else {
      out += base.xml;
    }
  }

  return out;
}

/**
 * Converts a LaTeX math string into a complete `<m:oMath>...</m:oMath>` Word OMML fragment.
 */
export function latexToOmml(latex: string): string {
  const inner = parseExpression(latex);
  return `<m:oMath>${inner}</m:oMath>`;
}

/**
 * Splits rich Vietnamese prose containing inline `$...$` or `$$...$$` formulas
 * into a sequence of plain text runs and native Word OMML `<m:oMath>` elements.
 */
export function richTextToWordRunsXml(
  text: string,
  options?: { bold?: boolean; italic?: boolean; color?: string }
): string {
  const rPrParts = [
    '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>',
    '<w:sz w:val="26"/>',
    '<w:szCs w:val="26"/>',
  ];
  if (options?.bold) rPrParts.push('<w:b/>');
  if (options?.italic) rPrParts.push('<w:i/>');
  if (options?.color) rPrParts.push(`<w:color w:val="${options.color}"/>`);
  const rPr = `<w:rPr>${rPrParts.join('')}</w:rPr>`;

  // Tokenize by $$...$$ or $...$
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g;
  const parts = text.split(regex);
  let xml = '';

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('$$') && part.endsWith('$$')) {
      xml += latexToOmml(part.slice(2, -2));
    } else if (part.startsWith('$') && part.endsWith('$')) {
      xml += latexToOmml(part.slice(1, -1));
    } else {
      xml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`;
    }
  }

  return xml;
}
