import React, { useState, useEffect, useMemo } from 'react';
import { 
  ListOrdered, PlayCircle, Plus, Bookmark, Volume2, 
  Trash2, FolderPlus, Check, ChevronRight, Headphones, 
  CheckCircle2, RotateCcw, Search, Sparkles, Filter, BookOpen 
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { SpeechService } from '../../services/speech';
import './SentenceManager.css';

export default function SentenceManager({ onPlayPlaylist }) {
  // 메인 탭: 'learning' (학습 중) | 'mastered' (학습 완료) | 'playlists' (플레이리스트)
  const [activeSection, setActiveSection] = useState('learning');
  
  const [sentences, setSentences] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  
  // 검색 및 필터 칩
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all'); // 'all' | 'bookmarked' | '책/원서' | '일상회화'

  // 플레이리스트 생성 모달
  const [isCreatingPl, setIsCreatingPl] = useState(false);
  const [newPlTitle, setNewPlTitle] = useState('');
  const [newPlDesc, setNewPlDesc] = useState('');

  // 문장 -> 플레이리스트 담기 모달
  const [targetSentenceForPl, setTargetSentenceForPl] = useState(null);

  const loadData = () => {
    setSentences(StorageService.getSentences());
    setPlaylists(StorageService.getPlaylists());
  };

  useEffect(() => {
    loadData();
  }, []);

  // 학습 중인 문장 & 학습 완료 문장 분리
  const learningSentences = useMemo(() => {
    return sentences.filter(s => s.status !== 'mastered');
  }, [sentences]);

  const masteredSentences = useMemo(() => {
    return sentences.filter(s => s.status === 'mastered');
  }, [sentences]);

  // 필터링 적용된 목록
  const displayedSentences = useMemo(() => {
    const baseList = activeSection === 'learning' ? learningSentences : masteredSentences;
    return baseList.filter(s => {
      // 1. 검색어 필터
      const matchSearch = !searchQuery || 
        s.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.translation?.includes(searchQuery);
      
      // 2. 태그/상태 필터
      let matchTag = true;
      if (selectedTag === 'bookmarked') {
        matchTag = !!s.isBookmarked;
      } else if (selectedTag !== 'all') {
        matchTag = s.source?.includes(selectedTag) || s.tags?.some(t => t.includes(selectedTag));
      }

      return matchSearch && matchTag;
    });
  }, [activeSection, learningSentences, masteredSentences, searchQuery, selectedTag]);

  const handleSpeak = (text) => {
    SpeechService.speak(text, 1.0);
  };

  // 학습 완료로 전환 (외웠어요)
  const handleMarkAsMastered = (id) => {
    const updated = StorageService.setSentenceStatus(id, 'mastered');
    setSentences(updated);
  };

  // 다시 학습 중으로 전환 (복습하기)
  const handleMarkAsLearning = (id) => {
    const updated = StorageService.setSentenceStatus(id, 'learning');
    setSentences(updated);
  };

  const handleToggleBookmark = (id) => {
    const updated = StorageService.toggleSentenceBookmark(id);
    setSentences(updated);
  };

  const handleDeleteSentence = (id) => {
    if (confirm('이 문장을 보관함에서 완전히 삭제하시겠습니까?')) {
      const updated = StorageService.deleteSentence(id);
      setSentences(updated);
    }
  };

  // 학습 중인 문장들만 모아서 즉시 라디오로 듣기
  const handlePlayLearningInRadio = () => {
    if (learningSentences.length === 0) return;
    const tempPl = {
      id: 'pl-learning-now',
      title: '📖 학습 중인 문장 모음',
      description: '아직 외우지 않은 문장들만 모아 3회 반복 청취',
      sentenceIds: learningSentences.map(s => s.id)
    };
    if (onPlayPlaylist) {
      onPlayPlaylist(tempPl);
    }
  };

  // 플레이리스트 생성
  const handleCreatePlaylist = () => {
    if (!newPlTitle.trim()) return;
    StorageService.savePlaylist({
      title: newPlTitle.trim(),
      description: newPlDesc.trim() || '아내의 맞춤형 문장 플레이리스트',
      sentenceIds: []
    });
    setNewPlTitle('');
    setNewPlDesc('');
    setIsCreatingPl(false);
    loadData();
  };

  const handleAddSentenceToPlaylist = (playlistId) => {
    if (!targetSentenceForPl) return;
    StorageService.addSentenceToPlaylist(playlistId, targetSentenceForPl.id);
    setTargetSentenceForPl(null);
    loadData();
  };

  const handleDeletePlaylist = (id) => {
    if (confirm('이 플레이리스트를 삭제하시겠습니까?')) {
      StorageService.deletePlaylist(id);
      loadData();
    }
  };

  // 전체 진척도 계산
  const totalCount = sentences.length;
  const progressPercent = totalCount > 0 ? Math.round((masteredSentences.length / totalCount) * 100) : 0;

  return (
    <div className="sentence-manager-container">
      {/* 3단 메인 세그먼트: [학습 중] vs [학습 완료] vs [플레이리스트] */}
      <div className="section-segment-bar">
        <button 
          type="button" 
          className={`segment-btn ${activeSection === 'learning' ? 'active' : ''}`}
          onClick={() => setActiveSection('learning')}
        >
          <BookOpen size={15} />
          <span>학습 중 ({learningSentences.length})</span>
        </button>

        <button 
          type="button" 
          className={`segment-btn ${activeSection === 'mastered' ? 'active' : ''}`}
          onClick={() => setActiveSection('mastered')}
        >
          <CheckCircle2 size={15} />
          <span>학습 완료 ({masteredSentences.length})</span>
        </button>

        <button 
          type="button" 
          className={`segment-btn ${activeSection === 'playlists' ? 'active' : ''}`}
          onClick={() => setActiveSection('playlists')}
        >
          <FolderPlus size={15} />
          <span>플레이리스트 ({playlists.length})</span>
        </button>
      </div>

      {/* 학습 진척도 게이지 바 */}
      {activeSection !== 'playlists' && totalCount > 0 && (
        <div className="learning-progress-card">
          <div className="progress-label-row">
            <span>누적 학습 진척도</span>
            <strong>{masteredSentences.length} / {totalCount} 문장 ({progressPercent}%)</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* 1. 학습 중 탭 또는 학습 완료 탭 화면 */}
      {(activeSection === 'learning' || activeSection === 'mastered') && (
        <div className="sentences-tab-content">
          {/* 학습 중 탭 전용: 원클릭 라디오 연속 듣기 CTA 카드 */}
          {activeSection === 'learning' && learningSentences.length > 0 && (
            <div className="quick-radio-banner">
              <div className="banner-left">
                <div className="banner-pulse-icon">
                  <Headphones size={20} />
                </div>
                <div>
                  <h4>학습 중인 문장만 모아듣기</h4>
                  <p>산책할 때 화면을 끄고 3회 반복(영➔한➔영)으로 편안하게 들어보세요.</p>
                </div>
              </div>
              <button 
                type="button" 
                className="banner-play-btn"
                onClick={handlePlayLearningInRadio}
              >
                <span>라디오 재생</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* 실시간 검색창 */}
          <div className="sentence-search-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="영어 문장 또는 한국어 번역 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          {/* 태그 필터 칩 바 */}
          <div className="filter-chips-row">
            <button 
              type="button" 
              className={`chip ${selectedTag === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedTag('all')}
            >
              전체
            </button>
            <button 
              type="button" 
              className={`chip ${selectedTag === 'bookmarked' ? 'active' : ''}`}
              onClick={() => setSelectedTag('bookmarked')}
            >
              ⭐ 중요 북마크
            </button>
            <button 
              type="button" 
              className={`chip ${selectedTag === '책' ? 'active' : ''}`}
              onClick={() => setSelectedTag('책')}
            >
              📖 책/영상
            </button>
            <button 
              type="button" 
              className={`chip ${selectedTag === '일상' ? 'active' : ''}`}
              onClick={() => setSelectedTag('일상')}
            >
              💬 일상회화
            </button>
          </div>

          {/* 문장 카드 리스트 */}
          <div className="sentence-cards-list">
            {displayedSentences.length === 0 ? (
              <div className="empty-state-box">
                <p>
                  {activeSection === 'learning' 
                    ? '현재 학습 중인 문장이 없습니다! 첫 탭에서 새 문장을 담아보세요.' 
                    : '아직 학습 완료된 문장이 없습니다. 학습 중 탭에서 [외웠어요]를 체크해보세요!'}
                </p>
              </div>
            ) : (
              displayedSentences.map((s) => (
                <div key={s.id} className={`sentence-master-card ${s.status === 'mastered' ? 'mastered-card' : ''}`}>
                  {/* 카드 헤더 (출처, 상태 전환 버튼, 액션들) */}
                  <div className="card-header-row">
                    <span className="source-badge">{s.source || '직접 입력'}</span>

                    <div className="card-top-icons">
                      {/* 상태 토글: 학습 중일 땐 [외웠어요], 완료일 땐 [다시 복습] */}
                      {activeSection === 'learning' ? (
                        <button 
                          type="button" 
                          className="status-toggle-btn master-btn"
                          onClick={() => handleMarkAsMastered(s.id)}
                          title="학습 완료로 이동"
                        >
                          <Check size={14} />
                          <span>외웠어요</span>
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          className="status-toggle-btn review-btn"
                          onClick={() => handleMarkAsLearning(s.id)}
                          title="다시 학습 중으로 이동"
                        >
                          <RotateCcw size={13} />
                          <span>다시 학습</span>
                        </button>
                      )}

                      <button 
                        type="button" 
                        className={`bookmark-btn ${s.isBookmarked ? 'bookmarked' : ''}`}
                        onClick={() => handleToggleBookmark(s.id)}
                      >
                        <Bookmark size={16} fill={s.isBookmarked ? '#f59e0b' : 'none'} />
                      </button>
                      <button 
                        type="button" 
                        className="delete-btn"
                        onClick={() => handleDeleteSentence(s.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* 영어 원문 (강조) */}
                  <p className="master-en-text">{s.text}</p>
                  
                  {/* 한국어 번역 */}
                  <p className="master-ko-text">{s.translation}</p>

                  {/* 카드 하단 액션 버튼 바 */}
                  <div className="card-footer-actions">
                    <button type="button" className="action-pill-btn" onClick={() => handleSpeak(s.text)}>
                      <Volume2 size={14} />
                      <span>발음 듣기</span>
                    </button>

                    <button 
                      type="button" 
                      className="action-pill-btn playlist-add"
                      onClick={() => setTargetSentenceForPl(s)}
                    >
                      <Plus size={14} />
                      <span>플레이리스트에 담기</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. 플레이리스트 관리 탭 화면 */}
      {activeSection === 'playlists' && (
        <div className="playlists-section">
          <div className="playlist-create-bar">
            <button 
              type="button" 
              className="create-pl-trigger-btn"
              onClick={() => setIsCreatingPl(true)}
            >
              <Plus size={16} />
              <span>새 플레이리스트 만들기</span>
            </button>
          </div>

          <div className="playlists-grid">
            {playlists.map((pl) => {
              const plSentences = sentences.filter(s => pl.sentenceIds?.includes(s.id));
              return (
                <div key={pl.id} className="playlist-card">
                  <div className="pl-card-top">
                    <h4>{pl.title}</h4>
                    <button 
                      type="button" 
                      className="pl-delete-btn"
                      onClick={() => handleDeletePlaylist(pl.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="pl-desc">{pl.description}</p>
                  
                  <div className="pl-meta-row">
                    <span className="count-tag">{plSentences.length}개 문장 담김</span>
                  </div>

                  {plSentences.length > 0 && (
                    <div className="pl-preview-list">
                      {plSentences.slice(0, 3).map((item, idx) => (
                        <div key={item.id} className="pl-preview-item">
                          <span>{idx + 1}. {item.text}</span>
                        </div>
                      ))}
                      {plSentences.length > 3 && (
                        <span className="more-count">외 {plSentences.length - 3}개 더...</span>
                      )}
                    </div>
                  )}

                  <button 
                    type="button" 
                    className="pl-play-btn"
                    disabled={plSentences.length === 0}
                    onClick={() => onPlayPlaylist && onPlayPlaylist(pl)}
                  >
                    <Headphones size={16} />
                    <span>라디오로 반복 듣기</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 플레이리스트 신규 생성 모달 */}
      {isCreatingPl && (
        <div className="modal-backdrop">
          <div className="modal-sheet">
            <h3>🎧 새 플레이리스트 만들기</h3>
            <p className="modal-guide">산책할 때나 가사일할 때 반복해서 들을 문장 모음집입니다.</p>

            <input 
              type="text" 
              placeholder="예: 오늘의 카페 주문 표현들" 
              value={newPlTitle}
              onChange={(e) => setNewPlTitle(e.target.value)}
              className="modal-input"
            />
            <input 
              type="text" 
              placeholder="설명 (선택)" 
              value={newPlDesc}
              onChange={(e) => setNewPlDesc(e.target.value)}
              className="modal-input"
            />

            <div className="modal-actions">
              <button type="button" className="modal-btn cancel" onClick={() => setIsCreatingPl(false)}>
                취소
              </button>
              <button type="button" className="modal-btn submit" onClick={handleCreatePlaylist}>
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 문장을 플레이리스트에 담기 모달 */}
      {targetSentenceForPl && (
        <div className="modal-backdrop">
          <div className="modal-sheet">
            <h3>📂 플레이리스트 선택</h3>
            <p className="target-text-preview">"{targetSentenceForPl.text}"</p>
            <p className="modal-guide">이 문장을 어느 플레이리스트에 담을까요?</p>

            <div className="pl-select-list">
              {playlists.map(pl => {
                const alreadyIncluded = pl.sentenceIds?.includes(targetSentenceForPl.id);
                return (
                  <button 
                    key={pl.id}
                    type="button" 
                    className={`pl-select-item ${alreadyIncluded ? 'included' : ''}`}
                    disabled={alreadyIncluded}
                    onClick={() => handleAddSentenceToPlaylist(pl.id)}
                  >
                    <div>
                      <strong>{pl.title}</strong>
                      <span className="sub">({pl.sentenceIds?.length || 0}개)</span>
                    </div>
                    {alreadyIncluded ? <Check size={16} color="#059669" /> : <ChevronRight size={16} />}
                  </button>
                );
              })}
            </div>

            <div className="modal-actions">
              <button type="button" className="modal-btn cancel" onClick={() => setTargetSentenceForPl(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
