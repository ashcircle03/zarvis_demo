// 제스처 정의 - 코드로 간단하게 관리
export interface GestureMapping {
  mediapieName: string;
  displayName: string;
  description: string;
  icon: string;
  action: string;
  enabled: boolean;
}

export const GESTURE_MAPPINGS: GestureMapping[] = [
  {
    mediapieName: 'Closed_Fist',
    displayName: '주먹 쥐기',
    description: '선택된 파일들을 클립보드에 추가',
    icon: '✊',
    action: 'add_to_clipboard',
    enabled: true
  },
  {
    mediapieName: 'Open_Palm',
    displayName: '손바닥 펼치기',
    description: '클립보드의 파일들을 붙여넣기',
    icon: '✋',
    action: 'paste_from_clipboard',
    enabled: true
  },
  {
    mediapieName: 'Pointing_Up',
    displayName: '위로 가리키기',
    description: '상위 폴더로 이동',
    icon: '☝️',
    action: 'navigate_up',
    enabled: true
  },
  {
    mediapieName: 'Thumb_Up',
    displayName: '엄지 올리기',
    description: '현재 폴더의 모든 항목 선택',
    icon: '👍',
    action: 'select_all',
    enabled: true
  },
  {
    mediapieName: 'Victory',
    displayName: '브이 사인',
    description: '모든 선택 및 클립보드 초기화',
    icon: '✌️',
    action: 'clear_selection',
    enabled: true
  },
  // 새로운 제스처들을 여기에 추가할 수 있습니다
  {
    mediapieName: 'Thumb_Down',
    displayName: '엄지 내리기',
    description: '선택된 파일들 삭제',
    icon: '👎',
    action: 'delete_files',
    enabled: false // 아직 비활성화
  },
  {
    mediapieName: 'ILoveYou',
    displayName: '사랑해 표시',
    description: '새 폴더 생성',
    icon: '🤟',
    action: 'new_folder',
    enabled: false // 아직 비활성화
  }
];

// 활성화된 제스처만 반환
export const getActiveGestures = (): GestureMapping[] => {
  return GESTURE_MAPPINGS.filter(gesture => gesture.enabled);
};

// MediaPipe 제스처 이름으로 매핑 찾기
export const findGestureByMediapipeName = (name: string): GestureMapping | undefined => {
  return GESTURE_MAPPINGS.find(gesture => gesture.mediapieName === name && gesture.enabled);
};

// 액션 이름으로 매핑 찾기
export const findGestureByAction = (action: string): GestureMapping | undefined => {
  return GESTURE_MAPPINGS.find(gesture => gesture.action === action && gesture.enabled);
};

// 제스처 활성화/비활성화
export const toggleGesture = (mediapieName: string, enabled: boolean): void => {
  const gesture = GESTURE_MAPPINGS.find(g => g.mediapieName === mediapieName);
  if (gesture) {
    gesture.enabled = enabled;
  }
};

// 새 제스처 추가
export const addCustomGesture = (gesture: Omit<GestureMapping, 'enabled'>): void => {
  GESTURE_MAPPINGS.push({
    ...gesture,
    enabled: true
  });
};