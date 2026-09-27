(() => {
  "use strict";

  const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  const PAGE_W = 841.89; // A4 paisagem, em pontos
  const PAGE_H = 595.28;

  const COLORS = {
    border: [0.937, 0.902, 0.980],
    header: [0.776, 0.655, 0.910],
    headerBox: [0.965, 0.945, 0.985],
    purple: [0.365, 0.298, 0.635],
    purpleLight: [0.420, 0.337, 0.690],
    ink: [0.247, 0.220, 0.349],
    number: [0.455, 0.396, 0.553],
    line: [0.847, 0.796, 0.918],
    empty: [0.980, 0.973, 0.988],
    white: [1, 1, 1]
  };

  function fmt(n) {
    return Number(n.toFixed(3)).toString();
  }

  function color(c) {
    return c.map(fmt).join(" ");
  }

  function normalizePdfText(value) {
    const replacements = {
      "\u2013": "-",
      "\u2014": "-",
      "\u2018": "'",
      "\u2019": "'",
      "\u201c": '"',
      "\u201d": '"',
      "\u2022": "*",
      "\u2026": "...",
      "\u00a0": " ",
      "\u2192": "->"
    };

    let out = "";
    for (const char of String(value ?? "")) {
      if (replacements[char]) {
        out += replacements[char];
        continue;
      }

      const code = char.charCodeAt(0);
      out += code <= 255 ? char : "?";
    }
    return out;
  }

  function escapePdfString(value) {
    return normalizePdfText(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\r?\n/g, " ");
  }

  function latin1Bytes(value) {
    const text = normalizePdfText(value);
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
    return bytes;
  }

  function byteLengthLatin1(value) {
    return normalizePdfText(value).length;
  }

  function rect(x, y, w, h, fill, stroke = null, lineWidth = 1) {
    let cmd = "q\n";
    if (fill) cmd += `${color(fill)} rg\n`;
    if (stroke) cmd += `${color(stroke)} RG\n${fmt(lineWidth)} w\n`;
    cmd += `${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re ${fill && stroke ? "B" : fill ? "f" : "S"}\nQ\n`;
    return cmd;
  }

  function line(x1, y1, x2, y2, stroke, width = 0.7) {
    return `q\n${color(stroke)} RG\n${fmt(width)} w\n${fmt(x1)} ${fmt(y1)} m ${fmt(x2)} ${fmt(y2)} l S\nQ\n`;
  }

  function text(x, y, value, size, font = "F1", fill = COLORS.ink) {
    return `BT\n/${font} ${fmt(size)} Tf\n${color(fill)} rg\n1 0 0 1 ${fmt(x)} ${fmt(y)} Tm\n(${escapePdfString(value)}) Tj\nET\n`;
  }

  function approxTextWidth(value, size, factor = 0.52) {
    return normalizePdfText(value).length * size * factor;
  }

  function centeredText(centerX, y, value, size, font = "F1", fill = COLORS.ink, factor = 0.52) {
    const width = approxTextWidth(value, size, factor);
    return text(centerX - (width / 2), y, value, size, font, fill);
  }

  function wrapText(value, maxWidth, size) {
    const charWidth = Math.max(2.5, size * 0.52);
    const maxChars = Math.max(3, Math.floor(maxWidth / charWidth));
    const raw = normalizePdfText(value).replace(/\r/g, "");
    const paragraphs = raw.split("\n");
    const lines = [];

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        if (paragraphIndex < paragraphs.length - 1) lines.push("");
        return;
      }

      let current = "";
      for (let word of words) {
        while (word.length > maxChars) {
          if (current) {
            lines.push(current);
            current = "";
          }
          lines.push(word.slice(0, maxChars));
          word = word.slice(maxChars);
        }

        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxChars) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }

      if (current) lines.push(current);
      if (paragraphIndex < paragraphs.length - 1) lines.push("");
    });

    return lines;
  }

  function buildPageContent(monthData) {
    const year = monthData.year;
    const month = monthData.month;
    const daysInMonth = monthData.daysInMonth;
    const leadingEmpty = monthData.leadingEmpty;
    const weekCount = monthData.weekCount;
    const notes = monthData.notes || {};

    const plannerX = 20;
    const plannerY = 20;
    const plannerW = PAGE_W - 40;
    const plannerH = PAGE_H - 40;
    const border = 5;

    const x = plannerX + border;
    const y = plannerY + border;
    const w = plannerW - (border * 2);
    const h = plannerH - (border * 2);
    const headerH = 50;
    const weekH = 25;
    const headerY = y + h - headerH;
    const weekY = headerY - weekH;
    const gridY = y;
    const gridH = weekY - gridY;
    const cellW = w / 7;
    const rowH = gridH / weekCount;

    let out = "";

    out += rect(0, 0, PAGE_W, PAGE_H, COLORS.white);
    out += rect(plannerX, plannerY, plannerW, plannerH, COLORS.border);
    out += rect(x, y, w, h, COLORS.white);
    out += rect(x, headerY, w, headerH, COLORS.header);
    out += rect(x, weekY, w, weekH, COLORS.purple);

    out += text(x + 14, headerY + 15, "Planner Mensal", 24, "F3", COLORS.purple);

    const boxW = 225;
    const boxH = 32;
    const boxX = x + w - boxW - 10;
    const boxY = headerY + 9;
    out += rect(boxX, boxY, boxW, boxH, COLORS.headerBox, COLORS.purpleLight, 1.1);
    out += text(boxX + 9, boxY + 11, "Mês/Ano:", 10.5, "F2", COLORS.number);
    out += centeredText(boxX + 151, boxY + 11, `${MONTHS[month]} / ${year}`, 11.5, "F2", COLORS.ink, 0.50);

    WEEKDAYS.forEach((weekday, col) => {
      const centerX = x + (col * cellW) + (cellW / 2);
      out += centeredText(centerX, weekY + 8, weekday, 10.5, "F2", COLORS.white, 0.50);
    });

    // Fundos das células vazias e linhas da grade.
    const totalCells = weekCount * 7;
    for (let index = 0; index < totalCells; index++) {
      const day = index - leadingEmpty + 1;
      if (day >= 1 && day <= daysInMonth) continue;
      const row = Math.floor(index / 7);
      const col = index % 7;
      const cellX = x + (col * cellW);
      const cellY = weekY - ((row + 1) * rowH);
      out += rect(cellX, cellY, cellW, rowH, COLORS.empty);
    }

    for (let col = 0; col <= 7; col++) {
      const gx = x + (col * cellW);
      out += line(gx, gridY, gx, weekY, COLORS.line, 0.65);
    }
    for (let row = 0; row <= weekCount; row++) {
      const gy = gridY + (row * rowH);
      out += line(x, gy, x + w, gy, COLORS.line, 0.65);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const index = leadingEmpty + day - 1;
      const row = Math.floor(index / 7);
      const col = index % 7;
      const cellX = x + (col * cellW);
      const cellY = weekY - ((row + 1) * rowH);
      const numberColor = col >= 5 ? COLORS.purpleLight : COLORS.number;

      out += text(cellX + 6, cellY + rowH - 13, String(day).padStart(2, "0"), 11.5, "F2", numberColor);

      const note = notes[day] || "";
      if (!note) continue;

      const noteSize = 7.2;
      const lineHeight = 8.5;
      const wrapped = wrapText(note, cellW - 12, noteSize);
      const maxLines = Math.max(1, Math.floor((rowH - 27) / lineHeight));
      const visible = wrapped.slice(0, maxLines);
      let noteY = cellY + rowH - 25;

      visible.forEach((noteLine) => {
        out += text(cellX + 6, noteY, noteLine, noteSize, "F1", COLORS.ink);
        noteY -= lineHeight;
      });
    }

    return out;
  }

  function buildPdfBytes(months) {
    if (!Array.isArray(months) || months.length === 0) {
      throw new Error("É necessário informar pelo menos um mês para gerar o PDF.");
    }

    const objects = [];
    const addObject = (id, value) => { objects[id] = value; };

    addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    addObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    addObject(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>");

    const pageIds = [];
    let nextId = 6;

    months.forEach((monthData) => {
      const pageId = nextId++;
      const contentId = nextId++;
      pageIds.push(pageId);

      const stream = buildPageContent(monthData);
      const streamLength = byteLengthLatin1(stream);

      addObject(pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(PAGE_W)} ${fmt(PAGE_H)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>`
      );
      addObject(contentId, `<< /Length ${streamLength} >>\nstream\n${stream}endstream`);
    });

    addObject(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);

    const maxId = objects.length - 1;
    const chunks = [];
    const offsets = new Array(maxId + 1).fill(0);
    let currentOffset = 0;

    function push(value) {
      const bytes = latin1Bytes(value);
      chunks.push(bytes);
      currentOffset += bytes.length;
    }

    push("%PDF-1.4\n%âãÏÓ\n");

    for (let id = 1; id <= maxId; id++) {
      if (!objects[id]) throw new Error(`Objeto PDF ausente: ${id}`);
      offsets[id] = currentOffset;
      push(`${id} 0 obj\n${objects[id]}\nendobj\n`);
    }

    const xrefOffset = currentOffset;
    push(`xref\n0 ${maxId + 1}\n`);
    push("0000000000 65535 f \n");
    for (let id = 1; id <= maxId; id++) {
      push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
    }
    push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const pdf = new Uint8Array(totalLength);
    let cursor = 0;
    chunks.forEach((chunk) => {
      pdf.set(chunk, cursor);
      cursor += chunk.length;
    });

    return pdf;
  }

  function download(months, filename) {
    const bytes = buildPdfBytes(months);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  globalThis.PlannerPDF = {
    buildPdfBytes,
    download
  };
})();
