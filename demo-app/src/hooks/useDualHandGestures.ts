import { useEffect, useRef, useState, useCallback } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';
import type { 
  HandData, 
  CursorState, 
  DualHandResult, 
  LeftHandGesture, 
  RightHandGesture
} from '../types/DualHandGestures';
import { detectLeftHandGesture, detectRightHandGesture } from '../types/DualHandGestures';

export interface UseDualHandGesturesProps {
  onGestureDetected: (result: DualHandResult) => void;
  video: HTMLVideoElement | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const useDualHandGestures = ({
  onGestureDetected,
  video,
  canvasRef
}: UseDualHandGesturesProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<CursorState>({
    x: 0,
    y: 0,
    isVisible: false,
    isDragging: false
  });

  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastLeftGestureRef = useRef<LeftHandGesture | null>(null);
  const lastRightGestureRef = useRef<RightHandGesture | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; elementId?: string } | null>(null);

  // MediaPipe 초기화
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
          numHands: 2, // 두 손 감지
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        gestureRecognizerRef.current = gestureRecognizer;
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize MediaPipe:', err);
        setError('Failed to initialize dual hand recognition');
      }
    };

    initializeMediaPipe();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 프레임 처리
  const processFrame = useCallback(() => {
    if (!video || !gestureRecognizerRef.current || !canvasRef.current || !isInitialized) {
      return;
    }

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    if (!canvasCtx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      const results = gestureRecognizerRef.current.recognizeForVideo(video, performance.now());
      
      // 캔버스 클리어
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      let leftHandData: HandData | null = null;
      let rightHandData: HandData | null = null;

      // 손 데이터 분류
      if (results.landmarks && results.handednesses) {
        for (let i = 0; i < results.landmarks.length; i++) {
          const landmarks = results.landmarks[i];
          const handedness = results.handednesses[i][0];
          
          const handData: HandData = {
            landmarks: landmarks.map(l => ({ x: l.x, y: l.y, z: l.z || 0 })),
            handedness: handedness.categoryName as 'Left' | 'Right',
            confidence: handedness.score
          };

          if (handData.handedness === 'Left') {
            leftHandData = handData;
          } else {
            rightHandData = handData;
          }

          // 손 랜드마크 그리기
          const color = handData.handedness === 'Left' ? '#00FF00' : '#FF0000';
          canvasCtx.fillStyle = color;
          
          for (const landmark of landmarks) {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvas.width,
              landmark.y * canvas.height,
              handData.handedness === 'Right' ? 5 : 3, // 오른손 더 크게
              0,
              2 * Math.PI
            );
            canvasCtx.fill();
          }

          // 오른손 검지 끝에 커서 표시
          if (handData.handedness === 'Right') {
            const indexTip = landmarks[8]; // INDEX_TIP
            const cursorX = indexTip.x * canvas.width;
            const cursorY = indexTip.y * canvas.height;
            
            // 커서 표시
            canvasCtx.strokeStyle = '#FFD700';
            canvasCtx.lineWidth = 3;
            canvasCtx.beginPath();
            canvasCtx.arc(cursorX, cursorY, 8, 0, 2 * Math.PI);
            canvasCtx.stroke();
            
            // 십자선
            canvasCtx.beginPath();
            canvasCtx.moveTo(cursorX - 10, cursorY);
            canvasCtx.lineTo(cursorX + 10, cursorY);
            canvasCtx.moveTo(cursorX, cursorY - 10);
            canvasCtx.lineTo(cursorX, cursorY + 10);
            canvasCtx.stroke();
          }
        }
      }

      // 제스처 감지 및 처리
      const now = Date.now();
      let leftGesture: LeftHandGesture | undefined;
      let rightGesture: RightHandGesture | undefined;

      // 왼손 제스처 감지
      if (leftHandData) {
        const detected = detectLeftHandGesture(leftHandData.landmarks);
        if (detected.type !== 'neutral' && 
            (!lastLeftGestureRef.current || 
             lastLeftGestureRef.current.type !== detected.type ||
             now - lastLeftGestureRef.current.timestamp > 1000)) {
          leftGesture = detected;
          lastLeftGestureRef.current = detected;
        }
      }

      // 오른손 제스처 감지
      if (rightHandData) {
        const detected = detectRightHandGesture(rightHandData.landmarks);
        
        // 커서 위치 업데이트
        if (detected.cursorPosition) {
          const newCursor: CursorState = {
            x: detected.cursorPosition.x * canvas.width,
            y: detected.cursorPosition.y * canvas.height,
            isVisible: true,
            isDragging: cursor.isDragging
          };

          // 드래그 상태 관리
          if (detected.type === 'pinch' && !cursor.isDragging) {
            // 드래그 시작
            newCursor.isDragging = true;
            newCursor.dragStartX = newCursor.x;
            newCursor.dragStartY = newCursor.y;
            dragStartRef.current = { x: newCursor.x, y: newCursor.y };
          } else if (detected.type !== 'pinch' && cursor.isDragging) {
            // 드래그 종료
            newCursor.isDragging = false;
            dragStartRef.current = null;
          }

          setCursor(newCursor);
        }

        // 제스처 이벤트 (디바운싱)
        if ((detected.type === 'fist' || detected.type === 'pinch') &&
            (!lastRightGestureRef.current || 
             lastRightGestureRef.current.type !== detected.type ||
             now - lastRightGestureRef.current.timestamp > 500)) {
          rightGesture = detected;
          lastRightGestureRef.current = detected;
        }
      } else {
        // 오른손이 감지되지 않으면 커서 숨김
        setCursor(prev => ({ ...prev, isVisible: false, isDragging: false }));
      }

      // 결과 전달
      if (leftGesture || rightGesture) {
        const result: DualHandResult = {
          leftHand: leftGesture,
          rightHand: rightGesture,
          cursor,
          timestamp: now
        };
        onGestureDetected(result);
      }

    } catch (err) {
      console.error('Error processing dual hand frame:', err);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [video, canvasRef, isInitialized, onGestureDetected, cursor]);

  // 비디오 준비되면 프레임 처리 시작
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
    error,
    cursor
  };
};