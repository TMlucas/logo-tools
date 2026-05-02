# Web toolbox · Boîte à outils web

**EN** — Static client-side tools for the web: an **image color editor** (replace/remove colors, crop, multi-format export) and a **QR code generator** (Wi-Fi / vCard, styles, logo, PNG/SVG). No server; your data stays in the browser.

**FR** — Outils web **100 % navigateur** : **éditeur de couleurs d’image** (remplacer / supprimer des couleurs, crop, export multi-formats) et **générateur de QR code** (Wi-Fi, vCard, styles, logo, PNG/SVG). Pas de serveur applicatif ; vos données restent sur l’appareil.

---

## English

### Overview

The site is **free to use** and requires **no account**. Shared **navigation** between pages (`index.html` ↔ `qr-code.html`).

**Image editor** — All processing happens **locally** in your browser (HTML Canvas API). Your images are **not sent** to any server.

### Features

- **Import**
  - Drag and drop
  - Paste from clipboard (`Ctrl+V` / `Cmd+V`)
  - Image URL (subject to remote server **CORS** policy)
  - Local file picker
- **Replace color** — Pick a source color (hex, color input, or eyedropper on the “After” canvas), pick a replacement color, set **tolerance**, apply.
- **Remove color** — Make a chosen color **transparent** (useful for PNG with no background), with tolerance and eyedropper.
- **Preview**
  - **Before / After** side by side (desktop); **stacked** on narrow screens (Before above After)
  - **Undo / Redo** (limited history)
  - **Zoom** (buttons + mouse wheel) and **pan** (drag in the preview area)
- **Eyedropper** — Custom cursor when active; sampling uses the edited (“After”) image.
- **Export**
  - Formats: **PNG**, **JPEG**, **WebP**, **ICO**, **SVG** (SVG wraps a raster PNG for compatibility)
  - Optional **export width/height** with optional **aspect ratio lock**
  - Optional **crop** (rectangle on canvas + numeric fields); export can use crop only
  - Quality slider for JPEG/WebP
- **UI** — Collapsible sections to save space; short hints on each section when folded.

### QR Code generator (features)

Open **`qr-code.html`**. Encoding uses the vendored **`qrcode`** library ([node-qrcode](https://github.com/soldair/node-qrcode) v1.5.1, MIT) — **no CDN**.

- **Content** — Free text or URL; **Wi-Fi** and **vCard** presets; **import a `.vcf` file`** into the encoded payload.
- **Appearance** — Error correction (L–H), size, margin, dark/light colors (live preview updates), **module styles**: classic squares, **rounded squares**, or **dots**.
- **Logo** — Optional centered image (high ECC recommended).
- **Export** — **PNG** and **SVG**; optional **transparent PNG** (background colour removed on export/copy only); **copy PNG** to the clipboard when supported.

### Tech stack

- Plain **HTML**, **CSS**, **JavaScript** (no build step, no framework).
- **Image tool:** `index.html`, `styles.css`, `app.js`.
- **QR tool:** `qr-code.html`, `qr-code.css`, `qr-code.js`, `vendor/qrcode.min.js`.

### How to run

1. Clone or download this repository.
2. Open **`index.html`** in a modern browser (Chrome, Firefox, Edge, Safari).

For URL import or to avoid some browsers’ restrictions on `file://`, serve the folder locally, for example:

```bash
# Python 3
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

### SEO (GitHub Pages)

- **`index.html`** and **`qr-code.html`** include `meta description`, **Open Graph**, **Twitter Card**, **`canonical`**, and **JSON-LD** (site + tools list / web app).
- **`robots.txt`** and **`sitemap.xml`** are at the repo root for crawlers.
- **Important:** URLs are set to `https://tmlucas.github.io/logo-tools/` (project site). If your username, repository name, or **custom domain** differs, search-replace that base URL in: `index.html`, `qr-code.html`, `robots.txt`, `sitemap.xml`.
- Optional next step: add **`og:image`** (absolute URL to a 1200×630 preview) and a **`favicon.ico`** / `apple-touch-icon` for richer sharing and tabs.

### Browser notes

- **URL import** may fail if the image host does not allow cross-origin use (`Access-Control-Allow-Origin`). Local files and paste are not affected the same way.
- **ICO** export uses a simplified embedded PNG-style icon (size capped as in the code).
- **SVG** export is not a vector trace of your image; it embeds the bitmap.

### Repository layout

The folder name on disk may differ from the **GitHub** repository name (e.g. `logo_tools` locally vs `logo-tools` on GitHub).

```
├── index.html      # Image editor — structure & UI
├── qr-code.html    # QR code generator
├── styles.css      # Shared layout, themes, responsive preview
├── qr-code.css     # QR page extras
├── app.js          # Image editor logic
├── qr-code.js      # QR generator logic
├── vendor/
│   └── qrcode.min.js   # Local copy of node-qrcode (browser build)
├── robots.txt      # Crawlers + sitemap URL
├── sitemap.xml     # List of public URLs for indexing
├── LICENSE         # Apache-2.0 + third-party (node-qrcode MIT) section
└── README.md       # This file
```

### Contributing

Issues and pull requests are welcome (UI copy, accessibility, export edge cases, SEO base URL, etc.).

### License

The project **`LICENSE`** file applies **Apache License 2.0** to your authored material, with an appended **third-party** section for the bundled **node-qrcode** browser build (`vendor/qrcode.min.js`, MIT). Adjust the copyright line in the Apache appendix if needed.

---

## Français

### Présentation

Le site est **gratuit** et ne demande **aucun compte**. **Navigation partagée** entre les pages (`index.html` ↔ `qr-code.html`).

**Éditeur d’image** — Tout le traitement est fait **en local** dans le navigateur (API Canvas). Vos images **ne sont pas envoyées** sur un serveur.

### Fonctionnalités

- **Import**
  - Glisser-déposer
  - Collage depuis le presse-papiers (`Ctrl+V` / `Cmd+V`)
  - URL d’image (soumis aux règles **CORS** du site distant)
  - Sélection d’un fichier sur l’ordinateur
- **Remplacer une couleur** — Couleur source et couleur de remplacement (hexa, palette ou **pipette** sur le canvas « Après »), **tolérance**, puis application.
- **Supprimer une couleur** — Rend la couleur choisie **transparente** (pratique pour un PNG sans fond), avec tolérance et pipette.
- **Aperçu**
  - **Avant / Après** côte à côte sur grand écran ; **empilé** sur mobile (**Avant** au-dessus, **Après** en dessous)
  - **Annuler / Rétablir** (historique limité)
  - **Zoom** (boutons + molette) et **déplacement** (glisser dans la zone d’aperçu)
- **Pipette** — Curseur dédié quand le mode est actif ; échantillonnage sur l’image modifiée (« Après »).
- **Export**
  - Formats : **PNG**, **JPEG**, **WebP**, **ICO**, **SVG** (le SVG encapsule une image matricielle pour la compatibilité)
  - **Largeur / hauteur d’export** optionnelles, avec option **conserver le ratio**
  - **Crop** optionnel (rectangle à la souris + champs X/Y/L/H) ; possibilité d’exporter uniquement la zone recadrée
  - Curseur de **qualité** pour JPG/WebP
- **Interface** — Sections **repliables** pour limiter la hauteur de page ; **rappel** sur chaque section lorsqu’elle est repliée.

### Générateur QR Code (fonctionnalités)

Ouvrir **`qr-code.html`**. L’encodage utilise la bibliothèque **`qrcode`** fournie dans le dépôt ([node-qrcode](https://github.com/soldair/node-qrcode) v1.5.1, MIT) — **pas de CDN**.

- **Contenu** — Texte ou URL ; préréglages **Wi-Fi** et **vCard** ; **import d’un fichier `.vcf`** pour remplir le contenu encodé.
- **Apparence** — Niveau de correction d’erreur (L à H), taille, marge, couleurs modules / fond (mise à jour en direct), **style des modules** : carrés standard, **carrés arrondis** ou **pastilles**.
- **Logo** — Image centrée optionnelle (ECC élevé recommandé).
- **Export** — **PNG** et **SVG** ; option **PNG sans fond** (transparence à l’export / à la copie, pas sur l’aperçu) ; **copie PNG** dans le presse-papiers si le navigateur le permet.

### Technique

- **HTML**, **CSS**, **JavaScript** purs (pas de compilation, pas de framework).
- **Éditeur d’image :** `index.html`, `styles.css`, `app.js`.
- **QR code :** `qr-code.html`, `qr-code.css`, `qr-code.js`, `vendor/qrcode.min.js`.

### Lancer l’application

1. Cloner ou télécharger le dépôt.
2. Ouvrir **`index.html`** dans un navigateur récent (Chrome, Firefox, Edge, Safari).

Pour l’import par URL ou pour éviter certaines limitations du schéma `file://`, servir le dossier en local, par exemple :

```bash
# Python 3
python -m http.server 8080
```

Puis ouvrir `http://localhost:8080` dans le navigateur.

### SEO (GitHub Pages)

- **`index.html`** et **`qr-code.html`** incluent `meta description`, balises **Open Graph**, **Twitter Card**, lien **`canonical`** et **JSON-LD** (site + liste d’outils / application web).
- **`robots.txt`** et **`sitemap.xml`** à la racine du dépôt pour les robots d’indexation.
- **À personnaliser :** les URL pointent vers `https://tmlucas.github.io/logo-tools/`. Si votre compte, le nom du dépôt ou un **domaine personnalisé** change, faites un remplacement global de cette base dans `index.html`, `qr-code.html`, `robots.txt` et `sitemap.xml`.
- Pour aller plus loin : ajouter une **`og:image`** (URL absolue, visuel ~1200×630) et un **favicon** pour le partage social et l’onglet du navigateur.

### Notes navigateur

- L’import par **URL** peut échouer si le serveur de l’image n’autorise pas l’usage cross-origin (`Access-Control-Allow-Origin`). Les fichiers locaux et le collage sont moins concernés.
- L’export **ICO** suit une construction d’icône classique (taille plafonnée comme dans le code).
- L’export **SVG** n’est pas une vectorisation : il intègre le bitmap.

### Arborescence

Le nom du dossier local peut différer du **dépôt GitHub** (ex. `logo_tools` en local vs `logo-tools` sur GitHub).

```
├── index.html      # Éditeur d’image — structure et interface
├── qr-code.html    # Générateur QR Code
├── styles.css      # Mise en page partagée, thème, aperçu responsive
├── qr-code.css     # Styles complémentaires page QR
├── app.js          # Logique éditeur d’image
├── qr-code.js      # Logique générateur QR
├── vendor/
│   └── qrcode.min.js   # Copie locale de node-qrcode (build navigateur)
├── robots.txt      # Crawlers + URL du sitemap
├── sitemap.xml     # URLs publiques pour l’indexation
├── LICENSE         # Apache-2.0 + section tiers (node-qrcode MIT)
└── README.md       # Ce fichier
```

### Contribution

Les retours et les pull requests sont les bienvenus (texte, accessibilité, cas limites d’export, URL de base SEO, etc.).

### Licence

Le fichier **`LICENSE`** applique la **licence Apache 2.0** à votre travail, avec une section **logiciels tiers** pour le build navigateur **node-qrcode** (`vendor/qrcode.min.js`, MIT). Adaptez la ligne de copyright de l’annexe Apache si besoin.
