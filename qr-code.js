/* global QRCode */

const canvas = document.getElementById("qrCanvas");
const ctx = canvas.getContext("2d");
const contentInput = document.getElementById("qrContent");
const charCountEl = document.getElementById("charCount");
const qrStatus = document.getElementById("qrStatus");

const wifiSsid = document.getElementById("wifiSsid");
const wifiPass = document.getElementById("wifiPass");
const wifiSec = document.getElementById("wifiSec");
const wifiHidden = document.getElementById("wifiHidden");
const applyWifiBtn = document.getElementById("applyWifiBtn");

const vcardFn = document.getElementById("vcardFn");
const vcardTel = document.getElementById("vcardTel");
const vcardEmail = document.getElementById("vcardEmail");
const vcardOrg = document.getElementById("vcardOrg");
const applyVcardBtn = document.getElementById("applyVcardBtn");
const vcardImportFile = document.getElementById("vcardImportFile");

const qrEcc = document.getElementById("qrEcc");
const qrWidth = document.getElementById("qrWidth");
const qrMargin = document.getElementById("qrMargin");
const qrColorDarkHex = document.getElementById("qrColorDarkHex");
const qrColorDarkPicker = document.getElementById("qrColorDarkPicker");
const qrColorLightHex = document.getElementById("qrColorLightHex");
const qrColorLightPicker = document.getElementById("qrColorLightPicker");
const qrLogoEnabled = document.getElementById("qrLogoEnabled");
const qrLogoFile = document.getElementById("qrLogoFile");
const qrModuleStyle = document.getElementById("qrModuleStyle");

const qrFilename = document.getElementById("qrFilename");
const qrPngTransparentBg = document.getElementById("qrPngTransparentBg");
const exportPngBtn = document.getElementById("exportPngBtn");
const exportSvgBtn = document.getElementById("exportSvgBtn");
const copyPngBtn = document.getElementById("copyPngBtn");

let debounceTimer = null;
let logoImage = null;

function setStatus(message, isError = false) {
  qrStatus.textContent = message;
  qrStatus.style.color = isError ? "#fca5a5" : "#bfdbfe";
}

function escapeWifiValue(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/:/g, "\\:");
}

function buildWifiString() {
  const ssid = wifiSsid.value.trim();
  if (!ssid) {
    return null;
  }
  const pass = wifiPass.value;
  const sec = wifiSec.value;
  const hidden = wifiHidden.checked ? "true" : "false";
  const s = escapeWifiValue(ssid);
  const p = escapeWifiValue(pass);
  if (sec === "nopass") {
    return `WIFI:T:nopass;S:${s};H:${hidden};;`;
  }
  return `WIFI:T:${sec};S:${s};P:${p};H:${hidden};;`;
}

function normalizeImportedVcard(raw) {
  return String(raw).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
}

function isValidVcardText(text) {
  return /BEGIN:VCARD/i.test(text) && /END:VCARD/i.test(text);
}

function buildVcardString() {
  const fn = vcardFn.value.trim();
  if (!fn) {
    return null;
  }
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fn.replace(/\n/g, " ")}`,
  ];
  const org = vcardOrg.value.trim();
  if (org) {
    lines.push(`ORG:${org.replace(/\n/g, " ")}`);
  }
  const tel = vcardTel.value.trim();
  if (tel) {
    lines.push(`TEL;TYPE=CELL:${tel.replace(/\n/g, " ")}`);
  }
  const email = vcardEmail.value.trim();
  if (email) {
    lines.push(`EMAIL;TYPE=INTERNET:${email.replace(/\n/g, " ")}`);
  }
  lines.push("END:VCARD");
  return lines.join("\n");
}

function normalizeHex(input) {
  const t = input.trim();
  if (!/^#?[0-9a-fA-F]{3,8}$/.test(t.replace("#", ""))) {
    return null;
  }
  const h = t.startsWith("#") ? t : `#${t}`;
  if (h.length === 4 || h.length === 5) {
    return null;
  }
  if (h.length === 7 || h.length === 9) {
    return h.slice(0, 7);
  }
  return null;
}

function syncDarkColors() {
  const n = normalizeHex(qrColorDarkHex.value);
  if (n) {
    qrColorDarkPicker.value = n;
    qrColorDarkHex.value = n;
  }
}

function syncLightColors() {
  const n = normalizeHex(qrColorLightHex.value);
  if (n) {
    qrColorLightPicker.value = n;
    qrColorLightHex.value = n;
  }
}

function hexToRgb(hex) {
  const n = normalizeHex(hex);
  if (!n || n.length < 7) {
    return null;
  }
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

function colorDistanceRgb(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Canvas prêt pour export/copie PNG : fond transparent si option cochée. */
function buildPngExportCanvas() {
  if (!qrPngTransparentBg.checked) {
    return canvas;
  }
  const lightHex = normalizeHex(qrColorLightHex.value) || "#ffffff";
  const rgb = hexToRgb(lightHex);
  if (!rgb) {
    return canvas;
  }
  const w = canvas.width;
  const h = canvas.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  octx.drawImage(canvas, 0, 0);
  const imgData = octx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const tolerance = 42;
  for (let i = 0; i < d.length; i += 4) {
    if (colorDistanceRgb(d[i], d[i + 1], d[i + 2], rgb.r, rgb.g, rgb.b) <= tolerance) {
      d[i + 3] = 0;
    }
  }
  octx.putImageData(imgData, 0, 0);
  return out;
}

function getQrOptions() {
  const dark = normalizeHex(qrColorDarkHex.value) || "#000000";
  const light = normalizeHex(qrColorLightHex.value) || "#ffffff";
  qrColorDarkHex.value = dark;
  qrColorLightHex.value = light;
  qrColorDarkPicker.value = dark;
  qrColorLightPicker.value = light;

  let width = Number(qrWidth.value);
  if (!Number.isFinite(width) || width < 64) {
    width = 256;
  }
  width = Math.min(2048, Math.round(width));

  let margin = Number(qrMargin.value);
  if (!Number.isFinite(margin) || margin < 0) {
    margin = 2;
  }
  margin = Math.min(10, Math.round(margin));

  return {
    errorCorrectionLevel: qrEcc.value,
    width,
    margin,
    color: { dark, light },
  };
}

function updateCharCount() {
  const len = contentInput.value.length;
  const unit = len <= 1 ? "caractère" : "caractères";
  charCountEl.textContent = `${len} ${unit}`;
  charCountEl.classList.toggle("is-warn", len > 800);
}

function drawLogoOnCanvas(img) {
  const w = canvas.width;
  const box = Math.round(w * 0.22);
  const pad = Math.round(box * 0.12);
  const outer = box + pad * 2;
  const ox = Math.floor((w - outer) / 2);
  const oy = Math.floor((w - outer) / 2);
  const light = normalizeHex(qrColorLightHex.value) || "#ffffff";
  ctx.fillStyle = light;
  ctx.fillRect(ox, oy, outer, outer);
  ctx.drawImage(img, ox + pad, oy + pad, box, box);
}

function clearCanvasPlaceholder() {
  const w = canvas.width;
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, 0, w, w);
  ctx.fillStyle = "#6b7280";
  ctx.font = `${Math.max(12, Math.round(w / 18))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Contenu vide", w / 2, w / 2);
}

function ensureQRCodeLib() {
  if (typeof QRCode === "undefined" || typeof QRCode.toCanvas !== "function") {
    setStatus(
      "Bibliothèque QR indisponible (réseau ou blocage). Vérifiez la connexion et rechargez la page.",
      true,
    );
    return false;
  }
  return true;
}

function fillRoundRect(c, x, y, w, h, r) {
  const rad = Math.min(Math.max(0, r), w / 2, h / 2);
  if (rad <= 0) {
    c.fillRect(x, y, w, h);
    return;
  }
  if (typeof c.roundRect === "function") {
    c.beginPath();
    c.roundRect(x, y, w, h, rad);
    c.fill();
    return;
  }
  c.beginPath();
  c.moveTo(x + rad, y);
  c.lineTo(x + w - rad, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rad);
  c.lineTo(x + w, y + h - rad);
  c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  c.lineTo(x + rad, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rad);
  c.lineTo(x, y + rad);
  c.quadraticCurveTo(x, y, x + rad, y);
  c.closePath();
  c.fill();
}

function drawStyledQrOnCanvas(text, opts, style, onDone) {
  if (typeof QRCode.create !== "function") {
    onDone(new Error("API QRCode.create indisponible."));
    return;
  }
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: opts.errorCorrectionLevel });
    const n = qr.modules.size;
    const m = opts.margin;
    const W = opts.width;
    const cell = W / (n + 2 * m);
    const c = canvas.getContext("2d");
    c.fillStyle = opts.color.light;
    c.fillRect(0, 0, W, W);
    c.fillStyle = opts.color.dark;

    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (!qr.modules.get(row, col)) {
          continue;
        }
        const x = (col + m) * cell;
        const y = (row + m) * cell;
        if (style === "dots") {
          const radius = cell * 0.42;
          c.beginPath();
          c.arc(x + cell / 2, y + cell / 2, radius, 0, Math.PI * 2);
          c.fill();
        } else {
          const pad = cell * 0.1;
          const rw = cell - 2 * pad;
          const rh = cell - 2 * pad;
          const rr = Math.min(rw, rh) * 0.32;
          fillRoundRect(c, x + pad, y + pad, rw, rh, rr);
        }
      }
    }
    onDone(null);
  } catch (err) {
    onDone(err);
  }
}

function escapeXmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildStyledSvgString(text, opts, style, onDone) {
  if (typeof QRCode.create !== "function") {
    onDone(new Error("API QRCode.create indisponible."));
    return;
  }
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: opts.errorCorrectionLevel });
    const n = qr.modules.size;
    const m = opts.margin;
    const W = opts.width;
    const cell = W / (n + 2 * m);
    const dark = escapeXmlAttr(opts.color.dark);
    const light = escapeXmlAttr(opts.color.light);
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">`,
      `<rect width="100%" height="100%" fill="${light}"/>`,
    ];
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (!qr.modules.get(row, col)) {
          continue;
        }
        const x = (col + m) * cell;
        const y = (row + m) * cell;
        if (style === "dots") {
          const r = cell * 0.42;
          parts.push(
            `<circle cx="${(x + cell / 2).toFixed(3)}" cy="${(y + cell / 2).toFixed(3)}" r="${r.toFixed(3)}" fill="${dark}"/>`,
          );
        } else {
          const pad = cell * 0.1;
          const rw = cell - 2 * pad;
          const rh = cell - 2 * pad;
          const rx = Math.min(rw, rh) * 0.32;
          parts.push(
            `<rect x="${(x + pad).toFixed(3)}" y="${(y + pad).toFixed(3)}" width="${rw.toFixed(3)}" height="${rh.toFixed(3)}" rx="${rx.toFixed(3)}" ry="${rx.toFixed(3)}" fill="${dark}"/>`,
          );
        }
      }
    }
    parts.push("</svg>");
    onDone(null, parts.join(""));
  } catch (err) {
    onDone(err);
  }
}

function applyLogoIfNeeded() {
  if (qrLogoEnabled.checked && logoImage && logoImage.complete && logoImage.naturalWidth) {
    if (qrEcc.value !== "H") {
      setStatus("QR généré (logo actif : préférez la correction H pour un scan plus fiable).");
    } else {
      setStatus("QR code généré.");
    }
    try {
      drawLogoOnCanvas(logoImage);
    } catch {
      setStatus("QR généré ; impossible de dessiner le logo.", true);
    }
  } else {
    setStatus("QR code généré.");
  }
}

function regenerate() {
  if (!ensureQRCodeLib()) {
    return;
  }

  const text = contentInput.value;
  updateCharCount();

  if (!text.trim()) {
    const w = Number(qrWidth.value) || 256;
    canvas.width = Math.min(2048, Math.max(64, w));
    canvas.height = canvas.width;
    clearCanvasPlaceholder();
    setStatus("Saisissez un contenu pour générer le QR code.");
    return;
  }

  const opts = getQrOptions();
  const style = qrModuleStyle.value;
  canvas.width = opts.width;
  canvas.height = opts.width;

  if (style === "classic") {
    QRCode.toCanvas(canvas, text, opts, (err) => {
      if (err) {
        setStatus(`Erreur : ${err.message || String(err)}`, true);
        return;
      }
      applyLogoIfNeeded();
    });
    return;
  }

  drawStyledQrOnCanvas(text, opts, style, (err) => {
    if (err) {
      setStatus(`Erreur : ${err.message || String(err)}`, true);
      return;
    }
    applyLogoIfNeeded();
  });
}

function scheduleRegenerate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(regenerate, 280);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

applyWifiBtn.addEventListener("click", () => {
  const s = buildWifiString();
  if (!s) {
    setStatus("Indiquez au moins le nom du réseau Wi-Fi (SSID).", true);
    return;
  }
  contentInput.value = s;
  scheduleRegenerate();
  setStatus("Chaîne Wi-Fi insérée dans le contenu.");
});

applyVcardBtn.addEventListener("click", () => {
  const s = buildVcardString();
  if (!s) {
    setStatus("Indiquez au moins le nom affiché pour la vCard.", true);
    return;
  }
  contentInput.value = s;
  scheduleRegenerate();
  setStatus("vCard insérée dans le contenu.");
});

vcardImportFile.addEventListener("change", async () => {
  const file = vcardImportFile.files?.[0];
  vcardImportFile.value = "";
  if (!file) {
    return;
  }
  let raw;
  try {
    raw = await file.text();
  } catch {
    setStatus("Impossible de lire ce fichier.", true);
    return;
  }
  const text = normalizeImportedVcard(raw);
  if (!isValidVcardText(text)) {
    setStatus(
      "Fichier invalide : une vCard doit contenir les lignes BEGIN:VCARD et END:VCARD.",
      true,
    );
    return;
  }
  contentInput.value = text;
  scheduleRegenerate();
  setStatus(`vCard importée depuis « ${file.name} ».`);
});

function onDarkColorEdit() {
  syncDarkColors();
  scheduleRegenerate();
}
function onLightColorEdit() {
  syncLightColors();
  scheduleRegenerate();
}
qrColorDarkHex.addEventListener("input", onDarkColorEdit);
qrColorDarkHex.addEventListener("change", onDarkColorEdit);
qrColorLightHex.addEventListener("input", onLightColorEdit);
qrColorLightHex.addEventListener("change", onLightColorEdit);
function onDarkPickerChange() {
  qrColorDarkHex.value = qrColorDarkPicker.value;
  scheduleRegenerate();
}
function onLightPickerChange() {
  qrColorLightHex.value = qrColorLightPicker.value;
  scheduleRegenerate();
}
qrColorDarkPicker.addEventListener("input", onDarkPickerChange);
qrColorDarkPicker.addEventListener("change", onDarkPickerChange);
qrColorLightPicker.addEventListener("input", onLightPickerChange);
qrColorLightPicker.addEventListener("change", onLightPickerChange);

[
  qrEcc,
  qrWidth,
  qrMargin,
  qrLogoEnabled,
  qrModuleStyle,
].forEach((el) => el.addEventListener("change", scheduleRegenerate));
[qrEcc, qrWidth, qrMargin].forEach((el) => {
  el.addEventListener("input", scheduleRegenerate);
});

contentInput.addEventListener("input", scheduleRegenerate);

qrLogoFile.addEventListener("change", () => {
  const file = qrLogoFile.files?.[0];
  logoImage = null;
  if (!file || !file.type.startsWith("image/")) {
    scheduleRegenerate();
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    logoImage = img;
    scheduleRegenerate();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    setStatus("Image logo illisible.", true);
    scheduleRegenerate();
  };
  img.src = url;
});

exportPngBtn.addEventListener("click", () => {
  const text = contentInput.value.trim();
  if (!text) {
    setStatus("Rien à exporter : contenu vide.", true);
    return;
  }
  const base = (qrFilename.value || "qrcode").trim().replace(/[/\\?%*:|"<>]/g, "-");
  const exportCanvas = buildPngExportCanvas();
  exportCanvas.toBlob((blob) => {
    if (!blob) {
      setStatus("Export PNG impossible.", true);
      return;
    }
    downloadBlob(blob, `${base}.png`);
    setStatus(
      qrPngTransparentBg.checked ? "PNG téléchargé (fond transparent)." : "PNG téléchargé.",
    );
  }, "image/png");
});

exportSvgBtn.addEventListener("click", () => {
  const text = contentInput.value.trim();
  if (!text) {
    setStatus("Rien à exporter : contenu vide.", true);
    return;
  }
  const base = (qrFilename.value || "qrcode").trim().replace(/[/\\?%*:|"<>]/g, "-");
  const style = qrModuleStyle.value;
  const renderOpts = getQrOptions();

  if (qrLogoEnabled.checked && logoImage) {
    setStatus("Export SVG sans logo (le logo n’est pas vectorisé ici). Le PNG contient le logo.");
  }

  if (style === "classic") {
    const opts = {
      type: "svg",
      errorCorrectionLevel: renderOpts.errorCorrectionLevel,
      margin: renderOpts.margin,
      color: renderOpts.color,
    };
    QRCode.toString(text, opts, (err, str) => {
      if (err) {
        setStatus(`SVG : ${err.message || String(err)}`, true);
        return;
      }
      downloadBlob(new Blob([str], { type: "image/svg+xml;charset=utf-8" }), `${base}.svg`);
      setStatus("SVG téléchargé.");
    });
    return;
  }

  buildStyledSvgString(text, renderOpts, style, (err, str) => {
    if (err) {
      setStatus(`SVG : ${err.message || String(err)}`, true);
      return;
    }
    downloadBlob(new Blob([str], { type: "image/svg+xml;charset=utf-8" }), `${base}.svg`);
    setStatus("SVG téléchargé (style arrondi / pastilles).");
  });
});

copyPngBtn.addEventListener("click", async () => {
  const text = contentInput.value.trim();
  if (!text) {
    setStatus("Rien à copier : contenu vide.", true);
    return;
  }
  if (!navigator.clipboard || !window.ClipboardItem) {
    setStatus("Copie non supportée par ce navigateur.", true);
    return;
  }
  try {
    const exportCanvas = buildPngExportCanvas();
    await new Promise((resolve, reject) => {
      exportCanvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("blob"));
          return;
        }
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          resolve();
        } catch (e) {
          reject(e);
        }
      }, "image/png");
    });
    setStatus(
      qrPngTransparentBg.checked
        ? "Image copiée (PNG avec fond transparent)."
        : "Image copiée dans le presse-papiers.",
    );
  } catch {
    setStatus("Copie refusée (permissions ou contexte non sécurisé).", true);
  }
});

syncDarkColors();
syncLightColors();
updateCharCount();
regenerate();
