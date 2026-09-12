/**
 * Web Speech API Service (STT & TTS)
 * 무제한 무료 브라우저 내장 음성 합성 및 인식 서비스
 */

// 음성 합성 설정 키
const VOICE_SETTINGS_KEY = 'all4u_voice_settings';

// 보이스 캐시 및 초기화
let cachedVoices = [];
const initVoices = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
};
initVoices();

export const CURATED_VOICES = [
  { 
    id: 'jenny', 
    name: '제니 (Jenny)', 
    gender: 'female', 
    label: '👩 제니 (밝고 또렷한 여성)',
    pitch: 1.18,
    rateFactor: 1.02,
    keywords: ['jenny', 'zira', 'female', 'karen', 'victoria', 'woman', 'samantha', 'google us english']
  },
  { 
    id: 'samantha', 
    name: '사만다 (Samantha)', 
    gender: 'female', 
    label: '👩 사만다 (차분하고 부드러운 여성)',
    pitch: 0.94,
    rateFactor: 0.94,
    keywords: ['samantha', 'victoria', 'karen', 'female', 'zira', 'woman']
  },
  { 
    id: 'guy', 
    name: '가이 (Guy)', 
    gender: 'male', 
    label: '👨 가이 (자연스럽고 세련된 남성)',
    pitch: 0.76,
    rateFactor: 1.0,
    keywords: ['guy', 'david', 'male', 'mark', 'richard', 'george', 'man']
  },
  { 
    id: 'alex', 
    name: '알렉스 (Alex)', 
    gender: 'male', 
    label: '👨 알렉스 (깊고 신뢰감 있는 남성)',
    pitch: 0.62,
    rateFactor: 0.92,
    keywords: ['alex', 'george', 'david', 'male', 'daniel', 'oliver', 'man']
  }
];

// 음성 합성 (TTS - Text to Speech)
export const SpeechService = {
  getSettings: () => {
    try {
      const saved = localStorage.getItem(VOICE_SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { voiceId: 'jenny', rate: 1.0 };
  },

  setSettings: (settings) => {
    try {
      const current = SpeechService.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return settings;
    }
  },

  // 영어 또는 한국어 문장 낭독
  speak: (text, { lang = 'en-US', rate, pitch, onEnd = () => {} } = {}) => {
    if (!('speechSynthesis' in window)) {
      console.warn('이 브라우저는 음성 합성을 지원하지 않습니다.');
      return;
    }

    // 기존 재생 중인 음성 즉시 취소
    window.speechSynthesis.cancel();

    const userSettings = SpeechService.getSettings();
    const finalRate = rate !== undefined ? rate : (userSettings.rate || 1.0);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    if (lang.startsWith('en')) {
      const allVoices = (cachedVoices && cachedVoices.length > 0) ? cachedVoices : window.speechSynthesis.getVoices();
      const enVoices = allVoices.filter(v => v.lang.startsWith('en'));
      const targetId = userSettings.voiceId || 'jenny';
      const profile = CURATED_VOICES.find(p => p.id === targetId) || CURATED_VOICES[0];
      
      // 1. 키워드 기반 시스템 보이스 매칭
      let matchedVoice = null;
      for (const kw of profile.keywords) {
        matchedVoice = enVoices.find(v => v.name.toLowerCase().includes(kw));
        if (matchedVoice) break;
      }

      // 남성 보이스 요청 시 여성 키워드가 포함된 음성 배제 및 남성 보이스 탐색
      if (profile.gender === 'male' && (!matchedVoice || matchedVoice.name.toLowerCase().includes('female'))) {
        const maleVoice = enVoices.find(v => {
          const n = v.name.toLowerCase();
          return (n.includes('male') && !n.includes('female')) || n.includes('david') || n.includes('george') || n.includes('alex') || n.includes('guy');
        });
        if (maleVoice) matchedVoice = maleVoice;
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      } else if (enVoices.length > 0) {
        utterance.voice = enVoices[0];
      }

      // 2. 어쿠스틱 피치 & 속도 변조 (단일 음성 기기에서도 남성/여성/개성 차이를 100% 실감나게 변환)
      utterance.pitch = pitch !== undefined ? pitch : profile.pitch;
      utterance.rate = finalRate * profile.rateFactor;
    } else {
      utterance.rate = finalRate;
      utterance.pitch = pitch !== undefined ? pitch : 1.0;
    }

    utterance.onend = onEnd;
    utterance.onerror = (e) => {
      console.error('TTS 에러:', e);
      onEnd();
    };

    window.speechSynthesis.speak(utterance);
  },

  // 재생 즉시 중지
  stop: () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  // 음성 인식 (STT - Speech to Text)
  activeRecognizer: null,

  /**
   * 음성 인식 시작
   */
  startListening: (onResult, onEnd, { lang = 'en-US', onError } = {}) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const msg = '현재 사용 중인 브라우저에서 마이크 음성 인식을 지원하지 않습니다. (Chrome 또는 Safari 권장)';
      alert(msg);
      if (onError) onError(new Error(msg));
      if (onEnd) onEnd();
      return null;
    }

    // 기존 진행 중인 인식이 있다면 정리
    if (SpeechService.activeRecognizer) {
      try {
        SpeechService.activeRecognizer.stop();
      } catch {}
      SpeechService.activeRecognizer = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang; // 기본 영어 인식 (en-US)

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let latestInterim = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0]?.transcript?.trim() || '';
          if (!transcript) continue;

          if (item.isFinal) {
            if (!finalTranscript) {
              finalTranscript = transcript;
            } else if (transcript.toLowerCase().includes(finalTranscript.toLowerCase())) {
              finalTranscript = transcript;
            } else if (!finalTranscript.toLowerCase().includes(transcript.toLowerCase())) {
              finalTranscript += ' ' + transcript;
            }
          } else {
            // 안드로이드 크롬은 새로운 interim 가설을 새 index로 push하므로 가장 최신 interim 채택
            latestInterim = transcript;
          }
        }

        let current = '';
        if (finalTranscript && latestInterim) {
          if (latestInterim.toLowerCase().includes(finalTranscript.toLowerCase())) {
            current = latestInterim;
          } else if (finalTranscript.toLowerCase().includes(latestInterim.toLowerCase())) {
            current = finalTranscript;
          } else {
            current = finalTranscript + ' ' + latestInterim;
          }
        } else {
          current = finalTranscript || latestInterim;
        }

        if (onResult && current.trim()) {
          onResult(current.trim());
        }
      };

      recognition.onerror = (e) => {
        console.warn('음성 인식 이벤트 오류:', e.error);
        if (e.error === 'not-allowed') {
          alert('마이크 접근 권한이 차단되어 있습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
        }
        if (onError) onError(e);
      };

      recognition.onend = () => {
        SpeechService.activeRecognizer = null;
        if (onEnd) onEnd();
      };

      recognition.start();
      SpeechService.activeRecognizer = recognition;
      return recognition;
    } catch (err) {
      console.error('음성 인식 시작 실패:', err);
      if (onError) onError(err);
      if (onEnd) onEnd();
      return null;
    }
  },

  /**
   * 음성 인식 즉시 종료 (말하기 완료)
   */
  stopListening: () => {
    if (SpeechService.activeRecognizer) {
      try {
        SpeechService.activeRecognizer.stop();
      } catch (e) {
        console.warn('음성 인식 중지 에러:', e);
      }
      SpeechService.activeRecognizer = null;
    }
  },

  createRecognizer: ({ lang = 'en-US', onResult, onError, onEnd }) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += (finalText ? ' ' : '') + transcript.trim();
        } else {
          interimText += (interimText ? ' ' : '') + transcript.trim();
        }
      }

      if (onResult) {
        onResult({
          finalTranscript: finalText,
          interimTranscript: interimText,
          currentSessionTranscript: (finalText + (interimText ? ' ' + interimText : '')).trim()
        });
      }
    };

    recognition.onerror = (e) => {
      if (onError) onError(e);
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    return recognition;
  }
};
