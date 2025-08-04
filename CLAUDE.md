# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PIVOT: Desktop App with Real Mouse Control**

This project has pivoted from a web-based file management system to a desktop application that provides touchless mouse control for computers. Users authenticate via AWS Rekognition facial recognition and control their computer's mouse cursor using hand gestures in sterile environments (medical/semiconductor).

### Key Features (New Direction)
- **Desktop Application**: Electron-based app with React frontend
- **Real Mouse Control**: Direct manipulation of OS mouse cursor
- **Facial Authentication**: AWS Rekognition for secure user login
- **Subscription Model**: Free tier with ads vs Premium tier
- **Gesture Recognition**: MediaPipe-powered hand tracking for mouse control

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

### Backend (AWS Architecture - New Direction)
- **User Authentication**: AWS Rekognition for facial recognition login
- **User Management**: Amazon Cognito + DynamoDB for user profiles and subscription status
- **Subscription Management**: Stripe integration via Lambda functions
- **Advertisement Service**: DynamoDB for ad content + CloudWatch for metrics
- **API Gateway**: RESTful APIs for authentication, user management, and billing
- **Monitoring**: CloudWatch, X-Ray for app performance and usage analytics
- **Security**: KMS encryption, IAM roles, secure credential management

### Native System Integration
- **Mouse Control**: OS-specific APIs (Windows: user32.dll, macOS: Core Graphics, Linux: X11)
- **Camera Access**: Native camera permissions and MediaPipe integration
- **System Tray**: Background operation with system tray icon
- **Auto-start**: Launch on system boot (optional)

## Key Technologies (Updated Architecture)

- **Electron**: Cross-platform desktop app framework
- **React + TypeScript**: Frontend UI framework (reusing existing components)
- **MediaPipe**: Real-time hand tracking and gesture recognition
- **Node.js Native Modules**: Mouse control via robotjs or native bindings
- **AWS SDK**: Rekognition for facial auth, Cognito for user management
- **Native OS APIs**: Direct system integration for mouse control
- **Stripe API**: Payment processing for subscription management

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

## Development Roadmap (Desktop App Migration)

### Phase 1: Electron Setup & Migration
- [ ] **Electron Environment Setup**
  - Install electron, electron-builder, concurrently
  - Create main.js for Electron main process
  - Configure package.json for desktop app
  - Setup hot-reload for development

- [ ] **React App Integration**  
  - Migrate existing React components to Electron renderer
  - Configure build process for desktop distribution
  - Setup IPC (Inter-Process Communication) between main and renderer
  - Test camera access in Electron environment

### Phase 2: Native Mouse Control
- [ ] **Mouse Control Implementation**
  - Install robotjs or alternative mouse control library
  - Create mouse control service in main process
  - Map gesture coordinates to screen coordinates
  - Implement click, drag, scroll functionality
  - Handle multi-monitor setups

- [ ] **Gesture-to-Mouse Mapping**
  - Convert pinch gestures to mouse clicks
  - Map finger movement to cursor movement
  - Implement scroll gestures (two-finger pinch/spread)
  - Add right-click gesture (long press or specific finger position)

### Phase 3: AWS Rekognition Authentication
- [ ] **Facial Recognition Login**
  - Setup AWS SDK in Electron main process
  - Create face capture component using webcam
  - Implement face enrollment process for new users
  - Build face comparison login flow
  - Store user face data securely (encrypted local + AWS)

- [ ] **User Management System**
  - Integrate Amazon Cognito for user sessions
  - Create user profile management
  - Implement subscription status tracking
  - Setup secure token storage

### Phase 4: Subscription & Advertisement System
- [ ] **User Tier Management**
  - Create free vs premium user logic
  - Implement subscription status checking
  - Setup Stripe payment integration
  - Build subscription management UI

- [ ] **Advertisement System (Free Users)**
  - Create ad display component (bottom-right overlay)
  - Implement ad rotation and scheduling
  - Setup ad analytics and tracking
  - Create ad-free experience for premium users
  - Add "Upgrade to Premium" prompts

### Phase 5: Production Features
- [ ] **System Integration**
  - System tray integration with minimize to tray
  - Auto-start on system boot (optional setting)
  - Keyboard shortcuts for app control
  - Multiple workspace/monitor support

- [ ] **Security & Performance**
  - Implement secure credential storage
  - Add usage analytics and performance monitoring
  - Create auto-update mechanism
  - Setup crash reporting and error tracking

### Phase 6: Distribution & Deployment
- [ ] **App Packaging**
  - Configure electron-builder for Windows/macOS/Linux
  - Create installer packages
  - Setup code signing certificates
  - Prepare app store distribution (optional)

- [ ] **Backend Infrastructure**
  - Deploy AWS backend services
  - Setup CloudWatch monitoring
  - Configure API Gateway endpoints
  - Implement rate limiting and security

### Technical Challenges & Solutions
- **Camera Access**: Electron provides native camera access without browser restrictions
- **Mouse Control**: Use robotjs for cross-platform mouse control
- **Performance**: Optimize gesture recognition to prevent system lag
- **Security**: Secure storage of biometric data and user credentials
- **Cross-platform**: Handle OS-specific mouse control differences

## Project Structure (Electron App)

```
gesture-mouse-app/
├── src/                          # Renderer Process (React)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── FaceLogin.tsx     # AWS Rekognition 얼굴인증
│   │   │   ├── UserProfile.tsx   # 사용자 프로필 관리
│   │   │   └── SubscriptionManager.tsx # 구독 관리
│   │   ├── mouse/
│   │   │   ├── GestureToMouse.tsx # 제스처-마우스 매핑
│   │   │   ├── MouseCalibration.tsx # 마우스 캘리브레이션
│   │   │   └── CursorOverlay.tsx  # 가상 커서 오버레이
│   │   ├── ads/
│   │   │   ├── AdBanner.tsx      # 광고 배너 (무료 사용자)
│   │   │   └── UpgradePrompt.tsx # 프리미엄 업그레이드 안내
│   │   ├── CameraView.tsx        # 웹캠 피드 (재사용)
│   │   └── SystemTray.tsx        # 시스템 트레이 UI
│   ├── hooks/
│   │   ├── useGestureToMouse.ts  # 제스처→마우스 제어 훅
│   │   ├── useFaceAuth.ts        # AWS Rekognition 훅
│   │   ├── useSubscription.ts    # 구독 상태 관리 훅
│   │   └── useDualHandGesture.ts # 기존 제스처 인식 (재사용)
│   ├── services/
│   │   ├── aws-rekognition.ts    # AWS 얼굴인식 서비스
│   │   ├── user-management.ts    # 사용자 관리 서비스
│   │   ├── subscription.ts       # 구독/결제 서비스
│   │   └── analytics.ts          # 사용량 분석 서비스
│   ├── types/
│   │   ├── User.ts               # 사용자 타입 정의
│   │   ├── Subscription.ts       # 구독 타입 정의
│   │   └── MouseControl.ts       # 마우스 제어 타입
│   └── App.tsx                   # 메인 렌더러 앱
├── electron/                     # Main Process
│   ├── main.ts                   # Electron 메인 프로세스
│   ├── mouse-control.ts          # 네이티브 마우스 제어
│   ├── system-integration.ts     # 시스템 트레이, 자동시작
│   ├── ipc-handlers.ts           # IPC 통신 핸들러
│   └── security.ts               # 보안 및 권한 관리
├── aws-backend/                  # AWS 백엔드 코드
│   ├── lambda/
│   │   ├── face-auth/            # 얼굴인증 Lambda
│   │   ├── user-management/      # 사용자 관리 Lambda
│   │   └── subscription/         # 구독관리 Lambda
│   ├── api-gateway/              # API Gateway 설정
│   └── cloudformation/           # 인프라 코드
├── package.json
├── electron-builder.json         # 앱 패키징 설정
└── tsconfig.json
```

### Key Components (New Architecture)
- **`main.ts`**: Electron 메인 프로세스, 시스템 권한 관리
- **`mouse-control.ts`**: robotjs를 이용한 실제 마우스 제어
- **`FaceLogin.tsx`**: AWS Rekognition 기반 얼굴 인증 UI
- **`GestureToMouse.tsx`**: 손 제스처를 실제 마우스 동작으로 변환
- **`useGestureToMouse.ts`**: 제스처-마우스 매핑 로직
- **`AdBanner.tsx`**: 무료 사용자용 광고 시스템