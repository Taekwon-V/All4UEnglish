import React, { useState, useEffect } from 'react';
import { Search, Star, Volume2, BookOpen, Check, Clock, Calendar } from 'lucide-react';
import { SpeechService } from '../../services/speech';
import { StorageService } from '../../services/storage';
import { mockArchiveData } from './mockData';
import './WordArchiveBlock.css';

export function WordArchiveComponent({
  data = mockArchiveData,
  onOpenSession = (sessionId) => console.log('Open session:', sessionId),
  isStandalone = false
}) {
  const [words, setWords] = useState(() => {
    const saved = StorageService.getWords();
    return saved.length > 0 ? saved : (data.words || []);
  });

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'review' | 'mastered' | 'bookmark' | 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [sessions, setSessions] = useState(() => {
    const saved = StorageService.getSessions();
    return saved.length > 0 ? saved : (data.sessions || []);
  });

  const handleSpeak = (text) => {
    SpeechService.speak(text, { rate: 0.95 });
  };

  const handleToggleBookmark = (wordId) => {
    const updated = StorageService.toggleBookmark(wordId);
    setWords(updated);
  };

  const handleToggleStatus = (wordId, currentStatus) => {
    const nextStatus = currentStatus === 'mastered' ? 'review' : 'mastered';
    const updated = StorageService.setWordStatus(wordId, nextStatus);
    setWords(updated);
  };

  // 필터링된 단어 리스트
  const filteredWords = words.filter(w => {
    // 탭 필터
    if (activeTab === 'review' && w.status !== 'review') return false;
    if (activeTab === 'mastered' && w.status !== 'mastered') return false;
    if (activeTab === 'bookmark' && !w.isBookmarked) return false;

    // 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchWord = w.word.toLowerCase().includes(q);
      const matchNuance = (w.nuanceKo || '').includes(q);
      if (!matchWord && !matchNuance) return false;
    }
    return true;
  });

  return (
    <div className="archive-container">
      <header className="archive-header">
        <div className="archive-title-row">
          <h2 className="archive-main-title">나만의 보관함</h2>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-brand)' }}>
            총 {words.length}개 어휘
          </span>
        </div>

        {/* 실시간 검색바 */}
        <div className="archive-search-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="archive-search-input"
            placeholder="단어 스펠링이나 한글 뜻 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 필터 탭 */}
        <div className="archive-filter-row">
          <button
            className={`archive-filter-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            전체 ({words.length})
          </button>
          <button
            className={`archive-filter-btn ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            헷갈려요 ({words.filter(w => w.status === 'review').length})
          </button>
          <button
            className={`archive-filter-btn ${activeTab === 'mastered' ? 'active' : ''}`}
            onClick={() => setActiveTab('mastered')}
          >
            외웠어요 ({words.filter(w => w.status === 'mastered').length})
          </button>
          <button
            className={`archive-filter-btn ${activeTab === 'bookmark' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookmark')}
          >
            ★ 중요 ({words.filter(w => w.isBookmarked).length})
          </button>
          <button
            className={`archive-filter-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            학습 기록 ({sessions.length})
          </button>
        </div>
      </header>

      {/* 메인 리스트 뷰 */}
      <div className="archive-list">
        {activeTab !== 'history' ? (
          filteredWords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              조건에 맞는 단어가 없습니다.
            </div>
          ) : (
            filteredWords.map(word => (
              <div key={word.id} className="archive-word-card">
                <div className="archive-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="archive-word-text">{word.word}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{word.phonetic}</span>
                    <button
                      className="btn-audio-circle btn-spring"
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => handleSpeak(word.word)}
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn-bookmark btn-spring"
                      style={{ color: word.isBookmarked ? '#F59E0B' : '#CBD5E1' }}
                      onClick={() => handleToggleBookmark(word.id)}
                    >
                      <Star size={18} fill={word.isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className={`archive-status-badge ${word.status || 'review'} btn-spring`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => handleToggleStatus(word.id, word.status || 'review')}
                    >
                      {word.status === 'mastered' ? '✓ 외움' : '? 헷갈림'}
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--text-body)', lineHeight: 1.4 }}>
                  {word.nuanceKo}
                </p>

                {word.dailyExample && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-canvas)', padding: '6px 10px', borderRadius: '8px' }}>
                    "{word.dailyExample}"
                  </p>
                )}
              </div>
            ))
          )
        ) : (
          /* 지난 학습 세션 타임라인 */
          sessions.map(session => (
            <div
              key={session.id}
              className="archive-word-card btn-spring"
              style={{ cursor: 'pointer' }}
              onClick={() => onOpenSession(session.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <Calendar size={13} />
                <span>{new Date(session.createdAt).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-headline)', lineHeight: 1.4 }}>
                "{session.originalText}"
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const WordArchiveBlock = {
  id: 'WordArchive',
  name: '나만의 단어장 & 아카이브',
  description: '저장된 단어들의 필터링/검색 및 과거 학습 세션 타임라인을 관리하는 보관함 블록',
  Component: WordArchiveComponent,
  mockData: mockArchiveData
};
