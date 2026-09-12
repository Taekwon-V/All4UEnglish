import React, { useState, useEffect } from 'react';
import { StandaloneRunner } from './blocks/StandaloneRunner';
import { AuthGateBlock } from './blocks/AuthGate/AuthGateBlock';

// 새로운 5대 핵심 모듈
import UniversalInput from './blocks/UniversalInput/UniversalInput';
import SentenceManager from './blocks/SentenceManager/SentenceManager';
import StudyLibrary from './blocks/StudyLibrary/StudyLibrary';
import { RadioPlayerComponent } from './blocks/RadioPlayer/RadioPlayerBlock';
import RetentionTest from './blocks/RetentionTest/RetentionTest';

import { 
  Edit3, 
  ListOrdered, 
  BookOpen, 
  Radio, 
  Award, 
  Flame, 
  Layers, 
  LogOut 
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState(() => {
    return new URLSearchParams(window.location.search).has('block');
  });

  // 메인 5단 탭: 'input' | 'sentences' | 'library' | 'radio' | 'test'
  const [activeTab, setActiveTab] = useState('input');
  
  // 플레이리스트 -> 라디오 연동 상태
  const [targetRadioPlaylist, setTargetRadioPlaylist] = useState(null);

  useEffect(() => {
    const checkMode = () => {
      setIsStandaloneMode(new URLSearchParams(window.location.search).has('block'));
    };
    window.addEventListener('popstate', checkMode);
    return () => window.removeEventListener('popstate', checkMode);
  }, []);

  // 레고 블록 단독 러너 모드
  if (isStandaloneMode) {
    return <StandaloneRunner />;
  }

  // 1인 화이트리스트 보안 게이트 (미인증 시)
  if (!currentUser) {
    return (
      <div className="mobile-app-shell">
        <AuthGateBlock.Component
          onLoginSuccess={(user) => setCurrentUser(user)}
          onBlocked={(email) => console.log('Blocked:', email)}
        />
      </div>
    );
  }

  // 플레이리스트에서 [라디오로 듣기] 클릭 시 라디오 탭으로 전환
  const handlePlayPlaylistInRadio = (playlist) => {
    setTargetRadioPlaylist(playlist);
    setActiveTab('radio');
  };

  return (
    <div className="mobile-app-shell">
      {/* 상단 통합 헤더 */}
      <header style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-surface, #ffffff)',
        borderBottom: '1px solid rgba(45, 106, 79, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-en-display, sans-serif)', fontSize: '18px', fontWeight: 800, color: 'var(--text-headline, #0f172a)' }}>
            All<span style={{ color: 'var(--primary, #059669)' }}>4U</span>English
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>for Sarah</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 연속 학습 스트릭 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
            <Flame size={14} fill="currentColor" />
            <span>7일 연속</span>
          </div>

          {/* 단독 러너 전환 버튼 */}
          <a
            href="/?block=AuthGate"
            title="레고 블록 플레이그라운드 열기"
            style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            <Layers size={18} />
          </a>

          {/* 로그아웃 버튼 */}
          <button
            type="button"
            onClick={() => setCurrentUser(null)}
            title="로그아웃"
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* =========================================================================
          메인 바디 콘텐츠 (5대 탭 분기)
          ========================================================================= */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '16px 16px 8px' }}>
        
        {/* 1. 문장 입력 & AI 발굴 */}
        {activeTab === 'input' && (
          <UniversalInput 
            onNavigateTo={(tab) => setActiveTab(tab)}
          />
        )}

        {/* 2. 문장장 (Sentences Master & Playlists) */}
        {activeTab === 'sentences' && (
          <SentenceManager 
            onPlayPlaylist={handlePlayPlaylistInRadio}
          />
        )}

        {/* 3. 서재 (단어장 / 문법장 / 숙어장 & AI 동적 예문 생성) */}
        {activeTab === 'library' && (
          <StudyLibrary 
            initialTab="words"
            onNavigateToSentence={() => setActiveTab('sentences')}
          />
        )}

        {/* 4. 플레이리스트 반복 오디오 라디오 */}
        {activeTab === 'radio' && (
          <RadioPlayerComponent 
            targetPlaylist={targetRadioPlaylist}
          />
        )}

        {/* 5. 암기 테스트 */}
        {activeTab === 'test' && (
          <RetentionTest />
        )}
      </main>

      {/* =========================================================================
          하단 글로벌 바텀 네비게이션 바 (5단 탭)
          ========================================================================= */}
      <nav style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        background: '#ffffff',
        borderTop: '1px solid rgba(45, 106, 79, 0.1)',
        paddingTop: '8px',
        paddingBottom: 'calc(var(--safe-bottom, 10px) + 6px)',
        zIndex: 100
      }}>
        {/* 탭 1: 문장 담기 */}
        <button
          type="button"
          onClick={() => setActiveTab('input')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: activeTab === 'input' ? 'var(--primary, #059669)' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <Edit3 size={20} />
          <span style={{ fontSize: '10.5px', fontWeight: activeTab === 'input' ? 700 : 500 }}>문장담기</span>
        </button>

        {/* 탭 2: 문장장 */}
        <button
          type="button"
          onClick={() => setActiveTab('sentences')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: activeTab === 'sentences' ? 'var(--primary, #059669)' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <ListOrdered size={20} />
          <span style={{ fontSize: '10.5px', fontWeight: activeTab === 'sentences' ? 700 : 500 }}>문장장</span>
        </button>

        {/* 탭 3: 서재 (단어/문법/숙어) */}
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: activeTab === 'library' ? 'var(--primary, #059669)' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <BookOpen size={20} />
          <span style={{ fontSize: '10.5px', fontWeight: activeTab === 'library' ? 700 : 500 }}>서재</span>
        </button>

        {/* 탭 4: 라디오 */}
        <button
          type="button"
          onClick={() => setActiveTab('radio')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: activeTab === 'radio' ? 'var(--primary, #059669)' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <Radio size={20} />
          <span style={{ fontSize: '10.5px', fontWeight: activeTab === 'radio' ? 700 : 500 }}>라디오</span>
        </button>

        {/* 탭 5: 암기 테스트 */}
        <button
          type="button"
          onClick={() => setActiveTab('test')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: activeTab === 'test' ? 'var(--primary, #059669)' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <Award size={20} />
          <span style={{ fontSize: '10.5px', fontWeight: activeTab === 'test' ? 700 : 500 }}>암기테스트</span>
        </button>
      </nav>
    </div>
  );
}
