const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const beforeCanvas = document.getElementById("beforeCanvas");
const beforeCtx = beforeCanvas.getContext("2d", { willReadFrequently: true });

const previewViewport = document.getElementById("previewViewport");
const previewStage = document.getElementById("previewStage");
const zoomLabel = document.getElementById("zoomLabel");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const resetViewBtn = document.getElementById("resetViewBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const urlInput = document.getElementById("urlInput");
const loadUrlBtn = document.getElementById("loadUrlBtn");
const importStatus = document.getElementById("importStatus");

const sourceHex = document.getElementById("sourceHex");
const sourcePicker = document.getElementById("sourcePicker");
const targetHex = document.getElementById("targetHex");
const targetPicker = document.getElementById("targetPicker");
const removeHex = document.getElementById("removeHex");
const removePicker = document.getElementById("removePicker");

const pickSourceBtn = document.getElementById("pickSourceBtn");
const pickTargetBtn = document.getElementById("pickTargetBtn");
const pickRemoveBtn = document.getElementById("pickRemoveBtn");

const tolerance = document.getElementById("tolerance");
const toleranceValue = document.getElementById("toleranceValue");
const removeTolerance = document.getElementById("removeTolerance");
const removeToleranceValue = document.getElementById("removeToleranceValue");

const replaceBtn = document.getElementById("replaceBtn");
const removeBtn = document.getElementById("removeBtn");
const exportBtn = document.getElementById("exportBtn");
const formatSelect = document.getElementById("formatSelect");
const filenameInput = document.getElementById("filename");
const quality = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const qualityWrap = document.getElementById("qualityWrap");
const resetBtn = document.getElementById("resetBtn");
const exportWidthInput = document.getElementById("exportWidth");
const exportHeightInput = document.getElementById("exportHeight");
const lockAspect = document.getElementById("lockAspect");
const useCrop = document.getElementById("useCrop");
const cropModeBtn = document.getElementById("cropModeBtn");
const cropXInput = document.getElementById("cropX");
const cropYInput = document.getElementById("cropY");
const cropWInput = document.getElementById("cropW");
const cropHInput = document.getElementById("cropH");
const cropOverlay = document.getElementById("cropOverlay");

let originalImageData = null;
let eyedropperMode = null;
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 30;

let zoom = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let cropMode = false;
let isDrawingCrop = false;
let cropStartX = 0;
let cropStartY = 0;
let cropRect = { x: 0, y: 0, w: 1, h: 1 };

function setStatus(message) {
  importStatus.textContent = message;
}

function updateEyedropperCursor() {
  const wrap = canvas.closest(".canvas-wrap");
  if (wrap) {
    wrap.classList.toggle("is-eyedropper", Boolean(eyedropperMode));
  }
}

function hexToRgba(hex) {
  const clean = hex.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(clean.length)) {
    return null;
  }
  const normalized = clean.length <= 4 ? clean.split("").map((char) => char + char).join("") : clean;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const a = normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) : 255;

  if ([r, g, b, a].some((value) => Number.isNaN(value))) {
    return null;
  }
  return { r, g, b, a };
}

function rgbaToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function syncHexAndPicker(hexInput, pickerInput) {
  const parsed = hexToRgba(hexInput.value);
  if (parsed) {
    pickerInput.value = rgbaToHex(parsed.r, parsed.g, parsed.b);
    hexInput.value = rgbaToHex(parsed.r, parsed.g, parsed.b);
  }
}

function distanceColor(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function hasImage() {
  return canvas.width > 0 && canvas.height > 0;
}

function cloneImageData(imageData) {
  return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
}

function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function setCanvasImageData(imageData) {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);
}

function pushHistoryState() {
  if (!hasImage()) {
    return;
  }
  undoStack.push(cloneImageData(ctx.getImageData(0, 0, canvas.width, canvas.height)));
  if (undoStack.length > MAX_HISTORY) {
    undoStack = undoStack.slice(-MAX_HISTORY);
  }
  redoStack = [];
  updateUndoRedoButtons();
}

function resetView() {
  zoom = 1;
  panX = 0;
  panY = 0;
  applyViewTransform();
}

function applyViewTransform() {
  previewStage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  zoomLabel.textContent = `Zoom: ${Math.round(zoom * 100)}%`;
}

function clampCropRect(rect) {
  if (!hasImage()) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(rect.x)));
  const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(rect.y)));
  const maxW = Math.max(1, canvas.width - x);
  const maxH = Math.max(1, canvas.height - y);
  const w = Math.max(1, Math.min(maxW, Math.floor(rect.w)));
  const h = Math.max(1, Math.min(maxH, Math.floor(rect.h)));
  return { x, y, w, h };
}

function updateCropInputs() {
  cropXInput.value = String(cropRect.x);
  cropYInput.value = String(cropRect.y);
  cropWInput.value = String(cropRect.w);
  cropHInput.value = String(cropRect.h);
}

function renderCropOverlay() {
  if (!hasImage() || !useCrop.checked) {
    cropOverlay.hidden = true;
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  cropOverlay.hidden = false;
  cropOverlay.style.left = `${cropRect.x * scaleX}px`;
  cropOverlay.style.top = `${cropRect.y * scaleY}px`;
  cropOverlay.style.width = `${cropRect.w * scaleX}px`;
  cropOverlay.style.height = `${cropRect.h * scaleY}px`;
}

function initCropAndExportControls() {
  if (!hasImage()) {
    return;
  }
  cropRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  updateCropInputs();
  exportWidthInput.value = String(canvas.width);
  exportHeightInput.value = String(canvas.height);
  renderCropOverlay();
}

function getSourceRectForExport() {
  if (useCrop.checked) {
    return clampCropRect(cropRect);
  }
  return { x: 0, y: 0, w: canvas.width, h: canvas.height };
}

function getTargetSizeForExport(sourceRect) {
  const parsedW = Number(exportWidthInput.value);
  const parsedH = Number(exportHeightInput.value);
  const hasW = Number.isFinite(parsedW) && parsedW > 0;
  const hasH = Number.isFinite(parsedH) && parsedH > 0;

  let w = hasW ? Math.floor(parsedW) : sourceRect.w;
  let h = hasH ? Math.floor(parsedH) : sourceRect.h;

  if (lockAspect.checked) {
    const ratio = sourceRect.w / sourceRect.h;
    if (hasW && !hasH) {
      h = Math.max(1, Math.round(w / ratio));
    } else if (!hasW && hasH) {
      w = Math.max(1, Math.round(h * ratio));
    } else if (hasW && hasH) {
      h = Math.max(1, Math.round(w / ratio));
    }
  }

  return { w: Math.max(1, w), h: Math.max(1, h) };
}

function buildExportCanvas() {
  const source = getSourceRectForExport();
  const target = getTargetSizeForExport(source);
  const out = document.createElement("canvas");
  out.width = target.w;
  out.height = target.h;
  const outCtx = out.getContext("2d");
  outCtx.drawImage(
    canvas,
    source.x,
    source.y,
    source.w,
    source.h,
    0,
    0,
    target.w,
    target.h,
  );
  return out;
}

function setCropMode(active) {
  cropMode = active;
  if (active) {
    eyedropperMode = null;
  }
  updateEyedropperCursor();
  cropModeBtn.textContent = active ? "Désactiver crop" : "Activer crop";
  setStatus(active ? "Mode crop actif: glissez sur l'image." : "Mode crop désactivé.");
}

function fitCanvasesToImage() {
  if (!originalImageData) {
    return;
  }
  beforeCanvas.width = originalImageData.width;
  beforeCanvas.height = originalImageData.height;
  beforeCtx.putImageData(originalImageData, 0, 0);
}

function loadImageFromSrc(src, sourceName = "image") {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      fitCanvasesToImage();
      undoStack = [];
      redoStack = [];
      updateUndoRedoButtons();
      resetView();
      initCropAndExportControls();
      eyedropperMode = null;
      updateEyedropperCursor();
      setStatus(`Image chargée: ${sourceName} (${canvas.width}x${canvas.height})`);
      resolve();
    };
    image.onerror = () => reject(new Error("Chargement impossible"));
    image.src = src;
  });
}

async function loadFromFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("Veuillez choisir un fichier image valide.");
    return;
  }
  const src = URL.createObjectURL(file);
  try {
    await loadImageFromSrc(src, file.name);
  } catch {
    setStatus("Impossible de lire cette image.");
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function loadFromUrl() {
  const url = urlInput.value.trim();
  if (!url) {
    setStatus("Veuillez entrer une URL d'image.");
    return;
  }
  try {
    await loadImageFromSrc(url, url);
  } catch {
    setStatus("Échec de chargement. Vérifiez l'URL et le CORS.");
  }
}

function replaceColorInImage(fromColor, toColor, maxDistance) {
  pushHistoryState();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const dist = distanceColor(
      pixels[i],
      pixels[i + 1],
      pixels[i + 2],
      fromColor.r,
      fromColor.g,
      fromColor.b,
    );
    if (dist <= maxDistance) {
      pixels[i] = toColor.r;
      pixels[i + 1] = toColor.g;
      pixels[i + 2] = toColor.b;
      pixels[i + 3] = toColor.a;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function removeColorInImage(colorToRemove, maxDistance) {
  pushHistoryState();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const dist = distanceColor(
      pixels[i],
      pixels[i + 1],
      pixels[i + 2],
      colorToRemove.r,
      colorToRemove.g,
      colorToRemove.b,
    );
    if (dist <= maxDistance) {
      pixels[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function undoEdit() {
  if (!hasImage() || undoStack.length === 0) {
    return;
  }
  const current = cloneImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
  redoStack.push(current);
  const previous = undoStack.pop();
  setCanvasImageData(previous);
  updateUndoRedoButtons();
  setStatus("Dernière modification annulée.");
}

function redoEdit() {
  if (!hasImage() || redoStack.length === 0) {
    return;
  }
  const current = cloneImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
  undoStack.push(current);
  const next = redoStack.pop();
  setCanvasImageData(next);
  updateUndoRedoButtons();
  setStatus("Modification rétablie.");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value, true);
}

function canvasToIcoBlob(sourceCanvas = canvas) {
  const size = Math.min(256, Math.max(sourceCanvas.width, sourceCanvas.height));
  const tmp = document.createElement("canvas");
  tmp.width = size;
  tmp.height = size;
  const tctx = tmp.getContext("2d");
  tctx.clearRect(0, 0, size, size);
  tctx.drawImage(sourceCanvas, 0, 0, size, size);
  const rgba = tctx.getImageData(0, 0, size, size).data;

  const headerSize = 6;
  const entrySize = 16;
  const dibHeaderSize = 40;
  const rowBytes = size * 4;
  const xorSize = rowBytes * size;
  const andRowBytes = Math.ceil(size / 32) * 4;
  const andMaskSize = andRowBytes * size;
  const imageSize = dibHeaderSize + xorSize + andMaskSize;
  const fileSize = headerSize + entrySize + imageSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);

  u8[6] = size === 256 ? 0 : size;
  u8[7] = size === 256 ? 0 : size;
  u8[8] = 0;
  u8[9] = 0;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, imageSize, true);
  view.setUint32(18, headerSize + entrySize, true);

  let offset = headerSize + entrySize;
  writeUint32(view, offset + 0, dibHeaderSize);
  writeUint32(view, offset + 4, size);
  writeUint32(view, offset + 8, size * 2);
  view.setUint16(offset + 12, 1, true);
  view.setUint16(offset + 14, 32, true);
  writeUint32(view, offset + 16, 0);
  writeUint32(view, offset + 20, xorSize + andMaskSize);
  writeUint32(view, offset + 24, 0);
  writeUint32(view, offset + 28, 0);
  writeUint32(view, offset + 32, 0);
  writeUint32(view, offset + 36, 0);
  offset += dibHeaderSize;

  for (let y = size - 1; y >= 0; y -= 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      u8[offset++] = rgba[i + 2];
      u8[offset++] = rgba[i + 1];
      u8[offset++] = rgba[i];
      u8[offset++] = rgba[i + 3];
    }
  }

  for (let y = size - 1; y >= 0; y -= 1) {
    let bit = 7;
    let byte = 0;
    let rowOffset = 0;
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      if (rgba[i + 3] === 0) {
        byte |= 1 << bit;
      }
      bit -= 1;
      if (bit < 0 || x === size - 1) {
        u8[offset + rowOffset] = byte;
        rowOffset += 1;
        bit = 7;
        byte = 0;
      }
    }
    offset += andRowBytes;
  }

  return new Blob([buffer], { type: "image/x-icon" });
}

async function exportCurrentImage() {
  if (!hasImage()) {
    setStatus("Chargez une image avant export.");
    return;
  }
  const format = formatSelect.value;
  const baseName = (filenameInput.value || "image-editee").trim();
  const exportCanvas = buildExportCanvas();

  if (format === "svg") {
    const pngDataUrl = exportCanvas.toDataURL("image/png");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${exportCanvas.width}" height="${exportCanvas.height}" viewBox="0 0 ${exportCanvas.width} ${exportCanvas.height}"><image href="${pngDataUrl}" width="${exportCanvas.width}" height="${exportCanvas.height}"/></svg>`;
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${baseName}.svg`);
    setStatus("Export SVG terminé.");
    return;
  }

  if (format === "ico") {
    downloadBlob(canvasToIcoBlob(exportCanvas), `${baseName}.ico`);
    setStatus("Export ICO terminé.");
    return;
  }

  const mime = format === "jpg" ? "image/jpeg" : `image/${format}`;
  exportCanvas.toBlob(
    (blob) => {
      if (!blob) {
        setStatus("Erreur d'export.");
        return;
      }
      downloadBlob(blob, `${baseName}.${format}`);
      setStatus(`Export ${format.toUpperCase()} terminé.`);
    },
    mime,
    Number(quality.value),
  );
}

function setEyedropper(mode) {
  if (!hasImage()) {
    setStatus("Chargez une image avant d'utiliser la pipette.");
    return;
  }
  cropMode = false;
  cropModeBtn.textContent = "Activer crop";
  eyedropperMode = mode;
  updateEyedropperCursor();
  setStatus("Cliquez sur l'image pour prélever une couleur.");
}

function getCanvasCoordinatesFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
  return {
    x: Math.max(0, Math.min(canvas.width - 1, x)),
    y: Math.max(0, Math.min(canvas.height - 1, y)),
  };
}

function syncCropFromInputs() {
  if (!hasImage()) {
    return;
  }
  cropRect = clampCropRect({
    x: Number(cropXInput.value),
    y: Number(cropYInput.value),
    w: Number(cropWInput.value),
    h: Number(cropHInput.value),
  });
  updateCropInputs();
  renderCropOverlay();
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

loadUrlBtn.addEventListener("click", loadFromUrl);

document.addEventListener("paste", async (event) => {
  const items = event.clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      await loadFromFile(item.getAsFile());
      return;
    }
  }
});

[sourceHex, targetHex, removeHex].forEach((input) => {
  input.addEventListener("change", () => {
    if (input === sourceHex) {
      syncHexAndPicker(sourceHex, sourcePicker);
    } else if (input === targetHex) {
      syncHexAndPicker(targetHex, targetPicker);
    } else {
      syncHexAndPicker(removeHex, removePicker);
    }
  });
});

sourcePicker.addEventListener("input", () => {
  sourceHex.value = sourcePicker.value;
});
targetPicker.addEventListener("input", () => {
  targetHex.value = targetPicker.value;
});
removePicker.addEventListener("input", () => {
  removeHex.value = removePicker.value;
});

tolerance.addEventListener("input", () => {
  toleranceValue.textContent = tolerance.value;
});
removeTolerance.addEventListener("input", () => {
  removeToleranceValue.textContent = removeTolerance.value;
});
quality.addEventListener("input", () => {
  qualityValue.textContent = quality.value;
});
exportWidthInput.addEventListener("input", () => {
  if (!hasImage() || !lockAspect.checked) {
    return;
  }
  const source = getSourceRectForExport();
  const width = Number(exportWidthInput.value);
  if (Number.isFinite(width) && width > 0) {
    exportHeightInput.value = String(Math.max(1, Math.round(width * (source.h / source.w))));
  }
});
exportHeightInput.addEventListener("input", () => {
  if (!hasImage() || !lockAspect.checked) {
    return;
  }
  const source = getSourceRectForExport();
  const height = Number(exportHeightInput.value);
  if (Number.isFinite(height) && height > 0) {
    exportWidthInput.value = String(Math.max(1, Math.round(height * (source.w / source.h))));
  }
});
useCrop.addEventListener("change", () => {
  const source = getSourceRectForExport();
  if (lockAspect.checked) {
    exportWidthInput.value = String(source.w);
    exportHeightInput.value = String(source.h);
  }
  renderCropOverlay();
});
cropModeBtn.addEventListener("click", () => setCropMode(!cropMode));
[cropXInput, cropYInput, cropWInput, cropHInput].forEach((input) => {
  input.addEventListener("change", syncCropFromInputs);
});

formatSelect.addEventListener("change", () => {
  const enabled = formatSelect.value === "jpg" || formatSelect.value === "webp";
  quality.disabled = !enabled;
  qualityWrap.style.opacity = enabled ? "1" : "0.5";
});

pickSourceBtn.addEventListener("click", () => setEyedropper("source"));
pickTargetBtn.addEventListener("click", () => setEyedropper("target"));
pickRemoveBtn.addEventListener("click", () => setEyedropper("remove"));

function applyEyedropperFromEvent(event) {
  if (!eyedropperMode || !hasImage()) {
    return false;
  }
  const { x, y } = getCanvasCoordinatesFromEvent(event);
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
  const hex = rgbaToHex(r, g, b);

  if (eyedropperMode === "source") {
    sourceHex.value = hex;
    sourcePicker.value = hex;
  } else if (eyedropperMode === "target") {
    targetHex.value = hex;
    targetPicker.value = hex;
  } else {
    removeHex.value = hex;
    removePicker.value = hex;
  }
  eyedropperMode = null;
  updateEyedropperCursor();
  setStatus(`Couleur prélevée: ${hex}`);
  return true;
}

replaceBtn.addEventListener("click", () => {
  if (!hasImage()) {
    setStatus("Chargez une image avant modification.");
    return;
  }
  const from = hexToRgba(sourceHex.value);
  const to = hexToRgba(targetHex.value);
  if (!from || !to) {
    setStatus("Couleur invalide. Utilisez un code hexa valide.");
    return;
  }
  replaceColorInImage(from, to, Number(tolerance.value));
  setStatus("Remplacement de couleur effectué.");
});

removeBtn.addEventListener("click", () => {
  if (!hasImage()) {
    setStatus("Chargez une image avant modification.");
    return;
  }
  const color = hexToRgba(removeHex.value);
  if (!color) {
    setStatus("Couleur invalide. Utilisez un code hexa valide.");
    return;
  }
  removeColorInImage(color, Number(removeTolerance.value));
  setStatus("Suppression de couleur effectuée (transparence appliquée).");
});

undoBtn.addEventListener("click", undoEdit);
redoBtn.addEventListener("click", redoEdit);

zoomInBtn.addEventListener("click", () => {
  zoom = Math.min(8, zoom * 1.2);
  applyViewTransform();
});
zoomOutBtn.addEventListener("click", () => {
  zoom = Math.max(0.15, zoom / 1.2);
  applyViewTransform();
});
resetViewBtn.addEventListener("click", resetView);

previewViewport.addEventListener("mousedown", (event) => {
  if (cropMode && event.target === canvas) {
    return;
  }
  if (eyedropperMode && event.target === canvas) {
    return;
  }
  isDragging = true;
  dragStartX = event.clientX - panX;
  dragStartY = event.clientY - panY;
  previewViewport.classList.add("dragging");
});

window.addEventListener("mousemove", (event) => {
  if (!isDragging) {
    return;
  }
  panX = event.clientX - dragStartX;
  panY = event.clientY - dragStartY;
  applyViewTransform();
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  previewViewport.classList.remove("dragging");
});

previewViewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  const next = event.deltaY < 0 ? zoom * 1.08 : zoom / 1.08;
  zoom = Math.min(8, Math.max(0.15, next));
  applyViewTransform();
}, { passive: false });

canvas.addEventListener(
  "mousedown",
  (event) => {
    if (!hasImage()) {
      return;
    }
    if (eyedropperMode && !cropMode) {
      event.preventDefault();
      event.stopPropagation();
      applyEyedropperFromEvent(event);
      return;
    }
    if (!cropMode) {
      return;
    }
    isDrawingCrop = true;
    const { x, y } = getCanvasCoordinatesFromEvent(event);
    cropStartX = x;
    cropStartY = y;
    cropRect = clampCropRect({ x, y, w: 1, h: 1 });
    updateCropInputs();
    useCrop.checked = true;
    renderCropOverlay();
    event.stopPropagation();
  },
  true,
);

window.addEventListener("mousemove", (event) => {
  if (!isDrawingCrop || !hasImage()) {
    return;
  }
  const { x, y } = getCanvasCoordinatesFromEvent(event);
  const left = Math.min(cropStartX, x);
  const top = Math.min(cropStartY, y);
  const w = Math.abs(cropStartX - x) + 1;
  const h = Math.abs(cropStartY - y) + 1;
  cropRect = clampCropRect({ x: left, y: top, w, h });
  updateCropInputs();
  renderCropOverlay();
});

window.addEventListener("mouseup", () => {
  isDrawingCrop = false;
});
window.addEventListener("resize", renderCropOverlay);

exportBtn.addEventListener("click", exportCurrentImage);

resetBtn.addEventListener("click", () => {
  if (!originalImageData) {
    setStatus("Aucune image d'origine disponible.");
    return;
  }
  pushHistoryState();
  setCanvasImageData(cloneImageData(originalImageData));
  initCropAndExportControls();
  setStatus("Image réinitialisée.");
});

formatSelect.dispatchEvent(new Event("change"));
updateUndoRedoButtons();
applyViewTransform();
