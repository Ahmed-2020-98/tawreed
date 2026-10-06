import { Fragment } from 'react';

/** Minimal, safe Markdown → React (headings, lists, paragraphs, **bold**) for CMS content — no raw HTML. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
}

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const blocks = source.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <div className={`space-y-4 text-[1.0625rem] leading-8 text-gray-700 ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^[-*] /.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 ps-6 marker:text-brand-600">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <Fragment key={i}>
            {lines.map((l, j) => {
              if (l.startsWith('### ')) return <h3 key={j} className="pt-2 text-xl font-extrabold text-navy-900">{inline(l.slice(4))}</h3>;
              if (l.startsWith('## ')) return <h2 key={j} className="pt-2 text-2xl font-black text-navy-900">{inline(l.slice(3))}</h2>;
              if (l.startsWith('# ')) return <h1 key={j} className="text-3xl font-black text-navy-900">{inline(l.slice(2))}</h1>;
              if (/^[-*] /.test(l)) return <p key={j} className="ps-4">• {inline(l.slice(2))}</p>;
              return l.trim() ? <p key={j}>{inline(l)}</p> : null;
            })}
          </Fragment>
        );
      })}
    </div>
  );
}
