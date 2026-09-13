import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, HelpCircle, RotateCcw, Sparkles, Volume2, ArrowRight, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StorageService } from '../../services/storage';
import { SpeechService } from '../../services/speech';
import './RetentionTest.css';

export default function RetentionTest() {
  const [testCategory, setTestCategory] = useState('sentences'); // 'sentences' | 'idioms' | 'words'
  const [questions, setQuestions] = useState([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);

  // 단어 객관식 상태
  const [selectedOption, setSelectedOption] = useState(null);

  // 문장/숙어 순서 배열 상태
  const [availableChips, setAvailableChips] = useState([]);
  const [assembledChips, setAssembledChips] = useState([]);

  const [isAnswered, setIsAnswered] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // 단어의 실제 사전적 의미(뜻) 추출 헬퍼 (장황한 뉘앙스 서술형 문장 완전 배제)
  const getCleanWordMeaning = (w) => {
    const lower = (w.word || '').toLowerCase().trim();
    let dictMeanings = Array.isArray(w.dictionaryMeanings) ? w.dictionaryMeanings.filter(Boolean) : [];
    let pos = w.partOfSpeech || '';

    // 잘 알려진 기본 단어 사전 뜻 보정
    if (lower === 'busy') {
      dictMeanings = ["바쁜", "분주한", "통화 중인"];
      pos = "형용사";
    } else if (lower === 'iced') {
      dictMeanings = ["얼음을 넣은", "차가운", "설탕을 입힌"];
      pos = "형용사";
    } else if (lower === 'achieve') {
      dictMeanings = ["달성하다", "성취하다", "이루어 내다"];
      pos = "동사";
    } else if (lower === 'proud') {
      dictMeanings = ["자랑스러워하는", "자부심을 느끼는", "자존심이 강한"];
      pos = "형용사";
    } else if (lower === 'enough') {
      dictMeanings = ["충분한", "충분히"];
      pos = "대명사 / 부사";
    }

    // 1순위: dictionaryMeanings 배열
    if (dictMeanings.length > 0) {
      const meaningStr = dictMeanings.slice(0, 3).join(', ');
      return pos ? `${meaningStr} (${pos})` : meaningStr;
    }

    // 2순위: meaningKo (단어의 짧은 뜻)
    if (w.meaningKo && !w.meaningKo.includes('문맥 속에서') && !w.meaningKo.includes('중요 어휘')) {
      return pos ? `${w.meaningKo} (${pos})` : w.meaningKo;
    }

    // 3순위: nuanceKo 중 설명형 문장이 아닌 짧은 뜻인 경우에만 사용
    if (w.nuanceKo) {
      const isExplanation = w.nuanceKo.length > 25 || 
        w.nuanceKo.includes('습니다') || 
        w.nuanceKo.includes('쓰입니다') || 
        w.nuanceKo.includes('상태') || 
        w.nuanceKo.includes('담은 단어') || 
        w.nuanceKo.includes('문장에서');
      if (!isExplanation) {
        return pos ? `${w.nuanceKo} (${pos})` : w.nuanceKo;
      }
    }

    // fallback
    return pos ? `[${pos}] 뜻을 가진 단어` : `${w.word}의 뜻`;
  };

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
        promptText = getCleanWordMeaning(item);
        correct = item.word;
        distractors = rawItems
          .filter(x => (x.word || '').toLowerCase() !== (correct || '').toLowerCase())
          .map(x => x.word)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        const fallbackDistractors = [
          'experience', 'opportunity', 'confident', 'schedule', 
          'journey', 'challenge', 'progress', 'inspire', 'attitude'
        ];
        let fbIdx = 0;
        while (distractors.length < 3) {
          const candidate = fallbackDistractors[fbIdx++];
          if (candidate && candidate.toLowerCase() !== correct.toLowerCase() && !distractors.includes(candidate)) {
            distractors.push(candidate);
          }
        }

        const options = [correct, ...distractors].sort(() => 0.5 - Math.random());
        return {
          id: `q-${idx}`,
          category: 'words',
          type: 'choice',
          prompt: promptText,
          correct,
          options
        };
      } else if (category === 'sentences') {
        promptText = item.translation || '다음 우리말에 맞는 영어 문장을 순서대로 완성하세요.';
        correct = item.text;
        
        // 단어 토큰 분리
        const tokens = correct.trim().split(/\s+/).filter(Boolean).map((word, wIdx) => ({
          id: `token-${wIdx}-${word}`,
          word
        }));
        const scrambled = [...tokens].sort(() => 0.5 - Math.random());

        return {
          id: `q-${idx}`,
          category: 'sentences',
          type: 'scramble',
          prompt: promptText,
          correct,
          tokens: scrambled
        };
      } else {
        // 숙어 암기: 순서 배열하기
        promptText = item.meaning || '다음 뜻에 맞는 영어 숙어를 순서대로 완성하세요.';
        correct = item.idiom;

        const tokens = correct.trim().split(/\s+/).filter(Boolean).map((word, wIdx) => ({
          id: `token-${wIdx}-${word}`,
          word
        }));
        const scrambled = [...tokens].sort(() => 0.5 - Math.random());

        return {
          id: `q-${idx}`,
          category: 'idioms',
          type: 'scramble',
          prompt: promptText,
          correct,
          tokens: scrambled
        };
      }
    });

    setQuestions(builtQuestions);
    setCurrentQIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCurrentCorrect(false);
    setScore(0);
    setIsCompleted(false);

    if (builtQuestions.length > 0 && builtQuestions[0].type === 'scramble') {
      setAvailableChips(builtQuestions[0].tokens);
      setAssembledChips([]);
    }
  };

  useEffect(() => {
    generateQuiz(testCategory);
  }, [testCategory]);

  // 문제 바뀔 때 토큰 초기화
  useEffect(() => {
    const q = questions[currentQIdx];
    if (q && q.type === 'scramble') {
      setAvailableChips(q.tokens);
      setAssembledChips([]);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCurrentCorrect(false);
    }
  }, [currentQIdx, questions]);

  // 단어 객관식 정답 선택
  const handleSelectOption = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const q = questions[currentQIdx];
    const isCorrect = option === q.correct;
    setIsCurrentCorrect(isCorrect);
    if (isCorrect) {
      setScore(prev => prev + 1);
      SpeechService.speak('Correct!', { lang: 'en-US', rate: 1.1 });
    } else {
      SpeechService.speak('Check again', { lang: 'en-US', rate: 1.1 });
    }
  };

  // 순서 배열: 칩 추가 (대기열 -> 조립 영역)
  const handlePickChip = (chip) => {
    if (isAnswered) return;
    setAvailableChips(prev => prev.filter(c => c.id !== chip.id));
    setAssembledChips(prev => [...prev, chip]);
  };

  // 순서 배열: 칩 제거 (조립 영역 -> 대기열)
  const handleRemoveChip = (chip) => {
    if (isAnswered) return;
    setAssembledChips(prev => prev.filter(c => c.id !== chip.id));
    setAvailableChips(prev => [...prev, chip]);
  };

  // 순서 배열: 전체 초기화
  const handleResetChips = () => {
    if (isAnswered) return;
    const q = questions[currentQIdx];
    if (q && q.tokens) {
      setAvailableChips(q.tokens);
      setAssembledChips([]);
    }
  };

  // 순서 배열: 정답 확인
  const handleCheckScrambleAnswer = () => {
    if (isAnswered || assembledChips.length === 0) return;
    const q = questions[currentQIdx];

    const assembledText = assembledChips.map(c => c.word).join(' ');
    const normalize = str => str.replace(/[.,!?'"~;:()]/g, '').trim().toLowerCase();
    const isCorrect = normalize(assembledText) === normalize(q.correct);

    setIsAnswered(true);
    setIsCurrentCorrect(isCorrect);

    if (isCorrect) {
      setScore(prev => prev + 1);
      SpeechService.speak(q.correct, { lang: 'en-US', rate: 1.0 });
    } else {
      SpeechService.speak(q.correct, { lang: 'en-US', rate: 1.0 });
    }
  };

  const handleNextQuestion = () => {
    if (currentQIdx + 1 < questions.length) {
      setCurrentQIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCurrentCorrect(false);
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
      {/* 8번 요구사항: 상단 고정 카테고리 탭 (상단 여백 및 탭 디자인 통일) */}
      <div className="test-sticky-header">
        <div className="test-category-tabs">
          <button 
            type="button" 
            className={`test-tab ${testCategory === 'sentences' ? 'active' : ''}`}
            onClick={() => setTestCategory('sentences')}
          >
            🧩 문장 순서배열
          </button>
          <button 
            type="button" 
            className={`test-tab ${testCategory === 'idioms' ? 'active' : ''}`}
            onClick={() => setTestCategory('idioms')}
          >
            🧩 숙어 순서배열
          </button>
          <button 
            type="button" 
            className={`test-tab ${testCategory === 'words' ? 'active' : ''}`}
            onClick={() => setTestCategory('words')}
          >
            🎯 단어 퀴즈
          </button>
        </div>
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
            <p className="q-guide">
              {currentQ.type === 'scramble' 
                ? '아래 우리말 의미에 맞게 영어 단어 블록을 순서대로 배열해 보세요:'
                : '다음 사전적 뜻에 알맞은 올바른 영어 단어를 고르세요:'}
            </p>
            <h3 className="q-text">{currentQ.prompt}</h3>
          </div>

          {/* ================= 14, 15번: 순서 배열하기 (Scramble Mode) ================= */}
          {currentQ.type === 'scramble' && (
            <div className="scramble-workspace">
              {/* 조립된 문장 영역 */}
              <div className={`assembled-box ${isAnswered ? (isCurrentCorrect ? 'correct' : 'wrong') : ''}`}>
                <div className="assembled-box-header">
                  <span className="assembled-label">내가 배열한 문장</span>
                  {!isAnswered && assembledChips.length > 0 && (
                    <button type="button" className="reset-chips-btn" onClick={handleResetChips}>
                      <RotateCw size={12} /> <span>초기화</span>
                    </button>
                  )}
                </div>

                <div className="assembled-chips-wrap">
                  {assembledChips.length === 0 ? (
                    <span className="chips-placeholder">아래 단어 카드를 터치하여 문장을 완성하세요</span>
                  ) : (
                    assembledChips.map((chip, idx) => (
                      <button
                        key={chip.id}
                        type="button"
                        className="chip-btn assembled"
                        onClick={() => handleRemoveChip(chip)}
                        disabled={isAnswered}
                      >
                        <span>{chip.word}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* 선택 가능한 단어 풀 (대기열) */}
              {!isAnswered && (
                <div className="available-chips-section">
                  <span className="available-label">터치하여 순서대로 넣기:</span>
                  <div className="available-chips-wrap">
                    {availableChips.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        className="chip-btn available btn-spring"
                        onClick={() => handlePickChip(chip)}
                      >
                        <span>{chip.word}</span>
                      </button>
                    ))}
                  </div>

                  {/* 정답 확인 버튼 */}
                  <button
                    type="button"
                    className="check-scramble-btn"
                    disabled={assembledChips.length === 0}
                    onClick={handleCheckScrambleAnswer}
                  >
                    <span>정답 확인하기 ({assembledChips.length}개 배열됨)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= 단어 객관식 4지선다 리스트 ================= */}
          {currentQ.type === 'choice' && (
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
          )}

          {/* ================= 채점 피드백 및 다음 문제 버튼 ================= */}
          {isAnswered && (
            <div className="answer-feedback-box animate-pop">
              <div className="feedback-result">
                {isCurrentCorrect ? (
                  <div className="feedback-correct-row">
                    <CheckCircle size={20} className="text-emerald" />
                    <span className="correct-label">정답입니다! 완벽해요! 👏</span>
                  </div>
                ) : (
                  <div className="feedback-wrong-row">
                    <span className="wrong-label">{currentQ.type === 'choice' ? '아쉬워요! 올바른 정답 단어:' : '아쉬워요! 올바른 문장:'}</span>
                    <strong className="correct-sentence-view">{currentQ.correct}</strong>
                  </div>
                )}

                <button 
                  type="button" 
                  className="listen-correct-btn"
                  onClick={() => SpeechService.speak(currentQ.correct, { lang: 'en-US', rate: 1.0 })}
                >
                  <Volume2 size={14} /> <span>정답 발음 듣기</span>
                </button>
              </div>

              <button 
                type="button" 
                className="next-q-btn"
                onClick={handleNextQuestion}
              >
                <span>{currentQIdx + 1 === questions.length ? '최종 결과 보기' : '다음 문제로'}</span>
                <ArrowRight size={16} />
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
