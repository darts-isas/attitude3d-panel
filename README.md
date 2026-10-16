# Attitude 3D Panel for Grafana

A panel plugin for displaying 3D model data using WebGL.

Render WebGL-based 3D models directly inside Grafana dashboards. The panel is ideal for monitoring spacecraft attitude, robot pose, or any sensor-driven 3D visualization.

![Example of 3D model display result of spacecraft](screenshots/display.png)

## Highlights

- Place **any number of 3D models** in one scene, each with its own asset, position, and orientation.
- Load GLB, GLTF, or OBJ assets and bind position and quaternion to live telemetry, per model.
- Point the camera at the origin or at **any model**, and let the look-at point follow it as it moves.
- Keep models moving smoothly between refreshes with per-model **quaternion interpolation / extrapolation**.
- Combine directional and ambient lighting to match the conditions your model represents.
- Align each model's pivot, and toggle helper axes and background to keep orientation easy to understand.
- Draw **any number of vectors (arrows)** in world coordinates, each with its own start point, direction, length, and truncation.
- Overlay a **key parameters** text readout on top of the 3D view, showing any number of data field values in a fixed-size box.
- Toggle camera reset, all-models visibility, and all-vectors visibility from a small icon overlay, always available in the corner of the view.

Dashboards built with the earlier single-model version are **migrated automatically** — see [Migration](#migration).

## Installation

1. Install dependencies with `pnpm install` (see `package.json`).
2. Build the plugin bundle via `pnpm build`.
3. Copy or symlink the plugin folder into your Grafana plugin directory (for development use `grafana-server`'s `plugins` path).
4. Restart Grafana and enable the unsigned plugin from the configuration page if required.

## Usage Workflow

- **Add a model**: Press *Add Model* under **Objects**. Each model gets its own settings; pick one in the list on the left to edit it on the right.
- **Provide a model asset**: Host your `.glb`, `.gltf`, or `.obj` file where Grafana can reach it. The URL can include Grafana template variables.
- **Bind position and quaternion data**: Each of Position X/Y/Z and Quaternion X/Y/Z/W is independently either a *Const* or a *Field*.
- **Center the model**: Switch between origin, bounding sphere, or average vertex center depending on your asset's coordinate system.
- **Calibrate the camera**: Choose the target to look at, then set the direction vector and the relative distance (the target's bounding-sphere radius equals 1).
- **Smooth out the motion**: Enable per-model interpolation to keep the attitude advancing between dashboard refreshes.
- **Shape the lighting**: Adjust directional light vectors, colors, and intensity, then blend in ambient light for shadow fill.
- **Expose helpers and controls**: Toggle helper axes during debugging and enable mouse control for interactive reviews.
- **Add a vector**: Press *Add Vector* under **Vectors** to draw an arrow in world coordinates, from a start point toward a direction, with its own length.
- **Show key parameters**: Press *Add Key Parameter* under **Key Parameters** to overlay data field values on top of the model.

## Panel Options

### Camera

<img src="screenshots/menu2.png" alt="Camera tab highlighting the target selector, direction, distance, and mouse control toggles" width="250" />
*Panel view — pick what the camera looks at, point it via constants or fields, and enable mouse-driven orbital controls.*

- **Target**: The object the camera looks at — `Origin (0, 0, 0)` or one of the models added under Objects. The camera distance scales with the target's bounding-sphere radius, and the look-at point follows the target as it moves. With `Origin`, the distance is based on a sphere enclosing every visible model.
- **Direction Input**: Provide constants or bind to fields for the camera direction vector.
- **Direction X / Y / Z**: Components of the camera direction.
- **Distance**: Relative distance from the target (1 equals the target's bounding-sphere radius).
- **Mouse Control**: Enable orbit-style camera control for exploratory inspection.

### Directional Light

<img src="screenshots/menu3.png" alt="Directional Light, Ambient Light, and Scene sections of the options pane" width="250" />
*Panel view — balance directional and ambient light to keep the model legible, then set the helper axes and background under Scene.*

- **Direction Input**: Choose constants or data-bound vectors for light direction.
- **Direction X / Y / Z**: Components of the directional light vector.
- **Color & Intensity**: Tune light temperature and brightness.

### Ambient Light

- **Color & Intensity**: Adjust global ambient illumination.

### Scene

- **Helper**: Toggle helper axes to debug the world coordinate frame.
- **Background Color**: Pick a solid background or set to transparent for overlay views.

### Scene Controls (Overlay)

A small stack of icon buttons is always shown in the top-right corner of the 3D view (above the Key Parameters overlay, if that is also anchored there):

- **Camera / Reset**: Reset the camera to its default position — the same effect as the Camera settings above.
- **Models / Show-Hide**: Show or hide every model at once, without changing any individual model's own *visible* setting in the Objects list.
- **Vectors / Show-Hide**: Show or hide every vector at once, without changing any individual vector's own *visible* setting in the Vectors list.

These toggles only affect the current browser session — they are not saved with the dashboard, so every viewer sees everything the panel's own options say should be visible when they first open it.

### Objects

<img src="screenshots/menu1.png" alt="Objects tab with the model list and the selected model's settings" width="250" />
*Panel view — add models to the scene, then bind each one's asset, position, and quaternion.*

- **Add Model**: Add a new 3D model to the scene. The list below shows every model; select one to edit it, use the eye icon to hide it, the arrows to reorder, and the trash icon to remove it.

Each model has the following settings:

- **Name**: Display name, shown in the object list and used as a *Camera → Target* option.
- **Model URL**: URL or template-variable path to a GLB, GLTF, or OBJ asset. The hosting server must respond to CORS preflight requests.
- **Center**: Realign the asset using its *Origin*, its bounding *Sphere* center, or the *Average* of its vertices.
- **Scale**: Scale factor applied to the model.
- **Brightness**: How dark the model appears under the same lighting, from `0` (black) to `1` (unchanged). Default: `1`. This darkens the model's own color — it does not change opacity/transparency, so the model stays fully solid and still correctly occludes other objects.
- **Position X / Y / Z**: Position of the model in world coordinates.
- **Quaternion X / Y / Z / W**: Orientation applied to the model.
- **Interpolation**: See [Quaternion Interpolation](#quaternion-interpolation).

Position X/Y/Z, Quaternion X/Y/Z/W, and Brightness each choose their own source:

- **Const**: A fixed numeric value.
- **Field**: A value read from a query field, taking the latest row. The field can be given either as `Series.Field` (for example `A.q_x`) or as a bare field name (`q_x`). When more than one query returns a field of the same name, use the `Series.Field` form to disambiguate. For Brightness, values above `1` saturate to `1` and values below `0` saturate to `0`; brightness is applied on top of the model's own authored materials (only its color darkens), so a model that is already partially transparent in its source file keeps that translucency unchanged.

### Vectors

Add vectors (arrows) to the scene, then bind each one's start point, end point, and length.

- **Add Vector**: Add a new vector (arrow) to the scene. The list below shows every vector; select one to edit it, use the eye icon to hide it, the arrows to reorder, and the trash icon to remove it.

Each vector has the following settings:

- **Name**: Display name, shown in the vector list.
- **Color**: Color of the arrow. Vectors are drawn unlit, so Directional/Ambient Light settings do not change their color; any alpha channel in the color is ignored.
- **Thickness**: Shaft radius, in world units. The arrow head is sized automatically from this.
- **Start X / Y / Z**: Start point of the vector, in world coordinates. Default: `(0, 0, 0)`.
- **End X / Y / Z**: End point of the vector, in world coordinates. Default: `(1, 1, 1)`. Only the *direction* from Start to End is used — the drawn length always comes from Magnitude, not the distance between Start and End.
- **Magnitude**: Drawn length of the arrow, along the Start-to-End direction, in world units. Default: `1`. A value of `0` or less draws nothing.
- **Truncate**: Fraction of Magnitude, from `0.0` to `1.0`, cut off from the start side. Default: `0` (draws the full length). For example, with Start `(0, 0, 0)`, End `(0, 0, 1)`, Magnitude `100`, and Truncate `0.8`, only the segment from `80` to `100` is drawn — a simple way to show just the outer part of a long vector. A Truncate at or beyond `1.0` draws nothing.

Vectors are always positioned in world coordinates: they cannot be attached to a model, and cannot be selected as a Camera → Target.

Start X/Y/Z, End X/Y/Z, Magnitude, and Truncate each choose their own source:

- **Const**: A fixed numeric value.
- **Field**: A value read from a query field, taking the latest row, given either as `Series.Field` or as a bare field name — the same rules as the other Const/Field settings in this panel.

### Key Parameters

Overlays a fixed-format text list of data field values on top of the 3D view. The box's size depends only on the item count, names, and *Value Width* — never on the values themselves, so it never resizes as data changes.

- **Font Size**: Font size of the overlay text, in pixels.
- **Vertical Position** / **Horizontal Position**: Which edge and side the overlay is anchored to — `Top`/`Bottom` and `Left`/`Right`, combining into one of the four corners. Default: `Top` / `Left`.
- **Separator**: Text placed between each parameter's name and value — `:`, `=`, or a plain space.
- **Value Width**: Fixed width of the value column, in characters. Values shorter than this are right-padded with spaces; longer ones are truncated from the right, so the column width never changes.
- **Text Color**: Color of the overlay text.
- **Background**: Show a background behind the overlay text. Default: on, neutral gray at `0.25` opacity.
- **Background Color** / **Background Opacity**: Color and opacity (`0`-`1`) of the background, shown when *Background* is on.
- **Shape**: Corner style of the background/border — `Rectangle` or `Rounded`.
- **Border**: Show a border around the overlay. Default: on.
- **Border Color**: Color of the border, shown when *Border* is on.
- **Add Key Parameter**: Add a new value to the overlay. The list below shows every parameter; select one to edit it, use the eye icon to hide it, the arrows to reorder, and the trash icon to remove it.

Each key parameter has the following settings:

- **Name**: Display name, shown in the name column.
- **Data Field**: The field whose latest value is displayed, given either as `Series.Field` (for example `A.mode`) or as a bare field name (`mode`). Unlike Position/Quaternion/Brightness fields, this accepts fields of any type (numeric, string, time, boolean, ...), not just numeric ones.
- **Format**: A single `printf`-style specifier plus any literal text, applied to the field's latest value — for example `%.2f`, `%.2f deg`, `%s`, `%d`, or `%+.1e`. Only the first specifier in the string is substituted with the value; anything else is shown as-is. When the field can't be resolved, `-` is shown instead of a value.

## Quaternion Interpolation

Configured **per model**, under that model's *Attitude Interpolation* settings in **Objects**.

<img src="screenshots/menu4.png" alt="Attitude Interpolation section with Enable, Time Field, Retained Samples, and Catch-up Blend" width="250" />
*Panel view — enable interpolation to keep a model turning between dashboard refreshes.*

Grafana delivers data in discrete refreshes, so an attitude bound directly to a field only moves when new data arrives. With interpolation enabled, the panel retains a small number of timestamped quaternions across refreshes and spherically interpolates — in the usual case, *extrapolates* — to the end of the display range, so the model keeps turning smoothly between refreshes.

- **Enable**: Turn the behaviour on. Default: off.
  - Only takes effect when Quaternion X, Y, Z, and W are **all** set to *Field*. If any of them is a *Const*, there is nothing to sample and interpolation stays off.
  - When the display range is relative (for example `now-5m` to `now`), the extrapolation target advances every frame by the time elapsed since the data arrived.
- **Time Field**: Time field used for the retained quaternion samples. Leave empty to auto-detect the time field of the target frame.
- **Retained Samples**: Number of timestamped quaternions retained across refreshes. `2` gives constant angular-velocity extrapolation. Default: `2`.
- **Catch-up Blend [ms]**: When a new sample shifts which pair of points backs the extrapolation, blend into the corrected orientation over this many ms instead of snapping onto it. `0` disables blending. Default: `300`.

### How it works

**On each refresh**, the panel finds the frame that carries all four quaternion fields, takes its last *Retained Samples* rows, pairs each with the corresponding time value, normalizes the quaternions, and keeps them sorted by time. Nothing older is retained, so the memory cost is fixed regardless of how long the dashboard stays open.

**On each animation frame**, the panel picks a target time and samples the retained buffer at it:

1. **Target time.** The end of the display range (`${__to}`). If the range is relative — anything starting with `now` — the target additionally advances by the wall-clock time elapsed since the data arrived, so it keeps tracking "now" between refreshes rather than freezing at the last refresh instant.
2. **Pick a pair.** If the target is at or past the newest sample — the usual case — the last two samples are used. Otherwise the bracketing pair around the target is used, which makes the motion inside the retained window a piecewise slerp. There is no cap on how far past the newest sample the target can go: a stalled data source keeps extrapolating at the last known rate indefinitely rather than freezing.
3. **Slerp.** With `u = (target - a.t) / (b.t - a.t)`, the result is `slerp(a, b, u)`. Three.js implements slerp with the great-circle formula, so `u > 1` continues along the same great circle at the same angular velocity and the result stays a unit quaternion — no renormalization drift, no gimbal artifacts.
4. **Catch-up blend.** Whenever a new sample changes the pair of points backing the extrapolation, the *previous* pair is frozen and kept extrapolating in parallel with the newly corrected trajectory. The displayed orientation is `slerp(old, new, ratio)`, with `ratio` easing 0 → 1 (smoothstep) over *Catch-up Blend [ms]* — matching the old trajectory exactly at the start of the blend and the corrected one exactly at the end, so a mid-flight rate change doesn't look like a jump-cut.

With the default *Retained Samples* of `2`, this is exactly constant-angular-velocity extrapolation from the two newest attitudes. Raising it does not smooth the extrapolation any further — the leading pair still drives it — but it does let the panel interpolate correctly if the target time falls back inside the retained window.

Two degenerate cases are handled without special configuration: a buffer holding a single sample simply applies that attitude, and a pair less than 1 ms apart applies the newer one rather than dividing by a near-zero interval.

## Migration

Dashboards created with the previous, single-model version of this panel are migrated automatically the first time the panel is opened. The old `Model URL` / `Center` / Quaternion X..W / Quaternion Interpolation settings are converted into a single object named `Model 1`, its position is set to (0, 0, 0), and the Camera Target is set to `Origin` — so the panel looks exactly the same as before. Camera, lighting, and background settings are carried over untouched.

## Development

- Run `pnpm dev` to watch for code changes during plugin development.
- Execute `pnpm test` for unit tests and `pnpm playwright test` for UI regression coverage.
- Follow Grafana plugin signing guidelines before distributing binaries.

## Localization

A Japanese translation of this README is available in `README_ja.md`.

## License
Licensed under the GNU Lesser General Public License v3.0.

© 2025 ISAS/JAXA and [NAKAHIRA, Satoshi](https://orcid.org/0000-0001-9307-046X).

## Acknowledgement

This software was developed with the cooperation of [AstroArts Inc.](https://www.astroarts.co.jp/)
