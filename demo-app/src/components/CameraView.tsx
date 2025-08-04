import React, { useRef, useEffect, useState } from 'react';

interface CameraViewProps {
  onVideoReady: (video: HTMLVideoElement) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onVideoReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play();
              onVideoReady(videoRef.current);
              setIsLoading(false);
            }
          };
        }
      } catch (err) {
        console.error('Camera access failed:', err);
        setError('Camera access denied or not available');
        setIsLoading(false);
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [onVideoReady]);

  return (
    <div className="camera-view" style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '200px',
      height: '150px',
      backgroundColor: '#000',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '2px solid #ddd',
      zIndex: 20
    }}>
      {isLoading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#fff',
          fontSize: '12px'
        }}>
          Loading camera...
        </div>
      )}
      
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#fff',
          fontSize: '10px',
          textAlign: 'center',
          padding: '8px'
        }}>
          {error}
        </div>
      )}
      
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)', // Mirror the video
          display: isLoading || error ? 'none' : 'block'
        }}
        playsInline
        muted
      />
      
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: '4px',
        right: '4px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '10px',
        padding: '2px 4px',
        borderRadius: '2px',
        textAlign: 'center'
      }}>
        Live Camera Feed
      </div>
    </div>
  );
};

export default CameraView;