/**
 * All4UEnglish Lego Feature Block Standard Contract
 * 
 * 모든 기능 객체는 이 표준 형식을 따르며, 
 * 독립 실행용 mockData와 단독 렌더링 컴포넌트를 반드시 포함합니다.
 */

/**
 * @typedef {Object} FeatureBlock
 * @property {string} id - 고유 블록 ID (예: 'auth-gate')
 * @property {string} name - 블록 명칭 (예: '1인 보안 인증 게이트')
 * @property {string} description - 블록 설명
 * @property {React.ComponentType<any>} Component - UI 컴포넌트
 * @property {any} mockData - 단독 실행 및 검증용 Mock 데이터
 */

export const BLOCK_IDS = {
  AUTH_GATE: 'AuthGate',
  VOICE_INPUT: 'VoiceInput',
  GEMINI_ANALYZER: 'GeminiAnalyzer',
  PASSAGE_BAR: 'PassageBar',
  VOCA_CARD: 'VocaCard',
  GRAMMAR_CARD: 'GrammarCard',
  ROLEPLAY_SHADOWING: 'RoleplayShadowing',
  MICRO_QUIZ: 'MicroQuiz',
  WORD_ARCHIVE: 'WordArchive',
  RADIO_PLAYER: 'RadioPlayer'
};
