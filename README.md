# Image color editor · Éditeur de couleurs d’image

**EN** — A small, static web app to replace or remove colors in an image, crop, resize exports, and download in several formats. Everything runs in your browser; no server, no upload.

**FR** — Petite application web statique pour remplacer ou supprimer des couleurs dans une image, recadrer, redimensionner l’export et télécharger en plusieurs formats. Tout s’exécute dans le navigateur ; pas de serveur, pas d’envoi de fichiers.

---

## English

### Overview

This tool is **free to use** and requires **no account**. All image processing happens **locally** in your browser using the HTML Canvas API. Your images are **not sent** to any server.

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

### Tech stack

- Plain **HTML**, **CSS**, **JavaScript** (no build step, no framework).
- Files: `index.html`, `styles.css`, `app.js`.

### How to run

1. Clone or download this repository.
2. Open **`index.html`** in a modern browser (Chrome, Firefox, Edge, Safari).

For URL import or to avoid some browsers’ restrictions on `file://`, serve the folder locally, for example:

```bash
# Python 3
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

### Browser notes

- **URL import** may fail if the image host does not allow cross-origin use (`Access-Control-Allow-Origin`). Local files and paste are not affected the same way.
- **ICO** export uses a simplified embedded PNG-style icon (size capped as in the code).
- **SVG** export is not a vector trace of your image; it embeds the bitmap.

### Repository layout

```
logo_tools/
├── index.html    # Structure & UI
├── styles.css    # Layout, themes, responsive preview
├── app.js        # Logic: canvas, history, crop, export
└── README.md     # This file
```

### Contributing

Issues and pull requests are welcome (UI copy, accessibility, export edge cases, etc.).

### License

Specify a license in the repository if you publish on GitHub (e.g. **MIT**). Until then, reuse is at your own discretion.

---

## Français

### Présentation

Cet outil est **gratuit** et ne demande **aucun compte**. Tout le traitement d’image est effectué **en local** dans votre navigateur via l’API Canvas. Vos images **ne sont pas envoyées** sur un serveur.

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

### Technique

- **HTML**, **CSS**, **JavaScript** purs (pas de compilation, pas de framework).
- Fichiers : `index.html`, `styles.css`, `app.js`.

### Lancer l’application

1. Cloner ou télécharger le dépôt.
2. Ouvrir **`index.html`** dans un navigateur récent (Chrome, Firefox, Edge, Safari).

Pour l’import par URL ou pour éviter certaines limitations du schéma `file://`, servir le dossier en local, par exemple :

```bash
# Python 3
python -m http.server 8080
```

Puis ouvrir `http://localhost:8080` dans le navigateur.

### Notes navigateur

- L’import par **URL** peut échouer si le serveur de l’image n’autorise pas l’usage cross-origin (`Access-Control-Allow-Origin`). Les fichiers locaux et le collage sont moins concernés.
- L’export **ICO** suit une construction d’icône classique (taille plafonnée comme dans le code).
- L’export **SVG** n’est pas une vectorisation : il intègre le bitmap.

### Arborescence

```
logo_tools/
├── index.html    # Structure et interface
├── styles.css    # Mise en page, thème, aperçu responsive
├── app.js        # Logique canvas, historique, crop, export
└── README.md     # Ce fichier
```

### Contribution

Les retours et les pull requests sont les bienvenus (texte, accessibilité, cas limites d’export, etc.).

### Licence

Précisez une licence sur le dépôt si vous publiez sur GitHub (par ex. **MIT**). En l’absence de fichier de licence, la réutilisation reste à votre appréciation.
