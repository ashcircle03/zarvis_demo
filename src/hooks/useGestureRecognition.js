import { useEffect, useState, useRef } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

// A custom hook to encapsulate MediaPipe gesture recognition logic
export const useGestureRecognition = () => {
  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const runningMode = 'VIDEO';

  // Initialize the Gesture Recognizer
  useEffect(() => {
    const createGestureRecognizer = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/gesture_recognizer.task', // Path in the public folder
            delegate: 'GPU',
          },
          runningMode: runningMode,
          numHands: 2,
        });
        setGestureRecognizer(recognizer);
        console.log('Gesture recognizer created successfully.');
      } catch (error) {
        console.error('Error creating gesture recognizer:', error);
      }
    };

    createGestureRecognizer();
  }, []);

  // Function to start detection
  const predictWebcam = (video, lastVideoTimeRef) => {
    if (!gestureRecognizer || !video.currentTime || video.currentTime === lastVideoTimeRef.current) {
      window.requestAnimationFrame(() => predictWebcam(video, lastVideoTimeRef));
      return;
    }

    lastVideoTimeRef.current = video.currentTime;
    const result = gestureRecognizer.recognizeForVideo(video, Date.now());
    
    if (result) {
        setDetectionResult(result);
    }

    window.requestAnimationFrame(() => predictWebcam(video, lastVideoTimeRef));
  };

  return { gestureRecognizer, detectionResult, predictWebcam };
};
