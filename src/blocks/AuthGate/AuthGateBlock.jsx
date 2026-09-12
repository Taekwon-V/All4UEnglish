import React, { useState } from 'react';
import { Heart, Sparkles, BookOpen, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  WhitelistService, 
  MASTER_ADMIN_EMAIL 
} from '../../services/firebase';
import { WorkspaceService } from '../../services/workspace';
import { StorageService } from '../../services/storage';
import './AuthGateBlock.css';

export function AuthGateComponent({
  onLoginSuccess = (user) => console.log('Login Success:', user)
}) {
  const [blockedEmail, setBlockedEmail] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // 실제 Google OAuth 팝업 로그인
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    setBlockedEmail(null);

    try {
      if (!auth || !googleProvider) {
        throw new Error('Firebase 인증 서비스가 준비되지 않았습니다.');
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = (user.email || '').toLowerCase().trim();

      // 마스터 관리자(inchul17.kim@gmail.com)는 항상 전체 권한 프리패스
      if (userEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
        const spaceInfo = await WorkspaceService.getOrCreateUserSpace(userEmail, user.displayName || '', true);
        StorageService.setActiveSpace(spaceInfo.spaceId);
        await StorageService.initCloudSync(spaceInfo.spaceId);
        onLoginSuccess({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '관리자',
          photoURL: user.photoURL,
          isAdmin: true,
          spaceId: spaceInfo.spaceId,
          spaceName: spaceInfo.spaceName
        });
        return;
      }

      // 등록된 화이트리스트 계정인지 Firestore 검증
      const isAllowed = await WhitelistService.isEmailAllowed(userEmail);
      if (isAllowed) {
        const spaceInfo = await WorkspaceService.getOrCreateUserSpace(userEmail, user.displayName || '', false);
        StorageService.setActiveSpace(spaceInfo.spaceId);
        await StorageService.initCloudSync(spaceInfo.spaceId);
        onLoginSuccess({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '학습자',
          photoURL: user.photoURL,
          isAdmin: false,
          spaceId: spaceInfo.spaceId,
          spaceName: spaceInfo.spaceName
        });
      } else {
        // 비인가 계정 -> 즉시 차단 및 로그아웃
        await signOut(auth);
        StorageService.setActiveSpace('space_master');
        setBlockedEmail(user.email);
      }
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(error.message || '로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="auth-gate-container">
      {/* 상단 웰컴 헤더 */}
      <header className="auth-header">
        <div className="auth-logo-badge">
          <Heart size={14} fill="currentColor" />
          <span>Private English Study</span>
        </div>
        <h1 className="auth-title">
          All<span>4U</span>English
        </h1>
        <p className="auth-subtitle">
          소리 내어 읽으면 나만의 단어장과 문법이 완성되는<br />
          아내만을 위한 1:1 맞춤형 AI 영어 튜터
        </p>
      </header>

      {/* 중앙 히어로 카드 */}
      <div className="auth-hero-card">
        <div className="auth-hero-icon">
          <Sparkles size={32} />
        </div>
        <div className="auth-feature-list">
          <div className="auth-feature-item">
            <BookOpen size={18} />
            <span>오늘 읽은 책·영상의 문장 그대로 학습</span>
          </div>
          <div className="auth-feature-item">
            <Sparkles size={18} />
            <span>AI가 발굴하는 맞춤 단어·문법·숙어 & 낭독 라디오</span>
          </div>
          <div className="auth-feature-item">
            <ShieldCheck size={18} />
            <span>등록된 전용 구글 계정으로만 열리는 안전한 서재</span>
          </div>
        </div>
      </div>

      {/* 하단 로그인 액션 */}
      <footer className="auth-actions">
        {errorMessage && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          className="btn-google-login btn-spring"
          onClick={handleGoogleSignIn}
          disabled={isAuthenticating}
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{isAuthenticating ? 'Google 계정 확인 중...' : 'Google 계정으로 시작하기'}</span>
        </button>

        <p className="auth-privacy-note">
          🔒 등록된 관리자 및 허용된 구글 계정으로만 접근이 가능합니다.
        </p>
      </footer>

      {/* 비인가 계정 접근 차단 모달 */}
      {blockedEmail && (
        <div className="blocked-modal-overlay">
          <div className="blocked-modal-card">
            <div className="blocked-icon-wrapper">
              <Lock size={28} />
            </div>
            <h2 className="blocked-title">접근 권한이 없습니다</h2>
            <div className="blocked-email-tag">{blockedEmail}</div>
            <p className="blocked-desc">
              All4UEnglish는 <strong>인가된 사용자만을 위한 프라이빗 학습 앱</strong>입니다.<br /><br />
              관리자(<strong>{MASTER_ADMIN_EMAIL}</strong>)에게 이메일 등록을 요청하시거나, 등록된 전용 계정으로 다시 로그인해 주세요.
            </p>
            <button
              type="button"
              className="btn-modal-close btn-spring"
              onClick={() => setBlockedEmail(null)}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const AuthGateBlock = {
  id: 'AuthGate',
  name: '구글 보안 인증 게이트',
  description: '관리자 및 등록된 구글 계정만 인가하는 프라이빗 게이트키퍼',
  Component: AuthGateComponent
};
