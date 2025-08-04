# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based touchless file management system designed for sterile environments (medical/semiconductor). Users interact with AWS EFS using hand gestures and voice commands through a React.js frontend with MediaPipe integration.

## Development Commands

```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Eject from Create React App (use with caution)
npm run eject
```

## Architecture

### Frontend (React.js)
- **Framework**: React 19.1.1 with Create React App
- **Hand Gesture Recognition**: MediaPipe (@mediapipe/tasks-vision, @mediapipe/hands)
- **Core Components**:
  - `FileExplorer` - Left panel EFS file tree
  - `FileView` - Center panel directory contents  
  - `Clipboard` - Right panel for move operations
  - `CameraView` - Live webcam feed
  - `HandSilhouette` - Gesture visualization overlay
- **Custom Hook**: `useGestureRecognition` - MediaPipe integration

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

- The main application was recently deleted - check git history (commit ef440f5) for the last working version
- MediaPipe model file: `public/gesture_recognizer.task`
- Camera feed is mirrored for natural interaction
- 마우스형 제스처 시스템: 검지 커서 + 손목 꺾기 클릭 방식
- Three-panel UI layout follows the specification in GEMINI.md

## Hardware Setup & User Interaction

### Camera Configuration
- **웹캠 위치**: 사용자 정면 화면 위쪽에 배치
- **앵글 설정**: 낮춘 각도로 손만 비추도록 조정 (상체/얼굴 제외)
- **사용자 자세**: 선 자세에서 전면 화면 대면
- **촬영 범위**: 손 동작 영역에 집중

## Gesture System Design

### 마우스형 제스처 시스템
- **커서**: 오른손 검지 끝점 (INDEX_FINGER_TIP)을 화면 좌표계로 매핑
- **클릭 감지**: 손목 각도 변화 (WRIST → MCP_INDEX 벡터 분석)
- **드래그**: 클릭 상태에서의 검지 위치 추적
- **상태 관리**: IDLE → CLICK_START → DRAGGING → CLICK_END

### MediaPipe 랜드마크 활용
```javascript
// 필요 랜드마크 포인트
- WRIST (0): 손목 기준점
- INDEX_FINGER_TIP (8): 커서 위치
- INDEX_FINGER_MCP (5): 손목 각도 계산용

// 손목 꺾기 감지 알고리즘
const detectWristBend = (landmarks) => {
  const wrist = landmarks[0];           // WRIST
  const indexMcp = landmarks[5];        // INDEX_FINGER_MCP
  const indexTip = landmarks[8];        // INDEX_FINGER_TIP
  
  // 손목-검지 기준점 벡터
  const wristToMcp = {
    x: indexMcp.x - wrist.x,
    y: indexMcp.y - wrist.y,
    z: indexMcp.z - wrist.z
  };
  
  // Z축 변화량으로 손목 꺾임 감지 (앞으로 꺾기)
  const bendThreshold = -0.02; // 조정 가능한 임계값
  const isBent = wristToMcp.z < bendThreshold;
  
  return isBent;
};

// 커서 위치 매핑
const mapCursorPosition = (indexTip, canvasWidth, canvasHeight) => {
  return {
    x: indexTip.x * canvasWidth,
    y: indexTip.y * canvasHeight
  };
};

// 제스처 상태 관리
const GestureState = {
  IDLE: 'idle',           // 대기 상태
  CLICK_START: 'click_start', // 클릭 시작
  DRAGGING: 'dragging',   // 드래그 중
  CLICK_END: 'click_end'  // 클릭 종료
};

// 제스처 이벤트 처리
class MouseGestureHandler {
  constructor() {
    this.state = GestureState.IDLE;
    this.dragStartPosition = null;
    this.currentCursor = { x: 0, y: 0 };
  }
  
  processGesture(landmarks) {
    const isBent = detectWristBend(landmarks);
    const cursorPos = mapCursorPosition(landmarks[8], window.innerWidth, window.innerHeight);
    
    // 상태 전환 로직
    switch(this.state) {
      case GestureState.IDLE:
        if (isBent) {
          this.state = GestureState.CLICK_START;
          this.dragStartPosition = cursorPos;
          this.onClickStart(cursorPos);
        }
        break;
        
      case GestureState.CLICK_START:
        if (!isBent) {
          this.state = GestureState.CLICK_END;
          this.onClick(cursorPos);
        } else if (this.hasMoved(cursorPos, this.dragStartPosition)) {
          this.state = GestureState.DRAGGING;
          this.onDragStart(this.dragStartPosition);
        }
        break;
        
      case GestureState.DRAGGING:
        if (!isBent) {
          this.state = GestureState.CLICK_END;
          this.onDragEnd(cursorPos);
        } else {
          this.onDrag(cursorPos);
        }
        break;
        
      case GestureState.CLICK_END:
        this.state = GestureState.IDLE;
        break;
    }
    
    this.currentCursor = cursorPos;
    this.onCursorMove(cursorPos);
  }
  
  hasMoved(current, start, threshold = 10) {
    const distance = Math.sqrt(
      Math.pow(current.x - start.x, 2) + 
      Math.pow(current.y - start.y, 2)
    );
    return distance > threshold;
  }
  
  // 이벤트 핸들러들
  onCursorMove(position) { /* 커서 위치 업데이트 */ }
  onClickStart(position) { /* 클릭 시작 처리 */ }
  onClick(position) { /* 단순 클릭 처리 */ }
  onDragStart(position) { /* 드래그 시작 처리 */ }
  onDrag(position) { /* 드래그 중 처리 */ }
  onDragEnd(position) { /* 드래그 종료 처리 */ }
}
```

### 추후 개선 필요사항 (휴리스틱)
- **카메라 각도 자동 조정**: 사용자 키/자세에 따른 최적 앵글 계산
- **손 인식 영역 최적화**: 배경 노이즈 제거 및 ROI(Region of Interest) 설정
- **조명 조건 보상**: 다양한 조명 환경에서의 인식률 개선
- **다중 사용자 대응**: 키 차이에 따른 적응형 인식 시스템
- **피로도 감소**: 장시간 사용시 손목/어깨 피로 최소화 각도 연구
- **손목 각도 임계값 최적화**: 개인별 손목 움직임 패턴에 맞는 클릭 감도 조정
- **떨림 보정**: 자연스러운 손 떨림으로 인한 오인식 방지 필터링

## Project Structure

When restored, the typical structure includes:
- `src/components/` - React UI components
- `src/hooks/` - Custom React hooks
- `public/` - Static assets including MediaPipe models
- `src/App.js` - Main application entry point