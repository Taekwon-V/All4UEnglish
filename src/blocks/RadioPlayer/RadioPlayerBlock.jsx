import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Radio, Volume2, Repeat, Sliders, Layers, Sparkles, Disc3 } from 'lucide-react';
import { SpeechService } from '../../services/speech';
import { StorageService } from '../../services/storage';
import { mockRadioData } from './mockData';
import './RadioPlayerBlock.css';

export function RadioPlayerComponent({
  targetPlaylist = null,
  isStandalone = false
}) {
  const [playlists, setPlaylists] = useState([]);
  const [sentences, setSentences] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(targetPlaylist?.id || 'learning');
  
  // 재생 설정: 루프 모드 ('3times' | 'infinite' | 'once'), 낭독 모드 ('en-ko-en' | 'en-only'), 속도 (0.8, 1.0, 1.2)
  const [loopMode, setLoopMode] = useState('3times');
  const [speechMode, setSpeechMode] = useState('en-ko-en');
  const [speechRate, setSpeechRate] = useState(1.0);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCounter, setRepeatCounter] = useState(1);

  const playSeqRef = useRef(0);
  const stateRef = useRef({ loopMode, speechMode, speechRate, currentIdx, repeatCounter, isPlaying });

  useEffect(() => {
    stateRef.current = { loopMode, speechMode, speechRate, currentIdx, repeatCounter, isPlaying };
  }, [loopMode, speechMode, speechRate, currentIdx, repeatCounter, isPlaying]);

  useEffect(() => {
    const loadedSentences = StorageService.getSentences();
    const loadedPlaylists = StorageService.getPlaylists();
    setSentences(loadedSentences);
    setPlaylists(loadedPlaylists);

    if (targetPlaylist && targetPlaylist.id) {
      setSelectedPlaylistId(targetPlaylist.id);
    }
  }, [targetPlaylist]);

  // 현재 활성화된 재생 트랙 목록
  const currentTracks = React.useMemo(() => {
    if (selectedPlaylistId === 'learning') {
      const filtered = sentences.filter(s => s.status !== 'mastered');
      return filtered.length > 0 ? filtered : sentences;
    }
    if (selectedPlaylistId === 'mastered') {
      const filtered = sentences.filter(s => s.status === 'mastered');
      return filtered.length > 0 ? filtered : sentences;
    }
    if (selectedPlaylistId === 'all') {
      return sentences;
    }
    if (targetPlaylist && targetPlaylist.sentenceIds && selectedPlaylistId === targetPlaylist.id) {
      const filtered = sentences.filter(s => targetPlaylist.sentenceIds.includes(s.id));
      return filtered.length > 0 ? filtered : sentences;
    }
    const foundPl = playlists.find(p => p.id === selectedPlaylistId);
    if (!foundPl || !foundPl.sentenceIds) return sentences;
    const filtered = sentences.filter(s => foundPl.sentenceIds.includes(s.id));
    return filtered.length > 0 ? filtered : sentences;
  }, [selectedPlaylistId, sentences, playlists, targetPlaylist]);

  const currentTrack = currentTracks[currentIdx] || currentTracks[0];

  // 낭독 시퀀스 실행기
  const executePlaySequence = (trackIdx, seqId, currentRep, opts) => {
    if (!currentTracks || currentTracks.length === 0 || trackIdx >= currentTracks.length) {
      setIsPlaying(false);
      return;
    }

    const track = currentTracks[trackIdx];
    if (!track) return;

    setRepeatCounter(currentRep);
    const activeOpts = opts || { loopMode, speechMode, speechRate };

    // 1단계: 영어 문장 낭독
    SpeechService.speak(track.text, {
      lang: 'en-US',
      rate: activeOpts.speechRate,
      onEnd: () => {
        if (playSeqRef.current !== seqId) return;

        if (activeOpts.speechMode === 'en-ko-en' && track.translation) {
          // 2단계: 한국어 번역 낭독
          setTimeout(() => {
            if (playSeqRef.current !== seqId) return;
            SpeechService.speak(track.translation, {
              lang: 'ko-KR',
              rate: 1.0,
              onEnd: () => {
                if (playSeqRef.current !== seqId) return;
                // 3단계: 다시 한번 영어 낭독
                setTimeout(() => {
                  if (playSeqRef.current !== seqId) return;
                  SpeechService.speak(track.text, {
                    lang: 'en-US',
                    rate: activeOpts.speechRate,
                    onEnd: () => {
                      if (playSeqRef.current !== seqId) return;
                      handleTrackEnd(trackIdx, seqId, currentRep, activeOpts);
                    }
                  });
                }, 400);
              }
            });
          }, 350);
        } else {
          // 영어만 낭독 모드
          setTimeout(() => {
            if (playSeqRef.current !== seqId) return;
            handleTrackEnd(trackIdx, seqId, currentRep, activeOpts);
          }, 600);
        }
      }
    });
  };

  // 트랙 끝났을 때 반복 횟수 처리 & 다음 곡 이동
  const handleTrackEnd = (trackIdx, seqId, currentRep, activeOpts) => {
    if (activeOpts.loopMode === '3times' && currentRep < 3) {
      setTimeout(() => {
        if (playSeqRef.current !== seqId) return;
        executePlaySequence(trackIdx, seqId, currentRep + 1, activeOpts);
      }, 800);
      return;
    }

    // 다음 문장으로 이동
    setTimeout(() => {
      if (playSeqRef.current !== seqId) return;
      let nextIdx = trackIdx + 1;
      if (nextIdx >= currentTracks.length) {
        if (activeOpts.loopMode === 'once') {
          setIsPlaying(false);
          return;
        }
        nextIdx = 0; // 무한 반복 또는 3회 반복 모드에서 전체 루프
      }
      setCurrentIdx(nextIdx);
      executePlaySequence(nextIdx, seqId, 1, activeOpts);
    }, 1200);
  };

  // 12번 요구사항: 옵션 변경 시 '즉시 반영' 로직
  const handleOptionChange = (type, val) => {
    let nextLoop = loopMode;
    let nextMode = speechMode;
    let nextRate = speechRate;

    if (type === 'loop') {
      nextLoop = val;
      setLoopMode(val);
    } else if (type === 'mode') {
      nextMode = val;
      setSpeechMode(val);
    } else if (type === 'rate') {
      nextRate = val;
      setSpeechRate(val);
    }

    // 재생 중이면 진행 중인 음성을 중지하고 즉시 새 설정으로 현재 문장 다시 재생
    if (isPlaying) {
      SpeechService.stop();
      const newSeq = playSeqRef.current + 1;
      playSeqRef.current = newSeq;
      setTimeout(() => {
        executePlaySequence(currentIdx, newSeq, repeatCounter, {
          loopMode: nextLoop,
          speechMode: nextMode,
          speechRate: nextRate
        });
      }, 40);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      SpeechService.stop();
      setIsPlaying(false);
      playSeqRef.current += 1;
    } else {
      setIsPlaying(true);
      const newSeq = playSeqRef.current + 1;
      playSeqRef.current = newSeq;
      executePlaySequence(currentIdx, newSeq, 1, { loopMode, speechMode, speechRate });
    }
  };

  const handleNext = () => {
    SpeechService.stop();
    const next = (currentIdx + 1) % currentTracks.length;
    setCurrentIdx(next);
    setRepeatCounter(1);
    if (isPlaying) {
      const newSeq = playSeqRef.current + 1;
      playSeqRef.current = newSeq;
      executePlaySequence(next, newSeq, 1, { loopMode, speechMode, speechRate });
    }
  };

  const handlePrev = () => {
    SpeechService.stop();
    const prev = (currentIdx - 1 + currentTracks.length) % currentTracks.length;
    setCurrentIdx(prev);
    setRepeatCounter(1);
    if (isPlaying) {
      const newSeq = playSeqRef.current + 1;
      playSeqRef.current = newSeq;
      executePlaySequence(prev, newSeq, 1, { loopMode, speechMode, speechRate });
    }
  };

  useEffect(() => {
    return () => {
      SpeechService.stop();
      playSeqRef.current += 1;
    };
  }, []);

  return (
    <div className="radio-container">
      {/* 8번 요구사항: 상단 고정 헤더 셀렉터 */}
      <div className="radio-sticky-header">
        <div className="radio-badge">
          <Radio size={15} />
          <span>오디오 라디오</span>
        </div>

        <select 
          className="playlist-dropdown"
          value={selectedPlaylistId}
          onChange={(e) => {
            SpeechService.stop();
            setIsPlaying(false);
            setCurrentIdx(0);
            setRepeatCounter(1);
            setSelectedPlaylistId(e.target.value);
          }}
        >
          <option value="learning">📖 학습 중인 문장 ({sentences.filter(s => s.status !== 'mastered').length}개)</option>
          <option value="mastered">✅ 학습 완료된 문장 ({sentences.filter(s => s.status === 'mastered').length}개)</option>
          <option value="all">📂 전체 문장 ({sentences.length}개)</option>
          {playlists.map(pl => (
            <option key={pl.id} value={pl.id}>
              🎧 {pl.title} ({pl.sentenceIds?.length || 0}개)
            </option>
          ))}
        </select>
      </div>

      {/* 모던 비주얼 오디오 덱 카드 */}
      <div className="radio-visual-deck">
        <div className="deck-disc-badge">
          <Disc3 size={16} className={isPlaying ? 'spinning-disc' : ''} />
          <span>All4U Radio</span>
        </div>

        {/* 웨이브폼 애니메이션 */}
        <div className={`radio-waveform-animation ${isPlaying ? 'playing' : ''}`}>
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
        </div>

        {currentTrack ? (
          <div className="deck-content-wrap">
            <h2 className="radio-track-title">{currentTrack.text}</h2>
            <p className="radio-track-ko">{currentTrack.translation}</p>
            
            <div className="track-status-pill">
              <span className="track-number-chip">트랙 {currentIdx + 1} / {currentTracks.length}</span>
              {loopMode === '3times' && (
                <span className="repeat-badge">🔁 {repeatCounter} / 3회 반복</span>
              )}
              {loopMode === 'infinite' && (
                <span className="repeat-badge">♾️ 무한 반복</span>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-radio-hint">재생할 문장이 없습니다.</div>
        )}

        {/* 재생 컨트롤러 */}
        <div className="radio-control-row">
          <button
            type="button"
            className="btn-radio-circle btn-spring"
            onClick={handlePrev}
            disabled={!currentTracks.length}
            title="이전 문장"
          >
            <SkipBack size={20} />
          </button>

          <button
            type="button"
            className={`btn-radio-circle btn-radio-play btn-spring ${isPlaying ? 'is-playing' : ''}`}
            onClick={togglePlay}
            disabled={!currentTracks.length}
            title={isPlaying ? "일시정지" : "재생"}
          >
            {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}
          </button>

          <button
            type="button"
            className="btn-radio-circle btn-spring"
            onClick={handleNext}
            disabled={!currentTracks.length}
            title="다음 문장"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* 12번 요구사항: 누르면 즉시 음성에 반영되는 반복 / 모드 / 배속 컨트롤 패널 */}
      <div className="radio-options-panel">
        {/* 반복 모드 */}
        <div className="option-row">
          <span className="opt-label">반복</span>
          <div className="option-pill-group">
            <button 
              type="button" 
              className={`opt-btn ${loopMode === '3times' ? 'active' : ''}`}
              onClick={() => handleOptionChange('loop', '3times')}
            >
              3회 반복
            </button>
            <button 
              type="button" 
              className={`opt-btn ${loopMode === 'infinite' ? 'active' : ''}`}
              onClick={() => handleOptionChange('loop', 'infinite')}
            >
              무한 루프
            </button>
            <button 
              type="button" 
              className={`opt-btn ${loopMode === 'once' ? 'active' : ''}`}
              onClick={() => handleOptionChange('loop', 'once')}
            >
              1회만
            </button>
          </div>
        </div>

        {/* 낭독 순서 */}
        <div className="option-row">
          <span className="opt-label">언어</span>
          <div className="option-pill-group">
            <button 
              type="button" 
              className={`opt-btn ${speechMode === 'en-ko-en' ? 'active' : ''}`}
              onClick={() => handleOptionChange('mode', 'en-ko-en')}
            >
              영 ➔ 한 ➔ 영
            </button>
            <button 
              type="button" 
              className={`opt-btn ${speechMode === 'en-only' ? 'active' : ''}`}
              onClick={() => handleOptionChange('mode', 'en-only')}
            >
              영어만
            </button>
          </div>
        </div>

        {/* 속도 조절 */}
        <div className="option-row">
          <span className="opt-label">배속</span>
          <div className="option-pill-group">
            <button 
              type="button" 
              className={`opt-btn ${speechRate === 0.8 ? 'active' : ''}`}
              onClick={() => handleOptionChange('rate', 0.8)}
            >
              0.8x
            </button>
            <button 
              type="button" 
              className={`opt-btn ${speechRate === 1.0 ? 'active' : ''}`}
              onClick={() => handleOptionChange('rate', 1.0)}
            >
              1.0x (기본)
            </button>
            <button 
              type="button" 
              className={`opt-btn ${speechRate === 1.2 ? 'active' : ''}`}
              onClick={() => handleOptionChange('rate', 1.2)}
            >
              1.2x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const RadioPlayerBlock = {
  id: 'RadioPlayer',
  name: '백그라운드 연속 오디오 라디오',
  description: '플레이리스트 문장들을 무한/구간 반복 청취하는 오디오 플레이어',
  Component: RadioPlayerComponent,
  mockData: mockRadioData
};
