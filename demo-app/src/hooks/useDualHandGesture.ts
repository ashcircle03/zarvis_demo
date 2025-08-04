import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface CursorPosition {
  x: number;
  y: number;
  isVisible: boolean;
}

export type DragMode = 'area_selection' | 'item_move' | 'clipboard_item_move' | 'clipboard_area_selection';

export interface DualHandGestureResult {
  rightCursor: CursorPosition;
  leftCursor: CursorPosition;
  rightClickState: 'idle' | 'click' | 'double_click' | 'drag_start' | 'dragging' | 'drag_end';
  leftClickState: 'idle' | 'click' | 'double_click' | 'drag_start' | 'dragging' | 'drag_end';
  dragStart?: CursorPosition;
  dragEnd?: CursorPosition;
  dragMode?: DragMode;
  timestamp: number;
}

export interface UseDualHandGestureProps {
  onGestureDetected: (gesture: DualHandGestureResult) => void;
  video: HTMLVideoElement | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  checkItemAtPosition?: (x: number, y: number) => boolean; // 해당 위치에 파일/폴더가 있는지 확인
  checkClipboardItemAtPosition?: (x: number, y: number) => boolean; // 해당 위치에 클립보드 아이템이 있는지 확인
}

// 제스처 상태 관리
const GestureState = {
  IDLE: 'idle',
  CLICK: 'click',
  DOUBLE_CLICK: 'double_click',
  DRAG_START: 'drag_start',
  DRAGGING: 'dragging',
  DRAG_END: 'drag_end'
} as const;

type GestureStateType = typeof GestureState[keyof typeof GestureState];

export const useDualHandGesture = ({
  onGestureDetected,
  video,
  canvasRef,
  checkItemAtPosition,
  checkClipboardItemAtPosition
}: UseDualHandGestureProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 상태 관리 (오른손만)
  const rightStateRef = useRef<GestureStateType>(GestureState.IDLE);
  const dragStartRef = useRef<CursorPosition | null>(null);
  const dragModeRef = useRef<DragMode | null>(null);
  const rightCursorRef = useRef<CursorPosition>({ x: 0, y: 0, isVisible: false });
  
  // 핀치 상태 관리 (오른손만)
  const rightPinchStateRef = useRef<boolean>(false); // 현재 핀치 중인지
  const lastRightPinchRef = useRef<boolean>(false); // 이전 프레임 핀치 상태
  
  // 클릭 감지를 위한 타이밍 관리 (오른손만)
  const rightClickTimestampsRef = useRef<number[]>([]);
  const dragThresholdRef = useRef<number>(15); // 드래그로 인식할 최소 거리
  const doubleClickTimeoutRef = useRef<number>(400); // 더블클릭 인식 시간 (ms) - 조금 더 여유롭게

  // 핀치 감지 함수 (엄지와 검지 끝점 거리)
  const detectPinch = useCallback((landmarks: any[]) => {
    if (landmarks.length < 21) return false;

    const thumbTip = landmarks[4];   // THUMB_TIP
    const indexTip = landmarks[8];   // INDEX_FINGER_TIP
    
    // 엄지와 검지 끝점 사이의 거리 계산
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
    );
    
    // 거리 임계값 (조정 가능)
    const pinchThreshold = 0.05; // 핀치로 인식할 거리
    return distance < pinchThreshold;
  }, []);

  // 클릭 이벤트 감지 (핀치 시작에서 끝까지의 시간 체크)
  const detectClickType = useCallback((timestamps: number[], currentTime: number) => {
    // 최근 클릭들만 유지 (400ms 이내)
    const recentClicks = timestamps.filter(time => currentTime - time < doubleClickTimeoutRef.current);
    
    if (recentClicks.length >= 2) {
      // 더블클릭: 두 클릭 사이 간격이 적절한지 확인
      const timeBetweenClicks = recentClicks[recentClicks.length - 1] - recentClicks[recentClicks.length - 2];
      if (timeBetweenClicks < doubleClickTimeoutRef.current && timeBetweenClicks > 50) { // 최소 50ms 간격
        return 'double_click';
      }
    } else if (recentClicks.length === 1) {
      // 싱글클릭 (더블클릭 대기 시간이 지나면)
      const timeSinceLastClick = currentTime - recentClicks[0];
      if (timeSinceLastClick > doubleClickTimeoutRef.current) {
        return 'click';
      }
    }
    return null;
  }, []);

  // 커서 위치 매핑 (미러링 적용)
  const mapCursorPosition = useCallback((indexTip: any): CursorPosition => {
    return {
      x: (1 - indexTip.x) * window.innerWidth, // X축 미러링
      y: indexTip.y * window.innerHeight,
      isVisible: true
    };
  }, []);

  // 거리 계산
  const hasMoved = useCallback((current: CursorPosition, start: CursorPosition, threshold = 15): boolean => {
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
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numHands: 1, // 오른손만 감지
          minHandDetectionConfidence: 0.5, // 낮은 신뢰도로 설정
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        handLandmarkerRef.current = handLandmarker;
        setIsInitialized(true);
        setError(null);
        console.log('MediaPipe Hand Landmarker initialized successfully');
      } catch (err) {
        console.error('Failed to initialize MediaPipe:', err);
        setError('Failed to initialize dual hand gesture recognition');
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
    
    if (video.readyState < 2) {
      // Video not ready yet
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    if (!canvasCtx) return;

    // Set canvas size to match screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    try {
      const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
      
      // Clear canvas
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      let rightCursor: CursorPosition = { x: 0, y: 0, isVisible: false };
      let leftCursor: CursorPosition = { x: 0, y: 0, isVisible: false }; // 비활성화됨

      // Process hand landmarks (오른손만)
      if (results.landmarks && results.landmarks.length > 0) {
        console.log(`Detected ${results.landmarks.length} hands`);
        results.landmarks.forEach((landmarks, handIndex) => {
          const isRightHand = results.handednesses?.[handIndex]?.[0]?.categoryName === 'Right';
          
          // 오른손만 처리
          if (isRightHand && landmarks.length > 8) {
            const indexTip = landmarks[8]; // INDEX_FINGER_TIP
            const cursor = mapCursorPosition(indexTip);
            const currentPinch = detectPinch(landmarks);
            
            rightCursor = cursor;
            console.log('Right cursor updated:', rightCursor);
            
            // 핀치 시작 감지 (오른손)
            if (currentPinch && !lastRightPinchRef.current) {
              rightPinchStateRef.current = true;
              console.log('Right pinch started');
            }
            // 핀치 끝 감지 (오른손)
            else if (!currentPinch && lastRightPinchRef.current) {
              rightPinchStateRef.current = false;
              // 클릭 타임스탬프 기록
              rightClickTimestampsRef.current.push(performance.now());
              console.log('Right pinch ended');
            }
            lastRightPinchRef.current = currentPinch;
          }

          // 오른손만 랜드마크 그리기
          if (isRightHand) {
            const color = '#FF0000'; // 오른손: 빨간색
            canvasCtx.fillStyle = color;
            
            landmarks.forEach((landmark, index) => {
              canvasCtx.beginPath();
              canvasCtx.arc(
                (1 - landmark.x) * canvas.width, // X축 미러링 적용
                landmark.y * canvas.height,
                (index === 8 || index === 4) ? 6 : 3, // 검지(8)와 엄지(4) 끝점을 더 크게
                0,
                2 * Math.PI
              );
              canvasCtx.fill();
            });

            // 검지와 엄지 끝점 강조 표시
            if (landmarks.length > 8) {
              const indexTip = landmarks[8]; // 검지
              const thumbTip = landmarks[4]; // 엄지
              const currentPinch = detectPinch(landmarks);
              
              canvasCtx.strokeStyle = currentPinch ? '#FFFF00' : color; // 핀치시 노란색
              canvasCtx.lineWidth = currentPinch ? 4 : 3;
              
              // 검지 강조
              canvasCtx.beginPath();
              canvasCtx.arc(
                (1 - indexTip.x) * canvas.width, // X축 미러링 적용
                indexTip.y * canvas.height,
                10,
                0,
                2 * Math.PI
              );
              canvasCtx.stroke();
              
              // 엄지 강조
              canvasCtx.beginPath();
              canvasCtx.arc(
                (1 - thumbTip.x) * canvas.width, // X축 미러링 적용
                thumbTip.y * canvas.height,
                10,
                0,
                2 * Math.PI
              );
              canvasCtx.stroke();
              
              // 핀치시 연결선 표시
              if (currentPinch) {
                canvasCtx.beginPath();
                canvasCtx.moveTo(
                  (1 - indexTip.x) * canvas.width,
                  indexTip.y * canvas.height
                );
                canvasCtx.lineTo(
                  (1 - thumbTip.x) * canvas.width,
                  thumbTip.y * canvas.height
                );
                canvasCtx.stroke();
              }
            }
          }
        });
      }

      const currentTime = performance.now();
      
      // 상태 전환 로직 (오른손)
      const currentRightState = rightStateRef.current;
      let newRightState = currentRightState;

      switch (currentRightState) {
        case GestureState.IDLE:
          if (rightPinchStateRef.current && rightCursor.isVisible) {
            newRightState = GestureState.DRAG_START;
            dragStartRef.current = rightCursor;
            
            // 드래그 모드 결정: 시작 위치에 따라 모드 결정
            const hasFileItem = checkItemAtPosition?.(rightCursor.x, rightCursor.y) ?? false;
            const hasClipboardItem = checkClipboardItemAtPosition?.(rightCursor.x, rightCursor.y) ?? false;
            
            if (hasFileItem) {
              dragModeRef.current = 'item_move';
            } else if (hasClipboardItem) {
              dragModeRef.current = 'clipboard_item_move';
            } else {
              // 빈 공간에서 시작 - 영역 선택
              dragModeRef.current = 'area_selection';
            }
            console.log(`Drag mode: ${dragModeRef.current} at (${rightCursor.x}, ${rightCursor.y})`);
          } else if (rightClickTimestampsRef.current.length > 0) {
            // 클릭 이벤트 확인
            const clickType = detectClickType(rightClickTimestampsRef.current, currentTime);
            if (clickType === 'click') {
              newRightState = GestureState.CLICK;
              rightClickTimestampsRef.current = []; // 클릭 처리 후 초기화
            } else if (clickType === 'double_click') {
              newRightState = GestureState.DOUBLE_CLICK;
              rightClickTimestampsRef.current = []; // 더블클릭 처리 후 초기화
            }
          }
          break;
          
        case GestureState.DRAG_START:
          if (!rightPinchStateRef.current) {
            newRightState = GestureState.DRAG_END;
          } else if (dragStartRef.current && hasMoved(rightCursor, dragStartRef.current, dragThresholdRef.current)) {
            newRightState = GestureState.DRAGGING;
          }
          break;
          
        case GestureState.DRAGGING:
          if (!rightPinchStateRef.current) {
            newRightState = GestureState.DRAG_END;
          }
          break;
          
        case GestureState.CLICK:
        case GestureState.DOUBLE_CLICK:
        case GestureState.DRAG_END:
          newRightState = GestureState.IDLE;
          dragModeRef.current = null; // 드래그 모드 초기화
          break;
      }

      // 왼손 상태 전환 로직 제거됨 (오른손만 사용)
      const newLeftState = 'idle'; // 항상 idle 상태
      
      // 오래된 클릭 타임스탬프 정리 (오른손만)
      rightClickTimestampsRef.current = rightClickTimestampsRef.current.filter(
        time => currentTime - time < doubleClickTimeoutRef.current
      );

      rightStateRef.current = newRightState;
      rightCursorRef.current = rightCursor;

      // 제스처 결과 전달
      const gestureResult: DualHandGestureResult = {
        rightCursor,
        leftCursor,
        rightClickState: newRightState,
        leftClickState: newLeftState,
        dragStart: dragStartRef.current || undefined,
        dragEnd: (newRightState === GestureState.DRAG_END) ? rightCursor : undefined,
        dragMode: dragModeRef.current || undefined,
        timestamp: Date.now()
      };

      onGestureDetected(gestureResult);

    } catch (err) {
      console.error('Error processing frame:', err);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [video, canvasRef, isInitialized, onGestureDetected, detectPinch, mapCursorPosition, hasMoved]);

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