import React, { useEffect, useRef } from 'react';

const CameraView = ({ onVideoReady }) => { // Accept a callback
  const videoRef = useRef(null);

  useEffect(() => {
    const getCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // When the video metadata is loaded, call the callback
          videoRef.current.onloadedmetadata = () => {
            onVideoReady(videoRef.current);
          };
        }
      } catch (err) {
        console.error("Error accessing the camera: ", err);
      }
    };

    getCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [onVideoReady]);

  return (
    <div className="camera-view">
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
    </div>
  );
};

export default CameraView;
