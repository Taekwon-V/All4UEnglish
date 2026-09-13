import React, { useState } from 'react';
import { Layers } from 'lucide-react';

import { AuthGateBlock } from './AuthGate/AuthGateBlock';
import UniversalInput from './UniversalInput/UniversalInput';
import SentenceManager from './SentenceManager/SentenceManager';
import StudyLibrary from './StudyLibrary/StudyLibrary';
import { RadioPlayerBlock } from './RadioPlayer/RadioPlayerBlock';
import RetentionTest from './RetentionTest/RetentionTest';

// 5대 핵심 모듈 및 보안 게이트 러너 레지스트리
export const REGISTERED_BLOCKS = {
  [AuthGateBlock.id]: AuthGateBlock,
  UniversalInput: {
    id: 'UniversalInput',
    name: '스마트 문장 등록 (카메라/음성/텍스트)',
    description: '사진 영역 크롭 OCR, 음성 STT, 직접 입력 및 AI 서재 연결',
    Component: UniversalInput
  },
  SentenceManager: {
    id: 'SentenceManager',
    name: '문장 관리 및 플레이리스트',
    description: '문장 학습, AI 문법 점검, 단어 추출 및 플레이리스트 구성',
    Component: SentenceManager
  },
  StudyLibrary: {
    id: 'StudyLibrary',
    name: '서재 (단어·문법·숙어 자산)',
    description: '단어장/문법/숙어 3대 학습 자산 및 AI 파생 예문 무한 생성',
    Component: StudyLibrary
  },
  [RadioPlayerBlock.id]: RadioPlayerBlock,
  RetentionTest: {
    id: 'RetentionTest',
    name: '망각방지 퀴즈',
    description: '사전적 의미 기반 4지선다 퀴즈 및 오답 재학습',
    Component: RetentionTest
  }
};

export function StandaloneRunner() {
  const [activeBlockId, setActiveBlockId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('block') || AuthGateBlock.id;
  });

  const handleSelectBlock = (blockId) => {
    setActiveBlockId(blockId);
    const url = new URL(window.location.href);
    url.searchParams.set('block', blockId);
    window.history.pushState({}, '', url);
  };

  const currentBlock = REGISTERED_BLOCKS[activeBlockId] || AuthGateBlock;
  const BlockComponent = currentBlock.Component;

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#1E2420',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px'
    }}>
      {/* 러너 상단 컨트롤 툴바 */}
      <header style={{
        width: '100%',
        maxWidth: '840px',
        background: '#2B352E',
        borderRadius: '16px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#E8F3EE',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={20} color="#059669" />
          <span style={{ fontWeight: 700, fontSize: '15px' }}>All4UEnglish Block Runner</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '13px', color: '#A0AEC0' }}>블록 선택:</label>
          <select
            value={activeBlockId}
            onChange={(e) => handleSelectBlock(e.target.value)}
            style={{
              background: '#1A201C',
              color: '#FFFFFF',
              border: '1px solid #4A5568',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {Object.values(REGISTERED_BLOCKS).map(block => (
              <option key={block.id} value={block.id}>
                🧱 {block.name} ({block.id})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* 블록 렌더링 컨테이너 */}
      <main style={{
        width: '100%',
        maxWidth: '840px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        minHeight: '600px'
      }}>
        <BlockComponent isStandalone={true} />
      </main>
    </div>
  );
}
