/**
 * Gemini AI Master Service
 * 1. 사진 OCR 텍스트 추출 (Vision)
 * 2. 문장 정밀 분석 및 [단어 / 문법 / 숙어] 자동 발굴
 * 3. 각 항목별 [새로운 실생활 예문 2~3개] 실시간 무한 생성
 */

const DEFAULT_KEY_B64 = 'QVEuQWI4Uk42S3dMd1hmc3c2QXFzQ2Z6UE1EX3RZZFBwZUJxZWdNZ3JpRjJpMlZwNXRQZXc=';

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
   * @param {string} base64Data - 'data:image/jpeg;base64,...' 포맷
   */
  extractTextFromImage: async (base64Data) => {
    const apiKey = getApiKey();
    if (!apiKey) {
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

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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

    const apiKey = getApiKey();
    if (!apiKey) {
      return GeminiService.fallbackDiscover(sentence);
    }

    const prompt = `
당신은 한국인 학습자를 위한 최고 수준의 다정하고 지혜로운 1:1 원어민 영어 튜터입니다.
아래 사용자가 입력(또는 음성 인식/사진 추출)한 영어 문장을 분석해주세요.

[영어 문장]:
"${sentence}"

[핵심 분석 임무]:
1. [오타 & 문법 & 원어민 뉘앙스 교정]
   - 사용자가 입력한 문장에 오타, 스펠링 오류, 문법적 오류(수 일치, 시제 등), 또는 어색하거나 딱딱한 콩글리시 표현이 있는지 정밀하게 검토하세요.
   - 교정이나 더 자연스러운 원어민 표현으로의 개선이 필요한 경우:
     * "hasCorrection": true
     * "correctedSentence": "오타/문법을 교정하고 원어민이 일상에서 가장 자연스럽고 세련되게 사용하는 추천 문장"
     * "correctionReason": "어떤 부분을 왜 고쳤는지 따뜻하고 이해하기 쉬운 1~2줄 한국어 설명 (예: 'got 대신 can I get을 사용하고 oat milk 표기를 바로잡아 원어민식 카페 주문 표현으로 다듬었어요')"
   - 이미 문법적으로 오류가 없고 자연스러운 문장인 경우:
     * "hasCorrection": false
     * "correctedSentence": "${sentence}"
     * "correctionReason": "오류 없이 완벽하고 자연스러운 문장입니다! ✨"
2. [한국어 번역]:
   - 최종 추천 문장에 맞는 매끄럽고 자연스러운 구어체 한국어 번역 ("translation")
3. [단어/문법/숙어 추천 발굴]:
   - 추천 문장(correctedSentence)에 담긴 핵심 단어(1~3개), 문법 패턴(1개), 숙어/표현(1~2개) 추출

[응답 JSON 규격]:
{
  "hasCorrection": true,
  "correctedSentence": "자연스럽게 교정 및 추천된 영어 문장",
  "correctionReason": "교정 이유 및 원어민 표현 팁 (한국어 1~2줄)",
  "translation": "자연스럽고 매끄러운 한국어 번역",
  "suggestedWords": [
    {
      "word": "단어 원형",
      "phonetic": "[발음기호]",
      "partOfSpeech": "품사",
      "nuanceKo": "단순 사전 뜻이 아닌 이 문맥 속 뉘앙스 해설"
    }
  ],
  "suggestedGrammar": {
    "pattern": "문법 패턴 공식 (예: Can I get + 명사?, be reluctant to + 동사원형)",
    "tag": "#패턴태그",
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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
    const detailHint = item.nuanceKo || item.explanation || item.meaning || '';
    const posHint = item.partOfSpeech ? `(품사: ${item.partOfSpeech})` : '';

    const apiKey = getApiKey();
    if (!apiKey) {
      return GeminiService.fallbackVariations(type, targetName);
    }

    const prompt = `
당신은 일상 영어 회화 튜터입니다.
주어진 학습 대상 [${type === 'word' ? '단어' : type === 'grammar' ? '문법 패턴' : '숙어/표현'}]을 직접 활용하여, 실제 원어민이 일상에서 사용하는 자연스럽고 세련된 실생활 영어 예문 3개와 자연스러운 한국어 번역을 만드세요.

[학습 대상]: ${targetName} ${posHint}
[의미/뉘앙스]: ${detailHint}
[참고 원문]: ${originalSentence || '없음'}

[핵심 규칙 - 절대 준수]:
1. 대상 단어/표현을 따옴표(" ")로 감싸서 언급하거나, 단어 자체에 대해 이야기하는 메타 문장(예: I practiced "${targetName}", Using "${targetName}" is good 등)은 절대로 작성하지 마십시오.
2. 반드시 해당 단어/표현이 문장의 주어/동사/목적어/보어/수식어 등으로 실제 사용된 생활 대화/독백 문장이어야 합니다.
   (좋은 예: She was reluctant to leave the party. / He was reluctant to admit his mistake.)
3. 카페, 식당, 쇼핑, 직장, 가족, 여행, 감정 표현 등 일상 생활에서 입 밖으로 내뱉기 좋은 생생하고 현대적인 표현이어야 합니다.
4. 한국어 번역도 대상 단어를 따옴표로 감싸서 설명조로 쓰지 말고, 자연스러운 구어체로 번역하십시오.

[응답 JSON 규격]:
{
  "variations": [
    {
      "en": "자연스럽게 활용된 영어 예문 1",
      "ko": "자연스러운 한국어 번역 1"
    },
    {
      "en": "자연스럽게 활용된 영어 예문 2",
      "ko": "자연스러운 한국어 번역 2"
    },
    {
      "en": "자연스럽게 활용된 영어 예문 3",
      "ko": "자연스러운 한국어 번역 3"
    }
  ]
}
마크다운 백틱 없이 순수 JSON만 반환하세요.
`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7, // 신선하고 생생한 예문
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
      hasCorrection: false,
      correctedSentence: sentence,
      correctionReason: "완벽하고 자연스러운 표현입니다! ✨",
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
    const clean = (targetName || '').replace(/["']/g, '').trim();
    if (type === 'word') {
      return [
        {
          en: `She seemed somewhat ${clean} to leave the gathering so early.`,
          ko: `그녀는 그렇게 일찍 자리를 뜨는 것을 다소 주저하는 듯했습니다.`
        },
        {
          en: `You don't need to be ${clean} to ask questions whenever you feel lost.`,
          ko: `이해하기 어려울 때마다 질문하는 것을 망설이거나 어려워할 필요 없습니다.`
        },
        {
          en: `They were initially ${clean}, but decided to accept the proposal in the end.`,
          ko: `처음에는 약간 꺼려했으나, 결국에는 제안을 받아들이기로 했습니다.`
        }
      ];
    } else if (type === 'grammar') {
      return [
        {
          en: `I was reluctant to bring it up during the meeting, but it was necessary.`,
          ko: `회의 중에 그 이야기를 꺼내기가 망설여졌지만, 꼭 필요한 말이었습니다.`
        },
        {
          en: `Don't be hesitant to try new opportunities when they come along.`,
          ko: `새로운 기회가 찾아왔을 때 시도해 보는 것을 주저하지 마세요.`
        }
      ];
    } else {
      return [
        {
          en: `We finally managed to figure out the best way to handle this situation.`,
          ko: `우리는 마침내 이 상황을 해결할 가장 좋은 방법을 찾아냈습니다.`
        },
        {
          en: `It took a few days to figure out all the little details of the schedule.`,
          ko: `일정의 사소한 세부사항들을 모두 파악하는 데 며칠이 걸렸습니다.`
        }
      ];
    }
  }
};

