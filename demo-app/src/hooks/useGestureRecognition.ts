import { useEffect, useRef, useState, useCallback } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

export interface GestureResult {
  gesture: string;
  confidence: number;
  landmarks?: any[];
  timestamp: number;
}

export interface UseGestureRecognitionProps {
  onGestureDetected: (gesture: GestureResult) => void;
  video: HTMLVideoElement | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const useGestureRecognition = ({
  onGestureDetected,
  video,
  canvasRef
}: UseGestureRecognitionProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastGestureRef = useRef<{ gesture: string; timestamp: number } | null>(null);

  // Initialize MediaPipe
  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        gestureRecognizerRef.current = gestureRecognizer;
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize MediaPipe:', err);
        setError('Failed to initialize gesture recognition');
      }
    };

    initializeMediaPipe();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasRef]);

  // Process video frames
  const processFrame = useCallback(() => {
    if (!video || !gestureRecognizerRef.current || !canvasRef.current || !isInitialized) {
      return;
    }

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    if (!canvasCtx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      const results = gestureRecognizerRef.current.recognizeForVideo(video, performance.now());
      
      // Clear canvas
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw hand landmarks
      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
          // Draw landmarks as circles
          canvasCtx.fillStyle = '#FF0000';
          for (const landmark of landmarks) {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvas.width,
              landmark.y * canvas.height,
              3,
              0,
              2 * Math.PI
            );
            canvasCtx.fill();
          }
        }
      }

      // Process gestures
      if (results.gestures && results.gestures.length > 0) {
        const gesture = results.gestures[0][0];
        const now = Date.now();
        
        // Debounce gestures - only trigger if it's a new gesture or enough time has passed
        if (!lastGestureRef.current || 
            lastGestureRef.current.gesture !== gesture.categoryName ||
            now - lastGestureRef.current.timestamp > 1000) {
          
          lastGestureRef.current = {
            gesture: gesture.categoryName,
            timestamp: now
          };

          onGestureDetected({
            gesture: gesture.categoryName,
            confidence: gesture.score,
            landmarks: results.landmarks,
            timestamp: now
          });
        }
      }
    } catch (err) {
      console.error('Error processing frame:', err);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [video, canvasRef, isInitialized, onGestureDetected]);

  // Start processing when video is ready
  useEffect(() => {
    if (video && isInitialized && video.readyState >= 2) {
      processFrame();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [video, isInitialized, processFrame]);

  return {
    isInitialized,
    error
  };
};