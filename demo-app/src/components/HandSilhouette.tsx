import React, { useRef } from 'react';
import { useGestureRecognition } from '../hooks/useGestureRecognition';
import type { GestureResult } from '../hooks/useGestureRecognition';

interface HandSilhouetteProps {
  video: HTMLVideoElement | null;
  onGestureDetected: (gesture: GestureResult) => void;
}

const HandSilhouette: React.FC<HandSilhouetteProps> = ({ video, onGestureDetected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isInitialized, error } = useGestureRecognition({
    onGestureDetected,
    video,
    canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>
  });

  return (
    <div className="hand-silhouette" style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '200px',
      height: '150px',
      pointerEvents: 'none',
      zIndex: 20
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          transform: 'scaleX(-1)', // Mirror to match video
          borderRadius: '8px'
        }}
      />
      
      {!isInitialized && !error && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          left: '4px',
          right: '4px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: '#fff',
          fontSize: '8px',
          padding: '2px 4px',
          borderRadius: '2px',
          textAlign: 'center'
        }}>
          Initializing hand tracking...
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          left: '4px',
          right: '4px',
          backgroundColor: 'rgba(255,0,0,0.8)',
          color: '#fff',
          fontSize: '8px',
          padding: '2px 4px',
          borderRadius: '2px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default HandSilhouette;