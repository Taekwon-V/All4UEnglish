import React, { useState } from 'react';
import { Heart, Sparkles, BookOpen, ShieldCheck, Lock, AlertCircle, PlayCircle } from 'lucide-react';
import { mockAuthData } from './mockData';
import './AuthGateBlock.css';

export function AuthGateComponent({
  data = mockAuthData,
  onLoginSuccess = (user) => console.log('Login Success:', user),
  onBlocked = (email) => console.log('Login Blocked:', email),
  isStandalone = false
}) {
  const [blockedEmail, setBlockedEmail] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 허용된 아내 이메일 (환경변수 우선, 없을 시 mockData 기준)
  const targetWifeEmail = (import.meta.env.VITE_WIFE_EMAIL || data.allowedWifeEmail || 'wife.english@gmail.com').toLowerCase().trim();

  // 로그인 시도 핸들러
  const handleAttemptLogin = (user) => {
    setIsAuthenticating(true);
    setTimeout(() => {
      setIsAuthenticating(false);
      const userEmail = (user.email || '').toLowerCase().trim();

      if (userEmail === targetWifeEmail) {
        setBlockedEmail(null);
        onLoginSuccess(user);
      } else {
        setBlockedEmail(user.email);
        onBlocked(user.email);
      }
    }, 400);
  };

  // 실제 구글 로그인 시뮬레이션 (Firebase SDK 연동 전 기본 동작)
  const handleGoogleClick = () => {
    // 실제 환경에서는 signInWithPopup(auth, googleProvider) 실행
    // 현재 단계에서는 아내 계정으로 우선 시도
    handleAttemptLogin(data.wifeProfile);
  };

  return (
    <div className="auth-gate-container">
      {/* 상단 웰컴 헤더 */}
      <header className="auth-header">
        <div className="auth-logo-badge">
          <Heart size={14} fill="currentColor" />
          <span>Only for My Wife</span>
        </div>
        <h1 className="auth-title">
          All<span>4U</span>English
        </h1>
        <p className="auth-subtitle">
          소리 내어 읽으면 나만의 단어장과 문법이 완성되는<br />
          당신만을 위한 1:1 맞춤형 AI 영어 튜터
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
            <span>Gemini AI가 뽑아주는 맞춤 회화 & 퀴즈</span>
          </div>
          <div className="auth-feature-item">
            <ShieldCheck size={18} />
            <span>아내분 구글 계정으로만 열리는 전용 서재</span>
          </div>
        </div>
      </div>

      {/* 하단 로그인 액션 */}
      <footer className="auth-actions">
        <button
          className="btn-google-login btn-spring"
          onClick={handleGoogleClick}
          disabled={isAuthenticating}
        >
          <svg viewBox="0 0 24 24">
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
          <span>{isAuthenticating ? '인증 확인 중...' : '구글 계정으로 시작하기'}</span>
        </button>

        <p className="auth-privacy-note">
          🔒 등록된 전용 구글 계정으로만 접근이 가능합니다.
        </p>

        {/* 🛠️ Standalone 테스트 시뮬레이터 (Closed-Loop 검증용) */}
        <div className="simulator-box">
          <div className="simulator-title">
            <PlayCircle size={14} />
            <span>1인 화이트리스트 닫힌 루프 테스트 시뮬레이터</span>
          </div>
          <div className="simulator-buttons">
            <button
              className="btn-sim wife"
              onClick={() => handleAttemptLogin(data.wifeProfile)}
            >
              ✅ 아내 계정 로그인
            </button>
            <button
              className="btn-sim stranger"
              onClick={() => handleAttemptLogin(data.blockedProfile)}
            >
              ⛔ 타인 계정 차단 테스트
            </button>
          </div>
        </div>
      </footer>

      {/* 비인가 계정 접근 차단 모달 */}
      {blockedEmail && (
        <div className="blocked-modal-overlay">
          <div className="blocked-modal-card">
            <div className="blocked-icon-wrapper">
              <Lock size={28} />
            </div>
            <h2 className="blocked-title">접근할 수 없습니다</h2>
            <div className="blocked-email-tag">{blockedEmail}</div>
            <p className="blocked-desc">
              All4UEnglish는 <strong>아내만을 위해 특별히 제작된 프라이빗 학습 앱</strong>입니다.<br />
              지정된 전용 구글 계정으로 로그인해 주세요.
            </p>
            <button
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

// 표준 레고 블록 객체 익스포트
export const AuthGateBlock = {
  id: 'AuthGate',
  name: '1인 보안 인증 게이트',
  description: '아내의 구글 이메일 1개만 허용하고 타인은 즉시 차단하는 프라이빗 게이트키퍼',
  Component: AuthGateComponent,
  mockData: mockAuthData
};
