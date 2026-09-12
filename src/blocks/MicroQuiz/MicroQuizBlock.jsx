import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { mockQuizData } from './mockData';
import './MicroQuizBlock.css';

export function MicroQuizComponent({
  data = mockQuizData,
  onQuizComplete = (score) => console.log('Quiz complete:', score),
  isStandalone = false
}) {
  const quizzes = data.quizzes || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (quizzes.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>퀴즈가 없습니다.</div>;
  }

  const currentQ = quizzes[currentIdx];

  // 청크 조립형 토큰 클릭 핸들러
  const handleSelectPoolToken = (token, tokenIdx) => {
    if (isAnswered) return;
    setSelectedTokens(prev => [...prev, token]);
  };

  const handleRemoveSelectedToken = (tokenIdx) => {
    if (isAnswered) return;
    setSelectedTokens(prev => prev.filter((_, idx) => idx !== tokenIdx));
  };

  const checkChunkAnswer = () => {
    const isMatch = JSON.stringify(selectedTokens) === JSON.stringify(currentQ.correctTokens);
    setIsAnswered(true);
    setIsCorrect(isMatch);
    if (isMatch) {
      setScore(prev => prev + 1);
      triggerConfettiMini();
    }
  };

  // 4지선다형 옵션 선택 핸들러
  const handleSelectOption = (idx) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    const correct = idx === currentQ.correctIndex;
    setIsCorrect(correct);
    if (correct) {
      setScore(prev => prev + 1);
      triggerConfettiMini();
    }
  };

  // 컨페티 축하 효과
  const triggerConfettiMini = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const triggerConfettiCelebration = () => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.5 }
    });
  };

  const handleNextQuestion = () => {
    if (currentIdx < quizzes.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedTokens([]);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      setIsFinished(true);
      triggerConfettiCelebration();
      onQuizComplete(score);
    }
  };

  return (
    <div className="quiz-container">
      {!isFinished ? (
        <>
          <div className="quiz-progress-row">
            <span>문제 {currentIdx + 1} / {quizzes.length}</span>
            <span>현재 점수: {score}점</span>
          </div>

          <div className="quiz-card">
            <h3 className="quiz-question-title">{currentQ.question}</h3>

            {/* 청크 조립 유형 */}
            {currentQ.type === 'chunk-reorder' && (
              <>
                <div className="quiz-hint-box">
                  💡 {currentQ.koreanHint}
                </div>

                {/* 내가 터치해 올린 조립 박스 */}
                <div className="quiz-reorder-selected">
                  {selectedTokens.length === 0 && (
                    <span style={{ fontSize: '13px', color: '#94A3B8' }}>
                      아래 단어들을 올바른 순서대로 터치하세요
                    </span>
                  )}
                  {selectedTokens.map((token, idx) => (
                    <button
                      key={idx}
                      className="quiz-token-chip btn-spring"
                      onClick={() => handleRemoveSelectedToken(idx)}
                    >
                      {token} ✕
                    </button>
                  ))}
                </div>

                {/* 흩어진 단어 풀 */}
                <div className="quiz-reorder-pool">
                  {(currentQ.shuffledTokens || currentQ.correctTokens).map((token, idx) => {
                    const isAlreadySelected = selectedTokens.filter(t => t === token).length >= 
                      (currentQ.shuffledTokens || currentQ.correctTokens).filter(t => t === token).length;
                    return (
                      <button
                        key={idx}
                        className={`quiz-token-chip quiz-pool-chip btn-spring`}
                        style={{ opacity: isAlreadySelected ? 0.3 : 1 }}
                        disabled={isAlreadySelected || isAnswered}
                        onClick={() => handleSelectPoolToken(token, idx)}
                      >
                        {token}
                      </button>
                    );
                  })}
                </div>

                {!isAnswered && (
                  <button
                    className="btn-submit-ai btn-spring"
                    style={{ marginTop: '12px' }}
                    disabled={selectedTokens.length === 0}
                    onClick={checkChunkAnswer}
                  >
                    정답 확인하기
                  </button>
                )}
              </>
            )}

            {/* 4지선다 객관식 유형 */}
            {currentQ.type === 'multiple-choice' && (
              <>
                <div className="quiz-hint-box" style={{ fontFamily: 'var(--font-en-body)' }}>
                  "{currentQ.sentenceWithBlank}"
                </div>

                <div className="quiz-options-list">
                  {currentQ.options.map((opt, idx) => {
                    let statusClass = '';
                    if (isAnswered) {
                      if (idx === currentQ.correctIndex) statusClass = 'correct';
                      else if (idx === selectedOption) statusClass = 'wrong';
                    }
                    return (
                      <button
                        key={idx}
                        className={`quiz-opt-btn btn-spring ${statusClass}`}
                        onClick={() => handleSelectOption(idx)}
                        disabled={isAnswered}
                      >
                        {idx + 1}. {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* 정답/오답 및 친절 해설 */}
            {isAnswered && (
              <div className="quiz-explanation-box">
                <div style={{ fontWeight: 700, marginBottom: '4px', color: isCorrect ? 'var(--status-success)' : 'var(--status-error)' }}>
                  {isCorrect ? '🎉 완벽해요! 정답입니다.' : '💡 아쉬워요! 다음엔 맞출 수 있어요.'}
                </div>
                <div>{currentQ.explanation}</div>
                <button
                  className="btn-submit-ai btn-spring"
                  style={{ marginTop: '12px' }}
                  onClick={handleNextQuestion}
                >
                  <span>{currentIdx < quizzes.length - 1 ? '다음 문제로' : '퀴즈 완료 확인'}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 최종 퀴즈 완료 축하 카드 */
        <div className="quiz-finish-card">
          <div className="finish-trophy-icon">
            <Award size={40} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-headline)' }}>
            오늘의 복습 퀴즈 완료!
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-body)', lineHeight: 1.5 }}>
            총 {quizzes.length}문제 중 <strong>{score}문제</strong>를 맞혔습니다.<br />
            오늘 배운 표현이 뇌리에 쏙쏙 각인되었어요!
          </p>
          <button
            className="btn-submit-ai btn-spring"
            style={{ width: '100%', marginTop: '12px' }}
            onClick={() => onQuizComplete(score)}
          >
            <span>학습 결과 단어장에 저장하기</span>
            <CheckCircle2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export const MicroQuizBlock = {
  id: 'MicroQuiz',
  name: '마이크로 퀴즈 & 꽃가루 효과',
  description: '단어 청크 조립 및 4지선다 퀴즈를 풀고 꽃가루 축하를 받는 인터랙티브 퀴즈 블록',
  Component: MicroQuizComponent,
  mockData: mockQuizData
};
