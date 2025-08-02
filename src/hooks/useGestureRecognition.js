import { useEffect, useState, useCallback } from 'react';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export const useGestureRecognition = (canvasRef) => {
  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [lastGesture, setLastGesture] = useState('');
  let lastVideoTime = -1;

  // 1. Initialize the Gesture Recognizer
  useEffect(() => {
    const createGestureRecognizer = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
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

  // 2. Main detection loop
  const predictWebcam = useCallback((video) => {
    if (!gestureRecognizer || !video || !canvasRef.current) {
      return;
    }

    // Throttle the detection to avoid overwhelming the system
    if (video.currentTime === lastVideoTime) {
      requestAnimationFrame(() => predictWebcam(video));
      return;
    }

    lastVideoTime = video.currentTime;
    const results = gestureRecognizer.recognizeForVideo(video, Date.now());

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawingUtils = new DrawingUtils(ctx);

    // Draw hand landmarks and connectors
    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
        drawingUtils.drawLandmarks(landmarks, { color: '#FF0000', lineWidth: 2 });
      }
    }
    ctx.restore();

    // Update gesture state only when a gesture is detected
    if (results.gestures.length > 0) {
      const topGesture = results.gestures[0][0];
      if (topGesture.categoryName !== lastGesture) {
        setLastGesture(topGesture.categoryName);
      }
    }

    // Continue the loop
    requestAnimationFrame(() => predictWebcam(video));

  }, [gestureRecognizer, canvasRef, lastGesture]);

  return { gestureRecognizer, lastGesture, predictWebcam };
};