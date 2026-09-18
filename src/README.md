# Dartsisas-Attitude3d-Panel

Panel for rendering 3D objects

## Panel Setting

### Camera

* Target
  * The object the camera looks at: `Origin (0, 0, 0)` or one of the models added under Objects
  * The camera distance scales with the target's bounding-sphere radius, and the look-at point
    follows the target as it moves
* Direction Input
  * Constant: Use constant parameters
  * Field: Use parameters from the field
* Direction X,Y,Z
  * Direction of the camera
* Distance
  * Distance from the target
  * This is the relative distance, with the radius of the target's bounding sphere set to 1
* Mouse Control
  * Enable mouse control

### Directional Light

* Direction Input
  * Constant: Use constant parameters
  * Field: Use parameters from the field
* Direction X,Y,Z
  * Direction of the light
* Color
  * Color of the light
* Intensity
  * Intensity of the light

### Ambient Light

* Color
  * Color of the light
* Intensity
  * Intensity of the light

### Scene

* Helper
  * Show the helper
* Background Color
  * Color of the background

### Scene Controls (overlay)

A small stack of icon buttons is always shown in the top-right corner of the panel:

* Camera / Reset
  * Reset the camera to its default position
* Models / Show-Hide
  * Show or hide every model at once, without changing any individual model's own visibility
* Vectors / Show-Hide
  * Show or hide every vector at once, without changing any individual vector's own visibility

These toggles are only for the current browser session and are not saved with the dashboard.

### Objects

* Add Model
  * Add a new 3D model to the scene. Each added model gets its own set of settings below (master/detail: pick a model on the left to edit its settings on the right)
  * Name
    * Display name for the model, shown in the object list and used as a Camera Target option
  * Model URL
    * glb, gltf or obj file for the model
    * You can use variables in this field
    * Note: The server providing the model must respond to the Preflight Request
  * Center
    * Origin: Use the origin of the model
    * Sphere: Use the center of the bounding sphere
    * Average: Use the average of vertices
  * Scale
    * Scale factor applied to the model
  * Position X, Y, Z
    * Position of the model
  * Quaternion X, Y, Z, W
    * Quaternion for the model
  * Attitude Interpolation
    * See [Quaternion Interpolation](#quaternion-interpolation) below

  Position X/Y/Z and Quaternion X/Y/Z/W each have their own source:
  * Const: Use a constant value
  * Field: Use the value from a query field. The field can be specified either as `Series.Field`
    (e.g. `A.q_x`) or as a bare field name (e.g. `q_x`). If more than one query returns a field
    with the same name, use the `Series.Field` form to disambiguate which query's field is used

### Vectors

* Add Vector
  * Add a new vector (arrow) to the scene, drawn in world coordinates. Each vector gets its own
    settings below (master/detail: pick a vector on the left to edit its settings on the right)
  * Name
    * Display name for the vector, shown in the vector list
  * Color
    * Color of the arrow. Vectors are drawn unlit, so light settings don't change their color;
      any alpha channel in the color is ignored
  * Thickness
    * Shaft radius in world units. The arrow head is sized automatically from this
  * Start X, Y, Z
    * Start point of the vector, in world coordinates. Default: (0, 0, 0)
  * End X, Y, Z
    * End point of the vector, in world coordinates. Default: (1, 1, 1). Only the direction from
      Start to End is used — the drawn length always comes from Magnitude
  * Magnitude
    * Drawn length of the arrow along the Start-to-End direction, in world units. Default: 1.
      A value of 0 or less draws nothing
  * Truncate
    * Fraction (0.0-1.0) of Magnitude cut off from the start side. Default: 0 (draws the full
      length). Example: Start (0, 0, 0), End (0, 0, 1), Magnitude 100, Truncate 0.8 draws only
      the segment from 80 to 100. A value at or beyond 1.0 draws nothing

  Vectors are always positioned in world coordinates — they can't be attached to a model, and
  can't be selected as a Camera Target.

  Start X/Y/Z, End X/Y/Z, Magnitude, and Truncate each have their own source (Const/Field), the
  same as Position/Quaternion above.

## Quaternion Interpolation

This is configured per object, under the object's own Attitude Interpolation settings in Objects.

* Enable
  * Retain timestamped quaternions across refreshes and spherically interpolate to the end of
    the display range (typically this is extrapolation). Default: off
  * Only takes effect when Quaternion X, Y, Z and W are all set to Field; if any of them is a
    Const, there is nothing to sample and interpolation is disabled
  * When the display range is relative (e.g. `now-5m` to `now`), the extrapolation target
    advances every frame by the time elapsed since the data arrived, so the model keeps moving
    smoothly between refreshes
* Time Field
  * Time field used for the retained quaternion samples. Leave empty to auto-detect the time
    field of the target frame
* Retained Samples
  * Number of timestamped quaternions retained across refreshes. 2 = constant angular velocity
    extrapolation. Default: 2
* Catch-up Blend [ms]
  * A new sample shifts the extrapolation basis to a new pair of points, which can disagree with
    what was on screen if the attitude's rate of change shifted mid-extrapolation. Instead of
    snapping onto the corrected orientation, it's blended in over this many ms. 0 disables
    blending (snap immediately). Default: 300

### How it works

On each refresh, the panel finds the frame carrying all four quaternion fields, takes its last
`Retained Samples` rows, pairs each with the time value, normalizes the quaternions and keeps
them sorted by time. Nothing older is retained, so memory use is fixed.

On each animation frame:

1. The target time is the end of the display range (`${__to}`). For a relative range (one
   starting with `now`), it also advances by the wall-clock time elapsed since the data
   arrived, so it keeps tracking "now" between refreshes
2. If the target is at or past the newest sample (the usual case) the last two samples are used;
   otherwise the pair bracketing the target is used. There is no cap on how far past the newest
   sample the target can go: a stalled data source keeps extrapolating at the last known rate
   indefinitely rather than freezing
3. With `u = (target - a.t) / (b.t - a.t)`, the result is `slerp(a, b, u)`. three.js implements
   slerp with the great-circle formula, so `u > 1` continues along the same great circle at the
   same angular velocity and stays a unit quaternion
4. Whenever a new sample changes which pair of points backs the extrapolation, the *previous*
   pair is frozen and both trajectories keep being evaluated: the frozen (old) pair extrapolated
   forward, and the new pair's corrected value. The displayed orientation is
   `slerp(old, new, ratio)`, with `ratio` easing 0 → 1 (smoothstep) over `Catch-up Blend [ms]`, so
   it matches the old trajectory exactly at the start of the blend and the corrected one exactly
   at the end — no snap, and no dependence on frame rate

With the default `Retained Samples` of 2 this is exactly constant-angular-velocity extrapolation
from the two newest attitudes. A buffer with a single sample applies that attitude as-is, and a
pair less than 1 ms apart applies the newer one instead of dividing by a near-zero interval.

## Migration

Dashboards created with the previous, single-model version of this panel are migrated
automatically the first time the panel is opened. The old `Model URL` / `Center` / Quaternion
X..W / Quaternion Interpolation settings are converted into a single object named `Model 1`.
Its position is set to (0, 0, 0) and the Camera Target is set to `Origin`, so the panel looks
exactly the same as before.
