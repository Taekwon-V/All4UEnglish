import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Layers, Bookmark, Sparkles, Volume2, Plus, 
  Check, Trash2, Search, Filter, Quote, ArrowUpRight 
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { GeminiService } from '../../services/gemini';
import { SpeechService } from '../../services/speech';
import './StudyLibrary.css';

export default function StudyLibrary({ initialTab = 'words', onNavigateToSentence }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'words' | 'grammar' | 'idioms'
  const [searchQuery, setSearchQuery] = useState('');
  
  // 데이터 목록 상태
  const [words, setWords] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [idioms, setIdioms] = useState([]);

  // AI 예문 생성 중인 아이템 ID 및 생성된 예문 상태
  const [generatingId, setGeneratingId] = useState(null);
  const [savedVariationKeys, setSavedVariationKeys] = useState({}); // { 'itemId-varIdx': true }

  // 데이터 불러오기
  const refreshData = () => {
    setWords(StorageService.getWords());
    setGrammar(StorageService.getGrammar());
    setIdioms(StorageService.getIdioms());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // TTS 발음 듣기
  const handleSpeak = (text) => {
    SpeechService.speak(text, 1.0);
  };

  // AI 새 예문 2~3개 실시간 생성
  const handleGenerateVariations = async (type, item) => {
    setGeneratingId(item.id);
    try {
      const newVariations = await GeminiService.generateVariations(type, item, item.originalSentence);
      
      // 스토리지에 생성된 예문 추가 저장
      if (type === 'word') {
        newVariations.forEach(v => StorageService.addWordVariation(item.id, v));
      } else if (type === 'grammar') {
        newVariations.forEach(v => StorageService.addGrammarVariation(item.id, v));
      } else if (type === 'idiom') {
        newVariations.forEach(v => StorageService.addIdiomVariation(item.id, v));
      }
      refreshData();
    } catch (e) {
      console.error('예문 생성 오류:', e);
    } finally {
      setGeneratingId(null);
    }
  };

  // 마음에 드는 예문을 [문장장으로 저장]
  const handleSaveToSentences = (variation, parentItem, typeLabel, key) => {
    StorageService.saveSentence({
      text: variation.en,
      translation: variation.ko,
      source: `${typeLabel} 파생 예문 (${parentItem.word || parentItem.pattern || parentItem.idiom})`,
      tags: [typeLabel, "AI추천예문"]
    });
    setSavedVariationKeys(prev => ({ ...prev, [key]: true }));
  };

  return (
    <div className="study-library-container">
      {/* 3단 세그먼트 상단 탭 */}
      <div className="library-tabs">
        <button 
          type="button"
          className={`lib-tab ${activeTab === 'words' ? 'active' : ''}`}
          onClick={() => setActiveTab('words')}
        >
          <BookOpen size={16} />
          <span>단어장 ({words.length})</span>
        </button>

        <button 
          type="button"
          className={`lib-tab ${activeTab === 'grammar' ? 'active' : ''}`}
          onClick={() => setActiveTab('grammar')}
        >
          <Layers size={16} />
          <span>문법장 ({grammar.length})</span>
        </button>

        <button 
          type="button"
          className={`lib-tab ${activeTab === 'idioms' ? 'active' : ''}`}
          onClick={() => setActiveTab('idioms')}
        >
          <Bookmark size={16} />
          <span>숙어장 ({idioms.length})</span>
        </button>
      </div>

      {/* 검색 바 */}
      <div className="library-search-bar">
        <Search size={16} className="search-icon" />
        <input 
          type="text" 
          placeholder="저장된 표현, 뜻, 원문 검색..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 1. 단어장 탭 내용 */}
      {activeTab === 'words' && (
        <div className="card-list-section">
          {words
            .filter(w => !searchQuery || w.word.toLowerCase().includes(searchQuery.toLowerCase()) || w.nuanceKo?.includes(searchQuery))
            .map((item) => (
              <div key={item.id} className="library-card word-theme">
                {/* 상단 헤더 */}
                <div className="card-top-row">
                  <div className="main-term">
                    <span className="part-badge">{item.partOfSpeech || '단어'}</span>
                    <h3>{item.word}</h3>
                    <span className="phonetic">{item.phonetic}</span>
                  </div>
                  <button type="button" className="tts-icon-btn" onClick={() => handleSpeak(item.word)}>
                    <Volume2 size={18} />
                  </button>
                </div>

                {/* 뉘앙스/뜻 */}
                <p className="nuance-desc">{item.nuanceKo}</p>

                {/* 원문 디폴트 예시 */}
                {item.originalSentence && (
                  <div className="original-sentence-box">
                    <div className="box-tag">
                      <Quote size={12} />
                      <span>원래 입력했던 문장 (디폴트)</span>
                    </div>
                    <p className="en-text">{item.originalSentence}</p>
                    <button 
                      type="button" 
                      className="mini-speak-btn" 
                      onClick={() => handleSpeak(item.originalSentence)}
                    >
                      <Volume2 size={13} /> <span>원문 듣기</span>
                    </button>
                  </div>
                )}

                {/* AI 예문 생성 버튼 & 목록 */}
                <div className="variations-section">
                  <div className="variations-header">
                    <span className="label">AI 실생활 추가 예문</span>
                    <button 
                      type="button" 
                      className="gen-variations-btn"
                      disabled={generatingId === item.id}
                      onClick={() => handleGenerateVariations('word', item)}
                    >
                      <Sparkles size={14} />
                      <span>{generatingId === item.id ? '새 예문 만드는 중...' : '새 예문 2~3개 생성 ✨'}</span>
                    </button>
                  </div>

                  {item.variations && item.variations.length > 0 ? (
                    <div className="variations-list">
                      {item.variations.map((v, vIdx) => {
                        const vKey = `${item.id}-${vIdx}`;
                        const isSaved = savedVariationKeys[vKey];
                        return (
                          <div key={vIdx} className="variation-item">
                            <div className="var-text-wrap">
                              <p className="var-en">{v.en}</p>
                              <p className="var-ko">{v.ko}</p>
                            </div>
                            <div className="var-actions">
                              <button type="button" className="mini-speak-btn" onClick={() => handleSpeak(v.en)}>
                                <Volume2 size={14} />
                              </button>
                              <button 
                                type="button" 
                                className={`save-to-sentence-btn ${isSaved ? 'saved' : ''}`}
                                onClick={() => handleSaveToSentences(v, item, '단어', vKey)}
                                disabled={isSaved}
                              >
                                {isSaved ? (
                                  <>
                                    <Check size={13} /> <span>문장장에 담김</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={13} /> <span>문장장으로 저장</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-variations-hint">위의 '새 예문 생성'을 누르면 AI가 실생활 맞춤 예문을 만듭니다.</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 2. 문법장 탭 내용 */}
      {activeTab === 'grammar' && (
        <div className="card-list-section">
          {grammar
            .filter(g => !searchQuery || g.pattern.toLowerCase().includes(searchQuery.toLowerCase()) || g.explanation?.includes(searchQuery))
            .map((item) => (
              <div key={item.id} className="library-card grammar-theme">
                <div className="card-top-row">
                  <div className="main-term">
                    <span className="pattern-badge">{item.tag || '#문법패턴'}</span>
                    <h3>{item.pattern}</h3>
                  </div>
                </div>

                <p className="explanation-desc">{item.explanation}</p>

                {/* 원문 디폴트 예시 */}
                {item.originalSentence && (
                  <div className="original-sentence-box">
                    <div className="box-tag">
                      <Quote size={12} />
                      <span>원래 입력했던 문장 (디폴트)</span>
                    </div>
                    <p className="en-text">{item.originalSentence}</p>
                    <button 
                      type="button" 
                      className="mini-speak-btn" 
                      onClick={() => handleSpeak(item.originalSentence)}
                    >
                      <Volume2 size={13} /> <span>원문 듣기</span>
                    </button>
                  </div>
                )}

                {/* AI 예문 생성 섹션 */}
                <div className="variations-section">
                  <div className="variations-header">
                    <span className="label">이 문법을 사용한 예문들</span>
                    <button 
                      type="button" 
                      className="gen-variations-btn"
                      disabled={generatingId === item.id}
                      onClick={() => handleGenerateVariations('grammar', item)}
                    >
                      <Sparkles size={14} />
                      <span>{generatingId === item.id ? '새 예문 만드는 중...' : '새 예문 2~3개 생성 ✨'}</span>
                    </button>
                  </div>

                  {item.variations && item.variations.length > 0 ? (
                    <div className="variations-list">
                      {item.variations.map((v, vIdx) => {
                        const vKey = `${item.id}-${vIdx}`;
                        const isSaved = savedVariationKeys[vKey];
                        return (
                          <div key={vIdx} className="variation-item">
                            <div className="var-text-wrap">
                              <p className="var-en">{v.en}</p>
                              <p className="var-ko">{v.ko}</p>
                            </div>
                            <div className="var-actions">
                              <button type="button" className="mini-speak-btn" onClick={() => handleSpeak(v.en)}>
                                <Volume2 size={14} />
                              </button>
                              <button 
                                type="button" 
                                className={`save-to-sentence-btn ${isSaved ? 'saved' : ''}`}
                                onClick={() => handleSaveToSentences(v, item, '문법', vKey)}
                                disabled={isSaved}
                              >
                                {isSaved ? (
                                  <>
                                    <Check size={13} /> <span>문장장에 담김</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={13} /> <span>문장장으로 저장</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-variations-hint">새 예문 생성을 누르면 아내 맞춤형 문법 활용 예문이 만들어집니다.</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 3. 숙어장 탭 내용 */}
      {activeTab === 'idioms' && (
        <div className="card-list-section">
          {idioms
            .filter(i => !searchQuery || i.idiom.toLowerCase().includes(searchQuery.toLowerCase()) || i.meaning?.includes(searchQuery))
            .map((item) => (
              <div key={item.id} className="library-card idiom-theme">
                <div className="card-top-row">
                  <div className="main-term">
                    <span className="idiom-badge">숙어 / 표현</span>
                    <h3>{item.idiom}</h3>
                  </div>
                  <button type="button" className="tts-icon-btn" onClick={() => handleSpeak(item.idiom)}>
                    <Volume2 size={18} />
                  </button>
                </div>

                <p className="nuance-desc">{item.meaning}</p>

                {/* 원문 디폴트 예시 */}
                {item.originalSentence && (
                  <div className="original-sentence-box">
                    <div className="box-tag">
                      <Quote size={12} />
                      <span>원래 입력했던 문장 (디폴트)</span>
                    </div>
                    <p className="en-text">{item.originalSentence}</p>
                    <button 
                      type="button" 
                      className="mini-speak-btn" 
                      onClick={() => handleSpeak(item.originalSentence)}
                    >
                      <Volume2 size={13} /> <span>원문 듣기</span>
                    </button>
                  </div>
                )}

                {/* AI 예문 생성 섹션 */}
                <div className="variations-section">
                  <div className="variations-header">
                    <span className="label">이 숙어를 사용한 실생활 예문</span>
                    <button 
                      type="button" 
                      className="gen-variations-btn"
                      disabled={generatingId === item.id}
                      onClick={() => handleGenerateVariations('idiom', item)}
                    >
                      <Sparkles size={14} />
                      <span>{generatingId === item.id ? '새 예문 만드는 중...' : '새 예문 2~3개 생성 ✨'}</span>
                    </button>
                  </div>

                  {item.variations && item.variations.length > 0 ? (
                    <div className="variations-list">
                      {item.variations.map((v, vIdx) => {
                        const vKey = `${item.id}-${vIdx}`;
                        const isSaved = savedVariationKeys[vKey];
                        return (
                          <div key={vIdx} className="variation-item">
                            <div className="var-text-wrap">
                              <p className="var-en">{v.en}</p>
                              <p className="var-ko">{v.ko}</p>
                            </div>
                            <div className="var-actions">
                              <button type="button" className="mini-speak-btn" onClick={() => handleSpeak(v.en)}>
                                <Volume2 size={14} />
                              </button>
                              <button 
                                type="button" 
                                className={`save-to-sentence-btn ${isSaved ? 'saved' : ''}`}
                                onClick={() => handleSaveToSentences(v, item, '숙어', vKey)}
                                disabled={isSaved}
                              >
                                {isSaved ? (
                                  <>
                                    <Check size={13} /> <span>문장장에 담김</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={13} /> <span>문장장으로 저장</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-variations-hint">새 예문 생성을 누르면 이 숙어가 들어간 문장들이 생성됩니다.</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
