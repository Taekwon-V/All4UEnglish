import React, { useState } from 'react';
import { Volume2, VolumeX, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { SpeechService } from '../../services/speech';
import { mockPassageData } from './mockData';
import './PassageBarBlock.css';

export function PassageBarComponent({
  data = mockPassageData,
  onPlayStateChange = (playing) => {},
  isStandalone = false
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [speed, setSpeed] = useState(1.0); // 1.0x or 0.8x

  const textToRead = data.originalText || '';

  const handleTogglePlay = () => {
    if (isPlaying) {
      SpeechService.stop();
      setIsPlaying(false);
      onPlayStateChange(false);
    } else {
      setIsPlaying(true);
      onPlayStateChange(true);
      SpeechService.speak(textToRead, {
        rate: speed,
        onEnd: () => {
          setIsPlaying(false);
          onPlayStateChange(false);
        }
      });
    }
  };

  const handleToggleSpeed = () => {
    const nextSpeed = speed === 1.0 ? 0.8 : 1.0;
    setSpeed(nextSpeed);
    if (isPlaying) {
      SpeechService.speak(textToRead, {
        rate: nextSpeed,
        onEnd: () => {
          setIsPlaying(false);
          onPlayStateChange(false);
        }
      });
    }
  };

  return (
    <div className="passage-bar-container">
      <div className="passage-header-row">
        <div
          className="passage-badge-title"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ cursor: 'pointer' }}
        >
          <BookOpen size={16} />
          <span>공부한 원문</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>

        <div className="passage-controls">
          <button
            className="btn-speed-toggle btn-spring"
            onClick={handleToggleSpeed}
            title="원어민 낭독 배속 변경"
          >
            {speed === 0.8 ? '🐢 0.8x 슬로우' : '🐰 1.0x 표준'}
          </button>

          <button
            className={`btn-passage-play btn-spring ${isPlaying ? 'is-playing' : ''}`}
            onClick={handleTogglePlay}
            title={isPlaying ? '오디오 일시정지' : '원문 전체 듣기'}
          >
            {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* 원문 텍스트 표시 */}
      <div
        className={`passage-text-box ${!isExpanded ? 'passage-text-collapsed' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        "{textToRead}"
      </div>
    </div>
  );
}

export const PassageBarBlock = {
  id: 'PassageBar',
  name: '원문 보기 & 전체 TTS 플레이어',
  description: '상단에 학습 원문을 띄우고 0.8x/1.0x 배속으로 원어민 발음을 들려주는 미니 플레이어',
  Component: PassageBarComponent,
  mockData: mockPassageData
};
