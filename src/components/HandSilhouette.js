import React from 'react';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';

const HandSilhouette = ({ detectionResult }) => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions to match the window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear the canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detectionResult && detectionResult.landmarks) {
      // Draw landmarks and connectors for each detected hand
      for (const landmarks of detectionResult.landmarks) {
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 5,
        });
        drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 2 });
      }
    }
  }, [detectionResult]); // Redraw whenever detectionResult changes

  return <canvas ref={canvasRef} className="hand-silhouette" />;
};

export default HandSilhouette;
