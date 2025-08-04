# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based touchless file management system designed for sterile environments (medical/semiconductor). Users interact with AWS EFS using hand gestures and voice commands through a React.js frontend with MediaPipe integration.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Architecture

### Frontend (React.js)
- **Framework**: React 19.1.1 with Create React App
- **Hand Gesture Recognition**: MediaPipe (@mediapipe/tasks-vision, @mediapipe/hands)
- **Core Components**:
  - `FileExplorer` - Left panel folder tree with gesture interaction
  - `FileView` - Center panel file/folder display with drag & drop
  - `Clipboard` - Right panel for file move operations
  - `CameraView` - Live webcam feed with mirroring
  - `DualHandTracker` - MediaPipe hand tracking overlay
  - `DualCursor` - Visual cursor following finger position
  - `DragSelection` - Area selection visualization
- **Custom Hook**: `useDualHandGesture` - Comprehensive gesture recognition

### Backend (AWS Architecture)
- **Static Hosting**: CloudFront + S3 (HTTPS 필수 - 카메라 API 접근)
- **Real-time Communication**: AppSync Real-time Subscriptions (WebSocket)
- **File Operations**: Lambda + S3 (EFS 대신 S3 사용)
- **Voice Processing**: S3 + Lambda + AWS Transcribe pipeline
- **Authentication**: Amazon Cognito
- **Monitoring**: CloudWatch, X-Ray, Security Hub
- **Security**: WAF, GuardDuty, VPC, KMS encryption

## Key Technologies

- **MediaPipe**: Real-time hand tracking and gesture recognition (클라이언트 사이드 처리)
- **React Testing Library**: Testing framework
- **CloudFront + S3**: Static hosting with HTTPS (카메라 API 접근 필수)
- **AppSync Real-time**: WebSocket 대신 GraphQL subscriptions 사용
- **Client-side Processing**: MediaPipe 브라우저 내 처리로 즉각적 반응 (~30ms)

## Development Notes

### Current Implementation Status
- **완전 구현됨**: 오른손 전용 핀치 제스처 시스템으로 완전히 리팩토링됨
- **MediaPipe 모델**: 자동으로 최신 hand_landmarker 모델 다운로드
- **카메라 피드**: 자연스러운 상호작용을 위한 X축 미러링 적용
- **제스처 시스템**: 엄지-검지 핀치 방식으로 변경 (손목 꺾기 방식에서 개선)
- **3개 패널 UI**: 폴더 트리, 파일 뷰, 클립보드 영역 완전 구현

## Hardware Setup & User Interaction

### Camera Configuration
- **웹캠 위치**: 사용자 정면 화면 위쪽에 배치
- **앵글 설정**: 낮춘 각도로 손만 비추도록 조정 (상체/얼굴 제외)
- **사용자 자세**: 선 자세에서 전면 화면 대면
- **촬영 범위**: 손 동작 영역에 집중

## Gesture System Design

### 핀치 기반 제스처 시스템 (현재 구현)
- **커서**: 오른손 검지 끝점 (INDEX_FINGER_TIP, landmark[8])을 화면 좌표계로 매핑
- **클릭 감지**: 엄지 끝점(THUMB_TIP, landmark[4])과 검지 끝점 거리 기반 핀치 감지
- **제스처 유형**:
  - **단일 핀치**: 파일 선택/해제, 폴더 열기, 클립보드 아이템 제거
  - **더블 핀치**: 폴더 확실한 열기 (400ms 시간 창 내 2회 핀치)
  - **핀치+드래그**: 파일/폴더 이동, 영역 선택
- **상태 관리**: IDLE → CLICK/DOUBLE_CLICK → DRAG_START → DRAGGING → DRAG_END

### MediaPipe 랜드마크 활용 (현재 구현)
```javascript
// 핀치 감지 알고리즘 (3D 거리 계산)
const detectPinch = (landmarks) => {
  if (landmarks.length < 21) return false;

  const thumbTip = landmarks[4];   // THUMB_TIP
  const indexTip = landmarks[8];   // INDEX_FINGER_TIP
  
  // 3D 유클리드 거리 계산
  const distance = Math.sqrt(
    Math.pow(thumbTip.x - indexTip.x, 2) +
    Math.pow(thumbTip.y - indexTip.y, 2) +
    Math.pow(thumbTip.z - indexTip.z, 2)
  );
  
  const pinchThreshold = 0.05; // 핀치 인식 임계값
  return distance < pinchThreshold;
};

// 커서 위치 매핑 (X축 미러링 적용)
const mapCursorPosition = (indexTip) => {
  return {
    x: (1 - indexTip.x) * window.innerWidth,  // X축 미러링
    y: indexTip.y * window.innerHeight,
    isVisible: true
  };
};

// 제스처 상태 관리
const GestureState = {
  IDLE: 'idle',
  CLICK: 'click',
  DOUBLE_CLICK: 'double_click',
  DRAG_START: 'drag_start',
  DRAGGING: 'dragging',
  DRAG_END: 'drag_end'
};

// 드래그 모드 구분
const DragMode = {
  AREA_SELECTION: 'area_selection',      // 빈 공간: 영역 선택
  ITEM_MOVE: 'item_move',                // 파일/폴더: 아이템 이동
  CLIPBOARD_ITEM_MOVE: 'clipboard_item_move'  // 클립보드: 역방향 이동
};

// 더블클릭 감지 (타이밍 기반)
const detectClickType = (timestamps, currentTime) => {
  const recentClicks = timestamps.filter(
    time => currentTime - time < 400  // 400ms 시간 창
  );
  
  if (recentClicks.length >= 2) {
    const timeBetweenClicks = recentClicks[recentClicks.length - 1] - 
                             recentClicks[recentClicks.length - 2];
    if (timeBetweenClicks < 400 && timeBetweenClicks > 50) {
      return 'double_click';  // 50-400ms 간격의 더블클릭
    }
  }
  return 'click';
};

// 상호작용 영역별 처리
const handleGestureByArea = (hoveredItemId, clickState) => {
  const element = document.querySelector(`[data-file-id="${hoveredItemId}"]`);
  const itemType = element?.getAttribute('data-item-type');
  
  switch (clickState) {
    case 'click':
      if (itemType === 'folder-tree') {
        // 폴더 트리: 확장/축소
        toggleFolder(hoveredItemId);
      } else if (element?.hasAttribute('data-clipboard-item-id')) {
        // 클립보드: 아이템 제거
        removeFromClipboard(hoveredItemId);
      } else {
        // 파일 영역: 선택/폴더 열기
        handleFileAreaClick(hoveredItemId);
      }
      break;
      
    case 'double_click':
      if (itemType === 'folder-tree' || isFileAreaFolder(hoveredItemId)) {
        // 폴더를 파일 영역에 표시
        setSelectedFolder(hoveredItemId);
      }
      break;
  }
};
```

### 구현된 기능 (v1.0)
- ✅ **오른손 전용 시스템**: 왼손 기능 완전 제거, 오른손만으로 모든 조작
- ✅ **핀치 기반 제스처**: 엄지-검지 핀치로 직관적 조작 (손목 꺾기 방식 대체)
- ✅ **3영역 상호작용**: 폴더 트리, 파일 뷰, 클립보드 간 완전한 드래그 앤 드롭
- ✅ **스마트 드래그 감지**: 시작 위치에 따른 자동 모드 전환 (영역선택/아이템이동)
- ✅ **더블클릭 지원**: 400ms 시간창 내 정확한 더블핀치 감지
- ✅ **양방향 클립보드**: 파일→클립보드, 클립보드→파일 양방향 이동
- ✅ **실시간 시각 피드백**: 드래그 영역 표시, 선택 상태 색상 구분
- ✅ **폴더 트리 네비게이션**: 클릭(확장/축소), 더블클릭(내용 표시) 구분

### 추후 개선 필요사항 (v2.0)
- **핀치 정확도 향상**: 개인별 손가락 길이에 따른 적응형 임계값 조정
- **카메라 각도 자동 조정**: 사용자 키/자세에 따른 최적 앵글 계산
- **손 인식 영역 최적화**: 배경 노이즈 제거 및 ROI(Region of Interest) 설정
- **조명 조건 보상**: 다양한 조명 환경에서의 인식률 개선
- **다중 사용자 대응**: 키 차이에 따른 적응형 인식 시스템
- **피로도 감소**: 장시간 사용시 손목/어깨 피로 최소화 각도 연구
- **떨림 보정**: 자연스러운 손 떨림으로 인한 오인식 방지 필터링
- **음성 명령 통합**: 제스처와 음성의 멀티모달 상호작용

## Project Structure

```
demo-app/
├── src/
│   ├── components/
│   │   ├── CameraView.tsx        # 웹캠 피드 컴포넌트
│   │   ├── Clipboard.tsx         # 클립보드 패널
│   │   ├── DragSelection.tsx     # 드래그 영역 시각화
│   │   ├── DualCursor.tsx        # 제스처 커서 표시
│   │   ├── DualHandTracker.tsx   # MediaPipe 손 추적
│   │   ├── FileExplorer.tsx      # 왼쪽 폴더 트리
│   │   └── FileView.tsx          # 가운데 파일/폴더 뷰
│   ├── hooks/
│   │   └── useDualHandGesture.ts # 제스처 인식 훅
│   ├── types/
│   │   └── FileSystem.ts         # 파일시스템 타입 정의
│   ├── App.tsx                   # 메인 애플리케이션
│   ├── App.css                   # 스타일시트
│   └── index.tsx                 # React 엔트리포인트
├── public/
│   └── index.html               # HTML 템플릿
├── package.json                 # 의존성 및 스크립트
└── tsconfig.json               # TypeScript 설정
```

### Key Files
- **`useDualHandGesture.ts`**: 핀치 감지, 더블클릭, 드래그 모드 결정 등 모든 제스처 로직
- **`App.tsx`**: 제스처 이벤트 처리, 상태 관리, UI 컴포넌트 조합  
- **`FileSystem.ts`**: 모의 파일시스템 데이터 및 타입 정의
- **`DualHandTracker.tsx`**: MediaPipe 초기화 및 실시간 손 추적 처리