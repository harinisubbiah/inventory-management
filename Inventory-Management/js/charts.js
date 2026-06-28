/* ==========================================================================
   charts.js
   --------------------------------------------------------------------------
   Hand-rolled HTML Canvas chart rendering — no Chart.js, no libraries.
   Two primitives (donut + bar) cover all three dashboard charts:
     - Inventory Distribution  -> Charts.donut(...)  (value share by product)
     - Stock Status            -> Charts.donut(...)  (count by status)
     - Product Quantities      -> Charts.bar(...)     (qty per product)

   Each function clears and redraws its canvas from scratch, so callers
   can simply re-invoke them whenever the underlying data changes.
   ========================================================================== */

const Charts = (() => {

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  // Scale canvas for crisp rendering on high-DPI screens
  function prepareCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height };
  }

  function emptyState(ctx, width, height) {
    ctx.fillStyle = cssVar('--text-tertiary', '#8b96ac');
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No data yet', width / 2, height / 2);
  }

  // -- Donut chart: segments = [{ label, value, color }] --
  function donut(canvasId, segments, { centerLabel, centerValue } = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = prepareCanvas(canvas);
    ctx.clearRect(0, 0, width, height);

    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (!total) return emptyState(ctx, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const outerR = Math.min(width, height) / 2 - 6;
    const innerR = outerR * 0.62;

    let angle = -Math.PI / 2;
    segments.forEach(seg => {
      if (seg.value <= 0) return;
      const slice = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      angle += slice;
    });

    // punch the donut hole using the page background color
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    if (centerLabel || centerValue) {
      ctx.fillStyle = cssVar('--text-primary', '#eef1f8');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillText(centerValue || '', cx, cy - (centerLabel ? 8 : 0));
      if (centerLabel) {
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = cssVar('--text-tertiary', '#8b96ac');
        ctx.fillText(centerLabel, cx, cy + 12);
      }
    }
  }

  // -- Bar chart: items = [{ label, value, color }] (horizontal bars) --
  function bar(canvasId, items) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = prepareCanvas(canvas);
    ctx.clearRect(0, 0, width, height);

    if (!items.length) return emptyState(ctx, width, height);

    const max = Math.max(...items.map(i => i.value), 1);
    const paddingLeft = 96;
    const paddingRight = 44;
    const rowHeight = height / items.length;
    const barHeight = Math.min(18, rowHeight * 0.5);

    ctx.font = '11.5px Inter, sans-serif';
    ctx.textBaseline = 'middle';

    items.forEach((item, i) => {
      const y = rowHeight * i + rowHeight / 2;
      const barWidth = ((width - paddingLeft - paddingRight) * item.value) / max;

      // label
      ctx.fillStyle = cssVar('--text-secondary', '#a8b0c3');
      ctx.textAlign = 'right';
      ctx.fillText(truncate(item.label, 14), paddingLeft - 12, y);

      // track
      ctx.fillStyle = cssVar('--line', 'rgba(255,255,255,0.08)');
      roundRect(ctx, paddingLeft, y - barHeight / 2, width - paddingLeft - paddingRight, barHeight, barHeight / 2);
      ctx.fill();

      // value bar
      ctx.fillStyle = item.color;
      roundRect(ctx, paddingLeft, y - barHeight / 2, Math.max(barWidth, 4), barHeight, barHeight / 2);
      ctx.fill();

      // value label
      ctx.fillStyle = cssVar('--text-primary', '#eef1f8');
      ctx.textAlign = 'left';
      ctx.font = '600 11.5px "JetBrains Mono", monospace';
      ctx.fillText(item.value, paddingLeft + barWidth + 10, y);
      ctx.font = '11.5px Inter, sans-serif';
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function truncate(str, n) {
    return str.length > n ? str.slice(0, n - 1) + '…' : str;
  }

  return { donut, bar, cssVar };
})();
