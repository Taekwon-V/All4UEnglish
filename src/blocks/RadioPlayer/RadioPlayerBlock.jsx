import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Radio, Volume2, Repeat, Sliders, Layers } from 'lucide-react';
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
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(targetPlaylist?.id || 'all');
  
  // 재생 설정: 루프 모드 ('infinite' | '3times' | 'once'), 낭독 모드 ('en-ko-en' | 'en-only'), 속도 (0.8, 1.0, 1.2)
  const [loopMode, setLoopMode] = useState('3times');
  const [speechMode, setSpeechMode] = useState('en-ko-en');
  const [speechRate, setSpeechRate] = useState(1.0);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCounter, setRepeatCounter] = useState(1);

  const playSeqRef = useRef(0);

  useEffect(() => {
    const loadedSentences = StorageService.getSentences();
    const loadedPlaylists = StorageService.getPlaylists();
    setSentences(loadedSentences);
    setPlaylists(loadedPlaylists);

    if (targetPlaylist && targetPlaylist.id) {
      setSelectedPlaylistId(targetPlaylist.id);
    }
  }, [targetPlaylist]);

  // 현재 활성화된 재생 목록 (학습 중인 문장 / 학습 완료 / 특정 플레이리스트 / 전체 문장)
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
    // 전달받은 가상 플레이리스트 (예: 학습 중 모음)
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
  const playTrackSequence = (trackIdx, seqId, currentRep = 1) => {
    if (!currentTracks || currentTracks.length === 0 || trackIdx >= currentTracks.length) {
      setIsPlaying(false);
      return;
    }

    const track = currentTracks[trackIdx];
    if (!track) return;

    setRepeatCounter(currentRep);

    // 1단계: 영어 문장 낭독
    SpeechService.speak(track.text, {
      lang: 'en-US',
      rate: speechRate,
      onEnd: () => {
        if (playSeqRef.current !== seqId) return;

        if (speechMode === 'en-ko-en' && track.translation) {
          // 2단계: 한국어 번역 낭독
          setTimeout(() => {
            SpeechService.speak(track.translation, {
              lang: 'ko-KR',
              rate: 1.0,
              onEnd: () => {
                if (playSeqRef.current !== seqId) return;
                // 3단계: 다시 한번 영어 낭독 (귀에 각인)
                setTimeout(() => {
                  SpeechService.speak(track.text, {
                    lang: 'en-US',
                    rate: speechRate,
                    onEnd: () => {
                      if (playSeqRef.current !== seqId) return;
                      handleTrackEnd(trackIdx, seqId, currentRep);
                    }
                  });
                }, 500);
              }
            });
          }, 400);
        } else {
          // 영어만 낭독 모드
          setTimeout(() => {
            handleTrackEnd(trackIdx, seqId, currentRep);
          }, 700);
        }
      }
    });
  };

  // 트랙 끝났을 때 반복 횟수 처리 & 다음 곡 이동
  const handleTrackEnd = (trackIdx, seqId, currentRep) => {
    if (loopMode === '3times' && currentRep < 3) {
      // 3회 반복 모드에서 아직 3회가 안 채워졌으면 동일 문장 반복
      setTimeout(() => {
        playTrackSequence(trackIdx, seqId, currentRep + 1);
      }, 1000);
      return;
    }

    // 다음 문장으로 이동
    setTimeout(() => {
      let nextIdx = trackIdx + 1;
      if (nextIdx >= currentTracks.length) {
        if (loopMode === 'once') {
          setIsPlaying(false);
          return;
        }
        nextIdx = 0; // 무한 반복
      }
      setCurrentIdx(nextIdx);
      playTrackSequence(nextIdx, seqId, 1);
    }, 1500);
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
      playTrackSequence(currentIdx, newSeq, 1);
    }
  };

  const handleNext = () => {
    SpeechService.stop();
    const next = (currentIdx + 1) % currentTracks.length;
    setCurrentIdx(next);
    if (isPlaying) {
      const newSeq = playSeqRef.current + 1;
      playSeqRef.current = newSeq;
      playTrackSequence(next, newSeq, 1);
    }
  };

  const handlePrev = () => {
    SpeechService.stop();
    const prev = (currentIdx - 1 + currentTracks.length) % currentTracks.length;
    setCurrentIdx(prev);
    if (isPlaying) {
      const newSeq = playSeqRef.current + 1;
      playSeqRef.current = newSeq;
      playTrackSequence(prev, newSeq, 1);
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
      {/* 헤더 & 플레이리스트 선택 드롭다운 */}
      <div className="radio-top-selector-row">
        <div className="radio-badge">
          <Radio size={14} />
          <span>반복 라디오 모드</span>
        </div>

        <select 
          className="playlist-dropdown"
          value={selectedPlaylistId}
          onChange={(e) => {
            SpeechService.stop();
            setIsPlaying(false);
            setCurrentIdx(0);
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

      {/* 비주얼 오디오 덱 */}
      <div className="radio-visual-deck">
        <div className={`radio-waveform-animation ${isPlaying ? 'playing' : ''}`}>
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
          <div className="radio-wave-bar" />
        </div>

        {currentTrack ? (
          <>
            <div className="radio-track-title">{currentTrack.text}</div>
            <div className="radio-track-ko">{currentTrack.translation}</div>
            
            <div className="track-status-pill">
              <span>트랙 {currentIdx + 1} / {currentTracks.length}</span>
              {loopMode === '3times' && (
                <span className="repeat-badge">🔁 {repeatCounter}번째 반복 중</span>
              )}
            </div>
          </>
        ) : (
          <div className="empty-radio-hint">재생할 문장이 없습니다.</div>
        )}
      </div>

      {/* 반복 및 음성 옵션 제어 바 */}
      <div className="radio-options-panel">
        {/* 반복 모드 */}
        <div className="option-pill-group">
          <button 
            type="button" 
            className={`opt-btn ${loopMode === '3times' ? 'active' : ''}`}
            onClick={() => setLoopMode('3times')}
          >
            3회 반복
          </button>
          <button 
            type="button" 
            className={`opt-btn ${loopMode === 'infinite' ? 'active' : ''}`}
            onClick={() => setLoopMode('infinite')}
          >
            무한 루프
          </button>
          <button 
            type="button" 
            className={`opt-btn ${loopMode === 'once' ? 'active' : ''}`}
            onClick={() => setLoopMode('once')}
          >
            1회만
          </button>
        </div>

        {/* 낭독 순서 */}
        <div className="option-pill-group">
          <button 
            type="button" 
            className={`opt-btn ${speechMode === 'en-ko-en' ? 'active' : ''}`}
            onClick={() => setSpeechMode('en-ko-en')}
          >
            영 ➔ 한 ➔ 영
          </button>
          <button 
            type="button" 
            className={`opt-btn ${speechMode === 'en-only' ? 'active' : ''}`}
            onClick={() => setSpeechMode('en-only')}
          >
            영어만
          </button>
        </div>

        {/* 속도 조절 */}
        <div className="option-pill-group">
          <button 
            type="button" 
            className={`opt-btn ${speechRate === 0.8 ? 'active' : ''}`}
            onClick={() => setSpeechRate(0.8)}
          >
            0.8x
          </button>
          <button 
            type="button" 
            className={`opt-btn ${speechRate === 1.0 ? 'active' : ''}`}
            onClick={() => setSpeechRate(1.0)}
          >
            1.0x
          </button>
          <button 
            type="button" 
            className={`opt-btn ${speechRate === 1.2 ? 'active' : ''}`}
            onClick={() => setSpeechRate(1.2)}
          >
            1.2x
          </button>
        </div>
      </div>

      <p className="radio-instruction-text">
        스마트폰 화면을 끄고 주머니에 넣어도<br />
        설정한 플레이리스트를 설정한 배속과 반복으로 편안하게 들려드립니다.
      </p>

      {/* 재생 컨트롤러 */}
      <div className="radio-control-row">
        <button
          type="button"
          className="btn-radio-circle btn-spring"
          onClick={handlePrev}
          disabled={!currentTracks.length}
        >
          <SkipBack size={20} />
        </button>

        <button
          type="button"
          className="btn-radio-circle btn-radio-play btn-spring"
          onClick={togglePlay}
          disabled={!currentTracks.length}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}
        </button>

        <button
          type="button"
          className="btn-radio-circle btn-spring"
          onClick={handleNext}
          disabled={!currentTracks.length}
        >
          <SkipForward size={20} />
        </button>
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
