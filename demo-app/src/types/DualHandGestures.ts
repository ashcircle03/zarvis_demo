export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  confidence: number;
}

export interface CursorState {
  x: number;
  y: number;
  isVisible: boolean;
  isDragging: boolean;
  dragStartX?: number;
  dragStartY?: number;
  hoveredElementId?: string;
}

export interface LeftHandGesture {
  type: 'hand_up' | 'hand_down' | 'neutral';
  confidence: number;
  timestamp: number;
}

export interface RightHandGesture {
  type: 'fist' | 'pinch' | 'point' | 'neutral';
  confidence: number;
  timestamp: number;
  cursorPosition?: { x: number; y: number };
}

export interface DualHandResult {
  leftHand?: LeftHandGesture;
  rightHand?: RightHandGesture;
  cursor: CursorState;
  timestamp: number;
}

// MediaPipe 손가락 랜드마크 인덱스
export const LANDMARK_INDICES = {
  // 엄지
  THUMB_TIP: 4,
  THUMB_IP: 3,
  THUMB_MCP: 2,
  
  // 검지
  INDEX_TIP: 8,
  INDEX_DIP: 7,
  INDEX_PIP: 6,
  INDEX_MCP: 5,
  
  // 중지
  MIDDLE_TIP: 12,
  MIDDLE_DIP: 11,
  MIDDLE_PIP: 10,
  MIDDLE_MCP: 9,
  
  // 약지
  RING_TIP: 16,
  RING_DIP: 15,
  RING_PIP: 14,
  RING_MCP: 13,
  
  // 새끼
  PINKY_TIP: 20,
  PINKY_DIP: 19,
  PINKY_PIP: 18,
  PINKY_MCP: 17,
  
  // 손목
  WRIST: 0
};

// 거리 계산 헬퍼 함수
export const calculateDistance = (p1: HandLandmark, p2: HandLandmark): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// 각도 계산 헬퍼 함수 (라디안)
export const calculateAngle = (p1: HandLandmark, p2: HandLandmark, p3: HandLandmark): number => {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  return Math.acos(dot / (mag1 * mag2));
};

// 손 높이 기반 제스처 감지
export const detectLeftHandGesture = (landmarks: HandLandmark[]): LeftHandGesture => {
  const wrist = landmarks[LANDMARK_INDICES.WRIST];
  const indexTip = landmarks[LANDMARK_INDICES.INDEX_TIP];
  const middleTip = landmarks[LANDMARK_INDICES.MIDDLE_TIP];
  
  // 손목 대비 손가락들의 상대적 높이
  const avgFingerY = (indexTip.y + middleTip.y) / 2;
  const heightDiff = wrist.y - avgFingerY; // y는 아래쪽이 클수록 큰 값
  
  if (heightDiff > 0.15) {
    return { type: 'hand_up', confidence: 0.8, timestamp: Date.now() };
  } else if (heightDiff < -0.15) {
    return { type: 'hand_down', confidence: 0.8, timestamp: Date.now() };
  }
  
  return { type: 'neutral', confidence: 0.5, timestamp: Date.now() };
};

// 오른손 제스처 감지
export const detectRightHandGesture = (landmarks: HandLandmark[]): RightHandGesture => {
  const thumbTip = landmarks[LANDMARK_INDICES.THUMB_TIP];
  const indexTip = landmarks[LANDMARK_INDICES.INDEX_TIP];
  const middleTip = landmarks[LANDMARK_INDICES.MIDDLE_TIP];
  const wrist = landmarks[LANDMARK_INDICES.WRIST];
  
  // 커서 위치 (검지 끝)
  const cursorPosition = { x: indexTip.x, y: indexTip.y };
  
  // 3개 손가락 모으기 (엄지-검지-중지)
  const thumbIndexDist = calculateDistance(thumbTip, indexTip);
  const indexMiddleDist = calculateDistance(indexTip, middleTip);
  const thumbMiddleDist = calculateDistance(thumbTip, middleTip);
  
  if (thumbIndexDist < 0.05 && indexMiddleDist < 0.05 && thumbMiddleDist < 0.05) {
    return { 
      type: 'pinch', 
      confidence: 0.9, 
      timestamp: Date.now(),
      cursorPosition 
    };
  }
  
  // 주먹 감지 (모든 손가락이 손목에 가까이)
  const avgFingerDist = [
    calculateDistance(indexTip, wrist),
    calculateDistance(middleTip, wrist),
    calculateDistance(landmarks[LANDMARK_INDICES.RING_TIP], wrist),
    calculateDistance(landmarks[LANDMARK_INDICES.PINKY_TIP], wrist)
  ].reduce((a, b) => a + b, 0) / 4;
  
  if (avgFingerDist < 0.12) {
    return { 
      type: 'fist', 
      confidence: 0.8, 
      timestamp: Date.now(),
      cursorPosition 
    };
  }
  
  // 기본 포인팅
  return { 
    type: 'point', 
    confidence: 0.7, 
    timestamp: Date.now(),
    cursorPosition 
  };
};