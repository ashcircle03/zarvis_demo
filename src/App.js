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
  const { gestureRecognizer, detectionResult, predictWebcam } = useGestureRecognition();
  const lastVideoTimeRef = useRef(-1);

  const handleVideoReady = useCallback((videoElement) => {
    if (gestureRecognizer) {
      predictWebcam(videoElement, lastVideoTimeRef);
    }
  }, [gestureRecognizer, predictWebcam]);

  // Effect to detect specific gestures
  useEffect(() => {
    if (detectionResult && detectionResult.gestures && detectionResult.gestures.length > 0) {
      const topGesture = detectionResult.gestures[0][0]; // Get the top gesture
      if (topGesture.categoryName === 'Closed_Fist') {
        console.log('Fist detected! Action triggered.');
        // TODO: Implement action for fist gesture (e.g., select item)
      }
    }
  }, [detectionResult]);

  return (
    <div className="app-container">
      <FileExplorer files={mockFileTree} />
      <FileView currentDirectory={currentDirectory} />
      <Clipboard clipboardItems={clipboardItems} />
      <CameraView onVideoReady={handleVideoReady} />
      <HandSilhouette detectionResult={detectionResult} />
    </div>
  );
}

export default App;
