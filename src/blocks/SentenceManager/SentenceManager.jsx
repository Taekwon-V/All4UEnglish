import React, { useState, useEffect } from 'react';
import { 
  ListOrdered, PlayCircle, Plus, Bookmark, Volume2, 
  Trash2, FolderPlus, Check, ChevronRight, Shuffle, Headphones
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { SpeechService } from '../../services/speech';
import './SentenceManager.css';

export default function SentenceManager({ onPlayPlaylist }) {
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' | 'playlists'
  const [sentences, setSentences] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  
  // 플레이리스트 생성 모달 상태
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

  const handleSpeak = (text) => {
    SpeechService.speak(text, 1.0);
  };

  const handleToggleBookmark = (id) => {
    const updated = StorageService.toggleSentenceBookmark(id);
    setSentences(updated);
  };

  const handleDeleteSentence = (id) => {
    if (confirm('이 문장을 보관함에서 삭제하시겠습니까?')) {
      const updated = StorageService.deleteSentence(id);
      setSentences(updated);
    }
  };

  // 신규 플레이리스트 생성
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

  // 문장을 특정 플레이리스트에 추가
  const handleAddSentenceToPlaylist = (playlistId) => {
    if (!targetSentenceForPl) return;
    StorageService.addSentenceToPlaylist(playlistId, targetSentenceForPl.id);
    setTargetSentenceForPl(null);
    loadData();
  };

  // 특정 플레이리스트 삭제
  const handleDeletePlaylist = (id) => {
    if (confirm('이 플레이리스트를 삭제하시겠습니까?')) {
      StorageService.deletePlaylist(id);
      loadData();
    }
  };

  return (
    <div className="sentence-manager-container">
      {/* 상단 서브 탭 */}
      <div className="sub-tab-bar">
        <button 
          type="button" 
          className={`sub-tab ${activeSubTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('all')}
        >
          <ListOrdered size={16} />
          <span>전체 문장 ({sentences.length})</span>
        </button>

        <button 
          type="button" 
          className={`sub-tab ${activeSubTab === 'playlists' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('playlists')}
        >
          <FolderPlus size={16} />
          <span>플레이리스트 ({playlists.length})</span>
        </button>
      </div>

      {/* 1. 전체 문장 탭 */}
      {activeSubTab === 'all' && (
        <div className="sentences-list-section">
          {sentences.length === 0 ? (
            <div className="empty-state-box">
              <p>아직 저장된 문장이 없습니다.<br />첫 화면에서 멋진 영어 문장을 입력해보세요!</p>
            </div>
          ) : (
            sentences.map((s) => (
              <div key={s.id} className="sentence-master-card">
                <div className="card-header-row">
                  <span className="source-badge">{s.source || '직접 입력'}</span>
                  <div className="card-top-icons">
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

                <p className="master-en-text">{s.text}</p>
                <p className="master-ko-text">{s.translation}</p>

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
      )}

      {/* 2. 플레이리스트 관리 탭 */}
      {activeSubTab === 'playlists' && (
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

          {/* 플레이리스트 카드 목록 */}
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

                  {/* 미리보기 문장들 */}
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
