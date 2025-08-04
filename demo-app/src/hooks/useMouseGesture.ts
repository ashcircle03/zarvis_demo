import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface CursorPosition {
  x: number;
  y: number;
  isVisible: boolean;
}

export interface MouseGestureResult {
  cursor: CursorPosition;
  clickState: 'idle' | 'click_start' | 'dragging' | 'click_end';
  dragStart?: CursorPosition;
  timestamp: number;
}

export interface UseMouseGestureProps {
  onGestureDetected: (gesture: MouseGestureResult) => void;
  video: HTMLVideoElement | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

// 제스처 상태 관리
const GestureState = {
  IDLE: 'idle',
  CLICK_START: 'click_start',
  DRAGGING: 'dragging',
  CLICK_END: 'click_end'
} as const;

type GestureStateType = typeof GestureState[keyof typeof GestureState];

export const useMouseGesture = ({
  onGestureDetected,
  video,
  canvasRef
}: UseMouseGestureProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 상태 관리
  const stateRef = useRef<GestureStateType>(GestureState.IDLE);
  const dragStartRef = useRef<CursorPosition | null>(null);
  const currentCursorRef = useRef<CursorPosition>({ x: 0, y: 0, isVisible: false });

  // 손목 꺾기 감지 함수
  const detectWristBend = useCallback((landmarks: any[]) => {
    if (landmarks.length < 21) return false;

    const wrist = landmarks[0];           // WRIST
    const indexMcp = landmarks[5];        // INDEX_FINGER_MCP
    
    // 손목-검지 기준점 벡터
    const wristToMcp = {
      x: indexMcp.x - wrist.x,
      y: indexMcp.y - wrist.y,
      z: indexMcp.z - wrist.z
    };
    
    // Z축 변화량으로 손목 꺾임 감지 (앞으로 꺾기)
    const bendThreshold = -0.02; // 조정 가능한 임계값
    return wristToMcp.z < bendThreshold;
  }, []);

  // 커서 위치 매핑 (미러링 적용)
  const mapCursorPosition = useCallback((indexTip: any, canvasWidth: number, canvasHeight: number): CursorPosition => {
    return {
      x: (1 - indexTip.x) * canvasWidth, // X축 미러링
      y: indexTip.y * canvasHeight,
      isVisible: true
    };
  }, []);

  // 거리 계산
  const hasMoved = useCallback((current: CursorPosition, start: CursorPosition, threshold = 10): boolean => {
    const distance = Math.sqrt(
      Math.pow(current.x - start.x, 2) + 
      Math.pow(current.y - start.y, 2)
    );
    return distance > threshold;
  }, []);

  // Initialize MediaPipe
  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 1, // 오른손만 감지
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        handLandmarkerRef.current = handLandmarker;
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize MediaPipe:', err);
        setError('Failed to initialize mouse gesture recognition');
      }
    };

    initializeMediaPipe();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Process video frames
  const processFrame = useCallback(() => {
    if (!video || !handLandmarkerRef.current || !canvasRef.current || !isInitialized) {
      return;
    }

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    if (!canvasCtx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
      
      // Clear canvas
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply mirroring transform for canvas drawing
      canvasCtx.save();
      canvasCtx.scale(-1, 1);
      canvasCtx.translate(-canvas.width, 0);

      let currentCursor: CursorPosition = { x: 0, y: 0, isVisible: false };
      let isBent = false;

      // Process hand landmarks
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0]; // 첫 번째 손 (오른손)
        
        // 검지 끝점으로 커서 위치 계산
        if (landmarks.length > 8) {
          const indexTip = landmarks[8]; // INDEX_FINGER_TIP
          currentCursor = mapCursorPosition(indexTip, window.innerWidth, window.innerHeight);
          
          console.log('Index tip coords:', indexTip.x, indexTip.y, 'Cursor:', currentCursor.x, currentCursor.y);
          
          // 손목 꺾기 감지
          isBent = detectWristBend(landmarks);
        }

        // Draw hand landmarks
        canvasCtx.fillStyle = '#00FF00';
        landmarks.forEach((landmark, index) => {
          canvasCtx.beginPath();
          canvasCtx.arc(
            landmark.x * canvas.width,
            landmark.y * canvas.height,
            index === 8 ? 6 : 3, // 검지 끝점을 더 크게
            0,
            2 * Math.PI
          );
          canvasCtx.fill();
        });

        // 검지 끝점 강조 표시
        if (landmarks.length > 8) {
          const indexTip = landmarks[8];
          canvasCtx.strokeStyle = '#FF0000';
          canvasCtx.lineWidth = 3;
          canvasCtx.beginPath();
          canvasCtx.arc(
            indexTip.x * canvas.width,
            indexTip.y * canvas.height,
            10,
            0,
            2 * Math.PI
          );
          canvasCtx.stroke();
        }
      }

      // 상태 전환 로직
      const currentState = stateRef.current;
      let newState = currentState;

      switch (currentState) {
        case GestureState.IDLE:
          if (isBent && currentCursor.isVisible) {
            newState = GestureState.CLICK_START;
            dragStartRef.current = currentCursor;
          }
          break;
          
        case GestureState.CLICK_START:
          if (!isBent) {
            newState = GestureState.CLICK_END;
          } else if (dragStartRef.current && hasMoved(currentCursor, dragStartRef.current)) {
            newState = GestureState.DRAGGING;
          }
          break;
          
        case GestureState.DRAGGING:
          if (!isBent) {
            newState = GestureState.CLICK_END;
          }
          break;
          
        case GestureState.CLICK_END:
          newState = GestureState.IDLE;
          break;
      }

      stateRef.current = newState;
      currentCursorRef.current = currentCursor;

      // 제스처 결과 전달
      const gestureResult: MouseGestureResult = {
        cursor: currentCursor,
        clickState: newState,
        dragStart: dragStartRef.current || undefined,
        timestamp: Date.now()
      };

      onGestureDetected(gestureResult);
      
      // Restore canvas transform
      canvasCtx.restore();

    } catch (err) {
      console.error('Error processing frame:', err);
      // Make sure to restore canvas state even on error
      canvasCtx.restore();
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [video, canvasRef, isInitialized, onGestureDetected, detectWristBend, mapCursorPosition, hasMoved]);

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