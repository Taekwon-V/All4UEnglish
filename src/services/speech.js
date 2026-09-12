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
