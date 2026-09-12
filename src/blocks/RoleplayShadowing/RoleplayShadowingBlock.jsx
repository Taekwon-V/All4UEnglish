import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Mic, MicOff, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { SpeechService } from '../../services/speech';
import { mockRoleplayData } from './mockData';
import './RoleplayShadowingBlock.css';

export function RoleplayShadowingComponent({
  data = mockRoleplayData,
  onShadowingComplete = (score) => console.log('Shadowing score:', score),
  isStandalone = false
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [scoreResult, setScoreResult] = useState(null);
  const recognizerRef = useRef(null);

  // 음성인식 초기화
  useEffect(() => {
    const recognizer = SpeechService.createRecognizer({
      lang: 'en-US',
      onResult: ({ currentSessionTranscript }) => {
        if (currentSessionTranscript) {
          setSpokenText(currentSessionTranscript);
          calculateScore(currentSessionTranscript);
        }
      },
      onEnd: () => setIsRecording(false)
    });
    recognizerRef.current = recognizer;
    return () => {
      try { recognizerRef.current?.stop(); } catch {}
    };
  }, [data.speakerB]);

  const handleSpeakA = () => {
    SpeechService.speak(data.speakerA, { rate: 0.95 });
  };

  const handleSpeakB = () => {
    SpeechService.speak(data.speakerB, { rate: 0.95 });
  };

  const toggleRecording = () => {
    if (!recognizerRef.current) {
      alert('음성 인식을 지원하지 않는 브라우저입니다.');
      return;
    }
    if (isRecording) {
      recognizerRef.current.stop();
      setIsRecording(false);
    } else {
      setSpokenText('');
      setScoreResult(null);
      try {
        recognizerRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 단순 단어 일치도 기반 정확도 채점 알고리즘
  const calculateScore = (userSpeech) => {
    const targetWords = data.speakerB.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
    const userWords = userSpeech.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);

    let matchCount = 0;
    targetWords.forEach(w => {
      if (userWords.includes(w)) matchCount++;
    });

    const percent = Math.min(100, Math.round((matchCount / targetWords.length) * 100)) || 85;
    setScoreResult(percent);
    onShadowingComplete(percent);
  };

  return (
    <div className="roleplay-container">
      <div className="roleplay-situation-badge">
        {data.situation}
      </div>

      <div className="roleplay-chat-stage">
        {/* A (튜터 버블) */}
        <div className="chat-bubble-card bubble-speaker-a">
          <div className="chat-speaker-name speaker-a-label">
            <span>원어민 튜터 (A)</span>
            <button
              className="btn-audio-circle btn-spring"
              style={{ width: '28px', height: '28px' }}
              onClick={handleSpeakA}
            >
              <Volume2 size={14} />
            </button>
          </div>
          <div className="chat-en-text">"{data.speakerA}"</div>
          <div className="chat-ko-text">{data.speakerAKo}</div>
        </div>

        {/* B (아내 파트 버블) */}
        <div className="chat-bubble-card bubble-speaker-b">
          <div className="chat-speaker-name speaker-b-label">
            <span>아내의 역할 (B - 따라하기)</span>
            <button
              className="btn-audio-circle btn-spring"
              style={{ width: '28px', height: '28px', background: '#DBEAFE', color: '#1D4ED8' }}
              onClick={handleSpeakB}
            >
              <Volume2 size={14} />
            </button>
          </div>
          <div className="chat-en-text">"{data.speakerB}"</div>
          <div className="chat-ko-text">{data.speakerBKo}</div>
        </div>
      </div>

      {/* 아내 쉐도잉 마이크 녹음 및 채점 */}
      <div className="shadowing-action-box">
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-body)' }}>
          🎙️ B 파트를 소리 내어 말해보세요!
        </span>

        <button
          className={`btn-mic-main btn-spring ${isRecording ? 'is-recording' : ''}`}
          style={{ width: '64px', height: '64px' }}
          onClick={toggleRecording}
        >
          {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
        </button>

        {isRecording && (
          <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>
            듣고 있어요... 말씀해 보세요!
          </span>
        )}

        {spokenText && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            내가 말한 내용: "{spokenText}"
          </p>
        )}

        {scoreResult !== null && (
          <div className={`score-badge ${scoreResult >= 80 ? 'high' : 'normal'}`}>
            <Award size={16} />
            <span>발음 일치도 {scoreResult}%! {scoreResult >= 80 ? '훌륭해요 🎉' : '잘하고 있어요 👍'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const RoleplayShadowingBlock = {
  id: 'RoleplayShadowing',
  name: '회화 롤플레이 & 쉐도잉 채점',
  description: '상황별 2턴 대화에서 원어민 음성을 듣고 아내가 따라 말하면 정확도를 피드백해주는 쉐도잉 블록',
  Component: RoleplayShadowingComponent,
  mockData: mockRoleplayData
};
