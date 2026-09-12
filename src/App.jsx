import React, { useState, useEffect } from 'react';
import { StandaloneRunner } from './blocks/StandaloneRunner';
import { AuthGateBlock } from './blocks/AuthGate/AuthGateBlock';

// 5대 핵심 모듈
import UniversalInput from './blocks/UniversalInput/UniversalInput';
import SentenceManager from './blocks/SentenceManager/SentenceManager';
import StudyLibrary from './blocks/StudyLibrary/StudyLibrary';
import { RadioPlayerComponent } from './blocks/RadioPlayer/RadioPlayerBlock';
import RetentionTest from './blocks/RetentionTest/RetentionTest';

// 서비스 임포트
import { StorageService } from './services/storage';
import { WorkspaceService } from './services/workspace';
import { 
  auth, 
  signOut, 
  onAuthStateChanged, 
  WhitelistService, 
  MASTER_ADMIN_EMAIL 
} from './services/firebase';

import { 
  Edit3, 
  ListOrdered, 
  BookOpen, 
  Radio, 
  Award, 
  Flame, 
  LogOut, 
  UserPlus, 
  Trash2, 
  X, 
  CheckCircle,
  Shield,
  FolderLock
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isStandaloneMode, setIsStandaloneMode] = useState(() => {
    return new URLSearchParams(window.location.search).has('block');
  });

  // 메인 5단 탭: 'input' | 'sentences' | 'library' | 'radio' | 'test'
  const [activeTab, setActiveTab] = useState('input');
  
  // 플레이리스트 -> 라디오 연동 상태
  const [targetRadioPlaylist, setTargetRadioPlaylist] = useState(null);

  // 관리자 전용: 화이트리스트 계정 관리 모달 상태
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [whitelistEmails, setWhitelistEmails] = useState([]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [whitelistLoading, setWhitelistLoading] = useState(false);

  // 1. 세션 체크 및 Firebase Auth 상태 감지
  useEffect(() => {
    const checkMode = () => {
      setIsStandaloneMode(new URLSearchParams(window.location.search).has('block'));
    };
    window.addEventListener('popstate', checkMode);

    // Firebase Auth 실시간 로그인 세션 유지
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && firebaseUser.email) {
          const userEmail = firebaseUser.email.toLowerCase().trim();
          const isMaster = userEmail === MASTER_ADMIN_EMAIL.toLowerCase();
          const isAllowed = isMaster || await WhitelistService.isEmailAllowed(userEmail);

          if (isAllowed) {
            // 개인 ID에 학습공간 배정 및 매칭
            const spaceInfo = await WorkspaceService.getOrCreateUserSpace(
              userEmail,
              firebaseUser.displayName || '',
              isMaster
            );
            StorageService.setActiveSpace(spaceInfo.spaceId);
            await StorageService.initCloudSync(spaceInfo.spaceId);

            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || (isMaster ? '관리자' : '학습자'),
              photoURL: firebaseUser.photoURL,
              isAdmin: isMaster,
              spaceId: spaceInfo.spaceId,
              spaceName: spaceInfo.spaceName
            });
          } else {
            // 비인가 사용자
            await signOut(auth);
            StorageService.setActiveSpace('space_master');
            setCurrentUser(null);
          }
        } else {
          StorageService.setActiveSpace('space_master');
          setCurrentUser(null);
        }
        setAuthLoading(false);
      });
      return () => {
        unsubscribe();
        window.removeEventListener('popstate', checkMode);
      };
    } else {
      StorageService.initCloudSync('space_master');
      setAuthLoading(false);
      return () => window.removeEventListener('popstate', checkMode);
    }
  }, []);

  // 화이트리스트 목록 불러오기
  const loadWhitelist = async () => {
    setWhitelistLoading(true);
    try {
      const list = await WhitelistService.getAllowedEmails();
      setWhitelistEmails(list);
    } catch (e) {
      console.error('화이트리스트 로드 에러:', e);
    } finally {
      setWhitelistLoading(false);
    }
  };

  // 새 구글 아이디 추가
  const handleAddAllowedEmail = async (e) => {
    e.preventDefault();
    if (!newEmailInput.trim() || !newEmailInput.includes('@')) {
      alert('올바른 이메일 형식을 입력해 주세요.');
      return;
    }
    try {
      await WhitelistService.addAllowedEmail(newEmailInput.trim());
      setNewEmailInput('');
      loadWhitelist();
    } catch (err) {
      alert('계정 등록 실패: ' + err.message);
    }
  };

  // 등록된 아이디 삭제
  const handleRemoveAllowedEmail = async (email) => {
    if (email === MASTER_ADMIN_EMAIL) {
      alert('마스터 관리자 계정은 삭제할 수 없습니다.');
      return;
    }
    if (confirm(`'${email}' 계정의 접근 권한을 제거하시겠습니까?`)) {
      try {
        await WhitelistService.removeAllowedEmail(email);
        loadWhitelist();
      } catch (err) {
        alert('삭제 실패: ' + err.message);
      }
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      if (auth) {
        await signOut(auth);
      }
      StorageService.setActiveSpace('space_master');
      setCurrentUser(null);
    }
  };

  // 레고 블록 단독 러너 모드
  if (isStandaloneMode) {
    return <StandaloneRunner />;
  }

  // 로딩 스피너
  if (authLoading) {
    return (
      <div className="mobile-app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#faf7f2' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>All4UEnglish 연결 중...</p>
        </div>
      </div>
    );
  }

  // 1인 화이트리스트 보안 게이트 (미인증 시)
  if (!currentUser) {
    return (
      <div className="mobile-app-shell">
        <AuthGateBlock.Component
          onLoginSuccess={(user) => setCurrentUser(user)}
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
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-surface, #ffffff)',
        borderBottom: '1px solid rgba(45, 106, 79, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'inherit', fontSize: '17px', fontWeight: 800, color: 'var(--text-headline, #0f172a)', lineHeight: 1.1 }}>
            All<span style={{ color: 'var(--primary, #059669)' }}>4U</span>English
          </span>
          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            {currentUser.spaceName || (currentUser.isAdmin ? '마스터 메인 공간' : '내 학습공간')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 관리자 전용 계정 등록 관리 버튼 */}
          {currentUser.isAdmin && (
            <button
              type="button"
              onClick={() => {
                setIsWhitelistModalOpen(true);
                loadWhitelist();
              }}
              title="허용할 구글 아이디 등록 관리"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '4px 8px',
                borderRadius: '10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Shield size={13} />
              <span>계정 통제</span>
            </button>
          )}

          {/* 연속 학습 스트릭 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 700 }}>
            <Flame size={13} fill="currentColor" />
            <span>7일</span>
          </div>

          {/* 로그아웃 버튼 */}
          <button
            type="button"
            onClick={handleLogout}
            title="로그아웃"
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* =========================================================================
          메인 바디 콘텐츠 (5대 탭 분기 - spaceId 기반 리마운트 및 데이터 격리)
          ========================================================================= */}
      <main key={currentUser?.spaceId || 'guest'} style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflowY: 'auto', 
        padding: '16px 16px 8px',
        paddingBottom: 'calc(var(--safe-bottom, 14px) + 72px)'
      }}>
        
        {/* 1. 문장 입력 & AI 발굴 */}
        {activeTab === 'input' && (
          <UniversalInput 
            onNavigateTo={(tab) => setActiveTab(tab)}
          />
        )}

        {/* 2. 문장학습 (Sentences Master & Playlists) */}
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
          하단 글로벌 바텀 네비게이션 바 (화면 하단 위치 고정)
          ========================================================================= */}
      <nav className="global-bottom-nav">
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
          <span style={{ fontSize: '10.5px', fontWeight: activeTab === 'sentences' ? 700 : 500 }}>문장학습</span>
        </button>

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

      {/* =========================================================================
          관리자 전용: 화이트리스트 구글 계정 관리 모달
          ========================================================================= */}
      {isWhitelistModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '420px',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  🛡️ 허용할 구글 아이디 관리
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  여기에 등록된 구글 계정만 앱에 로그인할 수 있습니다.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsWhitelistModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 새 계정 등록 폼 */}
            <form onSubmit={handleAddAllowedEmail} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                placeholder="예: wife.google@gmail.com"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: 'var(--primary, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                등록
              </button>
            </form>

            {/* 현재 등록된 허용 이메일 목록 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid #f1f5f9',
              borderRadius: '14px',
              padding: '8px'
            }}>
              {whitelistLoading ? (
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', margin: '12px 0' }}>불러오는 중...</p>
              ) : (
                whitelistEmails.map((email) => {
                  const isMaster = email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
                  return (
                    <div 
                      key={email}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: isMaster ? '#ecfdf5' : '#f8fafc',
                        borderRadius: '10px',
                        border: isMaster ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{email}</span>
                        {isMaster && (
                          <span style={{ marginLeft: '6px', fontSize: '10.5px', background: '#059669', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            전체권한 관리자
                          </span>
                        )}
                      </div>

                      {!isMaster && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAllowedEmail(email)}
                          title="삭제"
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsWhitelistModalOpen(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
