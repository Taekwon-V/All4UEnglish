import React, { useState, useRef } from 'react';
import { Camera, Mic, Edit3, Sparkles, Volume2, Plus, Check, ArrowRight, BookOpen, Layers, Bookmark } from 'lucide-react';
import CropCanvas from './CropCanvas';
import { SpeechService } from '../../services/speech';
import { GeminiService } from '../../services/gemini';
import { StorageService } from '../../services/storage';
import './UniversalInput.css';

export default function UniversalInput({ onSentenceAdded, onNavigateTo }) {
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'mic' | 'type'
  const [inputText, setInputText] = useState('');
  const [translationText, setTranslationText] = useState('');
  
  // 사진 크롭 관련 상태
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const fileInputRef = useRef(null);

  // 음성 STT 관련 상태
  const [isListening, setIsListening] = useState(false);

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

  // 3. 음성 STT 토글
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

  // 5. 문장 저장 & AI 추천 발굴 실행
  const handleSaveAndAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    try {
      // 1) AI 분석 (단어, 문법, 숙어, 번역)
      const result = await GeminiService.discoverFromSentence(inputText);
      setAnalysisResult(result);
      if (result.translation) {
        setTranslationText(result.translation);
      }

      // 2) 문장장에 영구 저장
      const saved = StorageService.saveSentence({
        text: inputText.trim(),
        translation: result.translation || translationText || "자연스러운 일상 영어 표현",
        source: activeMode === 'camera' ? '사진 인식' : activeMode === 'mic' ? '음성 녹음' : '직접 입력',
        tags: ["신규", activeMode === 'camera' ? "책/영상" : "일상회화"]
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

  // 6. 추천된 단어를 단어장에 추가
  const handleAddWordToVocab = (wordItem, idx) => {
    StorageService.saveWord({
      word: wordItem.word,
      phonetic: wordItem.phonetic || '',
      partOfSpeech: wordItem.partOfSpeech || '단어',
      nuanceKo: wordItem.nuanceKo || '',
      originalSentence: inputText,
      status: 'review'
    });
    setAddedItems(prev => ({
      ...prev,
      words: { ...prev.words, [idx]: true }
    }));
  };

  // 7. 추천된 문법을 문법장에 추가
  const handleAddGrammar = () => {
    if (!analysisResult?.suggestedGrammar) return;
    const g = analysisResult.suggestedGrammar;
    StorageService.saveGrammar({
      pattern: g.pattern,
      tag: g.tag || '#문법패턴',
      explanation: g.explanation || '',
      originalSentence: inputText
    });
    setAddedItems(prev => ({ ...prev, grammar: true }));
  };

  // 8. 추천된 숙어를 숙어장에 추가
  const handleAddIdiom = (idiomItem, idx) => {
    StorageService.saveIdiom({
      idiom: idiomItem.idiom,
      meaning: idiomItem.meaning,
      originalSentence: inputText
    });
    setAddedItems(prev => ({
      ...prev,
      idioms: { ...prev.idioms, [idx]: true }
    }));
  };

  // 9. 새로운 문장 입력 준비
  const handleResetForNext = () => {
    setInputText('');
    setTranslationText('');
    setAnalysisResult(null);
    setSavedSentenceId(null);
    setAddedItems({ words: {}, grammar: false, idioms: {} });
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

      {/* 헤더 & 가이드 */}
      <div className="universal-header">
        <h2 className="title">오늘의 문장 담기</h2>
        <p className="subtitle">
          공부한 책을 찍거나, 말하거나, 편하게 입력하세요.<br />
          AI가 단어, 문법, 숙어를 쏙쏙 골라 보관함으로 보내드립니다.
        </p>
      </div>

      {/* 3대 입력 모드 세그먼트 버튼 */}
      <div className="mode-selector">
        <button 
          type="button"
          className={`mode-tab ${activeMode === 'camera' ? 'active' : ''}`}
          onClick={() => {
            setActiveMode('camera');
            fileInputRef.current?.click();
          }}
        >
          <Camera size={18} />
          <span>사진 영역 지정</span>
        </button>

        <button 
          type="button"
          className={`mode-tab ${activeMode === 'mic' ? 'active' : ''}`}
          onClick={() => setActiveMode('mic')}
        >
          <Mic size={18} />
          <span>음성으로 말하기</span>
        </button>

        <button 
          type="button"
          className={`mode-tab ${activeMode === 'type' ? 'active' : ''}`}
          onClick={() => setActiveMode('type')}
        >
          <Edit3 size={18} />
          <span>직접 타이핑</span>
        </button>
      </div>

      {/* 숨겨진 파일 인풋 (카메라 촬영/앨범 선택 지원) */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        capture="environment" 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />

      {/* 모드별 인터랙션 패널 */}
      {activeMode === 'camera' && !inputText && (
        <div className="camera-trigger-card" onClick={() => fileInputRef.current?.click()}>
          <div className="camera-icon-bubble">
            <Camera size={32} />
          </div>
          <h4>책이나 화면 사진을 찍어주세요</h4>
          <p>사진을 올린 뒤 원하는 문장을 네모로 쓱 드래그하면 끝!</p>
          <span className="action-hint">터치하여 카메라/앨범 열기</span>
        </div>
      )}

      {activeMode === 'mic' && (
        <div className="mic-trigger-box">
          <button 
            type="button" 
            className={`mic-circle-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
          >
            <Mic size={32} />
            {isListening && <div className="pulse-ripple" />}
          </button>
          <span className="mic-status-label">
            {isListening ? '듣고 있어요... 말씀해 보세요 🎙️' : '마이크를 눌러 영어로 말해보세요'}
          </span>
        </div>
      )}

      {/* 메인 문장 에디터 영역 */}
      <div className="sentence-editor-card">
        <div className="editor-top-bar">
          <span className="editor-label">영어 문장</span>
          {inputText && (
            <button type="button" className="tts-listen-btn" onClick={handleSpeak}>
              <Volume2 size={16} />
              <span>원어민 듣기</span>
            </button>
          )}
        </div>

        <textarea
          className="sentence-textarea"
          placeholder="여기에 영어 문장이 입력되거나 직접 쓰실 수 있습니다..."
          value={inputText}
          rows={3}
          onChange={(e) => setInputText(e.target.value)}
        />

        {translationText && (
          <div className="translation-preview">
            <span className="trans-tag">한국어 번역</span>
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
              <Plus size={18} />
              <span>새로운 문장 또 입력하기</span>
            </button>
          ) : (
            <button 
              type="button" 
              className="analyze-btn" 
              disabled={!inputText.trim() || isAnalyzing}
              onClick={handleSaveAndAnalyze}
            >
              <Sparkles size={18} />
              <span>{isAnalyzing ? 'AI가 분석하고 있어요...' : '문장 등록 & AI 분석하기'}</span>
            </button>
          )}
        </div>
      </div>

      {/* AI 추출 결과 및 각 보관함으로 원클릭 전송 섹션 */}
      {analysisResult && (
        <div className="discovery-results-section animate-slide-up">
          <div className="discovery-banner">
            <div className="banner-icon">✨</div>
            <div>
              <h4>문장장에 저장 완료!</h4>
              <p>문장에서 찾은 표현들을 원하는 보관함으로 쏙쏙 넣어보세요.</p>
            </div>
          </div>

          {/* 1. 추천 단어들 */}
          {analysisResult.suggestedWords && analysisResult.suggestedWords.length > 0 && (
            <div className="discovery-group">
              <div className="group-title">
                <BookOpen size={16} />
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
                          <Check size={14} /> <span>단어장에 담김</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} /> <span>단어장으로</span>
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
                <Layers size={16} />
                <span>추천 문법 패턴</span>
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
                      <Check size={14} /> <span>문법장에 담김</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> <span>문법장으로</span>
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
                <Bookmark size={16} />
                <span>추천 숙어 & 관용 표현</span>
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
                          <Check size={14} /> <span>숙어장에 담김</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} /> <span>숙어장으로</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 문장장 바로가기 버튼 */}
          <div className="go-sentences-nav">
            <button 
              type="button" 
              className="nav-to-sentences-btn"
              onClick={() => onNavigateTo && onNavigateTo('sentences')}
            >
              <span>저장된 문장 목록 보러가기</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
