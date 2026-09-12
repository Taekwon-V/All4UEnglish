/**
 * Gemini AI Master Service
 * 1. 사진 OCR 텍스트 추출 (Vision)
 * 2. 문장 정밀 분석 및 [단어 / 문법 / 숙어] 자동 발굴
 * 3. 각 항목별 [새로운 실생활 예문 2~3개] 실시간 무한 생성
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const GeminiService = {
  /**
   * 사진(크롭된 영역)에서 영어 텍스트 및 한국어 번역 추출
   * @param {string} base64Data - 'data:image/jpeg;base64,...' 포맷
   */
  extractTextFromImage: async (base64Data) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('YOUR_KEY')) {
      console.warn('Gemini API 키 부재: OCR 시뮬레이션 데이터 반환');
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

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: cleanBase64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) throw new Error(`Gemini Vision Error: ${response.statusText}`);
      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
      return parsed;
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

    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('YOUR_KEY')) {
      return GeminiService.fallbackDiscover(sentence);
    }

    const prompt = `
당신은 한국인 아내를 위한 가장 다정하고 지혜로운 1:1 영어 튜터입니다.
아래 영어 문장을 분석하여, 한국어 번역과 함께 문장 속에 담긴 핵심 [단어들(1~3개)], [문법 패턴(1개)], [숙어/관용구/이어동사(1~2개)]를 발굴해주세요.

[영어 문장]:
"${sentence}"

[응답 JSON 규격]:
{
  "translation": "자연스럽고 매끄러운 한국어 번역",
  "suggestedWords": [
    {
      "word": "단어 원형",
      "phonetic": "[발음기호]",
      "partOfSpeech": "품사 (동사, 형용사 등)",
      "nuanceKo": "단순 사전 뜻이 아닌 이 문맥 속 뉘앙스 해설"
    }
  ],
  "suggestedGrammar": {
    "pattern": "문법 패턴 공식 (예: be reluctant to + 동사원형, I was wondering if...)",
    "tag": "#패턴태그 (예: #망설임_표현)",
    "explanation": "문법 용어 대신 말문이 트이도록 돕는 친절한 해설"
  },
  "suggestedIdioms": [
    {
      "idiom": "숙어 또는 관용 표현 (예: call it a day, figure out)",
      "meaning": "한국어 뜻 및 뉘앙스 풀이"
    }
  ]
}
마크다운 백틱 없이 순수 JSON만 반환하세요.
`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
      return parsed;
    } catch (e) {
      console.warn('Gemini Discover Fallback 전환:', e);
      return GeminiService.fallbackDiscover(sentence);
    }
  },

  /**
   * 단어장/문법장/숙어장에서 [새 예문 생성] 터치 시, 해당 항목을 활용한 2~3개의 새로운 실생활 예문 동적 생성
   * @param {'grammar'|'idiom'|'word'} type
   * @param {object} item - { pattern } or { idiom } or { word }
   * @param {string} originalSentence - 원문 문장
   */
  generateVariations: async (type, item, originalSentence = '') => {
    const targetName = item.pattern || item.idiom || item.word;

    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('YOUR_KEY')) {
      return GeminiService.fallbackVariations(type, targetName);
    }

    const prompt = `
당신은 아내의 일상(카페, 여행, 쇼핑, 집안일, 직장 대화, 취미 등)에 맞춘 생생한 예문을 만들어주는 영어 튜터입니다.
아래 [대상 ${type}]을 사용하여, 아내가 실제로 입 밖으로 내뱉고 싶은 세련되고 자연스러운 새로운 실생활 예문 2~3개를 생성하세요.

[대상 ${type}]: "${targetName}"
[참고 원문]: "${originalSentence}"

[응답 JSON 규격]:
{
  "variations": [
    {
      "en": "새로운 실생활 영어 예문 1",
      "ko": "자연스러운 한국어 번역 1"
    },
    {
      "en": "새로운 실생활 영어 예문 2",
      "ko": "자연스러운 한국어 번역 2"
    },
    {
      "en": "새로운 실생활 영어 예문 3",
      "ko": "자연스러운 한국어 번역 3"
    }
  ]
}
반드시 마크다운 없이 순수 JSON만 반환하세요.
`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7, // 신선한 예문을 위해 창의성 살짝 부여
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
      return parsed.variations || [];
    } catch (e) {
      console.warn('Gemini Variations Fallback 전환:', e);
      return GeminiService.fallbackVariations(type, targetName);
    }
  },

  // Fallback 생성기들
  fallbackDiscover: (sentence) => {
    const words = sentence.split(/\s+/).filter(w => w.length >= 4);
    const primary = words[0] ? words[0].replace(/[^a-zA-Z]/g, '') : 'wondering';
    return {
      translation: "이 문장은 자연스러운 일상 회화 표현입니다.",
      suggestedWords: [
        {
          word: primary,
          phonetic: `[${primary.toLowerCase()}]`,
          partOfSpeech: "단어",
          nuanceKo: "문맥 속에서 감정과 의도를 전달하는 중요 어휘"
        }
      ],
      suggestedGrammar: {
        pattern: `${sentence.slice(0, 24)}... 패턴`,
        tag: "#실전_문장패턴",
        explanation: "원어민들이 일상에서 자연스럽게 자주 쓰는 핵심 구문입니다."
      },
      suggestedIdioms: [
        {
          idiom: "take time",
          meaning: "시간을 내다, 서두르지 않고 여유를 가지다"
        }
      ]
    };
  },

  fallbackVariations: (type, targetName) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return [
      {
        en: `I always make sure to use "${targetName}" when talking to friends.`,
        ko: `친구들과 이야기할 때 늘 "${targetName}" 표현을 사용하려고 해요. (${timestamp} 생성)`
      },
      {
        en: `Could you tell me how you practiced "${targetName}" today?`,
        ko: `오늘 "${targetName}" 표현을 어떻게 연습하셨는지 말씀해 주실 수 있나요?`
      },
      {
        en: `It feels much more natural once you get used to "${targetName}".`,
        ko: `"${targetName}" 표현에 익숙해지고 나면 훨씬 더 자연스럽게 느껴집니다.`
      }
    ];
  }
};
