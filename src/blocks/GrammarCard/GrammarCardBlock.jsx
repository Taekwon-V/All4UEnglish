import React from 'react';
import { Tag, Sparkles, Volume2, Bookmark, CheckCircle2 } from 'lucide-react';
import { SpeechService } from '../../services/speech';
import { mockGrammarData } from './mockData';
import './GrammarCardBlock.css';

export function GrammarCardComponent({
  data = mockGrammarData,
  onComplete = () => console.log('Grammar review complete'),
  isStandalone = false
}) {
  const handleSpeak = (text) => {
    SpeechService.speak(text, { rate: 0.95 });
  };

  return (
    <div className="grammar-block-container">
      {/* 1. 패턴 공식 헤더 카드 */}
      <div className="grammar-formula-card">
        <div className="grammar-tag-row">
          <Tag size={13} />
          <span>{data.tag}</span>
        </div>
        <h2 className="grammar-formula-title">{data.patternFormula}</h2>
        <p className="grammar-formula-desc">{data.explanation}</p>
      </div>

      {/* 2. 컬러 청크 구조화 */}
      {data.chunks && (
        <div className="grammar-chunks-card">
          <span className="grammar-section-label">🧩 문장 성분 시각화 청크</span>
          <div className="grammar-chunk-list">
            {data.chunks.map((item, idx) => (
              <div
                key={idx}
                className="grammar-chunk-pill"
                style={{ backgroundColor: item.color }}
              >
                <span className="grammar-chunk-text">"{item.chunk}"</span>
                <span className="grammar-chunk-role">{item.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 일상 변형 예문 3단 콤보 */}
      {data.variations && (
        <div className="grammar-variations-card">
          <span className="grammar-section-label">💬 아내 맞춤 실전 변형 예문 3종</span>
          <div>
            {data.variations.map((item, idx) => (
              <div key={idx} className="grammar-var-item">
                <div style={{ flex: 1 }}>
                  <div className="grammar-var-en">"{item.en}"</div>
                  <div className="grammar-var-ko">{item.ko}</div>
                </div>
                <button
                  className="btn-audio-circle btn-spring"
                  style={{ width: '34px', height: '34px', flexShrink: 0 }}
                  onClick={() => handleSpeak(item.en)}
                  title="예문 발음 듣기"
                >
                  <Volume2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="btn-submit-ai btn-spring"
        style={{ marginTop: 'auto' }}
        onClick={onComplete}
      >
        <CheckCircle2 size={18} />
        <span>문법 패턴 학습 완료!</span>
      </button>
    </div>
  );
}

export const GrammarCardBlock = {
  id: 'GrammarCard',
  name: '문법 패턴 & 컬러 청크 카드',
  description: '문법 용어 없는 핵심 패턴 공식과 컬러 청크, 실전 변형 예문 3단을 제시하는 블록',
  Component: GrammarCardComponent,
  mockData: mockGrammarData
};
