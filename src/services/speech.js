/**
 * Web Speech API Service (STT & TTS)
 * 무제한 무료 브라우저 내장 음성 합성 및 인식 서비스
 */

// 음성 합성 (TTS - Text to Speech)
export const SpeechService = {
  // 영어 또는 한국어 문장 낭독
  speak: (text, { lang = 'en-US', rate = 1.0, pitch = 1.0, onEnd = () => {} } = {}) => {
    if (!('speechSynthesis' in window)) {
      console.warn('이 브라우저는 음성 합성을 지원하지 않습니다.');
      return;
    }

    // 기존 재생 중인 음성 취소
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate; // 0.8: 슬로우 모드, 1.0: 표준 모드
    utterance.pitch = pitch;

    // 자연스러운 원어민(en-US) 보이스 탐색
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith(lang.slice(0, 2)) && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
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

      // 0부터 전체 results를 순회하여 확정된 텍스트와 임시 텍스트를 분리 산출
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
