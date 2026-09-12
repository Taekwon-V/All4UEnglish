import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, HelpCircle, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StorageService } from '../../services/storage';
import { SpeechService } from '../../services/speech';
import './RetentionTest.css';

export default function RetentionTest() {
  const [testCategory, setTestCategory] = useState('words'); // 'words' | 'sentences' | 'idioms'
  const [questions, setQuestions] = useState([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // 퀴즈 데이터 생성기
  const generateQuiz = (category) => {
    let rawItems = [];
    if (category === 'words') {
      rawItems = StorageService.getWords();
    } else if (category === 'sentences') {
      rawItems = StorageService.getSentences();
    } else {
      rawItems = StorageService.getIdioms();
    }

    if (rawItems.length === 0) {
      setQuestions([]);
      return;
    }

    // 셔플 및 최대 5문제 생성
    const shuffled = [...rawItems].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    const builtQuestions = shuffled.map((item, idx) => {
      let promptText = '';
      let correct = '';
      let distractors = [];

      if (category === 'words') {
        promptText = item.nuanceKo || '이 단어의 뜻에 해당하는 영어 단어는?';
        correct = item.word;
        distractors = rawItems
          .filter(x => x.word !== correct)
          .map(x => x.word)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
      } else if (category === 'sentences') {
        promptText = item.translation || '다음 우리말에 맞는 영어 문장을 고르세요.';
        correct = item.text;
        distractors = rawItems
          .filter(x => x.text !== correct)
          .map(x => x.text)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
      } else {
        promptText = item.meaning || '다음 뜻에 해당하는 숙어는?';
        correct = item.idiom;
        distractors = rawItems
          .filter(x => x.idiom !== correct)
          .map(x => x.idiom)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
      }

      // 4지선다 보기 구성 (더미가 부족할 경우 기본 보기 채우기)
      while (distractors.length < 3) {
        distractors.push(`선택지 ${distractors.length + 2}`);
      }

      const options = [correct, ...distractors].sort(() => 0.5 - Math.random());

      return {
        id: `q-${idx}`,
        prompt: promptText,
        originalSentence: item.originalSentence || item.text || '',
        correct,
        options
      };
    });

    setQuestions(builtQuestions);
    setCurrentQIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsCompleted(false);
  };

  useEffect(() => {
    generateQuiz(testCategory);
  }, [testCategory]);

  const handleSelectOption = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const q = questions[currentQIdx];
    if (option === q.correct) {
      setScore(prev => prev + 1);
      SpeechService.speak('Correct!', 1.2);
    } else {
      SpeechService.speak('Check again', 1.2);
    }
  };

  const handleNextQuestion = () => {
    if (currentQIdx + 1 < questions.length) {
      setCurrentQIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const currentQ = questions[currentQIdx];

  return (
    <div className="retention-test-container">
      {/* 상단 카테고리 선택 */}
      <div className="test-category-tabs">
        <button 
          type="button" 
          className={`test-tab ${testCategory === 'words' ? 'active' : ''}`}
          onClick={() => setTestCategory('words')}
        >
          단어 암기
        </button>
        <button 
          type="button" 
          className={`test-tab ${testCategory === 'sentences' ? 'active' : ''}`}
          onClick={() => setTestCategory('sentences')}
        >
          문장 암기
        </button>
        <button 
          type="button" 
          className={`test-tab ${testCategory === 'idioms' ? 'active' : ''}`}
          onClick={() => setTestCategory('idioms')}
        >
          숙어 암기
        </button>
      </div>

      {isCompleted ? (
        <div className="test-result-card animate-pop">
          <div className="award-icon-box">
            <Award size={48} color="#059669" />
          </div>
          <h3>암기 테스트 완료! 🎉</h3>
          <p className="score-summary">
            총 {questions.length}문제 중 <strong>{score}문제</strong> 맞히셨어요!
          </p>
          <div className="encouragement-text">
            {score === questions.length ? "완벽합니다! 오늘도 완벽하게 암기하셨네요 💖" : "틀린 부분도 반복 라디오로 듣다 보면 자연스럽게 외워집니다!"}
          </div>

          <button 
            type="button" 
            className="retry-btn"
            onClick={() => generateQuiz(testCategory)}
          >
            <RotateCcw size={16} />
            <span>다시 한번 테스트하기</span>
          </button>
        </div>
      ) : currentQ ? (
        <div className="test-card">
          <div className="test-progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentQIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          <div className="test-q-header">
            <span className="q-badge">문제 {currentQIdx + 1} / {questions.length}</span>
            <span className="score-badge">현재 점수: {score}점</span>
          </div>

          <div className="question-prompt-box">
            <p className="q-guide">다음 뜻/상황에 알맞은 올바른 표현을 고르세요:</p>
            <h3 className="q-text">{currentQ.prompt}</h3>
          </div>

          {/* 4지선다 옵션 리스트 */}
          <div className="options-grid">
            {currentQ.options.map((opt, i) => {
              let optClass = 'option-btn';
              if (isAnswered) {
                if (opt === currentQ.correct) optClass += ' correct';
                else if (opt === selectedOption) optClass += ' wrong';
              }
              return (
                <button
                  key={i}
                  type="button"
                  className={optClass}
                  onClick={() => handleSelectOption(opt)}
                >
                  <span className="opt-num">{i + 1}</span>
                  <span className="opt-text">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* 피드백 & 다음 버튼 */}
          {isAnswered && (
            <div className="answer-feedback-box">
              <div className="feedback-result">
                {selectedOption === currentQ.correct ? (
                  <span className="correct-label">정답입니다! 👏</span>
                ) : (
                  <span className="wrong-label">아쉬워요! 정답은: {currentQ.correct}</span>
                )}
              </div>

              <button 
                type="button" 
                className="next-q-btn"
                onClick={handleNextQuestion}
              >
                <span>{currentQIdx + 1 === questions.length ? '결과 보기' : '다음 문제'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-test-box">
          <p>등록된 데이터가 부족하여 퀴즈를 생성할 수 없습니다.<br />먼저 문장이나 단어를 등록해 주세요!</p>
        </div>
      )}
    </div>
  );
}
