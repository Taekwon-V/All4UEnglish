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
  FolderLock,
  Settings,
  Volume2,
  Maximize,
  Minimize
} from 'lucide-react';
import { SpeechService, CURATED_VOICES } from './services/speech';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isStandaloneMode, setIsStandaloneMode] = useState(() => {
    return new URLSearchParams(window.location.search).has('block');
  });

  // 메인 5단 탭: 'input' | 'sentences' | 'library' | 'radio' | 'test' (새로고침 시에도 탭 유지)
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('all4u_active_tab') || 'input';
    } catch {
      return 'input';
    }
  });

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('all4u_active_tab', tab);
    } catch {}
  };
  
  // 플레이리스트 -> 라디오 연동 상태
  const [targetRadioPlaylist, setTargetRadioPlaylist] = useState(null);

  // 전체 화면 토글 상태
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(() => {});
      }
    }
  };

  // 관리자 전용: 화이트리스트 계정 관리 모달 상태
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [whitelistEmails, setWhitelistEmails] = useState([]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [whitelistLoading, setWhitelistLoading] = useState(false);

  // 음성 및 발음 설정 모달 상태
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState(() => SpeechService.getSettings());
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voiceTab, setVoiceTab] = useState('system'); // 'system' (기기 실제 음성) | 'preset' (원어민 프리셋)

  useEffect(() => {
    SpeechService.getAvailableVoices((voices) => {
      setAvailableVoices(voices);
    });
  }, []);

  // 기기 실제 음성 직접 선택
  const handleSelectSystemVoice = (voiceURI) => {
    const updated = SpeechService.setSettings({ voiceURI, voiceId: null });
    setVoiceSettings(updated);
    SpeechService.speak("Hello! This voice will now read all your English sentences clearly.", {
      rate: voiceSettings.rate
    });
  };

  // 프리셋 선택
  const handleUpdateVoice = (voiceId) => {
    const updated = SpeechService.setSettings({ voiceId, voiceURI: null });
    setVoiceSettings(updated);
    handleTestVoice(voiceId);
  };

  const handleUpdateRate = (rate) => {
    const updated = SpeechService.setSettings({ rate });
    setVoiceSettings(updated);
  };

  const handleTestVoice = (specificVoiceId) => {
    const targetId = specificVoiceId || voiceSettings.voiceId;
    let sampleText = "Hello! I am Jenny. Let's make English fun and easy!";
    if (targetId === 'samantha') {
      sampleText = "Hello. I am Samantha. Let's practice English together comfortably.";
    } else if (targetId === 'guy') {
      sampleText = "Hey there! I am Guy. Let's master practical, everyday English expressions!";
    } else if (targetId === 'alex') {
      sampleText = "Good day. I am Alex. Together, we will build confident and natural English.";
    }
    SpeechService.speak(sampleText, {
      rate: voiceSettings.rate
    });
  };

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
    handleSelectTab('radio');
  };

  return (
    <div className="mobile-app-shell">
      {/* 상단 영구 고정 헤더 */}
      <header className="app-fixed-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: 'inherit', fontSize: '18px', fontWeight: 800, color: 'var(--text-headline, #0f172a)', letterSpacing: '-0.3px' }}>
            All<span style={{ color: 'var(--primary, #059669)' }}>4U</span>English
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 브라우저 기본 바 숨기기 / 전체화면 토글 버튼 */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "전체화면 종료" : "브라우저 바 숨기기 (전체화면)"}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>

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

          {/* 발음 목소리 & 속도 설정 톱니바퀴 버튼 */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            title="발음 목소리 및 속도 설정"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Settings size={17} />
          </button>

          {/* 로그아웃 버튼 */}
          <button
            type="button"
            onClick={handleLogout}
            title="로그아웃"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={17} />
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
        padding: '10px 16px 8px',
        paddingBottom: 'calc(var(--safe-bottom, 14px) + 72px)',
        overscrollBehaviorY: 'contain'
      }}>
        
        {/* 1. 문장 입력 & AI 발굴 */}
        {activeTab === 'input' && (
          <UniversalInput 
            onNavigateTo={(tab) => handleSelectTab(tab)}
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
            onNavigateToSentence={() => handleSelectTab('sentences')}
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
          onClick={() => handleSelectTab('input')}
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
          onClick={() => handleSelectTab('sentences')}
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
          onClick={() => handleSelectTab('library')}
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
          onClick={() => handleSelectTab('radio')}
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
          onClick={() => handleSelectTab('test')}
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

      {/* =========================================================================
          원어민 발음 목소리 & 속도 설정 모달
          ========================================================================= */}
      {isSettingsModalOpen && (
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
            borderRadius: '20px',
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#ecfdf5', padding: '7px', borderRadius: '10px', color: '#059669', display: 'flex' }}>
                  <Settings size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>발음 목소리 & 속도 설정</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 음성 선택 모드 탭 (기기 음성 직접 선택 vs 프리셋) */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '12px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setVoiceTab('system')}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: '9px',
                  border: 'none',
                  background: voiceTab === 'system' ? '#ffffff' : 'transparent',
                  color: voiceTab === 'system' ? '#0f172a' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: voiceTab === 'system' ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: voiceTab === 'system' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                📱 내 폰/PC 실제 음성
              </button>
              <button
                type="button"
                onClick={() => setVoiceTab('preset')}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: '9px',
                  border: 'none',
                  background: voiceTab === 'preset' ? '#ffffff' : 'transparent',
                  color: voiceTab === 'preset' ? '#0f172a' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: voiceTab === 'preset' ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: voiceTab === 'preset' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                🎭 분위기 프리셋 (4종)
              </button>
            </div>

            {/* 1-A. 기기 실제 음성 직접 선택 */}
            {voiceTab === 'system' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  현재 기기에 설치된 음성을 직접 지정하면 다른 목소리로 바뀌지 않고 고정됩니다:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {availableVoices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', fontSize: '12.5px', color: '#94a3b8' }}>
                      브라우저 기본 음성을 불러오는 중이거나 1종만 지원됩니다.
                    </div>
                  ) : (
                    availableVoices.map((v) => {
                      const isSelected = voiceSettings.voiceURI === v.voiceURI;
                      return (
                        <div
                          key={v.voiceURI || v.name}
                          onClick={() => handleSelectSystemVoice(v.voiceURI)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                            <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#065f46' : '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {v.name}
                            </span>
                            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>{v.lang}</span>
                          </div>
                          {isSelected && <CheckCircle size={16} color="#059669" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 1-B. 원어민 분위기 프리셋 선택 */}
            {voiceTab === 'preset' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {CURATED_VOICES.map((v) => {
                  const isSelected = !voiceSettings.voiceURI && voiceSettings.voiceId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleUpdateVoice(v.id)}
                      style={{
                        padding: '11px 14px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #059669' : '1.5px solid #e2e8f0',
                        background: isSelected ? '#f0fdf4' : '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '13.5px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#065f46' : '#334155' }}>
                        {v.label}
                      </span>
                      {isSelected && <CheckCircle size={16} color="#059669" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. 발음 듣기 속도 조절 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>발음 속도</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
                  {voiceSettings.rate}x {voiceSettings.rate === 1.0 ? '(표준)' : voiceSettings.rate < 1.0 ? '(슬로우)' : '(빠르게)'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0.8, 0.9, 1.0, 1.1, 1.2].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleUpdateRate(r)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: voiceSettings.rate === r ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: voiceSettings.rate === r ? '#059669' : '#f8fafc',
                      color: voiceSettings.rate === r ? '#ffffff' : '#475569',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 전체 화면 전환 (브라우저 바 숨기기) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>화면 표시 모드</span>
              <button
                type="button"
                onClick={toggleFullscreen}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '12px',
                  background: isFullscreen ? '#f1f5f9' : '#ecfdf5',
                  border: isFullscreen ? '1px solid #cbd5e1' : '1px solid #a7f3d0',
                  color: isFullscreen ? '#475569' : '#059669',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                <span>{isFullscreen ? '전체화면 종료 (브라우저 복귀)' : '브라우저 바 숨기고 전체화면으로 보기'}</span>
              </button>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 12px',
                fontSize: '11.5px',
                color: '#64748b',
                lineHeight: 1.5,
                textAlign: 'left'
              }}>
                📱 <strong>주소창 없는 100% 순수 전체화면 앱으로 쓰는 법:</strong><br />
                스마트폰 브라우저 메뉴(<strong>⋮</strong> 또는 <strong>≡</strong>)에서 <strong>[홈 화면에 추가]</strong> 또는 <strong>[앱 설치]</strong>를 누르시면 바탕화면에 아이콘이 생성되어 브라우저 주소창과 하단바가 완전히 사라진 진짜 앱처럼 실행됩니다.
              </div>
            </div>

            {/* 4. 미리듣기 & 완료 버튼 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => handleTestVoice(voiceSettings.voiceId)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Volume2 size={16} />
                <span>미리듣기</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                설정 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
