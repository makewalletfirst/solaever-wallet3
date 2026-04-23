# SolaEver Wallet (SLE)

SolaEver 블록체인 전용 안드로이드 지갑 어플리케이션입니다. 

## 🚀 주요 기능
- **지갑 생성 및 복구**: 12단어 니모닉(Mnemonic)을 통한 지갑 생성 및 복구 지원.
- **보안 저장**: `Expo SecureStore`를 사용하여 기기 내에 암호화된 상태로 키(Mnemonic)를 안전하게 저장.
- **실시간 잔고 조회**: SolaEver RPC (`https://rpc-sola.ever-chain.xyz`) 연동 및 `processed` 상태 기반 초고속 잔액 확인.
- **최적화된 SLE 전송**: 테스트 밸리데이터 환경에 최적화된 고속 트랜잭션 전송 시스템.
- **네트워크 최적화**: 안드로이드 보안 정책 대응 및 커스텀 폴리필(Shim)을 통한 통신 안정화.

## 🛠 기술 스택
- **Framework**: React Native (Expo SDK 51+)
- **Language**: TypeScript
- **Blockchain SDK**: `@solana/web3.js`
- **Crypto & Polyfills**: `bip39`, `ed25519-hd-key`, `buffer`, `react-native-get-random-values`, `text-encoding`, `process`
- **Navigation**: React Navigation (Stack)

## 🏗 구현 및 트러블슈팅 과정 (Final)
1. **환경 설정 (Polyfills)**: `Uint8Array.prototype.slice` 누락 방지 로직을 포함한 `shim.js`를 구축하여 암호화 라이브러리 초기화 에러 해결.
2. **네트워크 보안 대응**: `network_security_config.xml` 도입 및 `INTERNET` 권한 설정을 통해 안드로이드 시스템의 통신 차단 문제 해결.
3. **RPC 통신 보강**: `fetch` 요청 시 `User-Agent` 헤더를 추가하여 서버 거부를 방지하고 직접 JSON-RPC 호출 방식을 병행하여 안정성 확보.
4. **전송 로직 최적화 (핵심)**:
   - **Commitment 최적화**: `processed` 단계를 사용하여 블록 생성 속도가 빠른 환경에서도 트랜잭션 만료(`Block height exceeded`) 없이 즉시 확인 가능하도록 구현.
   - **노드 레벨 재시도**: `maxRetries: 5` 설정을 통해 RPC 노드가 트랜잭션을 반복 전송하도록 하여 성공률 극대화.
   - **수동 상태 폴링**: 라이브러리의 자동 확인 로직 대신 2초 간격의 수동 `getSignatureStatus` 체크를 도입하여 앱의 반응성 개선.
   - **사전 잔고 검사**: 전송 시도 전 수수료(약 0.000005 SLE) 포함 여부를 미리 계산하여 `0x1 (Insufficient Funds)` 에러를 사용자 친화적인 메시지로 사전 안내.

## 📦 빌드 방법 (Local Build)

### 1. 의존성 설치
```bash
npm install
```

### 2. 안드로이드 빌드 준비 (Prebuild)
```bash
npx expo prebuild --platform android
```

### 3. APK 빌드 (고성능 권장)
```bash
cd android
export ANDROID_HOME=/your/android/sdk/path
./gradlew assembleDebug --no-daemon --max-workers=4
```

---
Developed for **SolaEver Network**.
