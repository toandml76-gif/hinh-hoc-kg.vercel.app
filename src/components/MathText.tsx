import katex from 'katex';
import React from 'react';

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Safely renders Vietnamese prose containing inline `$...$` and display `$$...$$`
 * math expressions via KaTeX. Non-math text is rendered strictly as React text nodes
 * (never raw HTML) and raw LaTeX is never exposed to the student.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className }) => {
  if (!text) return null;

  const paragraphs = text.split('\n');

  return (
    <span className={className}>
      {paragraphs.map((para, pIdx) => {
        const tokens = para.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);
        return (
          <React.Fragment key={pIdx}>
            {pIdx > 0 && <br />}
            {tokens.map((tok, tIdx) => {
              if (!tok) return null;
              const isBlock = tok.startsWith('$$') && tok.endsWith('$$');
              const isInline = !isBlock && tok.startsWith('$') && tok.endsWith('$');
              if (!isBlock && !isInline) {
                return <React.Fragment key={tIdx}>{tok}</React.Fragment>;
              }

              const expr = isBlock ? tok.slice(2, -2) : tok.slice(1, -1);
              try {
                const html = katex.renderToString(expr, {
                  displayMode: isBlock,
                  throwOnError: false,
                  strict: false,
                  trust: false,
                });
                return (
                  <span
                    key={tIdx}
                    className={isBlock ? 'block my-2 overflow-x-auto' : 'inline-block align-baseline px-[0.06em]'}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              } catch {
                return <span key={tIdx}>{expr}</span>;
              }
            })}
          </React.Fragment>
        );
      })}
    </span>
  );
};
