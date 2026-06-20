// Build a printable HTML report and open the OS print dialog (Save as PDF).
// No PDF dependency — the browser/Electron print pipeline does the conversion.
export function printReport({ title, subtitle, sections }) {
  const css = `
    body { font-family: -apple-system, system-ui, sans-serif; color: #013137; padding: 40px; }
    h1 { font-size: 26px; margin: 0 0 4px; }
    .sub { color: #297376; margin-bottom: 28px; }
    h2 { font-size: 16px; border-bottom: 2px solid #C1D9DE; padding-bottom: 6px; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { text-align: left; padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #e6eef0; }
    th { color: #297376; text-transform: uppercase; font-size: 11px; }
    .stat { display: inline-block; margin-right: 28px; }
    .stat b { font-size: 22px; color: #215E68; display: block; }
    .foot { margin-top: 40px; color: #9bb; font-size: 11px; }
  `;
  const renderSection = (s) => {
    if (s.stats) return `<h2>${s.heading}</h2>` + s.stats.map((x) => `<span class="stat"><b>${x.value}</b>${x.label}</span>`).join("");
    if (s.table) {
      const head = `<tr>${s.table.cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
      const body = s.table.rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("");
      return `<h2>${s.heading}</h2><table>${head}${body}</table>`;
    }
    return "";
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head>
    <body><h1>${title}</h1><div class="sub">${subtitle || ""}</div>
    ${sections.map(renderSection).join("")}
    <div class="foot">Generated ${new Date().toLocaleString()} · Perx</div>
    <script>window.onload = () => { window.print(); }</script>
    </body></html>`;
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
