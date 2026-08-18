# Interior Studio

A fully client-side interior design studio for **Interior**: manage one project per customer, bring in their 2D floor plan, generate an editable 3D design for every room, customize furniture piece by piece, and export a branded PDF presentation once the design is approved.

## Features

- **Multi-project management** — one project per customer/plan, with duplicate/delete, approval progress, and automatic persistence in the browser (IndexedDB). No backend needed.
- **Floor plan input** — upload the customer's 2D plan image, calibrate the scale against a known dimension, then trace rooms directly on top of it. Rooms can also be drawn on a blank grid.
- **3D generation** — every room gets a 3D shell (walls, floor finish) and an auto-generated furniture layout based on its type (bedroom, living, kitchen/dining, toilet, balcony, store, wash, vestibule, study…).
- **Per-room customization** — one room at a time:
  - drag furniture on the floor in 3D, rotate (R key or slider), duplicate, delete
  - resize any item (width/depth/height) with live parametric geometry
  - recolor primary/accent of every piece, plus wall color, floor color and floor style (wood/tile/marble/concrete)
  - add items from a 30+ piece catalog (sofas, beds, wardrobes, TV units, kitchen counters, sanitary ware, decor…)
- **3D overview** — dollhouse view of the whole apartment with adjustable wall cutaway and room labels.
- **Approval workflow** — mark rooms approved; progress is shown per project.
- **Branded PDF export** — Interior cover page, 2D plan, full-apartment 3D render, one page per room with the 3D view, finish swatches, and a furniture schedule with sizes. Unapproved rooms are watermarked DRAFT.

## Tech stack

- React 19 + TypeScript + Vite
- three.js via @react-three/fiber and @react-three/drei for the live 3D editors
- Shared plain-three "builder" functions generate all geometry, so the offscreen PDF snapshot renderer produces exactly what the editor shows
- zustand (+ IndexedDB via idb-keyval) for state and persistence
- jsPDF for the export (lazy-loaded)

## Getting started

```bash
npm install
npm run dev      # start the studio at http://localhost:5173
npm run build    # production build
npm run lint     # oxlint
```

Click **Load Sample Flat 104** on the dashboard to explore a ready-made 3BHK project modeled after the reference floor plan.

## Project structure

```
src/
  data/        furniture catalog, per-room-type auto-furnish presets, sample project
  three/       parametric geometry builders, offscreen snapshot renderer, camera logic
  store/       zustand store with IndexedDB persistence
  pdf/         branded PDF export
  components/  dashboard, floor plan tracer, 3D room editor, apartment overview
  utils/       units (feet/inches), colors, ids, 2D plan schematic renderer
```
