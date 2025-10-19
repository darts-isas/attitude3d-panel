# Dartsisas-Attitude3d-Panel

Panel for rendering 3D objects

## Panel Setting

### Model

* Data
  * glb, gltf or obj file for the model
  * You can use variables in this field
  * Note: The server providing the kernel must respond to the Preflight Request.
* Quaternion Input
  * Constant: Use constant parameters
  * Field: Use parameters from the field
* Quaternion X,Y,Z,W
  * Quaternion for the model
* Center
  * Origin: Use the origin of the model
  * Sphere: Use the center of the bounding sphere
  * Average: Use the average of vertices
* Helper
  * Show the helper

### Camera

* Direction Input
  * Constant: Use constant parameters
  * Field: Use parameters from the field
* Direction X,Y,Z
  * Direction of the camera
* Distance
  * Distance from the model
  * This is the relative distance, with the distance from the center to the farthest vertex set to 1
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

### Background

* Color
  * Color of the background
* Transparent
  * Transparent background