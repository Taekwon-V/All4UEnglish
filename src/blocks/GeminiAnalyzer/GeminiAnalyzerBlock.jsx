import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { GeminiService } from '../../services/gemini';
import { mockGeminiData } from './mockData';
import './GeminiAnalyzerBlock.css';

export function GeminiAnalyzerComponent({
  data = mockGeminiData,
  onAnalyzed = (result) => console.log('AI Analysis Done:', result),
  isStandalone = false
}) {
  const [isLoading, setIsLoading] = useState(!isStandalone);
  const [result, setResult] = useState(isStandalone ? data.mockResult : null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isStandalone && data.inputText) {
      handleAnalyze(data.inputText);
    }
  }, [data.inputText, isStandalone]);

  const handleAnalyze = async (textToAnalyze) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = await GeminiService.analyzePassage(textToAnalyze);
      setResult(parsed);
      onAnalyzed(parsed);
    } catch (err) {
      console.error(err);
      setError('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="analyzer-container">
      {isLoading && (
        <div className="analyzer-loading-card">
          <div className="analyzer-spinner" />
          <div>
            <h3 className="analyzer-loading-title">AI가 지문을 정밀 분석하고 있어요</h3>
            <p className="analyzer-loading-sub">
              핵심 단어와 문맥 뉘앙스, 문법 패턴,<br />
              그리고 맞춤형 퀴즈를 추출하는 중입니다...
            </p>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <div className="skeleton-bar" style={{ width: '100%' }} />
            <div className="skeleton-bar" style={{ width: '80%' }} />
            <div className="skeleton-bar" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {error && (
        <div className="analyzer-result-card" style={{ borderLeft: '4px solid #EF4444' }}>
          <p style={{ color: '#EF4444', fontWeight: 600 }}>{error}</p>
          <button
            className="btn-submit-ai btn-spring"
            onClick={() => handleAnalyze(data.inputText || data.mockResult.originalText)}
          >
            다시 시도하기
          </button>
        </div>
      )}

      {!isLoading && result && (
        <div className="analyzer-result-card">
          <div className="analyzer-badge">
            <Sparkles size={14} />
            <span>AI 분석 완료</span>
          </div>

          <div className="analyzer-summary">
            "{result.summary}"
          </div>

          <div className="analyzer-stat-grid">
            <div>
              <div className="analyzer-stat-val">{result.vocabularyList?.length || 0}</div>
              <div className="analyzer-stat-label">추출 단어</div>
            </div>
            <div>
              <div className="analyzer-stat-val">1</div>
              <div className="analyzer-stat-label">핵심 패턴</div>
            </div>
            <div>
              <div className="analyzer-stat-val">{result.quizzes?.length || 0}</div>
              <div className="analyzer-stat-label">맞춤 퀴즈</div>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            원문: "{result.originalText}"
          </p>

          <button
            className="btn-submit-ai btn-spring"
            onClick={() => onAnalyzed(result)}
          >
            <span>지금 바로 학습 시작하기</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {isStandalone && (
        <div style={{ marginTop: 'auto', padding: '12px', background: '#FEF3C7', borderRadius: '12px', fontSize: '12px' }}>
          🛠️ 단독 러너 모드: 상단의 '지금 바로 학습 시작하기'를 누르면 다음 블록 연계 이벤트를 확인할 수 있습니다.
        </div>
      )}
    </div>
  );
}

export const GeminiAnalyzerBlock = {
  id: 'GeminiAnalyzer',
  name: 'AI 추출 및 분석 엔진',
  description: '영어 지문을 단어/문법/회화/퀴즈로 가공해내는 Gemini 인공지능 분석 블록',
  Component: GeminiAnalyzerComponent,
  mockData: mockGeminiData
};
