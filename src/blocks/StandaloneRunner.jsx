import React, { useState } from 'react';
import { Layers, Terminal } from 'lucide-react';

import { AuthGateBlock } from './AuthGate/AuthGateBlock';
import { VoiceInputBlock } from './VoiceInput/VoiceInputBlock';
import { GeminiAnalyzerBlock } from './GeminiAnalyzer/GeminiAnalyzerBlock';
import { PassageBarBlock } from './PassageBar/PassageBarBlock';
import { VocaCardBlock } from './VocaCard/VocaCardBlock';
import { GrammarCardBlock } from './GrammarCard/GrammarCardBlock';
import { RoleplayShadowingBlock } from './RoleplayShadowing/RoleplayShadowingBlock';
import { MicroQuizBlock } from './MicroQuiz/MicroQuizBlock';
import { WordArchiveBlock } from './WordArchive/WordArchiveBlock';
import { RadioPlayerBlock } from './RadioPlayer/RadioPlayerBlock';

// 10대 독립 레고 블록 전체 레지스트리
export const REGISTERED_BLOCKS = {
  [AuthGateBlock.id]: AuthGateBlock,
  [VoiceInputBlock.id]: VoiceInputBlock,
  [GeminiAnalyzerBlock.id]: GeminiAnalyzerBlock,
  [PassageBarBlock.id]: PassageBarBlock,
  [VocaCardBlock.id]: VocaCardBlock,
  [GrammarCardBlock.id]: GrammarCardBlock,
  [RoleplayShadowingBlock.id]: RoleplayShadowingBlock,
  [MicroQuizBlock.id]: MicroQuizBlock,
  [WordArchiveBlock.id]: WordArchiveBlock,
  [RadioPlayerBlock.id]: RadioPlayerBlock
};

export function StandaloneRunner() {
  const [activeBlockId, setActiveBlockId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('block') || AuthGateBlock.id;
  });

  const [eventLogs, setEventLogs] = useState([]);

  const handleSelectBlock = (blockId) => {
    setActiveBlockId(blockId);
    const url = new URL(window.location.href);
    url.searchParams.set('block', blockId);
    window.history.pushState({}, '', url);
  };

  const addLog = (title, data) => {
    const time = new Date().toLocaleTimeString();
    setEventLogs(prev => [{ time, title, data }, ...prev.slice(0, 9)]);
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
          <Layers size={20} color="#FF7A59" />
          <span style={{ fontWeight: 700, fontSize: '15px' }}>All4UEnglish Lego Playground</span>
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

      {/* 중앙 메인: 갤럭시 S26 뷰포트 프레임 + 우측 이벤트 로그 */}
      <div style={{
        display: 'flex',
        gap: '24px',
        alignItems: 'flex-start',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '900px'
      }}>
        {/* 스마트폰 뷰포트 */}
        <div style={{
          width: '100%',
          maxWidth: '430px',
          minHeight: '840px',
          maxHeight: '90vh',
          background: 'var(--bg-canvas)',
          borderRadius: '36px',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 10px #2D3748',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* 모바일 펀치홀 카메라 */}
          <div style={{
            position: 'sticky',
            top: '10px',
            alignSelf: 'center',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#1A202C',
            zIndex: 999,
            marginBottom: '-12px'
          }} />

          {/* 블록 컴포넌트 마운트 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <BlockComponent
              data={currentBlock.mockData}
              isStandalone={true}
              onLoginSuccess={(user) => addLog('✅ Login Success', user)}
              onBlocked={(email) => addLog('⛔ Login Blocked', email)}
              onTextSubmit={(text) => addLog('📝 Text Submitted', text)}
              onAnalyzed={(res) => addLog('✨ AI Analysis Done', res)}
              onWordStatusChange={(id, st) => addLog(`Word ${st}`, id)}
              onBookmarkToggle={(id) => addLog('Bookmark toggle', id)}
              onShadowingComplete={(score) => addLog('🎙️ Shadowing Score', score)}
              onQuizComplete={(sc) => addLog('🏆 Quiz Complete', sc)}
              onEvent={(name, payload) => addLog(`Event: ${name}`, payload)}
            />
          </div>
        </div>

        {/* 이벤트 실시간 출력 터미널 (우측) */}
        <div style={{
          width: '340px',
          background: '#1A201C',
          borderRadius: '16px',
          border: '1px solid #2D3748',
          padding: '16px',
          color: '#E2E8F0',
          fontSize: '12px',
          fontFamily: 'monospace',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#10B981',
            fontWeight: 700,
            marginBottom: '12px',
            borderBottom: '1px solid #2D3748',
            paddingBottom: '8px'
          }}>
            <Terminal size={16} />
            <span>Closed-Loop Event Inspector</span>
          </div>

          {eventLogs.length === 0 ? (
            <div style={{ color: '#718096', textAlign: 'center', padding: '24px 0' }}>
              버튼을 누르거나 음성을 녹음하면<br />이벤트가 실시간으로 기록됩니다.
            </div>
          ) : (
            eventLogs.map((log, idx) => (
              <div key={idx} style={{
                marginBottom: '10px',
                padding: '8px',
                background: '#232B25',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A0AEC0', marginBottom: '4px' }}>
                  <span>{log.title}</span>
                  <span>{log.time}</span>
                </div>
                <div style={{ color: '#FBD38D', wordBreak: 'break-all' }}>
                  {typeof log.data === 'object' ? JSON.stringify(log.data, null, 1) : String(log.data)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
