import React, { forwardRef } from 'react';

// Use forwardRef to pass the ref to the underlying canvas element
// This component no longer has its own logic; it's just a styled canvas.
const HandSilhouette = forwardRef((props, ref) => (
  <canvas ref={ref} className="hand-silhouette" />
));

export default HandSilhouette;