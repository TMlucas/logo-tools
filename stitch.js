const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const importStatus = document.getElementById("importStatus");
const patternStats = document.getElementById("patternStats");
const legendList = document.getElementById("legendList");

const gridWidthInput = document.getElementById("gridWidth");
const gridHeightInput = document.getElementById("gridHeight");
const lockAspect = document.getElementById("lockAspect");
const maxColorsInput = document.getElementById("maxColors");
const cellSizeInput = document.getElementById("cellSize");
const sampleMode = document.getElementById("sampleMode");
const showGrid = document.getElementById("showGrid");
const showSymbols = document.getElementById("showSymbols");
const ignoreTransparent = document.getElementById("ignoreTransparent");
const alphaThreshold = document.getElementById("alphaThreshold");
const generateBtn = document.getElementById("generateBtn");

const patternCanvas = document.getElementById("patternCanvas");
const ctx = patternCanvas.getContext("2d");

const filenameInput = document.getElementById("filename");
const exportCellSize = document.getElementById("exportCellSize");
const exportPatternBtn = document.getElementById("exportPatternBtn");
const exportLegendBtn = document.getElementById("exportLegendBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");

const SYMBOLS = [
  "●", "■", "▲", "◆", "★", "✚", "✖", "○", "□", "△",
  "◇", "☆", "✦", "❖", "◎", "◉", "◐", "◑", "◒", "◓",
  "▣", "▤", "▥", "▦", "▧", "▨", "▩", "◈", "◊", "♦",
  "♠", "♣", "♥", "♤", "♧", "♡", "⚙", "☀", "☁", "☂",
  "❄", "✦", "✧", "✩", "✪", "✫", "✬", "✭", "✮", "✯",
  "✱", "✲", "✳", "✴", "✵", "✶", "✷", "✸", "✹", "✺",
  "✻", "✼", "✽", "✾",
];

let sourceImage = null;
let sourceNaturalW = 0;
let sourceNaturalH = 0;
let updatingDims = false;
let patternState = null;
let debounceTimer = null;

function setImportStatus(msg) {
  importStatus.textContent = msg;
}

function setPatternStats(msg) {
  patternStats.textContent = msg;
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(n)));
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(base) {
  return (base || "plan-point-de-croix").trim().replace(/[/\\?%*:|"<>]/g, "-") || "plan-point-de-croix";
}

async function loadFromFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setImportStatus("Choisissez un fichier image valide.");
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    await loadFromSrc(url, file.name);
  } catch {
    setImportStatus("Impossible de lire cette image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadFromSrc(src, label) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      sourceNaturalW = img.naturalWidth;
      sourceNaturalH = img.naturalHeight;
      syncHeightFromWidth();
      setImportStatus(`Image chargée : ${label} (${sourceNaturalW}×${sourceNaturalH})`);
      scheduleGenerate();
      resolve();
    };
    img.onerror = () => reject(new Error("load"));
    img.src = src;
  });
}

function syncHeightFromWidth() {
  if (!lockAspect.checked || !sourceNaturalW || !sourceNaturalH) {
    return;
  }
  updatingDims = true;
  const w = clampInt(gridWidthInput.value, 8, 300, 80);
  gridWidthInput.value = String(w);
  gridHeightInput.value = String(
    clampInt(Math.round((w * sourceNaturalH) / sourceNaturalW), 8, 300, w),
  );
  updatingDims = false;
}

function syncWidthFromHeight() {
  if (!lockAspect.checked || !sourceNaturalW || !sourceNaturalH) {
    return;
  }
  updatingDims = true;
  const h = clampInt(gridHeightInput.value, 8, 300, 80);
  gridHeightInput.value = String(h);
  gridWidthInput.value = String(
    clampInt(Math.round((h * sourceNaturalW) / sourceNaturalH), 8, 300, h),
  );
  updatingDims = false;
}

function sampleImageToGrid(img, gw, gh, mode, alphaCut, skipTransparent) {
  const tmp = document.createElement("canvas");
  tmp.width = img.naturalWidth;
  tmp.height = img.naturalHeight;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.drawImage(img, 0, 0);
  const src = tctx.getImageData(0, 0, tmp.width, tmp.height).data;
  const sw = tmp.width;
  const sh = tmp.height;
  const cells = new Array(gw * gh);

  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      const x0 = Math.floor((x * sw) / gw);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / gw));
      const y0 = Math.floor((y * sh) / gh);
      const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / gh));
      let cell;

      if (mode === "nearest") {
        const sx = Math.min(sw - 1, Math.floor((x + 0.5) * sw / gw));
        const sy = Math.min(sh - 1, Math.floor((y + 0.5) * sh / gh));
        const i = (sy * sw + sx) * 4;
        const a = src[i + 3];
        if (skipTransparent && a < alphaCut) {
          cell = null;
        } else {
          cell = { r: src[i], g: src[i + 1], b: src[i + 2] };
        }
      } else {
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let sy = y0; sy < y1; sy += 1) {
          for (let sx = x0; sx < x1; sx += 1) {
            const i = (sy * sw + sx) * 4;
            if (skipTransparent && src[i + 3] < alphaCut) {
              continue;
            }
            r += src[i];
            g += src[i + 1];
            b += src[i + 2];
            n += 1;
          }
        }
        if (n === 0) {
          cell = null;
        } else {
          cell = {
            r: Math.round(r / n),
            g: Math.round(g / n),
            b: Math.round(b / n),
          };
        }
      }
      cells[y * gw + x] = cell;
    }
  }
  return cells;
}

function medianCutPalette(colors, maxColors) {
  if (colors.length === 0) {
    return [];
  }
  if (colors.length <= maxColors) {
    const unique = [];
    const seen = new Set();
    for (const c of colors) {
      const key = `${c.r},${c.g},${c.b}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({ r: c.r, g: c.g, b: c.b });
      }
    }
    return unique.slice(0, maxColors);
  }

  const boxes = [{ colors: colors.slice() }];

  while (boxes.length < maxColors) {
    let bestIdx = -1;
    let bestRange = -1;
    let bestChannel = "r";
    for (let i = 0; i < boxes.length; i += 1) {
      const box = boxes[i];
      if (box.colors.length < 2) {
        continue;
      }
      let minR = 255;
      let maxR = 0;
      let minG = 255;
      let maxG = 0;
      let minB = 255;
      let maxB = 0;
      for (const c of box.colors) {
        minR = Math.min(minR, c.r);
        maxR = Math.max(maxR, c.r);
        minG = Math.min(minG, c.g);
        maxG = Math.max(maxG, c.g);
        minB = Math.min(minB, c.b);
        maxB = Math.max(maxB, c.b);
      }
      const ranges = [
        { ch: "r", range: maxR - minR },
        { ch: "g", range: maxG - minG },
        { ch: "b", range: maxB - minB },
      ];
      ranges.sort((a, b) => b.range - a.range);
      if (ranges[0].range > bestRange) {
        bestRange = ranges[0].range;
        bestChannel = ranges[0].ch;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) {
      break;
    }
    const box = boxes[bestIdx];
    box.colors.sort((a, b) => a[bestChannel] - b[bestChannel]);
    const mid = Math.floor(box.colors.length / 2);
    const left = box.colors.slice(0, mid);
    const right = box.colors.slice(mid);
    boxes.splice(bestIdx, 1, { colors: left }, { colors: right });
  }

  return boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    const n = box.colors.length || 1;
    for (const c of box.colors) {
      r += c.r;
      g += c.g;
      b += c.b;
    }
    return {
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n),
    };
  });
}

function mapCellsToPalette(cells, palette) {
  return cells.map((cell) => {
    if (!cell) {
      return -1;
    }
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const d = colorDistance(cell, palette[i]);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  });
}

function buildLegend(indices, palette) {
  const counts = new Array(palette.length).fill(0);
  for (const idx of indices) {
    if (idx >= 0) {
      counts[idx] += 1;
    }
  }
  return palette
    .map((color, i) => ({
      index: i,
      color,
      hex: rgbToHex(color.r, color.g, color.b),
      symbol: SYMBOLS[i % SYMBOLS.length],
      count: counts[i],
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

function renderPattern(state, cellPx, options) {
  const { gw, gh, indices, legend } = state;
  const canvas = document.createElement("canvas");
  canvas.width = gw * cellPx;
  canvas.height = gh * cellPx;
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);

  const byIndex = new Map(legend.map((e) => [e.index, e]));

  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      const idx = indices[y * gw + x];
      const px = x * cellPx;
      const py = y * cellPx;
      if (idx < 0) {
        continue;
      }
      const entry = byIndex.get(idx);
      const col = entry ? entry.color : { r: 0, g: 0, b: 0 };
      c.fillStyle = `rgb(${col.r},${col.g},${col.b})`;
      c.fillRect(px, py, cellPx, cellPx);

      if (options.showSymbols && entry) {
        const lum = luminance(col.r, col.g, col.b);
        c.fillStyle = lum > 140 ? "#111827" : "#f9fafb";
        c.font = `bold ${Math.max(8, Math.floor(cellPx * 0.62))}px Arial, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(entry.symbol, px + cellPx / 2, py + cellPx / 2 + 0.5);
      }
    }
  }

  if (options.showGrid) {
    c.strokeStyle = "rgba(17, 24, 39, 0.35)";
    c.lineWidth = 1;
    for (let x = 0; x <= gw; x += 1) {
      const thick = x % 10 === 0;
      c.beginPath();
      c.strokeStyle = thick ? "rgba(17, 24, 39, 0.65)" : "rgba(17, 24, 39, 0.28)";
      c.moveTo(x * cellPx + 0.5, 0);
      c.lineTo(x * cellPx + 0.5, gh * cellPx);
      c.stroke();
    }
    for (let y = 0; y <= gh; y += 1) {
      const thick = y % 10 === 0;
      c.beginPath();
      c.strokeStyle = thick ? "rgba(17, 24, 39, 0.65)" : "rgba(17, 24, 39, 0.28)";
      c.moveTo(0, y * cellPx + 0.5);
      c.lineTo(gw * cellPx, y * cellPx + 0.5);
      c.stroke();
    }
  }

  return canvas;
}

function renderLegendImage(legend, title) {
  const rowH = 36;
  const pad = 16;
  const width = 420;
  const height = pad * 2 + 40 + legend.length * rowH;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d");
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, width, height);
  c.fillStyle = "#111827";
  c.font = "bold 18px Arial, sans-serif";
  c.fillText(title, pad, pad + 18);
  c.font = "14px Arial, sans-serif";

  legend.forEach((entry, i) => {
    const y = pad + 40 + i * rowH;
    c.fillStyle = entry.hex;
    c.fillRect(pad, y, 28, 28);
    c.strokeStyle = "#6b7280";
    c.strokeRect(pad + 0.5, y + 0.5, 27, 27);
    c.fillStyle = "#111827";
    c.font = "bold 16px Arial, sans-serif";
    c.fillText(entry.symbol, pad + 44, y + 20);
    c.font = "14px Arial, sans-serif";
    c.fillText(`${entry.hex}  ·  ${entry.count} points`, pad + 78, y + 20);
  });
  return canvas;
}

function updateLegendUi(legend) {
  legendList.innerHTML = "";
  if (!legend.length) {
    legendList.textContent = "Aucune couleur.";
    return;
  }
  for (const entry of legend) {
    const row = document.createElement("div");
    row.className = "stitch-legend-item";
    row.innerHTML = `
      <span class="stitch-swatch" style="background:${entry.hex}" title="${entry.hex}"></span>
      <span class="stitch-symbol" aria-hidden="true">${entry.symbol}</span>
      <span>${entry.hex}</span>
      <span class="stitch-count">${entry.count} pts</span>
    `;
    legendList.appendChild(row);
  }
}

function generatePattern() {
  if (!sourceImage) {
    setPatternStats("Chargez une image avant de générer.");
    return;
  }

  const gw = clampInt(gridWidthInput.value, 8, 300, 80);
  const gh = clampInt(gridHeightInput.value, 8, 300, 80);
  const maxColors = clampInt(maxColorsInput.value, 2, 64, 16);
  const cellPx = clampInt(cellSizeInput.value, 4, 40, 12);
  const alphaCut = clampInt(alphaThreshold.value, 0, 255, 128);
  gridWidthInput.value = String(gw);
  gridHeightInput.value = String(gh);
  maxColorsInput.value = String(maxColors);
  cellSizeInput.value = String(cellPx);

  const cells = sampleImageToGrid(
    sourceImage,
    gw,
    gh,
    sampleMode.value,
    alphaCut,
    ignoreTransparent.checked,
  );
  const solid = cells.filter(Boolean);
  if (solid.length === 0) {
    patternState = null;
    ctx.clearRect(0, 0, patternCanvas.width, patternCanvas.height);
    updateLegendUi([]);
    setPatternStats("Aucune case opaque après échantillonnage. Baissez le seuil alpha ou décochez « Ignorer la transparence ».");
    return;
  }

  const palette = medianCutPalette(solid, maxColors);
  const indices = mapCellsToPalette(cells, palette);
  const legend = buildLegend(indices, palette);
  patternState = { gw, gh, indices, legend, palette };

  const preview = renderPattern(patternState, cellPx, {
    showGrid: showGrid.checked,
    showSymbols: showSymbols.checked,
  });
  patternCanvas.width = preview.width;
  patternCanvas.height = preview.height;
  ctx.clearRect(0, 0, patternCanvas.width, patternCanvas.height);
  ctx.drawImage(preview, 0, 0);

  updateLegendUi(legend);
  const total = legend.reduce((sum, e) => sum + e.count, 0);
  setPatternStats(
    `Plan ${gw}×${gh} · ${legend.length} couleur${legend.length > 1 ? "s" : ""} · ${total} points à broder`,
  );
}

function scheduleGenerate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generatePattern, 220);
}

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});
dropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  await loadFromFile(event.dataTransfer.files[0]);
});
fileInput.addEventListener("change", async () => {
  await loadFromFile(fileInput.files[0]);
});
document.addEventListener("paste", async (event) => {
  const items = event.clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      await loadFromFile(item.getAsFile());
      return;
    }
  }
});

gridWidthInput.addEventListener("input", () => {
  if (updatingDims) {
    return;
  }
  syncHeightFromWidth();
  scheduleGenerate();
});
gridHeightInput.addEventListener("input", () => {
  if (updatingDims) {
    return;
  }
  syncWidthFromHeight();
  scheduleGenerate();
});
lockAspect.addEventListener("change", () => {
  if (lockAspect.checked) {
    syncHeightFromWidth();
  }
  scheduleGenerate();
});

[
  maxColorsInput,
  cellSizeInput,
  sampleMode,
  showGrid,
  showSymbols,
  ignoreTransparent,
  alphaThreshold,
].forEach((el) => {
  el.addEventListener("change", scheduleGenerate);
  el.addEventListener("input", scheduleGenerate);
});

generateBtn.addEventListener("click", generatePattern);

exportPatternBtn.addEventListener("click", () => {
  if (!patternState) {
    setPatternStats("Générez un plan avant d’exporter.");
    return;
  }
  const cellPx = clampInt(exportCellSize.value, 6, 48, 16);
  const out = renderPattern(patternState, cellPx, {
    showGrid: showGrid.checked,
    showSymbols: showSymbols.checked,
  });
  out.toBlob((blob) => {
    if (!blob) {
      setPatternStats("Export PNG impossible.");
      return;
    }
    downloadBlob(blob, `${safeFilename(filenameInput.value)}.png`);
    setPatternStats("Plan PNG téléchargé.");
  }, "image/png");
});

exportLegendBtn.addEventListener("click", () => {
  if (!patternState) {
    setPatternStats("Générez un plan avant d’exporter.");
    return;
  }
  const out = renderLegendImage(patternState.legend, "Légende — point de croix");
  out.toBlob((blob) => {
    if (!blob) {
      setPatternStats("Export légende impossible.");
      return;
    }
    downloadBlob(blob, `${safeFilename(filenameInput.value)}-legende.png`);
    setPatternStats("Légende PNG téléchargée.");
  }, "image/png");
});

exportCsvBtn.addEventListener("click", () => {
  if (!patternState) {
    setPatternStats("Générez un plan avant d’exporter.");
    return;
  }
  const lines = ["symbole;hexa;r;g;b;points"];
  for (const entry of patternState.legend) {
    lines.push(
      `${entry.symbol};${entry.hex};${entry.color.r};${entry.color.g};${entry.color.b};${entry.count}`,
    );
  }
  downloadBlob(
    new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    `${safeFilename(filenameInput.value)}-palette.csv`,
  );
  setPatternStats("Palette CSV téléchargée.");
});
