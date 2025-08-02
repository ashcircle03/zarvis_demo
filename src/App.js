import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import FileExplorer from './components/FileExplorer';
import FileView from './components/FileView';
import Clipboard from './components/Clipboard';
import CameraView from './components/CameraView';
import HandSilhouette from './components/HandSilhouette';
import { useGestureRecognition } from './hooks/useGestureRecognition';

// Mock data
const mockFileTree = {
  id: 'root', name: '/', type: 'folder',
  children: [
    { id: '1', name: 'Medical Records', type: 'folder', children: [
        { id: '2', name: 'patient_x_ray.jpg', type: 'file' },
        { id: '3', name: 'patient_y_mri.jpg', type: 'file' },
    ]},
    { id: '4', name: 'Semiconductor Blueprints', type: 'folder', children: [
        { id: '5', name: 'chip_design_v1.pdf', type: 'file' },
        { id: '6', name: 'chip_design_v2.pdf', type: 'file' },
    ]},
    { id: '7', name: 'system_log.txt', type: 'file' },
  ],
};

function App() {
  const [currentDirectory, setCurrentDirectory] = useState(mockFileTree);
  const [clipboardItems, setClipboardItems] = useState([]);
  const canvasRef = useRef(null);
  const { gestureRecognizer, lastGesture, predictWebcam } = useGestureRecognition(canvasRef);

  const handleVideoReady = useCallback((videoElement) => {
    if (gestureRecognizer && canvasRef.current) {
      // Set canvas dimensions once
      canvasRef.current.width = videoElement.videoWidth;
      canvasRef.current.height = videoElement.videoHeight;
      // Start the prediction loop
      predictWebcam(videoElement);
    }
  }, [gestureRecognizer, predictWebcam]);

  // Effect to react to specific gestures
  useEffect(() => {
    if (lastGesture) {
      console.log(`New gesture detected: ${lastGesture}`);
      if (lastGesture === 'Closed_Fist') {
        console.log('Fist action triggered!');
        // TODO: Implement action for fist gesture
      }
      // Reset gesture after processing if needed, or handle state changes
    }
  }, [lastGesture]);

  return (
    <div className="app-container">
      <FileExplorer files={mockFileTree} />
      <FileView currentDirectory={currentDirectory} />
      <Clipboard clipboardItems={clipboardItems} />
      <CameraView onVideoReady={handleVideoReady} />
      {/* Pass the ref to the HandSilhouette component */}
      <HandSilhouette ref={canvasRef} />
    </div>
  );
}

export default App;