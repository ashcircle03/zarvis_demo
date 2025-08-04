# 음성 기반 파일 조작 시스템 아키텍처

## 개요

음성 제스처를 통한 파일 생성 및 조작 시스템의 기술적 분석과 구현 방안

## 시스템 아키텍처

```
[제스처 인식] → [음성 녹음] → [Speech-to-Text] → [LLM 처리] → [AWS Lambda] → [EFS 조작]
```

## 기술적 가능성 검토

### ✅ 가능한 기능들

1. **음성 녹음 제스처**
   - 기존 제스처 시스템에 새로운 제스처 추가
   - Web Audio API + MediaRecorder 활용
   - 예시: 검지+중지 올리기 → 녹음 시작/종료

2. **음성-텍스트 변환**
   - Web Speech API 또는 AWS Transcribe
   - 실시간 변환 지원
   - 다양한 언어 지원

3. **LLM 명령 전송**
   - 텍스트 확인 후 제스처로 전송
   - 자동 전송 옵션 제공

4. **AWS EFS 조작**
   - Lambda를 통한 파일시스템 조작
   - 표준 파일 I/O 작업 지원

## 음성 데이터 프라이버시 분석

### Web Speech API의 Google 서버 의존성

**문제점:**
- 브라우저 API이지만 실제 처리는 Google 클라우드에서 수행
- 음성 데이터가 Google 서버로 전송됨
- 프라이버시 및 보안 우려

**원인:**
```javascript
// Web Speech API는 브라우저 API이지만
// 실제 음성 인식은 Google의 클라우드에서 처리됨
const recognition = new webkitSpeechRecognition();
// ↓ 음성 데이터가 Google 서버로 전송됨
```

1. **브라우저 제한**: 실시간 음성 인식을 위한 충분한 컴퓨팅 파워 부족
2. **모델 크기**: 정확한 음성 인식 모델은 수GB 크기로 브라우저 다운로드 불가능
3. **Chrome 의존성**: Chrome의 기본 음성 인식 엔진이 Google 서비스 사용

## AWS 내부망 대안 솔루션

### Option 1: AWS Transcribe + VPC Private Endpoint (권장)

```typescript
// 완전히 AWS 내부망에서 처리 가능
const transcribeClient = new TranscribeClient({
  region: 'us-east-1',
  endpoint: 'https://vpce-xxxxx-transcribe.us-east-1.vpce.amazonaws.com' // VPC Endpoint
});

// 실시간 스트리밍 가능
const streamingClient = new TranscribeStreamingClient({
  region: 'us-east-1'
});
```

**장점:**
- ✅ AWS 내부망에서만 처리
- ✅ 실시간 스트리밍 지원
- ✅ Lambda와 완벽 통합
- ✅ VPC Private Endpoint로 인터넷 우회 없음

### Option 2: OpenAI Whisper (Self-Hosted)

```dockerfile
# Lambda 컨테이너에 Whisper 모델 포함
FROM public.ecr.aws/lambda/python:3.11

RUN pip install openai-whisper torch
COPY whisper-model/ /opt/ml/model/
COPY app.py ${LAMBDA_TASK_ROOT}
```

**장점:**
- ✅ 완전한 온프레미스 처리
- ✅ 외부 서버 의존성 없음
- ✅ 오픈소스, 무료

**단점:**
- ❌ Lambda 실행 시간 제한 (15분)
- ❌ 메모리 사용량 높음 (최대 10GB)

### Option 3: 하이브리드 아키텍처 (최종 권장)

**브라우저 측:**
```typescript
// 브라우저: 로컬 녹음만
const recorder = new MediaRecorder(stream);
recorder.start();

// 녹음 완료 후 AWS로 전송
const audioBlob = new Blob(chunks, { type: 'audio/wav' });
const response = await fetch('/api/transcribe', {
  method: 'POST',
  body: audioBlob
});
```

**Lambda 측:**
```python
# Lambda: AWS Transcribe 사용
import boto3
import json
import time

def lambda_handler(event, context):
    transcribe = boto3.client('transcribe', 
        endpoint_url='https://vpce-xxxxx-transcribe.us-east-1.vpce.amazonaws.com')
    
    # S3에 업로드된 음성 파일 처리
    job_name = f"transcribe-{int(time.time())}"
    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': f's3://bucket/{audio_file}'},
        MediaFormat='wav',
        LanguageCode='ko-KR'
    )
```

## AWS EFS 조작 방법

### CLI vs Lambda 비교

**CLI 직접 조작**: ❌ **불가능**
- EFS는 NFS 파일시스템으로 CLI 명령어로 직접 조작 불가
- `aws efs` CLI는 EFS 생성/삭제/설정용, 파일 조작용 아님

**Lambda 방식**: ✅ **가능 및 권장**

```python
# Lambda 내에서 EFS 파일 조작 예시
import os
import json

def lambda_handler(event, context):
    # EFS 마운트 경로: /mnt/efs
    efs_path = '/mnt/efs'
    
    command = event['command']  # LLM에서 파싱된 명령
    
    if command['action'] == 'create_folder':
        os.makedirs(f"{efs_path}/{command['folder_name']}")
    elif command['action'] == 'create_file':
        with open(f"{efs_path}/{command['file_path']}", 'w') as f:
            f.write(command['content'])
    elif command['action'] == 'list_files':
        return os.listdir(f"{efs_path}/{command['path']}")
    elif command['action'] == 'delete_file':
        os.remove(f"{efs_path}/{command['file_path']}")
    elif command['action'] == 'move_file':
        os.rename(f"{efs_path}/{command['source']}", 
                 f"{efs_path}/{command['destination']}")
```

### Lambda EFS 설정

```yaml
# serverless.yml
functions:
  fileOperations:
    handler: handler.fileOperations
    fileSystemConfigs:
      - arn: arn:aws:elasticfilesystem:region:account:access-point/fsap-xxxxx
        localMountPath: /mnt/efs
    vpc:
      securityGroupIds: [sg-xxxxx]
      subnetIds: [subnet-xxxxx]
    environment:
      EFS_MOUNT_PATH: /mnt/efs
```

## 성능 및 비용 비교

| 방식 | 지연시간 | 정확도 | 프라이버시 | 비용 |
|------|----------|--------|------------|------|
| Web Speech API | ~200ms | 높음 | ❌ Google 서버 | 무료 |
| AWS Transcribe | ~500ms | 높음 | ✅ AWS VPC | $0.024/분 |
| Whisper (Self) | ~2-5초 | 높음 | ✅ 완전 로컬 | 컴퓨팅 비용만 |

## 구체적인 구현 계획

### Phase 1: 음성 인터페이스 추가

```typescript
// 새로운 제스처 정의
export interface VoiceGesture {
  type: 'start_recording' | 'stop_recording' | 'send_command';
  confidence: number;
}

// 음성 녹음 훅
export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
}
```

### Phase 2: LLM 통합

```typescript
const processVoiceCommand = async (audioBlob: Blob) => {
  // 1. S3에 오디오 업로드
  const audioUrl = await uploadToS3(audioBlob);
  
  // 2. AWS Transcribe로 변환
  const transcript = await transcribeAudio(audioUrl);
  
  // 3. LLM으로 명령어 파싱
  const response = await fetch('/api/process-command', {
    method: 'POST',
    body: JSON.stringify({ 
      command: transcript,
      currentPath: selectedFolder 
    })
  });
  
  return response.json(); // 구조화된 명령어 반환
};
```

### Phase 3: 최종 아키텍처

```
[브라우저 녹음] → [S3 Upload] → [Lambda Trigger] → [AWS Transcribe VPC] 
                                      ↓
[EFS 조작] ← [Lambda 실행] ← [LLM 처리] ← [텍스트 반환]
```

## 주요 고려사항

### 기술적 제약
1. **프라이버시**: 음성 데이터 처리 위치 선택 필요
2. **지연시간**: EFS 콜드 스타트 시 수백ms 지연
3. **비용**: Lambda 호출 + EFS 스토리지 + Transcribe 사용료
4. **보안**: VPC 설정, 보안 그룹 구성 필요

### 보안 요구사항
- VPC Private Endpoint 설정
- IAM 역할 및 정책 구성
- 음성 데이터 암호화 (전송 중, 저장 시)
- 접근 로그 및 모니터링

## 권장 구현 순서

1. **음성 제스처 + 로컬 녹음** 구현
2. **AWS Transcribe + VPC** 설정
3. **LLM 명령어 파싱** 시스템 구축  
4. **Mock Lambda API** 로컬 테스트
5. **실제 AWS EFS + Lambda** 배포
6. **보안 및 모니터링** 설정

## 결론

전체 시스템이 기술적으로 완전히 실현 가능하며, AWS 내부망을 활용한 프라이버시 보호 솔루션이 존재합니다. Web Speech API의 Google 의존성을 완전히 제거하고 AWS Transcribe + VPC Private Endpoint를 사용하는 것이 보안 관점에서 최적의 접근 방식입니다.