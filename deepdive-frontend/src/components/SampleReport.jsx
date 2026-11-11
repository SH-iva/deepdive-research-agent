import { useEffect, useId, useRef, useState } from 'react';

function Cite({ n, title, meta }) {
  const id = useId();
  return (
    <span className="cite">
      <button aria-describedby={id}>{n}</button>
      <span className="pop" id={id} role="tooltip">
        <b>{title}</b>
        {meta}
      </span>
    </span>
  );
}

// Shows a skeleton while the depth changes, then fades in the matching version.
export default function SampleReport({ depth }) {
  const [shown, setShown] = useState(depth.id);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setLoading(true);
    const a = setTimeout(() => setShown(depth.id), 260);
    const b = setTimeout(() => setLoading(false), 700);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [depth.id]);

  return (
    <>
      <article className={`report ${loading ? 'loading' : ''}`} data-depth={shown}>
        <div className="content">
          <h3>Retail and e-commerce lead global sales</h3>
          <p>
            Walmart reported <span className="fig">$681 billion</span> in revenue for fiscal 2025
            <Cite n="1" title="Walmart annual report, FY2025" meta="corporate.walmart.com, retrieved 11 Nov" />, while
            Amazon reached <span className="fig">$638 billion</span> in 2024
            <Cite n="2" title="Amazon 10-K, fiscal 2024" meta="sec.gov, retrieved 11 Nov" />.
            <span className="std"> Both figures follow each company’s own fiscal year, so they are not a like-for-like comparison.</span>
            <span className="deep">
              {' '}Amazon’s total includes its cloud business, AWS, which reported about $108 billion on its own
              <Cite n="3" title="Amazon Q4 2024 results" meta="ir.aboutamazon.com, retrieved 11 Nov" />.
            </span>
          </p>
          <div className="src">
            <span><i>1</i>Walmart annual report</span>
            <span><i>2</i>Amazon 10-K</span>
            <span className="deep"><i>3</i>Amazon Q4 2024 results</span>
          </div>
        </div>
        <div className="skeleton" aria-hidden="true">
          <div className="sk" style={{ width: '62%', height: 22, marginBottom: 18 }} />
          <div className="sk" style={{ width: '100%' }} />
          <div className="sk" style={{ width: '94%' }} />
          <div className="sk" style={{ width: '70%' }} />
          <div className="sk" style={{ width: '36%', height: 26, marginTop: 20 }} />
        </div>
      </article>
      <p className="note">Sample excerpt. Hover a number to see its source.</p>
    </>
  );
}
