import React, { useState, useRef } from 'react';
import { 
  Camera, Mic, Edit3, Sparkles, Volume2, Plus, Check, 
  ArrowRight, BookOpen, Layers, Bookmark, Square, Compass,
  Wand2, CheckCircle2, Image as ImageIcon
} from 'lucide-react';
import CropCanvas from './CropCanvas';
import { SpeechService } from '../../services/speech';
import { GeminiService } from '../../services/gemini';
import { StorageService } from '../../services/storage';
import './UniversalInput.css';

const STARTER_PRESETS = [
  { theme: '☕ 카페 주문', text: "Can I get an iced latte with oat milk, please?", trans: "오트 밀크 넣은 아이스 라떼 한 잔 주시겠어요?" },
  { theme: '✈️ 여행/길찾기', text: "Excuse me, could you tell me how to get to the nearest station?", trans: "실례지만 가장 가까운 역으로 가는 길 좀 알려주시겠어요?" },
  { theme: '💬 감정 & 하루', text: "It was a busy day, but I am proud of what I achieved today.", trans: "바쁜 하루였지만 오늘 해낸 일들이 자랑스러워요." }
];

export default function UniversalInput({ onSentenceAdded, onNavigateTo }) {
  const [inputText, setInputText] = useState('');
  const [originalInputText, setOriginalInputText] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('recommended'); // 'recommended' | 'original'
  const [translationText, setTranslationText] = useState('');
  
  // 사진 크롭 관련 상태 (카메라 / 앨범 분리)
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const cameraInputRef = useRef(null);
  const albumInputRef = useRef(null);

  // 음성 STT 관련 상태
  const [showMicBox, setShowMicBox] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // 단어 직접 터치로 단어장 추가 상태
  const [tappedWords, setTappedWords] = useState({});
  const [wordToast, setWordToast] = useState(null);

  // 로딩 & AI 분석 결과 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [addedItems, setAddedItems] = useState({ words: {}, grammar: false, idioms: {} });
  const [savedSentenceId, setSavedSentenceId] = useState(null);

  // 1. 사진 선택 처리
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageSrc(event.target.result);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // 재선택 가능하도록 초기화
  };

  // 2. 크롭 완료 -> Gemini Vision OCR 호출
  const handleCropDone = async (croppedBase64) => {
    setIsCropping(false);
    setIsAnalyzing(true);
    try {
      const ocrResult = await GeminiService.extractTextFromImage(croppedBase64);
      if (ocrResult && ocrResult.text) {
        setInputText(ocrResult.text);
        if (ocrResult.translation) {
          setTranslationText(ocrResult.translation);
        }
      }
    } catch (err) {
      console.error('OCR 실패:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. 음성 STT 시작 / 종료 제어
  const toggleListening = () => {
    if (isListening) {
      SpeechService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      SpeechService.startListening(
        (transcript) => {
          setInputText(transcript);
        },
        () => {
          setIsListening(false);
        },
        {
          lang: 'en-US',
          onError: () => setIsListening(false)
        }
      );
    }
  };

  // 4. TTS 발음 듣기
  const handleSpeak = () => {
    if (inputText) {
      SpeechService.speak(inputText, 1.0);
    }
  };

  // 5. 문장 속 특정 단어 직접 터치하여 단어장 저장 (사전적 의미 자동 연동)
  const handleTapWordInSentence = (rawWord) => {
    const clean = rawWord.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').trim();
    if (!clean || clean.length < 2) return;
    
    const wordKey = clean.toLowerCase();
    
    // 1차 기본 저장 (즉각적 반응)
    StorageService.saveWord({
      word: clean,
      phonetic: '',
      partOfSpeech: '단어',
      dictionaryMeanings: [clean],
      nuanceKo: `'${inputText}' 문장에서 담은 단어`,
      originalSentence: inputText,
      sentenceId: savedSentenceId,
      status: 'learning'
    });

    setTappedWords(prev => ({ ...prev, [wordKey]: true }));
    setWordToast(`'${clean}' 단어장에 추가됨! 📚`);
    setTimeout(() => setWordToast(null), 2400);

    // 2차 백그라운드 AI 사전 조회로 대표 뜻 3개 및 품사 자동 완성
    GeminiService.lookupExpression('word', clean).then(info => {
      if (info && info.dictionaryMeanings && info.dictionaryMeanings.length > 0) {
        StorageService.saveWord({
          word: clean,
          phonetic: info.phonetic || '',
          partOfSpeech: info.partOfSpeech || '단어',
          dictionaryMeanings: info.dictionaryMeanings.slice(0, 3),
          nuanceKo: info.nuanceKo || info.dictionaryMeanings.join(', '),
          originalSentence: inputText,
          sentenceId: savedSentenceId,
          status: 'learning'
        });
      }
    }).catch(() => {});
  };

  // 6. 문장 저장 & AI 추천 발굴 실행
  const handleSaveAndAnalyze = async () => {
    const raw = inputText.trim();
    if (!raw) return;

    setIsAnalyzing(true);
    setOriginalInputText(raw);
    try {
      // 1) AI 분석 (오타/문법 교정 및 추천, 단어, 문법, 숙어, 번역)
      const result = await GeminiService.discoverFromSentence(raw);
      setAnalysisResult(result);
      if (result.translation) {
        setTranslationText(result.translation);
      }

      // 교정 추천 문장이 원문과 실질적으로 다른지 확인
      const hasDiff = Boolean(
        result.hasCorrection && 
        result.correctedSentence && 
        result.correctedSentence.trim().toLowerCase() !== raw.toLowerCase()
      );

      const chosenText = hasDiff ? result.correctedSentence.trim() : raw;
      setSelectedVersion(hasDiff ? 'recommended' : 'original');
      if (hasDiff) {
        setInputText(result.correctedSentence.trim());
      }

      // 2) 문장장에 영구 저장
      const saved = StorageService.saveSentence({
        text: chosenText,
        originalText: raw,
        translation: result.translation || translationText || "자연스러운 일상 영어 표현",
        source: activeMode === 'camera' ? '사진 인식' : activeMode === 'mic' ? '음성 녹음' : '직접 입력',
        tags: ["주제없음"]
      });
      
      const newSentence = saved[0];
      setSavedSentenceId(newSentence?.id);
      setAddedItems({ words: {}, grammar: false, idioms: {} });

      if (onSentenceAdded) {
        onSentenceAdded(newSentence);
      }
    } catch (err) {
      console.error('분석 에러:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 6-1. 추천 문장 vs 원문 선택 전환
  const handleSelectSentenceVersion = (version) => {
    setSelectedVersion(version);
    const targetText = version === 'recommended' 
      ? (analysisResult?.correctedSentence?.trim() || inputText)
      : (originalInputText || inputText);
    
    setInputText(targetText);

    if (savedSentenceId) {
      StorageService.updateSentence(savedSentenceId, {
        text: targetText,
        translation: (version === 'recommended' && analysisResult?.translation) 
          ? analysisResult.translation 
          : translationText
      });
    }

    if (version === 'recommended') {
      setWordToast('✨ AI 추천 자연스러운 문장으로 선택되었습니다!');
    } else {
      setWordToast('✏️ 내가 쓴 원문으로 선택되었습니다.');
    }
    setTimeout(() => setWordToast(null), 2400);
  };

  // 7. 추천된 단어를 단어장에 추가 (사전적 대표 의미 3개 및 품사 100% 보장)
  const handleAddWordToVocab = (wordItem, idx) => {
    let dictMeanings = wordItem.dictionaryMeanings;
    if (!Array.isArray(dictMeanings) || dictMeanings.length === 0) {
      const fallback = wordItem.meaningKo || wordItem.nuanceKo || '';
      dictMeanings = fallback ? fallback.split(/[,/·\n]/).map(s => s.trim()).filter(Boolean) : [];
      if (dictMeanings.length === 0) dictMeanings = [wordItem.word];
    }

    StorageService.saveWord({
      word: wordItem.word,
      phonetic: wordItem.phonetic || '',
      partOfSpeech: wordItem.partOfSpeech || '단어',
      dictionaryMeanings: dictMeanings.slice(0, 3),
      nuanceKo: wordItem.nuanceKo || dictMeanings.join(', '),
      originalSentence: inputText,
      sentenceId: savedSentenceId,
      status: 'learning'
    });
    setAddedItems(prev => ({
      ...prev,
      words: { ...prev.words, [idx]: true }
    }));
  };

  // 8. 추천된 문법을 문법장에 추가
  const handleAddGrammar = () => {
    if (!analysisResult?.suggestedGrammar) return;
    const g = analysisResult.suggestedGrammar;
    StorageService.saveGrammar({
      pattern: g.pattern,
      tag: g.tag || '#문법패턴',
      explanation: g.explanation || '',
      originalSentence: inputText,
      sentenceId: savedSentenceId,
      status: 'learning'
    });
    setAddedItems(prev => ({ ...prev, grammar: true }));
  };

  // 9. 추천된 숙어를 숙어장에 추가
  const handleAddIdiom = (idiomItem, idx) => {
    StorageService.saveIdiom({
      idiom: idiomItem.idiom,
      meaning: idiomItem.meaning,
      originalSentence: inputText,
      sentenceId: savedSentenceId,
      status: 'learning'
    });
    setAddedItems(prev => ({
      ...prev,
      idioms: { ...prev.idioms, [idx]: true }
    }));
  };

  // 10. 새로운 문장 입력 준비
  const handleResetForNext = () => {
    setInputText('');
    setOriginalInputText('');
    setSelectedVersion('recommended');
    setTranslationText('');
    setAnalysisResult(null);
    setSavedSentenceId(null);
    setTappedWords({});
    setWordToast(null);
    setAddedItems({ words: {}, grammar: false, idioms: {} });
  };

  // 11. 오늘의 추천 표현 즉시 담기 및 AI 분석 실행 (문장학습 100% 저장)
  const handleSelectStarterPreset = async (item) => {
    const raw = item.text;
    setInputText(raw);
    setTranslationText(item.trans);
    setOriginalInputText(raw);

    // 1) 문장학습에 즉시 영구 저장
    const saved = StorageService.saveSentence({
      text: raw,
      originalText: raw,
      translation: item.trans,
      source: '오늘의 추천 표현',
      tags: [item.theme || '추천']
    });

    const newSentence = saved[0];
    setSavedSentenceId(newSentence?.id);
    setAddedItems({ words: {}, grammar: false, idioms: {} });
    setWordToast('✨ 문장학습에 저장되었습니다! AI 분석 중...');

    if (onSentenceAdded) {
      onSentenceAdded(newSentence);
    }

    // 2) AI 단어/문법/숙어 분석 자동 실행
    setIsAnalyzing(true);
    try {
      const result = await GeminiService.discoverFromSentence(raw);
      setAnalysisResult(result);
      if (result.translation) {
        setTranslationText(result.translation);
      }
      setWordToast('✨ 문장과 AI 추천 어휘가 모두 준비되었습니다! 📚');
      setTimeout(() => setWordToast(null), 3000);
    } catch (e) {
      console.error('추천 표현 AI 분석 실패:', e);
      setWordToast('✨ 문장학습에 저장 완료되었습니다!');
      setTimeout(() => setWordToast(null), 2400);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="universal-input-container">
      {/* 사진 영역 크롭 모달 */}
      {isCropping && selectedImageSrc && (
        <CropCanvas 
          imageSrc={selectedImageSrc}
          onCropDone={handleCropDone}
          onCancel={() => setIsCropping(false)}
        />
      )}

      {/* 3대 빠른 입력 액션: [📷 사진 촬영] [🖼️ 앨범 선택] [🎙️ 음성 입력] */}
      <div className="input-quick-actions-bar">
        <button 
          type="button" 
          className="quick-action-pill camera"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera size={16} />
          <span>사진 촬영</span>
        </button>

        <button 
          type="button" 
          className="quick-action-pill album"
          onClick={() => albumInputRef.current?.click()}
        >
          <ImageIcon size={16} />
          <span>앨범 선택</span>
        </button>

        <button 
          type="button" 
          className={`quick-action-pill mic ${isListening ? 'listening' : showMicBox ? 'active' : ''}`}
          onClick={() => {
            if (!showMicBox) {
              setShowMicBox(true);
              toggleListening();
            } else {
              if (isListening) toggleListening();
              setShowMicBox(false);
            }
          }}
        >
          <Mic size={16} />
          <span>{isListening ? '말하는 중...' : '음성 입력'}</span>
        </button>
      </div>

      {/* 숨겨진 2대 파일 인풋 (카메라 전용 / 앨범 파일 선택 전용) */}
      <input 
        type="file" 
        ref={cameraInputRef} 
        accept="image/*" 
        capture="environment" 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        ref={albumInputRef} 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />

      {/* 음성 녹음 제어 패널 (시작 및 종료 버튼 크기 완전히 동일하게 고정) */}
      {(showMicBox || isListening) && (
        <div className="compact-mic-box animate-fade-in">
          {isListening ? (
            <button 
              type="button" 
              className="mic-action-btn stop"
              onClick={toggleListening}
            >
              <div className="rec-dot"></div>
              <Square size={16} fill="currentColor" />
              <span>말하기 완료 (입력 종료)</span>
            </button>
          ) : (
            <button 
              type="button" 
              className="mic-action-btn start"
              onClick={toggleListening}
            >
              <Mic size={18} />
              <span>터치하여 영어로 말하기 (시작)</span>
            </button>
          )}
        </div>
      )}

      {/* 메인 문장 에디터 영역 */}
      <div className="sentence-editor-card">
        <div className="editor-top-bar">
          <span className="editor-label">영어 문장</span>
          {inputText && (
            <button type="button" className="tts-listen-btn" onClick={handleSpeak}>
              <Volume2 size={15} />
              <span>원어민 발음</span>
            </button>
          )}
        </div>

        <textarea
          className="sentence-textarea"
          placeholder="영어 문장을 직접 입력하거나 사진/음성을 선택하세요"
          value={inputText}
          rows={3}
          onChange={(e) => setInputText(e.target.value)}
        />

        {/* 문장 속 특정 단어 직접 터치하여 단어장에 추가하는 인터랙티브 칩 영역 (중복 단어 자동 제거) */}
        {inputText.trim() && (() => {
          const seen = new Set();
          const uniqueWords = [];
          inputText.trim().split(/\s+/).forEach(rawWord => {
            const clean = rawWord.replace(/^[^a-zA-Z0-9'-]+|[^a-zA-Z0-9'-]+$/g, '').trim();
            const key = clean.toLowerCase();
            if (key && key.length >= 1 && !seen.has(key)) {
              seen.add(key);
              uniqueWords.push({ clean, key });
            }
          });

          if (uniqueWords.length === 0) return null;

          return (
            <div className="interactive-words-section">
              <div className="words-tap-header">
                <BookOpen size={13} />
                <span>모르는 단어를 터치하면 단어장으로 쏙 들어갑니다:</span>
              </div>
              <div className="words-chip-wrap">
                {uniqueWords.map(({ clean, key }) => {
                  const isSaved = tappedWords[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`word-tap-chip ${isSaved ? 'saved' : ''}`}
                      onClick={() => handleTapWordInSentence(clean)}
                      title={`'${clean}' 단어장에 추가`}
                    >
                      <span>{clean}</span>
                      {isSaved && <Check size={11} className="chip-check-icon" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 단어 추가 알림 토스트 */}
        {wordToast && (
          <div className="word-toast-notice">
            <Check size={14} />
            <span>{wordToast}</span>
          </div>
        )}

        {translationText && (
          <div className="translation-preview">
            <span className="trans-tag">번역</span>
            <p className="trans-text">{translationText}</p>
          </div>
        )}

        <div className="editor-bottom-actions">
          {analysisResult ? (
            <button 
              type="button" 
              className="analyze-btn saved"
              onClick={handleResetForNext}
            >
              <Plus size={16} />
              <span>새 문장 추가하기</span>
            </button>
          ) : (
            <button 
              type="button" 
              className="analyze-btn" 
              disabled={!inputText.trim() || isAnalyzing}
              onClick={handleSaveAndAnalyze}
            >
              <Sparkles size={16} />
              <span>{isAnalyzing ? 'AI 분석 중...' : '문장 등록 & AI 분석'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 분석 전 초기 화면의 공백을 채우는 알찬 추천 문장 & 팁 카드 */}
      {!analysisResult && (
        <div className="quick-starter-card">
          <div className="starter-header">
            <div className="starter-badge">
              <Compass size={14} />
              <span>오늘의 추천 표현</span>
            </div>
            <span className="starter-hint">터치하면 문장학습에 바로 담겨요 👇</span>
          </div>
          <div className="starter-list">
            {STARTER_PRESETS.map((item, i) => (
              <div 
                key={i} 
                className="starter-item"
                onClick={() => handleSelectStarterPreset(item)}
              >
                <div className="starter-item-header">
                  <span className="starter-tag">{item.theme}</span>
                  <span className="starter-action-hint">문장 담기 +</span>
                </div>
                <div className="starter-en">{item.text}</div>
                <div className="starter-ko">{item.trans}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 추출 결과 및 각 보관함으로 원클릭 전송 섹션 */}
      {analysisResult && (
        <div className="discovery-results-section animate-slide-up">
          <div className="discovery-compact-status">
            <Check size={14} />
            <span>문장학습에 저장 완료</span>
          </div>

          {/* AI 오타/문법 교정 및 자연스러운 문장 추천 선택 카드 */}
          {analysisResult.hasCorrection && analysisResult.correctedSentence && originalInputText && (
            <div className="sentence-correction-card animate-slide-up">
              <div className="correction-card-header">
                <div className="correction-header-badge">
                  <Wand2 size={15} />
                  <span>AI 문장 교정 & 추천</span>
                </div>
                <span className="correction-header-tip">원하는 버전을 터치하여 선택</span>
              </div>

              {analysisResult.correctionReason && (
                <div className="tutor-feedback-box">
                  <span className="tutor-feedback-label">💡 튜터 교정 코멘트:</span>
                  <p className="tutor-feedback-text">{analysisResult.correctionReason}</p>
                </div>
              )}

              <div className="correction-selection-grid">
                {/* 1. AI 추천 자연스러운 문장 */}
                <div
                  className={`version-select-box recommended ${selectedVersion === 'recommended' ? 'active' : ''}`}
                  onClick={() => handleSelectSentenceVersion('recommended')}
                >
                  <div className="version-btn-top">
                    <span className="version-pill-tag green">
                      {selectedVersion === 'recommended' && <CheckCircle2 size={13} />}
                      <span>✨ AI 추천 문장 (네이티브)</span>
                    </span>
                    {selectedVersion === 'recommended' && <span className="version-status-pill">선택됨</span>}
                  </div>
                  <div className="version-text-en">{analysisResult.correctedSentence}</div>
                  {analysisResult.translation && (
                    <div className="version-text-ko">{analysisResult.translation}</div>
                  )}
                </div>

                {/* 2. 내가 쓴 원문 */}
                <div
                  className={`version-select-box original ${selectedVersion === 'original' ? 'active' : ''}`}
                  onClick={() => handleSelectSentenceVersion('original')}
                >
                  <div className="version-btn-top">
                    <span className="version-pill-tag gray">
                      {selectedVersion === 'original' && <CheckCircle2 size={13} />}
                      <span>✏️ 내가 입력한 원문</span>
                    </span>
                    {selectedVersion === 'original' && <span className="version-status-pill">선택됨</span>}
                  </div>
                  <div className="version-text-en">{originalInputText}</div>
                </div>
              </div>
            </div>
          )}

          {/* 오타나 수정사항이 없는 완벽한 문장인 경우의 칭찬 배너 */}
          {(!analysisResult.hasCorrection || analysisResult.correctedSentence?.trim().toLowerCase() === originalInputText.toLowerCase()) && (
            <div className="perfect-sentence-badge animate-slide-up">
              <CheckCircle2 size={16} />
              <span>오타 없이 완벽하고 자연스러운 영어 문장입니다! ✨</span>
            </div>
          )}

          {/* 1. 추천 단어들 */}
          {analysisResult.suggestedWords && analysisResult.suggestedWords.length > 0 && (
            <div className="discovery-group">
              <div className="group-title">
                <BookOpen size={15} />
                <span>추천 단어</span>
              </div>
              <div className="items-grid">
                {analysisResult.suggestedWords.map((wordItem, idx) => (
                  <div key={idx} className="discovery-item-card">
                    <div className="item-main">
                      <div className="word-heading">
                        <strong>{wordItem.word}</strong>
                        <span className="phonetic">{wordItem.phonetic}</span>
                      </div>
                      <p className="nuance">{wordItem.nuanceKo}</p>
                    </div>
                    <button 
                      type="button"
                      className={`send-to-btn ${addedItems.words[idx] ? 'added' : ''}`}
                      onClick={() => handleAddWordToVocab(wordItem, idx)}
                      disabled={addedItems.words[idx]}
                    >
                      {addedItems.words[idx] ? (
                        <>
                          <Check size={13} /> <span>담김</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} /> <span>단어장으로</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. 추천 문법 패턴 */}
          {analysisResult.suggestedGrammar && (
            <div className="discovery-group">
              <div className="group-title">
                <Layers size={15} />
                <span>추천 문법</span>
              </div>
              <div className="discovery-item-card full-width">
                <div className="item-main">
                  <div className="pattern-badge">{analysisResult.suggestedGrammar.tag}</div>
                  <strong className="pattern-text">{analysisResult.suggestedGrammar.pattern}</strong>
                  <p className="explanation">{analysisResult.suggestedGrammar.explanation}</p>
                </div>
                <button 
                  type="button"
                  className={`send-to-btn ${addedItems.grammar ? 'added' : ''}`}
                  onClick={handleAddGrammar}
                  disabled={addedItems.grammar}
                >
                  {addedItems.grammar ? (
                    <>
                      <Check size={13} /> <span>담김</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} /> <span>문법장으로</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 3. 추천 숙어/관용 표현 */}
          {analysisResult.suggestedIdioms && analysisResult.suggestedIdioms.length > 0 && (
            <div className="discovery-group">
              <div className="group-title">
                <Bookmark size={15} />
                <span>추천 숙어</span>
              </div>
              <div className="items-grid">
                {analysisResult.suggestedIdioms.map((idiomItem, idx) => (
                  <div key={idx} className="discovery-item-card">
                    <div className="item-main">
                      <strong className="idiom-text">{idiomItem.idiom}</strong>
                      <p className="meaning">{idiomItem.meaning}</p>
                    </div>
                    <button 
                      type="button"
                      className={`send-to-btn ${addedItems.idioms[idx] ? 'added' : ''}`}
                      onClick={() => handleAddIdiom(idiomItem, idx)}
                      disabled={addedItems.idioms[idx]}
                    >
                      {addedItems.idioms[idx] ? (
                        <>
                          <Check size={13} /> <span>담김</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} /> <span>숙어장으로</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 문장학습 바로가기 버튼 */}
          <div className="go-sentences-nav">
            <button 
              type="button" 
              className="nav-to-sentences-btn"
              onClick={() => onNavigateTo && onNavigateTo('sentences')}
            >
              <span>문장학습 목록 보기</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
