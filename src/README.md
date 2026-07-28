# Dartsisas-Attitude3d-Panel

Panel for rendering 3D objects

## Panel Setting

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
  * Interpolation
    * See [Quaternion Interpolation](#quaternion-interpolation) below

  Position X/Y/Z and Quaternion X/Y/Z/W each have their own source:
  * Const: Use a constant value
  * Field: Use the value from a query field. The field can be specified either as `Series.Field`
    (e.g. `A.q_x`) or as a bare field name (e.g. `q_x`). If more than one query returns a field
    with the same name, use the `Series.Field` form to disambiguate which query's field is used

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

## Quaternion Interpolation

This is configured per object, under the object's own Interpolation settings in Objects.

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
* Max Extrapolation [ms]
  * Stop extrapolating once the target time exceeds the newest sample by this much. 0 disables
    extrapolation (interpolation only). Default: 5000

## Migration

Dashboards created with the previous, single-model version of this panel are migrated
automatically the first time the panel is opened. The old `Model URL` / `Center` / Quaternion
X..W / Quaternion Interpolation settings are converted into a single object named `Model 1`.
Its position is set to (0, 0, 0) and the Camera Target is set to `Origin`, so the panel looks
exactly the same as before.
