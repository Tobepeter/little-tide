# Three.js water

The water implementation and original normal-map asset are from Three.js r180:

- `Water.js`: https://github.com/mrdoob/three.js/blob/r180/examples/jsm/objects/Water.js
- `../textures/waternormals.jpg`: https://github.com/mrdoob/three.js/blob/r180/examples/textures/waternormals.jpg
- License: `THREE-LICENSE.txt` (MIT).

Local changes to `Water.js`: resolve its Three.js import to the vendored module;
expose `getRenderTarget()` for resizing and `dispose()` for resource cleanup.

The adapter in `../water.js` keeps the upstream four-layer normal-map animation
and planar-reflection implementation. It adjusts wave slope, Fresnel reflectance,
water color, sun-highlight filtering and reflection sampling for Little Tide.
The calm cartoon preset uses larger, shallower and slower ripples; a positive
normal-map mip bias filters fine wrinkles without adding texture samples. The
reflected image is lightly tinted and its contribution capped at grazing angles.
Soft color glints reuse the filtered normals to make the gentle flow readable
from the default camera, without extra samples, geometry or render passes.
The normal map is the unmodified 1024×1024 upstream image and is served locally.
