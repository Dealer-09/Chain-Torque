# ChainTorque CAD — Tooling Implementation Plan (SolidWorks × Blender)

> Living plan for expanding the CAD editor's tool set by borrowing the best of
> **SolidWorks** (parametric, feature/sketch-based, precision engineering) and
> **Blender** (direct mesh modeling, modifier stack, fast artist workflow).
> Tools and *behaviors* are gated by the user's chosen **Workflow Profile** so
> each user gets the software they already know in muscle memory.

## Context & the core idea

We already ship a navigation-style preset (`ct_cad_nav_style` ∈ `default | solidworks
| blender`) that swaps the viewport gizmo + mouse controls (see `src/three/navPresets.js`).
This plan **promotes that preset into a full "Workflow Profile"**: the same choice that
sets the gizmo also unlocks a matching *tool set* and *interaction model*. The product
currently lacks tools; this is how we add them coherently instead of as a random pile.

Three profiles:
- **SolidWorks** — feature-based / parametric. Sketch → feature (extrude/revolve/...) →
  modify (fillet/chamfer/shell) → pattern. Precision, dimensions, constraints, a feature
  history tree. Click-to-activate tools, PropertyManager-style panels.
- **Blender** — direct mesh modeling. Tab into Edit Mode, select verts/edges/faces, push
  geometry (extrude region, inset, bevel, loop cut, knife), non-destructive modifier stack.
  Modal hotkeys (G/R/S), proportional editing.
- **Default** — a curated "best of both" for newcomers: the kernel feature ops with friendly
  panels + the most useful Blender conveniences (mirror, array, smooth), no modal-hotkey wall.

**Profiles change tools AND behavior** — not just which buttons exist, but selection model,
hotkeys, pivots, snapping, and panel style. See the Behavior Matrix below.

---

## What we already have — DO NOT rewrite

These exist and work; new tools build on them, they are not re-implemented. (Full inventory
lives in the codebase; this is the "already covered" checklist.)

| Area | Existing | Files |
|------|----------|-------|
| 2D sketch | line, polygon, circle, arc (bezier), point, cut-edge, snap-to-grid, multi-circle | `ViewportManager.jsx` |
| Solids | **extrude**, primitives (box/sphere/cylinder/cone) | `CADGeometryService.js`, `CADOperations.jsx` |
| Booleans | union / cut / intersect (off-thread worker) | `MeshOperations.jsx`, `cad.worker.js`, `cadClient.js` |
| Mesh edit | vertex select + welded-group drag, live deform | `MeshEditor.jsx` |
| Object | select, move/rotate/scale gizmo, copy/paste, undo-redo (50-deep), visibility, feature tree | `ThreeViewer.jsx`, `documentStore.js`, `FeatureTree.jsx` |
| View/nav | front/top/right/iso, fit, zoom, the 3 nav presets + gizmo | `ThreeViewer.jsx`, `navPresets.js` |
| I/O | GLB/STL import + export, image-to-3D, marketplace upload | `App.jsx`, `ImportModelModal.jsx`, `UploadToMarketplaceModal.jsx`, `ImageTo3D.jsx` |
| AI | Torquy (NL → primitives + booleans, 2D/3D) | `App.jsx` `handleAICommand` |
| Platform | command palette (Ctrl+K), toasts/modals, perf HUD, adaptive quality, LOD/BVH, project save | `ui/`, `perf/`, `persistence.js` |
| Assembly | parts/instances **scaffolding** (store only, not rendered) | `documentStore.js`, `InstancedParts.jsx` |

> Gaps these tools fill: revolve, fillet, chamfer, shell, loft, sweep, mirror, pattern/array,
> sketch constraints/dimensions, mesh edit-mode tools (inset/bevel/loop-cut/knife/subdivide),
> modifier stack, feature history, 3D sketch. None of these exist yet.

---

## Kernel reality check (what's cheap vs expensive)

- **OpenCascade.js already supports every SolidWorks feature op** — they're just not exposed:
  - Revolve → `BRepPrimAPI_MakeRevol` · Fillet → `BRepFilletAPI_MakeFillet` ·
    Chamfer → `BRepFilletAPI_MakeChamfer` · Shell → `BRepOffsetAPI_MakeThickSolid` ·
    Loft → `BRepOffsetAPI_ThruSections` · Sweep → `BRepOffsetAPI_MakePipe(Shell)` ·
    Mirror/Pattern → `gp_Trsf` + `BRepBuilderAPI_Transform` · Draft → `BRepOffsetAPI_DraftAngle`.
  - ⇒ SolidWorks-style ops are **mostly UI + a worker method each**, low kernel risk. This is
    the cheapest, highest-leverage win and benefits all profiles.
- **Blender-style mesh tools are the expensive part.** They operate on editable poly meshes and
  need a **half-edge / winged-edge structure** the app doesn't have yet. OCC meshes come out
  *triangulated and unwelded*, which is wrong for loop cuts / bevels. Options: build a light
  half-edge layer over `BufferGeometry`, or pull in a mesh lib. Boolean-on-mesh can reuse
  `three-bvh-csg`; subdivision via three's `SubdivisionModifier` (examples).
- **Constraint solver (SW sketch relations/dimensions)** is its own mini-engine (2D geometric
  constraint solving). Real effort; sequence it after the kernel feature ops land.

---

## Tool catalog (by profile + backing + phase)

Legend — Backing: **K**=OCC kernel op, **M**=mesh-layer op, **S**=solver, **U**=UI/state only.
Profile: **SW**=SolidWorks, **BL**=Blender, **D**=Default, **·**=all.

| Tool | Profiles | Backing | Phase |
|------|:--------:|:------:|:----:|
| Revolve (sketch → solid of revolution) | SW, D | K | 1 |
| Fillet (edge round) | SW, D | K | 1 |
| Chamfer (edge bevel) | SW, D | K | 1 |
| Shell / hollow | SW, D | K | 1 |
| Mirror feature (about plane) | · | K | 1 |
| Linear pattern / Circular pattern (array) | SW, D | K | 2 |
| Hole / pocket (cut-extrude with depth/through) | SW, D | K | 2 |
| Loft (between profiles) | SW, D | K | 2 |
| Sweep (profile along path) | SW, D | K | 2 |
| Draft angle | SW | K | 5 |
| Sketch dimensions (driving) | SW | S | 3 |
| Sketch relations (coincident/parallel/perp/tangent/equal/horizontal/vertical) | SW | S | 3 |
| Fully-defined indicator + drag-to-solve | SW | S | 3 |
| Feature history tree (re-order / roll-back / edit) | SW, D | U | 3 |
| Spacebar View Selector + Orientation dialog | SW | U | 1 |
| Reference-triad modifier clicks (Shift/Alt rotate) | SW | U | 1 |
| Edit Mode: vert/edge/face select modes (Tab, 1/2/3) | BL, D | M | 4 |
| Extrude Region / Extrude Manifold | BL, D | M | 4 |
| Inset Faces (I) | BL, D | M | 4 |
| Bevel (Ctrl+B verts/edges) | BL, D | M | 4 |
| Loop Cut & Slide (Ctrl+R) | BL | M | 4 |
| Knife (K) | BL | M | 5 |
| Subdivide / Un-subdivide | BL, D | M | 4 |
| Merge / Dissolve / Bridge Edge Loops | BL | M | 5 |
| Proportional Editing (O) + falloff | BL | M | 5 |
| Snapping (vertex/edge/face/grid/increment) | · | M/U | 4 |
| Modifier stack (non-destructive) | BL, D | M | 6 |
| → Mirror modifier | BL, D | M | 6 |
| → Subdivision Surface | BL, D | M | 6 |
| → Solidify | BL, D | M | 6 |
| → Array modifier | BL, D | M | 6 |
| → Decimate | BL, D | M | 6 |
| Modal transforms G/R/S + axis lock (X/Y/Z) + numeric | BL | U | 4 |
| Pivot / transform-orientation options | BL, SW | U | 5 |

---

## Phased plan

Each phase is independently shippable and ends green (`bunx vite build`). Profiles default to
showing only their tools; the **Command Palette lists everything** regardless (discoverability).

### Phase 0 — Workflow Profile plumbing (foundation, no new tools)
Promote nav presets into profiles that also drive tool visibility + behavior.
- Extend `navPresets.js` (or a new `src/three/workflowProfiles.js`) with per-profile
  `tools: Set<toolId>`, `selection`, `hotkeys`, `pivot`, `snapping`, `panelStyle`.
- New `src/store/toolRegistry.js`: every tool registers `{ id, label, profiles, run, panel }`.
  Toolbar + Command Palette read from it, filtered by active profile.
- Settings already has the selector; rename "3D Navigation Style" → "Workflow Profile" and note
  it now changes tools too.
- **Verify:** switching profile changes which toolbar buttons show; palette still shows all;
  existing tools keep working under every profile.

### Phase 1 — Kernel feature ops, round 1 (biggest win, all-profile value)
Expose what the OCC kernel can already do. Each = one worker method + one panel.
- **Revolve, Fillet, Chamfer, Shell, Mirror.**
- Add worker methods in `cad.worker.js`/`cadOperations.js`; thin client calls in `cadClient.js`.
- Panels follow the existing `CADOperations.jsx` pattern (select feature/edges → params → apply).
- Fillet/chamfer need **edge selection** in the viewport (raycast to OCC edge index) — reuse the
  BVH picking already in `culling.js`; start with "all edges" / "by feature" then refine to picked.
- SolidWorks behavior add-ons: **Spacebar Orientation dialog + Ctrl+Space View Selector**, and
  **Reference-triad Shift/Alt modifier clicks** (custom onClick on the triad gizmo).
- **Verify:** sketch a profile → revolve; box → fillet an edge; shell a solid; mirror a feature.
  Result solids export to GLB/STL with transforms (reuse `placedMeshData`).

### Phase 2 — Kernel feature ops, round 2
- **Linear/Circular Pattern (array), Hole/Pocket, Loft, Sweep.**
- Pattern reuses the parts/instances store scaffolding for the result; loft/sweep need
  multi-profile / path selection UI.
- **Verify:** circular-pattern a feature N×; loft between 2 sketches; sweep a profile along a path.

### Phase 3 — SolidWorks parametric layer
- **Feature history tree** (re-orderable, roll-back, double-click to edit params) — the defining
  SW behavior. **Decided: "soft re-runnable recipe"** — each feature stores its op id + inputs and
  can be re-run/edited (edit a param → rebuild that feature + everything after it in order), WITHOUT
  a full inter-feature dependency graph. ~80% of the value at a fraction of the cost; a true
  dependency graph can come later if needed.
- **Sketch constraints + dimensions** via a 2D geometric constraint solver (driving dims,
  coincident/parallel/perp/tangent/equal/H/V, fully-defined indicator, drag-to-solve).
- **Verify:** edit an early feature's parameter → downstream rebuilds; over/under-defined sketch
  states show correctly; dimension drives geometry.

### Phase 4 — Blender Edit Mode core (mesh-editing layer)
- Build the **half-edge mesh layer** + **Edit Mode** (Tab) with vert/edge/face select modes (1/2/3).
- Tools: **Extrude Region, Inset, Bevel, Subdivide**, plus **Snapping** (vertex/edge/face/grid).
- **Modal transforms**: G/R/S with axis lock (X/Y/Z) and numeric entry — the Blender muscle memory.
- Extends the current single-vertex `MeshEditor.jsx` into full multi-element editing.
- **Verify:** Tab into a solid, select a face, extrude/inset/bevel it; G+X+`5`+Enter moves 5 on X.

### Phase 5 — Blender Edit Mode advanced + interaction polish
- **Loop Cut & Slide, Knife, Merge/Dissolve, Bridge Edge Loops, Proportional Editing** (O + falloff).
- **Pivot / transform-orientation** options (median/active/3D-cursor; global/local/normal).
- **Draft angle** (SW) lands here too (kernel op, lower priority).
- **Verify:** loop-cut a cylinder and slide; proportional-edit a vertex with smooth falloff.

### Phase 6 — Modifier stack (non-destructive)
- **Modifier stack UI** + evaluators: **Mirror, Subdivision Surface, Solidify, Array, Decimate.**
- Stack stored per object; evaluated top→bottom into the display mesh; "Apply" bakes it.
- Default profile surfaces Mirror/Subdivision/Array as friendly one-click versions.
- **Verify:** add Mirror+Subsurf to a half-model → see full smooth result live; reorder changes
  output; Apply bakes to geometry; undo works.

---

## Behavior Matrix (profiles change *interaction*, not just tools)

| Aspect | SolidWorks | Blender | Default |
|--------|-----------|---------|---------|
| Primary workflow | sketch → feature → modify | edit-mode mesh push/pull | guided feature ops |
| Tool activation | click tool → PropertyManager panel | modal hotkey (G/R/S, E, I, B…) | click tool → simple panel |
| Selection | left-click pick; orbit = MMB | left-click; box/lasso; 1/2/3 modes | left-click |
| Transform | gizmo drag + dimension entry | G/R/S + axis lock + numeric | gizmo drag |
| Pivot | model origin / selected | median / 3D cursor / active | selection center |
| View change | triad + Spacebar/Ctrl+Space selector | numpad-style + gizmo | gizmo |
| Snapping | inferencing (geometry relations) | vertex/edge/face/grid/increment | grid |
| History | full parametric feature tree | destructive + modifier stack | light history (undo + modifiers) |
| Panels | PropertyManager (left, verbose) | redo-last / N-panel (right) | compact inline |

Implementation: the active profile selects a **keymap** (`src/input/keymap.js`, planned in the
re-arch Phase 5), a **selection strategy**, and a **panel renderer**. Tools query the profile
for these rather than hardcoding.

---

## Architecture notes
- **Tool registry** (`toolRegistry.js`): single source; toolbar + palette + keymap all read it,
  filtered by `activeProfile`. A tool declares which profiles show it and how it's invoked.
- **Worker for anything heavy** (kernel ops, mesh ops, modifier eval) via the existing
  `cadClient` → `cad.worker.js` Comlink bridge; never block the main thread.
- **Re-evaluation graph** (Phase 3) is the parametric backbone; design features to store inputs
  + op id so SW history and BL modifier stack can both re-run them.
- **Selection upgrade**: extend BVH picking (`culling.js`) to return OCC edge/face ids (for
  fillet/chamfer) and mesh element ids (for Edit Mode).
- **Don't bump root three/R3F** (marketplace shares it); mesh-layer libs pinned in CAD only.

## Sequencing rationale
Phase 1–2 first: highest value, lowest risk (kernel already capable), benefits every profile, and
makes "SolidWorks mode" real fast. Phase 3 (history + constraints) is the hard parametric core.
Phase 4–6 (Blender mesh layer + modifiers) is the largest net-new subsystem, so it lands after the
cheap kernel wins. Interaction/behavior differences ride along with their owning phase.

## Decisions made
- **Feature history (Phase 3): soft re-runnable recipe** — op id + inputs per feature, rebuild that
  feature + downstream in order; no full dependency graph (cheaper first step). [resolved]

## Open questions
1. Should **Default** lean SolidWorks-ish (feature-first) or Blender-ish (mesh-first)? Affects
   what newcomers see first.
2. Mesh-editing layer: build a minimal half-edge ourselves vs adopt a library — affects Phase 4 size.
3. Do tools stay **hidden** in non-matching profiles, or shown-but-dimmed (discoverable)? Palette
   always lists all either way.

## References
- SolidWorks features/sketch/CommandManager: [GoEngineer — What's New 2024](https://www.goengineer.com/blog/whats-new-solidworks-2024-sketches-features-multi-body-parts-and-more), [Javelin — 2024 Features & Part Modeling](https://www.javelin-tech.com/blog/2024/02/solidworks-2024-features-and-part-modeling/), [Reference Triad](https://www.javelin-tech.com/blog/2017/06/solidworks-reference-triad-change-view-orientation/), [View Selector](https://help.solidworks.com/2019/english/SolidWorks/sldworks/c_view_selector.htm)
- Blender modeling/mesh/modifiers: [Mesh Editing](https://docs.blender.org/manual/en/latest/modeling/meshes/editing/index.html), [Object Modifiers](https://docs.blender.org/manual/en/latest/modeling/modifiers/index.html), [Transform basics](https://docs.blender.org/manual/en/latest/modeling/meshes/editing/mesh/transform/basic.html)
