import React, { useState } from 'react';
import { Volume2, Star, RotateCw, Check, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { SpeechService } from '../../services/speech';
import { mockVocaData } from './mockData';
import './VocaCardBlock.css';

export function VocaCardComponent({
  data = mockVocaData,
  onWordStatusChange = (wordId, status) => console.log('Word status:', wordId, status),
  onBookmarkToggle = (wordId) => console.log('Bookmark toggle:', wordId),
  onCompleteAll = () => console.log('All words reviewed'),
  isStandalone = false
}) {
  const words = data.words || [];
  const [index, setIndex] = useState(data.currentIndex || 0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => 
    new Set(words.filter(w => w.isBookmarked).map(w => w.id))
  );

  if (words.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>단어 카드가 없습니다.</div>;
  }

  const currentWord = words[index];
  const isBookmarked = bookmarkedIds.has(currentWord.id);

  const handleSpeak = (e, text) => {
    e?.stopPropagation();
    SpeechService.speak(text, { rate: 0.9 });
  };

  const handleToggleBookmark = (e) => {
    e?.stopPropagation();
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(currentWord.id)) {
        next.delete(currentWord.id);
      } else {
        next.add(currentWord.id);
      }
      return next;
    });
    onBookmarkToggle(currentWord.id);
  };

  const handleNextWord = (status) => {
    onWordStatusChange(currentWord.id, status);
    setIsFlipped(false);

    if (index < words.length - 1) {
      setIndex(prev => prev + 1);
    } else {
      onCompleteAll();
    }
  };

  return (
    <div className="voca-block-container">
      {/* 상단 인디케이터 */}
      <div className="voca-card-meta">
        <span className="voca-progress-badge">
          단어 {index + 1} / {words.length}
        </span>
        <button
          className={`btn-bookmark btn-spring ${isBookmarked ? 'active' : ''}`}
          onClick={handleToggleBookmark}
          title="단어 북마크"
        >
          <Star size={22} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* 3D 플립 카드 본체 */}
      <div className="voca-card-stage" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`voca-card-inner ${isFlipped ? 'flipped' : ''}`}>
          
          {/* 카드 앞면 */}
          <div className="voca-card-front">
            <div className="voca-front-content">
              <h2 className="voca-main-word">{currentWord.word}</h2>
              
              <div className="voca-phonetic-row">
                <span>{currentWord.phonetic}</span>
                <button
                  className="btn-audio-circle btn-spring"
                  onClick={(e) => handleSpeak(e, currentWord.word)}
                  title="발음 듣기"
                >
                  <Volume2 size={20} />
                </button>
              </div>

              <div className="voca-front-hint">
                💡 <strong>원문 속 문맥 힌트</strong><br />
                "{currentWord.highlightedSentence.replace(new RegExp(currentWord.word, 'gi'), '_____')}"
              </div>
            </div>

            <div className="voca-flip-prompt">
              <RotateCw size={14} />
              <span>카드를 터치하면 뜻과 뉘앙스가 보여요</span>
            </div>
          </div>

          {/* 카드 뒷면 */}
          <div className="voca-card-back">
            <div className="voca-nuance-tag">
              ✨ <strong>문맥 속 뉘앙스</strong><br />
              {currentWord.nuanceKo}
            </div>

            <div className="voca-section-title">아내가 읽은 원문 문장</div>
            <div className="voca-sentence-box">
              "{currentWord.highlightedSentence.split(new RegExp(`(${currentWord.word})`, 'gi')).map((part, i) => 
                part.toLowerCase() === currentWord.word.toLowerCase() ? (
                  <span key={i} className="voca-highlight">{part}</span>
                ) : part
              )}"
            </div>

            <div className="voca-section-title">일상 맞춤 추가 예문</div>
            <div className="voca-sentence-box voca-example-box">
              <div>
                <p style={{ fontWeight: 600 }}>"{currentWord.dailyExample}"</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {currentWord.dailyExampleKo}
                </p>
              </div>
              <button
                className="btn-audio-circle btn-spring"
                style={{ flexShrink: 0 }}
                onClick={(e) => handleSpeak(e, currentWord.dailyExample)}
              >
                <Volume2 size={16} />
              </button>
            </div>

            <div className="voca-flip-prompt" style={{ marginTop: 'auto' }}>
              <RotateCw size={14} />
              <span>다시 탭하면 앞면으로 회전</span>
            </div>
          </div>

        </div>
      </div>

      {/* 하단 갤럭시 S26 원핸드 스위트스팟 액션 버튼 */}
      <div className="voca-action-bar">
        <button
          className="btn-voca-action confused btn-spring"
          onClick={() => handleNextWord('review')}
        >
          <X size={18} />
          <span>아직 헷갈려요</span>
        </button>

        <button
          className="btn-voca-action mastered btn-spring"
          onClick={() => handleNextWord('mastered')}
        >
          <Check size={18} />
          <span>다 외웠어요!</span>
        </button>
      </div>
    </div>
  );
}

export const VocaCardBlock = {
  id: 'VocaCard',
  name: '3D 플립 단어 카드',
  description: '문맥 뉘앙스와 발음, 원문 형광펜 하이라이트가 담긴 3D 인터랙티브 플래시카드',
  Component: VocaCardComponent,
  mockData: mockVocaData
};
