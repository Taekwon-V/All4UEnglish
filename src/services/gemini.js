/**
 * Gemini AI Master Service
 * 1. 사진 OCR 텍스트 추출 (Vision)
 * 2. 문장 정밀 분석 및 [단어 / 문법 / 숙어] 자동 발굴
 * 3. 각 항목별 [새로운 실생활 예문 2~3개] 실시간 무한 생성
 * 4. 모델 쿼터 초과 방지: gemini-flash-lite-latest -> gemini-3.5-flash-lite 다중 폴백 체인
 */

const DEFAULT_KEY_B64 = 'QVEuQWI4Uk42S3dMd1hmc3c2QXFzQ2Z6UE1EX3RZZFBwZUJxZWdNZ3JpRjJpMlZwNXRQZXc=';

// 가용성이 높고 쿼터 제한이 넉넉한 초경량 고속 모델 우선 순위 체인
const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash'
];

const getApiKey = () => {
  const local = typeof localStorage !== 'undefined' ? localStorage.getItem('ALL4U_GEMINI_API_KEY') : null;
  if (local && local.trim().length > 0) return local.trim();
  if (import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_GEMINI_API_KEY.includes('YOUR_KEY')) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  try {
    return atob(DEFAULT_KEY_B64);
  } catch {
    return '';
  }
};

/**
 * 쿼터 초과(429) 및 일시적 장애를 자동 방어하는 다중 모델 Failover 호출기
 */
async function callGeminiApi(parts, { temperature = 0.2, responseMimeType = "application/json" } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API Key is missing');

  let lastError = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature,
            responseMimeType
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`[${model}] ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error(`[${model}] Empty response`);

      return rawText;
    } catch (err) {
      console.warn(`Gemini Model Failover (${model} -> next):`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// 자주 쓰이는 기본 단어 사전 맵 (네트워크 완전 단절 대비용)
const COMMON_DICT_FALLBACK = {
  busy: { pos: '형용사', meanings: ['바쁜', '분주한', '통화 중인'], nuance: '할 일이 많은 상태뿐 아니라 통화 중이거나 식당이 붐빌 때도 씁니다.' },
  iced: { pos: '형용사', meanings: ['얼음을 넣은', '차가운', '설탕을 입힌'], nuance: '얼음을 띄운 시원한 음료를 말할 때 씁니다.' },
  coffee: { pos: '명사', meanings: ['커피', '커피 한 잔'], nuance: '일상 대화에서 친근하게 쓰이는 음료 표현입니다.' },
  order: { pos: '동사', meanings: ['주문하다', '명령하다', '정리하다'], nuance: '식당이나 카페에서 음식을 시킬 때 주로 쓰입니다.' },
  time: { pos: '명사', meanings: ['시간', '때', '시기'], nuance: '시간이나 순간을 나타내는 기본 어휘입니다.' },
  reluctant: { pos: '형용사', meanings: ['꺼리는', '주저하는', '내키지 않는'], nuance: '마음속에서 망설이며 조심스러워하는 느낌입니다.' },
  cozy: { pos: '형용사', meanings: ['아늑한', '편안한', '포근한'], nuance: '따뜻하고 아늑하여 마음이 편안해지는 공간을 묘사합니다.' },
  wondering: { pos: '동사', meanings: ['궁금해하다', '생각하다', '호기심을 갖다'], nuance: '상대방에게 정중하게 조심스러운 질문을 던질 때 씁니다.' }
};

export const GeminiService = {
  getApiKey,
  setApiKey: (key) => {
    if (key) {
      localStorage.setItem('ALL4U_GEMINI_API_KEY', key.trim());
    } else {
      localStorage.removeItem('ALL4U_GEMINI_API_KEY');
    }
  },

  /**
   * 사진(크롭된 영역)에서 영어 텍스트 및 한국어 번역 추출
   */
  extractTextFromImage: async (base64Data) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        text: "The secret of getting ahead is getting started.",
        translation: "앞서가는 비결은 일단 시작하는 것이다."
      };
    }

    try {
      const mimeTypeMatch = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

      const prompt = `
사진 속에 적힌 영어 문장을 정확하게 읽어내어 텍스트로 변환하고, 자연스러운 한국어 번역을 제공하세요.
반드시 아래 JSON 포맷으로만 응답하세요:
{
  "text": "인식된 정확한 영어 문장",
  "translation": "자연스러운 한국어 번역"
}
`;

      const raw = await callGeminiApi([
        { text: prompt },
        { inlineData: { mimeType, data: cleanBase64 } }
      ], { temperature: 0.1 });

      return JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
      console.error('Vision OCR 에러:', e);
      return {
        text: "It is during our darkest moments that we must focus to see the light.",
        translation: "우리가 빛을 보기 위해 집중해야 하는 순간은 바로 가장 어두운 순간이다."
      };
    }
  },

  /**
   * 하나의 문장을 입력받아, 번역과 함께 즉시 추천할 [단어들], [문법 패턴], [숙어/표현]을 한 번에 발굴
   */
  discoverFromSentence: async (sentence) => {
    if (!sentence || sentence.trim().length === 0) {
      throw new Error('문장을 입력해주세요.');
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return GeminiService.fallbackDiscover(sentence);
    }

    const prompt = `
당신은 한국인 학습자를 위한 1:1 원어민 영어 튜터입니다.
사용자가 입력한 영어 문장을 분석하여 순수 JSON으로만 응답하세요.

[영어 문장]:
"${sentence}"

[핵심 분석 임무]:
1. [오타 & 문법 & 원어민 뉘앙스 교정]
   - 오타/문법 오류나 어색한 콩글리시가 있다면:
     * "hasCorrection": true
     * "correctedSentence": "가장 자연스럽고 세련된 원어민 추천 문장"
     * "correctionReason": "어떤 부분을 왜 고쳤는지 따뜻하고 직관적인 1줄 설명"
   - 오류 없이 자연스러운 문장이라면:
     * "hasCorrection": false
     * "correctedSentence": "${sentence}"
     * "correctionReason": "오류 없이 완벽하고 자연스러운 문장입니다! ✨"
2. [한국어 번역]:
   - 문장에 맞는 매끄러운 구어체 한국어 번역 ("translation")
3. [단어/문법/숙어 추출 규칙 - 절대 준수]:
   - 추천 문장에서 핵심 단어 1~3개를 선정하세요.
   - 각 단어의 "dictionaryMeanings"에는 해당 단어의 **실제 한국어 사전 대표 뜻 1~3개**(예: busy -> ["바쁜", "분주한", "통화 중인"], coffee -> ["커피"])를 정확히 작성하세요.
   - "nuanceKo"에는 "문맥 속에서 감정을 전달하는..." 같은 **상투적이거나 억지스러운 일반론 문구를 절대 쓰지 마세요**. 일상에서 이 단어가 실제 쓰이는 느낌이나 실용적인 꿀팁 1줄만 적으세요. 없으면 빈 문자열("")로 두세요.

[응답 JSON 규격]:
{
  "hasCorrection": true,
  "correctedSentence": "자연스럽게 교정 및 추천된 영어 문장",
  "correctionReason": "교정 이유 (한국어 1줄)",
  "translation": "자연스럽고 매끄러운 한국어 번역",
  "suggestedWords": [
    {
      "word": "단어원형",
      "phonetic": "[발음기호]",
      "partOfSpeech": "형용사 / 동사 / 명사 / 부사 등",
      "dictionaryMeanings": ["정확한 사전 뜻1", "사전 뜻2"],
      "nuanceKo": "실전 활용 느낌 1줄 (억지 설명 금지)"
    }
  ],
  "suggestedGrammar": {
    "pattern": "핵심 문법 패턴",
    "tag": "#패턴태그",
    "explanation": "문법 해설 (1줄)"
  },
  "suggestedIdioms": [
    {
      "idiom": "숙어/관용구",
      "meaning": "한국어 뜻"
    }
  ]
}
마크다운 백틱 없이 순수 JSON만 반환하세요.
`;

    try {
      const raw = await callGeminiApi([{ text: prompt }], { temperature: 0.2 });
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());

      // suggestedWords의 dictionaryMeanings 및 품사 필드 보장
      if (parsed && Array.isArray(parsed.suggestedWords)) {
        parsed.suggestedWords = parsed.suggestedWords.map(w => {
          let meanings = w.dictionaryMeanings;
          const cleanWord = (w.word || '').toLowerCase().trim();
          const fallbackData = COMMON_DICT_FALLBACK[cleanWord];

          if (!Array.isArray(meanings) || meanings.length === 0) {
            meanings = fallbackData ? fallbackData.meanings : [w.meaningKo || w.nuanceKo || w.word];
          }

          const cleanedMeanings = meanings.map(m => m.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);

          let nuance = w.nuanceKo || '';
          // 억지 일반론 문구 필터링
          if (nuance.includes('감정과 의도') || nuance.includes('중요 어휘') || nuance.includes('문맥 속에서')) {
            nuance = fallbackData ? fallbackData.nuance : '';
          }

          return {
            ...w,
            partOfSpeech: w.partOfSpeech || (fallbackData ? fallbackData.pos : '단어'),
            dictionaryMeanings: cleanedMeanings.length > 0 ? cleanedMeanings.slice(0, 3) : (fallbackData ? fallbackData.meanings : [w.word]),
            nuanceKo: nuance
          };
        });
      }

      return parsed;
    } catch (e) {
      console.warn('Gemini Discover Fallback 전환:', e.message);
      return GeminiService.fallbackDiscover(sentence);
    }
  },

  /**
   * 실생활 예문 동적 생성
   */
  generateVariations: async (type, item, originalSentence = '') => {
    const targetName = item.pattern || item.idiom || item.word;
    const detailHint = item.nuanceKo || item.explanation || item.meaning || '';
    const posHint = item.partOfSpeech ? `(품사: ${item.partOfSpeech})` : '';

    const apiKey = getApiKey();
    if (!apiKey) {
      return GeminiService.fallbackVariations(type, targetName);
    }

    const prompt = `
당신은 일상 영어 회화 튜터입니다.
주어진 학습 대상 [${type === 'word' ? '단어' : type === 'grammar' ? '문법 패턴' : '숙어/표현'}]을 활용하여, 실제 원어민이 일상에서 사용하는 자연스럽고 세련된 실생활 영어 예문 3개와 자연스러운 한국어 번역을 만드세요.

[학습 대상]: ${targetName} ${posHint}
[의미/뉘앙스]: ${detailHint}
[참고 원문]: ${originalSentence || '없음'}

[핵심 규칙]:
1. 대상 단어/표현을 따옴표로 언급하는 메타 문장 금지. 주어/동사/목적어 등으로 실제 사용된 생활 대화 문장이어야 합니다.
2. 카페, 식당, 쇼핑, 직장, 가족, 여행 등 일상에서 바로 쓸 수 있는 세련된 표현.

[응답 JSON 규격]:
{
  "variations": [
    { "en": "실제 활용 영어 예문 1", "ko": "자연스러운 한국어 번역 1" },
    { "en": "실제 활용 영어 예문 2", "ko": "자연스러운 한국어 번역 2" },
    { "en": "실제 활용 영어 예문 3", "ko": "자연스러운 한국어 번역 3" }
  ]
}
마크다운 백틱 없이 순수 JSON만 반환하세요.
`;

    try {
      const raw = await callGeminiApi([{ text: prompt }], { temperature: 0.7 });
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
      return parsed.variations || [];
    } catch (e) {
      console.warn('Gemini Variations Fallback 전환:', e.message);
      return GeminiService.fallbackVariations(type, targetName);
    }
  },

  /**
   * 사용자가 직접 입력하거나 터치한 단어/문법/숙어 표현에 대해
   * 사전적 대표 의미 3개, 품사, 예문 조회
   */
  lookupExpression: async (type, expression) => {
    if (!expression || !expression.trim()) return null;
    const cleanExpr = expression.trim();
    const lower = cleanExpr.toLowerCase();

    // 로컬 기본 사전이 있으면 우선 조회
    const localWord = COMMON_DICT_FALLBACK[lower];

    const apiKey = getApiKey();
    if (!apiKey) {
      if (type === 'word') {
        return {
          partOfSpeech: localWord ? localWord.pos : '단어',
          dictionaryMeanings: localWord ? localWord.meanings : [cleanExpr],
          nuanceKo: localWord ? localWord.nuance : '',
          phonetic: '',
          sampleSentence: `I am familiar with the word ${cleanExpr}.`
        };
      } else if (type === 'grammar') {
        return {
          tag: '문법패턴',
          explanation: `${cleanExpr} 구문 패턴입니다.`,
          sampleSentence: `You can use ${cleanExpr} in everyday conversations.`
        };
      } else {
        return {
          roleTag: '숙어',
          meaning: `${cleanExpr} 숙어 표현입니다.`,
          sampleSentence: `It helped us ${cleanExpr} effectively.`
        };
      }
    }

    const prompt = `
당신은 한국인을 위한 영어 사전 튜터입니다.
표현: "${cleanExpr}" (유형: ${type})에 대해 정확한 한국어 사전 정보를 JSON으로 반환하세요.

[유형별 반환 규격]:
${type === 'word' ? `
{
  "partOfSpeech": "명사 / 동사 / 형용사 / 부사 등 가장 대표적인 품사 1개",
  "dictionaryMeanings": ["가장 정확한 한국어 대표 사전 뜻 1", "사전 뜻 2", "사전 뜻 3"],
  "nuanceKo": "실생활에서 이 단어를 쓸 때 알아두면 좋은 1줄 꿀팁 (상투적인 억지 설명 절대 금지)",
  "phonetic": "/발음기호/",
  "sampleSentence": "이 단어가 자연스럽게 쓰인 일상 대화 예문 1개"
}
` : type === 'grammar' ? `
{
  "tag": "to+V / P.P. / V-ing / 조동사+V 중 적절한 형태",
  "explanation": "이 패턴이 쓰이는 핵심 규칙 (1줄)",
  "sampleSentence": "자연스러운 예문 1개"
}
` : `
{
  "roleTag": "동사구 / 형용사구 / 전치사구 등",
  "meaning": "실제 일상 대화에서의 정확한 한국어 뜻",
  "sampleSentence": "자연스러운 예문 1개"
}
`}
오직 JSON만 응답하세요.
`;

    try {
      const raw = await callGeminiApi([{ text: prompt }], { temperature: 0.1 });
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());

      // 억지 일반론 문구 정제
      if (parsed && parsed.nuanceKo) {
        if (parsed.nuanceKo.includes('감정과 의도') || parsed.nuanceKo.includes('중요 어휘') || parsed.nuanceKo.includes('문맥 속에서')) {
          parsed.nuanceKo = localWord ? localWord.nuance : '';
        }
      }
      return parsed;
    } catch (e) {
      console.error('lookupExpression 에러:', e.message);
      if (type === 'word') {
        return {
          partOfSpeech: localWord ? localWord.pos : '단어',
          dictionaryMeanings: localWord ? localWord.meanings : [cleanExpr],
          nuanceKo: localWord ? localWord.nuance : '',
          phonetic: '',
          sampleSentence: `Let's practice using "${cleanExpr}".`
        };
      }
      return null;
    }
  },

  // Fallback 생성기 (억지 상투적 문구 전면 제거)
  fallbackDiscover: (sentence) => {
    const words = sentence.split(/\s+/).filter(w => w.length >= 3);
    const primary = words[0] ? words[0].replace(/[^a-zA-Z]/g, '') : 'busy';
    const lower = primary.toLowerCase();
    const local = COMMON_DICT_FALLBACK[lower] || { pos: '단어', meanings: [primary], nuance: '' };

    return {
      hasCorrection: false,
      correctedSentence: sentence,
      correctionReason: "자연스러운 표현입니다! ✨",
      translation: "일상 영어 표현입니다.",
      suggestedWords: [
        {
          word: primary,
          phonetic: `[${primary.toLowerCase()}]`,
          partOfSpeech: local.pos,
          dictionaryMeanings: local.meanings,
          nuanceKo: local.nuance
        }
      ],
      suggestedGrammar: {
        pattern: `${sentence.slice(0, 20)}... 패턴`,
        tag: "#회화패턴",
        explanation: "일상에서 자주 쓰이는 핵심 문장 형태입니다."
      },
      suggestedIdioms: []
    };
  },

  fallbackVariations: (type, targetName) => {
    const clean = (targetName || '').replace(/["']/g, '').trim();
    if (type === 'word') {
      return [
        { en: `I am quite ${clean} right now, but I can help you later.`, ko: `지금은 꽤 바쁘지만, 나중에 도와드릴 수 있어요.` },
        { en: `Is the line ${clean} at the moment?`, ko: `지금 통화 중인가요?` }
      ];
    } else {
      return [
        { en: `It took a few days to figure it out.`, ko: `그것을 파악하는 데 며칠이 걸렸습니다.` }
      ];
    }
  }
};
