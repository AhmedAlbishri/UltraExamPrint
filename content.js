(() => {
  const BTN_ID = 'ultra-print-full-exam-btn';
  const PRINT_WRAPPER_ID = '__ultra_print_root__';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Locate exam root (your JSS content body first)
  function getExamRoot() {
    const jssBody = document.querySelector('[class^="makeStylescontentBody-"]');
    if (jssBody) return jssBody;
    const sels = [
      '[data-assessment-attempt]',
      '[data-automation-id="assessment-attempt"]',
      '[data-automation-id="attempt-view"]',
      'bb-assessment-attempt','bb-attempt-page',
      '.assessment-attempt','.assessment-view','.attempt-view'
    ];
    for (const s of sels) { const el = document.querySelector(s); if (el) return el; }
    // fallback up from a question
    const q = document.querySelector('.question,[data-question],.assessment-item,[aria-label^="Question"]');
    if (q) {
      let p = q;
      for (let i = 0; i < 6 && p; i++) {
        p = p.parentElement; if (!p) break;
        const hasQs = p.querySelectorAll('.question,[data-question],.assessment-item').length >= 1;
        const block = getComputedStyle(p).display !== 'inline';
        if (block && hasQs) return p;
      }
    }
    return null;
  }

  // Your header hint (student info)
  function getAttemptHeader(examRoot) {
    const header = document.querySelector(
      '[class^="makeStylesheader-"], [class*=" makeStylesheader-"], ' +
      '[class^="makeStylescompactHeader-"], [class*=" makeStylescompactHeader-"]'
    );
    if (header && header.offsetHeight > 0) return header;

    const candidates = [
      '[data-automation-id="attempt-header"]',
      '[data-automation-id*="assessment-header"]',
      '[class*="attemptHeader"]',
      '[class*="attempt-info"]',
      'bb-attempt-header','bb-assessment-header'
    ];
    for (const sel of candidates) { const el = document.querySelector(sel); if (el && el.offsetHeight > 0) return el; }

    // closest visible sibling above root
    let p = examRoot?.previousElementSibling;
    for (let i = 0; i < 3 && p; i++, p = p?.previousElementSibling) {
      if (!p) break;
      const isNav = p.getAttribute('role') === 'navigation' || /nav|breadcrumb/i.test(p.className || '');
      const hasText = (p.innerText || '').trim().length > 10;
      const okSize = p.offsetHeight > 0 && p.offsetHeight < 1200;
      if (!isNav && hasText && okSize) return p;
    }
    return null;
  }

  // Realize content without opening menus
  async function realizeAllContent(examRoot) {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // Only expand safe <details>
  examRoot.querySelectorAll('details:not([open])').forEach(d => d.open = true);
  // Eager-load images inside the exam
  examRoot.querySelectorAll('img[loading="lazy"]').forEach(img => img.loading = 'eager');

  const qSel = '.question,[data-question],.assessment-item,[aria-label^="Question"]';

  // Scroll helper
  const scrollOnce = (target) => {
    if (target === window) window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    else target.scrollTop = target.scrollHeight;
  };

  // Loop until question count stabilizes (and height stops growing)
  let lastCount = -1, stableHits = 0, lastH = -1;
  for (let i = 0; i < 120; i++) { // hard cap ~30s
    // inner virtualizer first (if scrollable)
    if (examRoot.scrollHeight > examRoot.clientHeight + 10) scrollOnce(examRoot);
    // outer virtualizer
    scrollOnce(window);

    await sleep(250);

    const count = examRoot.querySelectorAll(qSel).length;
    const h = document.body.scrollHeight;

    if (count === lastCount && h === lastH) stableHits++;
    else stableHits = 0;

    lastCount = count; lastH = h;
    if (stableHits >= 3) break; // 3 stable iterations = done
  }

  // Return to top for printing
  if (examRoot === document.body) window.scrollTo({ top: 0, behavior: 'instant' });
  else examRoot.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'instant' });
}


  // In-place print: clone header + body into a dedicated wrapper in THIS document
  function printInPlace(examRoot) {
    // 1) Create/refresh the print wrapper
    document.getElementById(PRINT_WRAPPER_ID)?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = PRINT_WRAPPER_ID;

    // 2) Attempt header (student info) first
    const headerNode = getAttemptHeader(examRoot);
    if (headerNode) {
      const headerClone = headerNode.cloneNode(true);
      headerClone.classList.add('__ultra_attempt_header__');
      wrapper.appendChild(headerClone);
    }

    // 3) Then the exam content
    const clone = examRoot.cloneNode(true);
    clone.querySelectorAll('#' + BTN_ID).forEach(n => n.remove());
    wrapper.appendChild(clone);

    // 4) Inject global print CSS (scoped by body.__ultra-printing)
    const styleId = '__ultra_print_styles__';
if (!document.getElementById(styleId)) {
  const s = document.createElement('style');
  s.id = styleId;
  s.textContent = `
    @media print {
      /* Hide EVERYTHING except the print wrapper: remove from layout = no blank pages */
      body.__ultra-printing * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      body.__ultra-printing :not(#${PRINT_WRAPPER_ID}):not(#${PRINT_WRAPPER_ID} *) {
        display: none !important; /* was visibility:hidden */
      }
      /* Ensure our wrapper is fully visible and not clipped */
      body.__ultra-printing #${PRINT_WRAPPER_ID} {
        display: block !important;
        position: static !important;
        width: auto !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* De-clip any scroll areas inside wrapper */
      body.__ultra-printing #${PRINT_WRAPPER_ID} * {
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
      }
      /* Keep logical blocks together */
      body.__ultra-printing article,
      body.__ultra-printing section,
      body.__ultra-printing .question,
      body.__ultra-printing [data-question],
      body.__ultra-printing .assessment-item,
      body.__ultra-printing [role="listitem"],
      body.__ultra-printing [class*="card"],
      body.__ultra-printing [class*="container"],
      body.__ultra-printing [class*="content"],
      body.__ultra-printing .__ultra_attempt_header__ {
        break-inside: avoid; page-break-inside: avoid;
        margin-bottom: 12px;
      }
      /* Media sizing */
      body.__ultra-printing img, 
      body.__ultra-printing svg, 
      body.__ultra-printing canvas, 
      body.__ultra-printing video {
        max-width: 100% !important; height: auto !important;
      }
      body.__ultra-printing pre, 
      body.__ultra-printing code, 
      body.__ultra-printing math, 
      body.__ultra-printing .math, 
      body.__ultra-printing .latex { white-space: pre-wrap; }
      @page { size: A4; margin: 12mm; }
    }
  `;
  document.head.appendChild(s);
}


    // 5) Append wrapper at end of body so it inherits all site CSS/context
    document.body.appendChild(wrapper);

    // 6) Enter print mode on this page
    const btn = document.getElementById(BTN_ID);
    if (btn) btn.style.display = 'none';
    document.body.classList.add('__ultra-printing');

    const cleanup = () => {
      document.body.classList.remove('__ultra-printing');
      wrapper.remove();
      if (btn) btn.style.display = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    // Fallback cleanup (some browsers don’t fire afterprint reliably)
    setTimeout(cleanup, 2000);
  }

// content.js (tail section)
async function runPrintWorkflow() {
  try {
    const root = getExamRoot();
    if (!root) { alert('Could not locate the exam content container.'); return; }
    await realizeAllContent(root);
    printInPlace(root);
  } catch (e) {
    console.error('Ultra Print error:', e);
    alert('Printing failed. See Console (F12) for details.');
  }
}

// Listen for shortcut and icon clicks
chrome.runtime?.onMessage?.addListener((msg) => {
  if (msg && msg.type === 'ULTRA_PRINT_FULL_EXAM') runPrintWorkflow().catch(console.error);
});

// Optional: automatically enable on pages that actually have exam content (no UI injected)
document.addEventListener('DOMContentLoaded', () => { /* no-op; rely on shortcut/icon */ });


//   function injectButton() {
//     if (document.getElementById(BTN_ID)) return;
//     const btn = document.createElement('button');
//     btn.id = BTN_ID;
//     btn.textContent = 'Print full exam';
//     Object.assign(btn.style, {
//       position: 'fixed', right: '16px', bottom: '16px', zIndex: 2147483647,
//       padding: '10px 14px', fontSize: '14px', borderRadius: '10px',
//       border: '1px solid #A0A0A0', background: '#ffffff', cursor: 'pointer',
//       boxShadow: '0 6px 18px rgba(0,0,0,.15)'
//     });
//     btn.title = 'Load all questions and print a clean version (Ctrl+Shift+Y)';
//     btn.addEventListener('click', () => runPrintWorkflow().catch(console.error));
//     document.body.appendChild(btn);
//   }

//   chrome.runtime?.onMessage?.addListener((msg) => {
//     if (msg && msg.type === 'ULTRA_PRINT_FULL_EXAM') runPrintWorkflow().catch(console.error);
//   });

//   const obs = new MutationObserver(() => { if (document.body && getExamRoot()) injectButton(); });
//   obs.observe(document.documentElement, { childList: true, subtree: true });

//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => { if (getExamRoot()) injectButton(); });
//   } else {
//     if (getExamRoot()) injectButton();
//   }
})();
