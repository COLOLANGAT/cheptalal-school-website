// responsive-check.js
// Simple runtime check for viewport meta and a small helper overlay
(function () {
  function hasViewportMeta() {
    return !!document.querySelector('meta[name="viewport"]');
  }

  function createHelper() {
    const helper = document.createElement('div');
    helper.id = 'viewport-helper';
    helper.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;background:rgba(0,0,0,0.6);color:#fff;padding:8px 10px;border-radius:8px;font-size:13px;backdrop-filter:blur(4px);cursor:pointer';
    helper.title = 'Viewport helper - click to show recommended breakpoints';
    helper.textContent = 'Viewports';
    document.body.appendChild(helper);

    const panel = document.createElement('div');
    panel.id = 'viewport-helper-panel';
    panel.style.cssText = 'position:fixed;right:12px;bottom:56px;z-index:10000;background:#fff;color:#111;padding:12px;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,0.18);display:none;min-width:220px;font-size:13px';
    panel.innerHTML = `
      <strong>Recommended breakpoints</strong>
      <ul style="margin:8px 0 0 16px;padding:0;line-height:1.6">
        <li>Mobile (small): 320px — 480px</li>
        <li>Mobile (large): 481px — 768px</li>
        <li>Tablet: 769px — 1024px</li>
        <li>Desktop: 1025px+</li>
      </ul>
      <small style="opacity:.8">Tip: open DevTools → Toggle device toolbar to emulate sizes.</small>
    `;
    document.body.appendChild(panel);

    helper.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!hasViewportMeta()) {
      console.warn('Viewport meta tag missing. Add <meta name="viewport" content="width=device-width, initial-scale=1"> to ensure responsiveness.');
    }
    createHelper();
  });
})();
