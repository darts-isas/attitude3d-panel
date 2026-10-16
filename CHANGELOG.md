# Changelog

## 1.0.0 (Unreleased)

Initial release.

### Added
- `Brightness` option per model, settable as a fixed value or bound to a data source field (clamped to 0-1). Darkens the model's color under the same lighting without affecting opacity/transparency.
- `Vectors`: draw any number of arrows in world coordinates, each with its own Start/End point, Magnitude (drawn length), Truncate (fraction, 0.0-1.0, of Magnitude cut off from the start side), Thickness, and Color, with Const/Field binding on every numeric setting.
- Scene Controls overlay: a small icon-button stack in the corner of the panel to reset the camera, and to show/hide all models or all vectors for the current session (not persisted to the dashboard).
