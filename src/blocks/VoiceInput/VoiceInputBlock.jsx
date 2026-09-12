import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { SpeechService } from '../../services/speech';
import { mockVoiceInputData } from './mockData';
import './VoiceInputBlock.css';

export function VoiceInputComponent({
  data = mockVoiceInputData,
  onTextSubmit = (text) => console.log('Text Submitted for AI:', text),
  isStandalone = false
}) {
  const [text, setText] = useState(data.initialText || '');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('마이크 버튼을 누르고 소리 내어 읽어보세요');
  const recognizerRef = useRef(null);
  const baseTextRef = useRef('');

  useEffect(() => {
    // 음성 인식기 초기화
    const recognizer = SpeechService.createRecognizer({
      lang: 'en-US',
      onResult: ({ currentSessionTranscript }) => {
        if (currentSessionTranscript) {
          const prefix = baseTextRef.current.trim();
          const combined = prefix ? `${prefix} ${currentSessionTranscript}` : currentSessionTranscript;
          setText(combined);
        }
      },
      onError: (err) => {
        console.warn('STT Error:', err);
        setIsRecording(false);
        setRecordingStatus('음성 인식이 종료되었습니다.');
      },
      onEnd: () => {
        setIsRecording(false);
        setRecordingStatus('음성 인식이 완료되었습니다.');
      }
    });

    recognizerRef.current = recognizer;
    return () => {
      if (recognizerRef.current) {
        try { recognizerRef.current.stop(); } catch {}
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognizerRef.current) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다. 텍스트를 직접 입력해 주세요.');
      return;
    }

    if (isRecording) {
      recognizerRef.current.stop();
      setIsRecording(false);
      setRecordingStatus('듣기를 멈췄습니다.');
    } else {
      try {
        // 녹음 시작 전 기존 텍스트를 기준점(Base)으로 보존
        baseTextRef.current = text.trim();
        recognizerRef.current.start();
        setIsRecording(true);
        setRecordingStatus('귀 기울여 듣고 있어요... 편하게 읽어보세요 🎙️');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSelectSample = (sample) => {
    setText(sample);
  };

  return (
    <div className="voice-input-container">
      <header className="voice-input-header">
        <h2 className="voice-input-title">오늘 공부한 문장 읽기</h2>
        <p className="voice-input-desc">책이나 영상에서 본 영어 문장을 편하게 소리 내어 읽어주세요.</p>
      </header>

      {/* 텍스트 편집기 */}
      <div className="voice-editor-box">
        <textarea
          className="voice-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="여기에 직접 타이핑하거나, 아래 마이크를 누르고 읽어보세요..."
        />
        <div className="voice-editor-actions">
          <span className="voice-char-count">{text.length}자 입력됨</span>
          {text.length > 0 && (
            <button className="btn-clear-text" onClick={() => setText('')}>
              <Trash2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              지우기
            </button>
          )}
        </div>
      </div>

      {/* 샘플 문장 칩 */}
      {data.sampleSentences && (
        <div className="voice-samples-wrapper">
          <span className="voice-samples-label">💡 이런 문장으로 테스트해 볼까요?</span>
          <div className="voice-samples-list">
            {data.sampleSentences.map((sample, idx) => (
              <button
                key={idx}
                className="voice-sample-chip btn-spring"
                onClick={() => handleSelectSample(sample)}
              >
                "{sample.slice(0, 48)}..."
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 하단 마이크 & AI 제출 */}
      <footer className="voice-action-center">
        <div className="mic-button-wrapper">
          {isRecording && (
            <>
              <div className="mic-pulse-ring" />
              <div className="mic-pulse-ring ring-2" />
            </>
          )}
          <button
            className={`btn-mic-main btn-spring ${isRecording ? 'is-recording' : ''}`}
            onClick={toggleRecording}
            title={isRecording ? '녹음 중지' : '음성 녹음 시작'}
          >
            {isRecording ? <MicOff size={34} /> : <Mic size={34} />}
          </button>
        </div>

        <div className="mic-status-label">{recordingStatus}</div>

        <button
          className="btn-submit-ai btn-spring"
          onClick={() => onTextSubmit(text)}
          disabled={!text.trim() || isRecording}
        >
          <Sparkles size={20} />
          <span>AI 튜터에게 분석 요청하기</span>
          <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  );
}

export const VoiceInputBlock = {
  id: 'VoiceInput',
  name: '음성 입력 & 텍스트 에디터',
  description: '마이크로 읽은 영어 문장을 실시간 텍스트로 변환하고 다듬는 입력 블록',
  Component: VoiceInputComponent,
  mockData: mockVoiceInputData
};
