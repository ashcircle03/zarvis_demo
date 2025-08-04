import React, { useRef, useEffect } from 'react';
import { useDualHandGesture, type DualHandGestureResult } from '../hooks/useDualHandGesture';

interface DualHandTrackerProps {
  video: HTMLVideoElement;
  onGestureDetected: (gesture: DualHandGestureResult) => void;
  checkItemAtPosition?: (x: number, y: number) => boolean;
  checkClipboardItemAtPosition?: (x: number, y: number) => boolean;
}

const DualHandTracker: React.FC<DualHandTrackerProps> = ({
  video,
  onGestureDetected,
  checkItemAtPosition,
  checkClipboardItemAtPosition
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { isInitialized, error } = useDualHandGesture({
    video,
    canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
    onGestureDetected,
    checkItemAtPosition,
    checkClipboardItemAtPosition
  });

  // 캔버스 스타일 설정
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '2';
    }
  }, []);

  if (error) {
    return (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(255, 0, 0, 0.8)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 10
      }}>
        Dual Hand Gesture Error: {error}
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 10
      }}>
        Initializing Dual Hand Recognition...
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 2
      }}
    />
  );
};

export default DualHandTracker;