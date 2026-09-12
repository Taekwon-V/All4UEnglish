/**
 * Web Speech API Service (STT & TTS)
 * 무제한 무료 브라우저 내장 음성 합성 및 인식 서비스
 */

// 음성 합성 설정 키
const VOICE_SETTINGS_KEY = 'all4u_voice_settings';

export const CURATED_VOICES = [
  { id: 'jenny', name: '제니 (Jenny)', gender: 'female', label: '👩 제니 (밝고 또렷한 여성)' },
  { id: 'samantha', name: '사만다 (Samantha)', gender: 'female', label: '👩 사만다 (차분하고 부드러운 여성)' },
  { id: 'guy', name: '가이 (Guy)', gender: 'male', label: '👨 가이 (자연스럽고 세련된 남성)' },
  { id: 'alex', name: '알렉스 (Alex)', gender: 'male', label: '👨 알렉스 (깊고 신뢰감 있는 남성)' }
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
  speak: (text, { lang = 'en-US', rate, pitch = 1.0, onEnd = () => {} } = {}) => {
    if (!('speechSynthesis' in window)) {
      console.warn('이 브라우저는 음성 합성을 지원하지 않습니다.');
      return;
    }

    // 기존 재생 중인 음성 취소
    window.speechSynthesis.cancel();

    const userSettings = SpeechService.getSettings();
    const finalRate = rate !== undefined ? rate : (userSettings.rate || 1.0);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = finalRate;
    utterance.pitch = pitch;

    if (lang.startsWith('en')) {
      const voices = window.speechSynthesis.getVoices();
      const targetId = userSettings.voiceId || 'jenny';
      
      let matchedVoice = null;
      if (targetId === 'jenny') {
        matchedVoice = voices.find(v => v.name.includes('Jenny') || (v.lang.startsWith('en') && v.name.includes('Female')) || v.name.includes('Samantha') || v.name.includes('Google US English'));
      } else if (targetId === 'samantha') {
        matchedVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Zira') || (v.lang.startsWith('en') && !v.name.includes('Male')));
      } else if (targetId === 'guy') {
        matchedVoice = voices.find(v => v.name.includes('Guy') || (v.lang.startsWith('en') && v.name.includes('Male')) || v.name.includes('David'));
      } else if (targetId === 'alex') {
        matchedVoice = voices.find(v => v.name.includes('Alex') || v.name.includes('George') || (v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David'))));
      }

      // fallback
      if (!matchedVoice) {
        matchedVoice = voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en'));
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
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
