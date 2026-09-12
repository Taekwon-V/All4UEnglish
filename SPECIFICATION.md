# 📖 All4UEnglish 시스템 요구사항 및 기능 상세 명세서 (PRD & Spec)

* **프로젝트명**: All4UEnglish (All for You English)
* **타겟 사용자**: 아내 1인 맞춤형 프라이빗 영어 학습 웹 애플리케이션
* **최적화 기기**: 삼성 갤럭시 S26 (19.5:9 롱스크린 모바일 퍼스트, One-Hand UX, PWA 지원)
* **핵심 인프라**: Google Gemini API + Firebase (Auth Whitelist & Cloud Firestore) + Web Speech API + Vercel

---

## 1. 프로젝트 철학 및 기본 원칙 (Karpathy First Principles)

1. **First Principles & 극단적 단순성 (Zero-Bloat)**:
   * 아내가 책이나 영상으로 공부한 내용을 소리 내어 읽으면 즉시 단어, 문법, 회화 예시, 퀴즈로 전환해주는 본질에 집중한다.
   * 불필요한 기능 추가나 거대 프레임워크 뒤에 숨지 않고, 동작 원리를 투명하게 제어할 수 있는 최소한의 코드로 구현한다.
2. **Deterministic Closed-Loop (닫힌 피드백 평가 루프)**:
   * 모든 기능 블록은 가짜 데이터(Mock Data)를 주입받아 단독 브라우저 러너(`Standalone Runner`)에서 독립 실행 및 검증이 가능해야 한다.
   * 코딩 후에는 반드시 직접 실행 및 테스트하여 오차를 수렴시킨다.
3. **Micro-Milestones (작은 단위 점진적 빌드)**:
   * 한 번에 거대하게 구축하지 않고, 독립 기능 객체(레고 블록)를 하나씩 빌드하고 검증한 뒤 메인 앱에 조립한다.

---

## 2. 시스템 아키텍처 & 레고 블록 구조 (Lego-Block Architecture)

### 2.1 아키텍처 다이어그램
```
┌─────────────────────────────────────────────────────────────┐
│                 App Shell (레고 조립 보드)                    │
│      [화이트리스트 인증] + [공통 이벤트 허브] + [하단 탭]      │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Props & Event 전달)
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
 ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
 │ 🧱 Block 1     │       │ 🧱 Block 2     │       │ 🧱 Block 3     │
 │ VoiceInput    │       │ GeminiAnalyzer│       │ VocaCardDeck  │
 │ (단독 실행 가능)│       │ (단독 실행 가능)│       │ (단독 실행 가능)│
 └───────────────┘       └───────────────┘       └───────────────┘
       ▲                       ▲                       ▲
       └───────────────────────┴───────────────────────┘
           🛠️ 각 블록별 Standalone Runner (독립 테스트 화면)
```

### 2.2 블록 표준 규격 (Standard Contract)
```typescript
interface FeatureBlock<TProps, TOutput> {
  id: string;                                          // 블록 고유 ID
  name: string;                                        // 블록 명칭
  Component: React.FC<BlockProps<TProps, TOutput>>;    // 렌더링 UI 컴포넌트
  mockData: TProps;                                    // 독립 실행 검증용 Mock 데이터
}

interface BlockProps<TProps, TOutput> {
  data: TProps;                                        // 입력 데이터
  onEvent?: (eventName: string, payload: any) => void; // 이벤트 전달
  onComplete?: (result: TOutput) => void;              // 완료 콜백
  isStandalone?: boolean;                              // 단독 테스트 모드 여부
}
```

### 2.3 10대 독립 기능 객체(레고 블록) 명세
1. **`AuthGateBlock`**: 아내 지정 구글 이메일 1개만 허용하는 화이트리스트 접근 제어 블록
2. **`VoiceInputBlock`**: 마이크 녹음(Web Speech STT), 파형 시각화, 인라인 텍스트 편집기 블록
3. **`GeminiAnalyzerBlock`**: 원문 텍스트를 받아 [단어+문법+회화+퀴즈] JSON으로 파싱하는 헤드리스 AI 엔진
4. **`PassageBarBlock`**: 상단 접이식 원문 표시 및 전체 TTS(0.8x/1.0x) 오디오 플레이어 블록
5. **`VocaCardBlock`**: 3D 부드러운 플립, 발음 듣기, 스와이프 암기 상태 토글 단어 카드 블록
6. **`GrammarCardBlock`**: 문법 공식 배지, 컬러 문장 청크, 아내 맞춤 변형 예문 3단 블록
7. **`RoleplayShadowingBlock`**: 원어민(A)-아내(B) 2턴 롤플레이 음성 재생 및 아내 음성 쉐도잉 채점 블록
8. **`MicroQuizBlock`**: 단어 청크 터치 조립 및 4지선다형 마이크로 퀴즈 + 컨페티 리워드 블록
9. **`WordArchiveBlock`**: 저장된 단어장 필터링(전체/헷갈려요/외웠어요), 실시간 검색, 북마크 블록
10. **`RadioPlayerBlock`**: 화면이 꺼져도 단어-뜻-예문을 순차 재생하는 백그라운드 연속 오디오 블록

---

## 3. UI/UX 화면 구성 및 레이아웃 정의

### 3.1 화면 목록
* **화면 1 (`/login`)**: 감성적인 일러스트와 구글 로그인 카드 (비인가자 차단 모달)
* **화면 2 (`/`)**: 홈 대시보드 (학습 스트릭, 데일리 응원 문구, 최근 학습 캐러셀, 대형 마이크 CTA)
* **화면 3 (`/input`)**: 음성 녹음 및 텍스트 입력 화면 (오디오 파형 애니메이션, 텍스트 수정 에디터)
* **화면 4 (`/lesson/:id`)**: 학습 뷰어 (상단 원문 바 + 단어/문법/회화/퀴즈 탭 or 스와이프 덱)
* **화면 5 (`/archive`)**: 나만의 보관함 (단어장 필터링, 날짜별 과거 학습 세션 타임라인)
* **화면 6 (`/settings`)**: 설정 (TTS 성별/속도 설정, 계정 관리)

### 3.2 갤럭시 S26 최적화 UI 가이드
* **종횡비**: 19.5:9 비율 대응 반응형 레이아웃
* **원핸드 인터랙션 (One-Hand UX)**: 핵심 터치 버튼(마이크, 다음/이전, 카드 플립/스와이프)을 하단 35% 영역에 집중 배치
* **디자인 톤**:
  * 배경: 웜 크림/샌드 톤 (`#FDFBF7`)
  * 포인트 컬러: 딥 세이지 그린 (`#2E6F5E`) & 소프트 코랄 (`#FF7B60`)
  * 표면: 반투명 글래스모피즘 (`backdrop-filter: blur(12px)`)
  * 폰트: 영어(Outfit/Plus Jakarta Sans), 한글(Pretendard)

---

## 4. 67대 세부 기능 명세표 (Detailed Feature Matrix)

| No | 기능 ID | 기능명 | 기능 상세 설명 | 연결 블록/화면 | 우선순위 |
| :---: | :---: | :--- | :--- | :--- | :---: |
| 1 | `AUTH-01` | 구글 팝업/리다이렉트 로그인 | Firebase Google Auth 연동을 통한 원터치 간편 로그인 | `AuthGateBlock` (`/login`) | **MVP** |
| 2 | `AUTH-02` | 아내 계정 화이트리스트 검증 | 지정된 아내분의 구글 이메일 1개만 허용, 타 계정 즉시 차단 | `AuthGateBlock` | **MVP** |
| 3 | `AUTH-03` | 비인가 접근 차단 안내 | 허가되지 않은 계정 접근 시 따뜻하고 단호한 전용 앱 안내 모달 표시 | `AuthGateBlock` (`/login`) | **MVP** |
| 4 | `AUTH-04` | 세션 영구 유지 (Keep-alive) | 앱 재방문 시 재로그인 없이 즉시 홈 진입 | `AuthGateBlock` | **MVP** |
| 5 | `AUTH-05` | 안전한 로그아웃 | 계정 세션을 완전히 종료하고 로그인 화면으로 전환 | `/settings` | P1 |
| 6 | `HOME-01` | 오늘의 학습 스트릭 계산 | Firestore 학습 기록 기반 연속 학습 일수(Flame 배지) 표시 | `/` (헤더) | P1 |
| 7 | `HOME-02` | 데일리 AI 응원 한마디 | 아침마다 Gemini가 생성하는 짧고 따뜻한 오늘의 영어 한마디 | `/` (상단) | P1 |
| 8 | `HOME-03` | 원터치 '학습 시작' 대형 CTA | 하단 엄지손가락 영역 대형 마이크/입력 시작 버튼 | `/` (하단) | **MVP** |
| 9 | `HOME-04` | 최근 학습 세션 캐러셀 | 최근 공부했던 지문과 날짜 카드 가로 스크롤 프리뷰 | `/` (중앙) | **MVP** |
| 10 | `HOME-05` | 헷갈리는 단어 퀵 복습 | 암기 미완료 단어 중 3개 무작위 추출 복습 위젯 | `/` (중앙) | P1 |
| 11 | `HOME-06` | 누적 학습 통계 요약 | 학습한 문장 수, 단어 수, 퀴즈 정답률 요약 배지 | `/` (상단) | P2 |
| 12 | `INP-01` | STT 음성인식 시작/정지 | Web Speech API 기반 실시간 음성 듣기 시작/종료 토글 | `VoiceInputBlock` (`/input`) | **MVP** |
| 13 | `INP-02` | 오디오 웨이브 시각화 | 말하는 동안 마이크 주변 부드러운 오디오 펄스 애니메이션 출력 | `VoiceInputBlock` | P1 |
| 14 | `INP-03` | 실시간 음성 텍스트 변환 | 읽은 문장이 화면 텍스트 영역에 실시간으로 타이핑 표시 | `VoiceInputBlock` | **MVP** |
| 15 | `INP-04` | 인식된 텍스트 인라인 수정 | 음성 인식 오류 수정 및 다듬기용 터치 키보드 편집 | `VoiceInputBlock` | **MVP** |
| 16 | `INP-05` | 텍스트 직접 붙여넣기 모드 | 마이크 사용 불가 시 클립보드 붙여넣기 및 직접 입력 | `VoiceInputBlock` | **MVP** |
| 17 | `INP-06` | 입력 내용 원터치 클리어 | 입력창 내용을 한 번에 지우고 다시 말하는 리셋 버튼 | `VoiceInputBlock` | **MVP** |
| 18 | `INP-07` | 'AI 분석 시작' 유효성 검사 | 빈 문장 입력 방지 및 로딩 스켈레톤 화면 전환 | `VoiceInputBlock` | **MVP** |
| 19 | `AI-01` | 원스톱 구조화 프롬프트 | 단어, 문법, 회화, 퀴즈를 1회 호출로 추출하는 엄격한 JSON 스키마 | `GeminiAnalyzerBlock` | **MVP** |
| 20 | `AI-02` | 문맥 어휘 추출 로직 | 핵심 어휘 3~5개 선정 및 문맥상 의미, 품사, 발음기호 추출 | `GeminiAnalyzerBlock` | **MVP** |
| 21 | `AI-03` | 실전문법 패턴 추출 로직 | 어려운 용어 대신 실용 패턴 공식과 색상 청크로 구조화 | `GeminiAnalyzerBlock` | **MVP** |
| 22 | `AI-04` | 2턴 롤플레이 대화문 생성 | 배운 표현을 활용한 실생활 상황(A/B) 롤플레이 대화문 생성 | `GeminiAnalyzerBlock` | **MVP** |
| 23 | `AI-05` | 복습 마이크로 퀴즈 생성 | 청크 조립 및 빈칸 퀴즈 2~3문제 자동 생성 | `GeminiAnalyzerBlock` | **MVP** |
| 24 | `AI-06` | JSON 파싱 오류 자동 복구 | 비정상 응답 시 정규식 파싱 및 자동 Fallback 처리기 | `GeminiAnalyzerBlock` | **MVP** |
| 25 | `DB-01` | 학습 세션 문서 자동 저장 | 분석 완료된 원문/단어/문법/회화/퀴즈 데이터를 Firestore에 저장 | `Firestore Service` | **MVP** |
| 26 | `DB-02` | 단어 마스터 컬렉션 동기화 | 단어 누적 저장으로 전체 어휘량 및 중복 카운트 관리 | `Firestore Service` | P1 |
| 27 | `DB-03` | 단어 암기 상태 실시간 반영 | '외웠어요'/'헷갈려요' 상태 변경 서버 즉시 동기화 | `Firestore Service` | **MVP** |
| 28 | `DB-04` | 퀴즈 풀이 결과 저장 | 퀴즈 정답 여부 및 오답 노트 세션에 기록 | `Firestore Service` | P1 |
| 29 | `DB-05` | 로컬 오프라인 캐싱 | 네트워크 불안정 시에도 최근 카드를 볼 수 있는 로컬 캐시 | `Client Cache` | P2 |
| 30 | `VIEW-01` | 상단 접이식 원문 카드 | 학습 중 원문을 언제든 볼 수 있게 배치 (터치 시 토글) | `PassageBarBlock` (`/lesson/:id`) | **MVP** |
| 31 | `VIEW-02` | 원문 전체 TTS 재생/정지 | 지문 전체를 자연스러운 원어민 억양으로 낭독 | `PassageBarBlock` | **MVP** |
| 32 | `VIEW-03` | 재생 속도 3단 토글 | 0.8x(느리게) / 1.0x(보통) / 1.2x(빠르게) 속도 조절 | `PassageBarBlock` | **MVP** |
| 33 | `VIEW-04` | 원문 수정 및 재분석 | 오타 수정 후 AI 재분석을 트리거하는 버튼 | `PassageBarBlock` | P2 |
| 34 | `VIEW-05` | 카드 학습 진행률 바 | 전체 카드 덱 중 현재 위치 게이지 표시 | `/lesson/:id` | **MVP** |
| 35 | `VOC-01` | 단어 카드 앞면 렌더링 | 핵심 표제어, 발음기호, 원문 속 빈칸 힌트 표시 | `VocaCardBlock` | **MVP** |
| 36 | `VOC-02` | 3D 부드러운 카드 플립 | 터치 시 180도 회전하는 3D CSS 플립 애니메이션 | `VocaCardBlock` | **MVP** |
| 37 | `VOC-03` | 단어 카드 뒷면 상세 렌더링 | 문맥 뉘앙스 풀이, 원문 형광펜 하이라이트, 생활 예문 표시 | `VocaCardBlock` | **MVP** |
| 38 | `VOC-04` | 단어별 원터치 발음 듣기 | 앞/뒷면 스피커 버튼 클릭 시 해당 단어 정확한 발음 재생 | `VocaCardBlock` | **MVP** |
| 39 | `VOC-05` | 스와이프 제스처 암기 판정 | 우측 스와이프(외웠어요) / 좌측 스와이프(헷갈려요) | `VocaCardBlock` | P1 |
| 40 | `VOC-06` | 단어 즐겨찾기(북마크) | 별표(★) 터치로 중요 단어 지정 | `VocaCardBlock` | **MVP** |
| 41 | `GRM-01` | 패턴 공식 배지 렌더링 | `[패턴 공식]`과 활용 태그(`#정중한_요청`) 표시 | `GrammarCardBlock` | **MVP** |
| 42 | `GRM-02` | 문장 컬러 청크 시각화 | 주어, 패턴, 수식어를 서로 다른 파스텔 블록으로 구분 | `GrammarCardBlock` | P1 |
| 43 | `GRM-03` | 아내 맞춤 변형 예문 3단 | 패턴을 적용한 일상 생활 대화 문장 3개 나열 | `GrammarCardBlock` | **MVP** |
| 44 | `GRM-04` | 변형 예문별 원터치 TTS | 3개 예문 각각을 터치하여 원어민 음성으로 청취 | `GrammarCardBlock` | **MVP** |
| 45 | `GRM-05` | 헷갈림 방지 뉘앙스 팁 모달 | 자주 헷갈리는 콩글리시나 전치사 오류 해설 박스 | `GrammarCardBlock` | P1 |
| 46 | `CONV-01` | 상황 설정 배지 표시 | `[📍 카페에서 주문할 때]` 등 생생한 대화 상황 헤더 | `RoleplayShadowingBlock` | **MVP** |
| 47 | `CONV-02` | A/B 대화 말풍선 렌더링 | 튜터(A)와 아내(B)의 2턴 핑퐁 대화 버블 출력 | `RoleplayShadowingBlock` | **MVP** |
| 48 | `CONV-03` | 원어민(A) 자동 음성 재생 | 회화 카드 진입 시 질문 문장을 먼저 음성으로 재생 | `RoleplayShadowingBlock` | P1 |
| 49 | `CONV-04` | 아내(B) 음성 쉐도잉 녹음 | 마이크 버튼을 누르고 아내가 직접 B 문장을 소리 내어 발음 | `RoleplayShadowingBlock` | P1 |
| 50 | `CONV-05` | 발음 일치도 채점 및 격려 | 말한 내용과 텍스트 일치도(%) 채점 및 칭찬 문구 | `RoleplayShadowingBlock` | P1 |
| 51 | `QZ-01` | 단어 청크 터치 조립 퀴즈 | 흩어진 단어 블록을 올바른 순서대로 터치해 문장 완성 | `MicroQuizBlock` | **MVP** |
| 52 | `QZ-02` | 문맥 빈칸 4지선다 퀴즈 | 문맥에 알맞은 단어/표현을 고르는 객관식 퀴즈 | `MicroQuizBlock` | **MVP** |
| 53 | `QZ-03` | 정답/오답 실시간 피드백 | 정답(녹색 펄스) / 오답(빨강 쉐이크 + 진동) 연출 | `MicroQuizBlock` | **MVP** |
| 54 | `QZ-04` | 즉시 친절 해설 보기 | 정답의 이유를 친절하게 설명해주는 한국어 해설 카드 | `MicroQuizBlock` | **MVP** |
| 55 | `QZ-05` | 세션 완료 컨페티 리워드 | 퀴즈 완료 시 화면 가득 축하 꽃가루 애니메이션 | `MicroQuizBlock` | **MVP** |
| 56 | `ARC-01` | 단어 상태 필터링 탭 | [전체] / [헷갈려요] / [외웠어요] / [북마크] 필터 | `WordArchiveBlock` (`/archive`) | **MVP** |
| 57 | `ARC-02` | 실시간 어휘 검색바 | 단어 스펠링 및 한글 뜻 실시간 검색 | `WordArchiveBlock` | P1 |
| 58 | `ARC-03` | 학습 세션 타임라인 | 날짜별 과거 학습 세션 목록 역순 조회 | `/archive` (세션탭) | **MVP** |
| 59 | `ARC-04` | 이전 세션 카드 재학습 | 과거 세션 클릭 시 당시 카드 덱 그대로 재열기 | `/lesson/:id` | **MVP** |
| 60 | `ARC-05` | 단어 및 세션 삭제/정리 | 불필요한 단어나 세션 제거 기능 | `WordArchiveBlock` | P2 |
| 61 | `RAD-01` | 단어장 순차 자동 재생 | [단어 1회 → 뜻 1회 → 예문 1회] 순서로 연속 낭독 | `RadioPlayerBlock` | P2 |
| 62 | `RAD-02` | 하단 미니 오디오 바 | 전 화면 공통 하단 미니 오디오 컨트롤러 | `RadioPlayerBlock` | P2 |
| 63 | `RAD-03` | 반복 재생 옵션 설정 | 단어당 2회 반복, 전체 반복, 셔플 재생 | `RadioPlayerBlock` | P2 |
| 64 | `RAD-04` | 잠금화면 제어(MediaSession) | 갤럭시 화면 꺼짐 상태에서도 잠금화면 미디어 컨트롤 지원 | `RadioPlayerBlock` | P2 |
| 65 | `SYS-01` | TTS 음성 커스텀 설정 | 원어민 음성 성별(여성/남성) 및 기본 배속 저장 | `/settings` | P1 |
| 66 | `SYS-02` | 갤럭시 S26 PWA 설치 | 홈 화면 추가 시 네이티브 앱처럼 전체화면 실행 지원 | PWA System | **MVP** |
| 67 | `SYS-03` | 갤럭시 S26 반응형 Safe Area | 롱스크린 최적화 및 하단 제스처 바 패딩 처리 | Global CSS | **MVP** |

---

## 5. 단계별 개발 로드맵 (Micro-Milestones)

* **Phase 1 (기반 환경 및 1인 인증)**:
  * Vite 기반 프로젝트 환경 구성
  * `AuthGateBlock`: Firebase Auth 구글 로그인 및 아내 이메일 화이트리스트 잠금 구현
* **Phase 2 (핵심 입력 & AI 분석)**:
  * `VoiceInputBlock`: Web Speech API 음성 녹음 및 텍스트 변환 구현
  * `GeminiAnalyzerBlock`: Gemini API 원스톱 구조화 프롬프트 연결 및 JSON 파싱 검증
* **Phase 3 (학습 뷰어 & 핵심 카드 인터랙션)**:
  * `PassageBarBlock`: 원문 표시 및 전체 TTS 플레이어 구현
  * `VocaCardBlock`: 3D 플립 단어 카드 및 개별 발음 듣기 구현
  * `GrammarCardBlock`: 문법 패턴 및 변형 예문 3단 구현
* **Phase 4 (인터랙션 & 데이터 동기화)**:
  * `MicroQuizBlock`: 단어 청크 조립 퀴즈 및 컨페티 효과 구현
  * Firebase Cloud Firestore 연동: 학습 세션 및 단어장 영구 저장
* **Phase 5 (보관함 & Vercel 배포)**:
  * `WordArchiveBlock`: 저장된 단어장 필터링 및 검색 구현
  * Vercel 배포 설정 및 갤럭시 S26 PWA 홈화면 추가 실기기 검증
