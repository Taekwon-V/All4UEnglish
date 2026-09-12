# 🌸 All4UEnglish (All for You English)

> **아내(Sarah)만을 위한 1:1 맞춤형 프라이빗 영어 학습 모바일 웹 애플리케이션**  
> *책에서 읽은 문장 하나가 단어, 문법, 숙어로 피어나고, 나만의 플레이리스트로 귀에 각인되는 영어 학습 시스템*

[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel)](https://all4-u-english.vercel.app)
[![Firestore](https://img.shields.io/badge/Database-Firestore-FFCA28?logo=firebase)](https://console.firebase.google.com/project/all4uenglish/firestore)
[![Gemini](https://img.shields.io/badge/Gemini_1.5_Flash-AI-4285F4?logo=google)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

👉 **프로덕션 라이브 접속**: [https://all4-u-english.vercel.app](https://all4-u-english.vercel.app)

---

## 🌟 핵심 기능 (5대 마스터 모듈)

### 1. 📷 🎙️ 멀티모달 문장 입력기 (`UniversalInput`)
- **사진 구역 드래그 크롭 (Vision OCR)**: 스마트폰으로 책이나 화면 사진을 찍은 뒤, 손가락/마우스로 문장 주변을 네모 박스로 드래그하면 Gemini Vision이 1초 만에 영어 텍스트와 번역을 추출합니다.
- **실시간 음성 말하기 (Web Speech STT)**: 마이크를 켜고 소리 내어 읽으면 실시간 텍스트 변환.
- **AI 스마트 분배**: 문장 등록 즉시 [추천 단어], [추천 문법 패턴], [추천 숙어/표현]을 자동 발굴하여 원클릭으로 각 보관함에 전송합니다.

### 2. 📖 문장장 & 플레이리스트 (`SentenceManager`)
- 직접 입력한 문장과 각 보관함에서 파생된 엄선 예문들을 영구 보관합니다.
- 출처 표시, 원어민 TTS(음성 합성), 북마크 기능 지원.
- **나만의 플레이리스트 그룹핑**: "카페 주문 표현", "산책할 때 들을 문장" 등 원하는 테마별로 문장들을 묶고 바로 라디오로 연속 청취.

### 3. 📚 서재: 단어장 / 문법장 / 숙어장 (`StudyLibrary`)
- **디폴트 원문 보존**: 원래 입력했던 문장이 기본 예시로 항상 함께 표시됩니다.
- **AI 실생활 예문 2~3개 무한 생성 ✨**: 터치할 때마다 아내의 일상에 맞춘 새로운 실생활 예문 2~3개를 실시간 무한 생성.
- **[문장장으로 저장 📥]**: 마음에 드는 예문을 클릭하면 즉시 문장장으로 영구 보관.

### 4. 🎧 플레이리스트 반복 오디오 라디오 (`RadioPlayer`)
- 화면을 끄고 주머니에 넣어도 백그라운드에서 편안하게 청취 가능.
- **3회 반복 / 무한 루프 / 1회만** 선택 가능.
- **영 ➔ 한 번역 ➔ 영** 순차 낭독 모드로 귀에 완벽히 각인.
- 0.8x / 1.0x / 1.2x 속도 조절 지원.

### 5. 🎯 암기 강화 테스트 (`RetentionTest`)
- 단어 / 문장 / 숙어 4지선다 암기 퀴즈.
- 즉각적인 원어민 사운드 피드백 및 결과 화면 컨페티(꽃가루) 축하 리워드.

---

## 🛠️ 기술 스택 & 엔지니어링 철학

- **Frontend**: React 18, Vite 6, Lucide-React, Canvas-Confetti
- **AI Engine**: Google Gemini 1.5 Flash (REST API & Fallback 시뮬레이터 내장)
- **Audio**: Web Speech API (`webkitSpeechRecognition` STT & `speechSynthesis` TTS)
- **Design System**: 세이지 그린 & 웜 크림 HSL 모바일 최적화 디자인 시스템
- **Engineering Core**: Andrej Karpathy의 *Zero-Bloat*, *Deterministic Closed-Loop*, *Micro-Milestones* 원칙 준수

---

## 🚀 빠른 시작 (Local Run)

```bash
# 1. 저장소 복제
git clone https://github.com/Taekwon-V/All4UEnglish.git
cd All4UEnglish

# 2. 의존성 패키지 설치
npm install

# 3. 환경 변수 설정 (.env)
cp .env.example .env
# .env 파일에 VITE_GEMINI_API_KEY 입력 (키 없이도 Fallback 시뮬레이터로 전체 동작 가능)

# 4. 개발 서버 실행
npm run dev

# 5. 프로덕션 빌드
npm run build
```

---

## 📱 지원 환경
- 삼성 갤럭시 S26 (19.5:9 롱스크린 최적화, Safe Area 및 One-Hand 하단 조작계)
- 모바일 웹 브라우저 (Chrome, Samsung Internet, Safari)
- 데스크톱 모던 브라우저
