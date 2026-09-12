import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Layers, Bookmark, Sparkles, Volume2, Plus, 
  Check, Trash2, Search, Filter, Quote, ArrowUpRight, Loader2,
  ChevronDown, ChevronUp, Calendar, ArrowUpDown
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { GeminiService } from '../../services/gemini';
import { SpeechService } from '../../services/speech';
import './StudyLibrary.css';

export default function StudyLibrary({ initialTab = 'words', onNavigateToSentence }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'words' | 'grammar' | 'idioms'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'oldest' | 'alpha'
  
  // 데이터 목록 상태
  const [words, setWords] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [idioms, setIdioms] = useState([]);

  // 아코디언 확장 상태 (id -> boolean)
  const [expandedIds, setExpandedIds] = useState({});

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

  const toggleExpand = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  // 삭제 처리
  const handleDelete = (type, item, e) => {
    e?.stopPropagation();
    const title = item.word || item.pattern || item.idiom;
    if (window.confirm(`'${title}' 항목을 서재에서 완전히 삭제하시겠습니까?`)) {
      if (type === 'word') StorageService.deleteWord(item.id);
      else if (type === 'grammar') StorageService.deleteGrammar(item.id);
      else if (type === 'idiom') StorageService.deleteIdiom(item.id);
      refreshData();
    }
  };

  // 발음 듣기
  const handleSpeak = (text, e) => {
    e?.stopPropagation();
    SpeechService.speak(text);
  };

  // AI 새 예문 실시간 생성 (기존 생성 문장 지우고 새로 교체)
  const handleGenerateVariations = async (type, item, e) => {
    e?.stopPropagation();
    setGeneratingId(item.id);
    try {
      const newVariations = await GeminiService.generateVariations(type, item, item.originalSentence);
      
      if (type === 'word') {
        StorageService.setWordVariations(item.id, newVariations);
      } else if (type === 'grammar') {
        StorageService.setGrammarVariations(item.id, newVariations);
      } else if (type === 'idiom') {
        StorageService.setIdiomVariations(item.id, newVariations);
      }
      refreshData();
    } catch (err) {
      console.error('예문 생성 오류:', err);
    } finally {
      setGeneratingId(null);
    }
  };

  // 마음에 드는 예문을 [문장학습으로 저장]
  const handleSaveToSentences = (variation, parentItem, typeLabel, key, e) => {
    e?.stopPropagation();
    StorageService.saveSentence({
      text: variation.en,
      translation: variation.ko,
      source: `${typeLabel} 파생 예문 (${parentItem.word || parentItem.pattern || parentItem.idiom})`,
      tags: [typeLabel, "AI추천예문"]
    });
    setSavedVariationKeys(prev => ({ ...prev, [key]: true }));
  };

  // 단어에 대한 사전적 대표 의미 / 품사 보완 헬퍼
  const getEnrichedWord = (w) => {
    let dictMeanings = w.dictionaryMeanings;
    let pos = w.partOfSpeech;
    
    // achieve 기본 샘플 및 기존 데이터 보완
    if ((!dictMeanings || dictMeanings.length === 0) && w.word?.toLowerCase() === 'achieve') {
      dictMeanings = ["달성하다", "성취하다", "이루어 내다"];
      pos = pos || "동사";
    }

    return {
      ...w,
      dictionaryMeanings: dictMeanings || [],
      partOfSpeech: pos || '단어'
    };
  };

  // 정렬 & 검색 필터링
  const getProcessedItems = (list, type) => {
    let filtered = list;
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      filtered = filtered.filter(item => {
        if (type === 'words') {
          return (
            (item.word || '').toLowerCase().includes(q) ||
            (item.nuanceKo || '').toLowerCase().includes(q) ||
            (item.dictionaryMeanings && item.dictionaryMeanings.some(m => m.toLowerCase().includes(q)))
          );
        } else if (type === 'grammar') {
          return (
            (item.pattern || '').toLowerCase().includes(q) ||
            (item.explanation || '').toLowerCase().includes(q) ||
            (item.tag || '').toLowerCase().includes(q)
          );
        } else {
          return (
            (item.idiom || '').toLowerCase().includes(q) ||
            (item.meaning || '').toLowerCase().includes(q)
          );
        }
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'latest') {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return db - da;
      }
      if (sortBy === 'oldest') {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return da - db;
      }
      if (sortBy === 'alpha') {
        const keyA = (a.word || a.pattern || a.idiom || '').toLowerCase();
        const keyB = (b.word || b.pattern || b.idiom || '').toLowerCase();
        return keyA.localeCompare(keyB);
      }
      return 0;
    });
  };

  const processedWords = getProcessedItems(words.map(getEnrichedWord), 'words');
  const processedGrammar = getProcessedItems(grammar, 'grammar');
  const processedIdioms = getProcessedItems(idioms, 'idioms');

  return (
    <div className="study-library-container">
      {/* 상단 고정 헤더: 탭 + 검색 + 정렬 */}
      <div className="library-sticky-header">
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

        {/* 검색 및 정렬 바 */}
        <div className="library-controls-row">
          <div className="library-search-bar">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="단어, 뜻, 패턴, 예문 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="library-sort-wrapper">
            <ArrowUpDown size={14} className="sort-icon" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="library-sort-select"
            >
              <option value="latest">최신 등록순</option>
              <option value="oldest">오래된순</option>
              <option value="alpha">알파벳순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. 단어장 탭 내용 */}
      {activeTab === 'words' && (
        <div className="accordion-list-section">
          {processedWords.length === 0 ? (
            <div className="library-empty-box">등록된 단어가 없습니다.</div>
          ) : (
            processedWords.map((item) => {
              const isExpanded = !!expandedIds[item.id];
              const dateDisplay = formatDate(item.createdAt);

              return (
                <div key={item.id} className={`accordion-card word-theme ${isExpanded ? 'is-open' : ''}`}>
                  {/* 접힌 기본 리스트 행 (누르면 확장) */}
                  <div className="accordion-header-row" onClick={() => toggleExpand(item.id)}>
                    <div className="header-left">
                      <span className="part-badge">{item.partOfSpeech || '단어'}</span>
                      <strong className="header-title">{item.word}</strong>
                      <span className="header-preview">
                        {item.dictionaryMeanings && item.dictionaryMeanings.length > 0 
                          ? item.dictionaryMeanings.join(', ')
                          : item.nuanceKo}
                      </span>
                    </div>

                    <div className="header-right">
                      {dateDisplay && (
                        <span className="meta-date-chip">
                          <Calendar size={11} />
                          <span>{dateDisplay}</span>
                        </span>
                      )}
                      <button 
                        type="button" 
                        className="tts-mini-icon-btn" 
                        title="발음 듣기"
                        onClick={(e) => handleSpeak(item.word, e)}
                      >
                        <Volume2 size={16} />
                      </button>
                      <button 
                        type="button" 
                        className="delete-mini-btn" 
                        title="단어 삭제"
                        onClick={(e) => handleDelete('word', item, e)}
                      >
                        <Trash2 size={15} />
                      </button>
                      <span className="accordion-chevron">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </div>
                  </div>

                  {/* 펼쳤을 때 나타나는 상세 설명 박스 */}
                  {isExpanded && (
                    <div className="accordion-body-content">
                      <div className="expanded-top-info">
                        <div className="word-heading">
                          <span className="phonetic">{item.phonetic}</span>
                        </div>
                      </div>

                      {/* 13번: 사전적 형태 추가 (대표 의미 3개 및 동사/명사/형용사 구분) */}
                      {item.dictionaryMeanings && item.dictionaryMeanings.length > 0 && (
                        <div className="dict-meanings-container">
                          <div className="dict-title-bar">
                            <span className="dict-label">📖 사전적 대표 의미</span>
                            <span className="dict-pos-tag">[{item.partOfSpeech || '단어'}]</span>
                          </div>
                          <div className="dict-meaning-pills">
                            {item.dictionaryMeanings.map((meaning, mIdx) => (
                              <div key={mIdx} className="dict-pill">
                                <span className="pill-idx">{mIdx + 1}</span>
                                <span className="pill-text">{meaning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 친절한 뉘앙스 풀이 */}
                      {item.nuanceKo && (
                        <div className="nuance-info-box">
                          <span className="nuance-label">💡 상세 뉘앙스 & 활용법</span>
                          <p className="nuance-desc">{item.nuanceKo}</p>
                        </div>
                      )}

                      {/* 원문 디폴트 예시 */}
                      {item.originalSentence && (
                        <div className="original-sentence-box">
                          <div className="box-tag">
                            <Quote size={12} />
                            <span>처음 담았던 원문</span>
                          </div>
                          <p className="en-text">{item.originalSentence}</p>
                          <button 
                            type="button" 
                            className="mini-speak-btn" 
                            onClick={(e) => handleSpeak(item.originalSentence, e)}
                          >
                            <Volume2 size={13} /> <span>원문 듣기</span>
                          </button>
                        </div>
                      )}

                      {/* AI 예문 생성 섹션 */}
                      <div className="variations-section">
                        <div className="variations-header">
                          <span className="label">✨ AI 실생활 추가 예문</span>
                          <button 
                            type="button" 
                            className="gen-variations-btn"
                            disabled={generatingId === item.id}
                            onClick={(e) => handleGenerateVariations('word', item, e)}
                          >
                            {generatingId === item.id ? (
                              <>
                                <Loader2 size={14} className="spin-loader" />
                                <span>새 예문 생성 중...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                <span>새 예문 생성</span>
                              </>
                            )}
                          </button>
                        </div>

                        {generatingId === item.id ? (
                          <div className="variations-loading-box">
                            <Loader2 size={16} className="spin-loader" />
                            <span>기존 예문을 비우고 새로운 실생활 예문을 생성 중입니다...</span>
                          </div>
                        ) : item.variations && item.variations.length > 0 ? (
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
                                    <button 
                                      type="button" 
                                      className="mini-speak-btn" 
                                      onClick={(e) => handleSpeak(v.en, e)}
                                    >
                                      <Volume2 size={14} />
                                    </button>
                                    <button 
                                      type="button" 
                                      className={`save-to-sentence-btn ${isSaved ? 'saved' : ''}`}
                                      onClick={(e) => handleSaveToSentences(v, item, '단어', vKey, e)}
                                      disabled={isSaved}
                                    >
                                      {isSaved ? (
                                        <>
                                          <Check size={13} /> <span>문장학습에 담김</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus size={13} /> <span>문장학습에 저장</span>
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
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. 문법장 탭 내용 */}
      {activeTab === 'grammar' && (
        <div className="accordion-list-section">
          {processedGrammar.length === 0 ? (
            <div className="library-empty-box">등록된 문법 패턴이 없습니다.</div>
          ) : (
            processedGrammar.map((item) => {
              const isExpanded = !!expandedIds[item.id];
              const dateDisplay = formatDate(item.createdAt);

              return (
                <div key={item.id} className={`accordion-card grammar-theme ${isExpanded ? 'is-open' : ''}`}>
                  {/* 접힌 기본 행 */}
                  <div className="accordion-header-row" onClick={() => toggleExpand(item.id)}>
                    <div className="header-left">
                      <span className="pattern-badge">{item.tag || '#문법패턴'}</span>
                      <strong className="header-title">{item.pattern}</strong>
                      <span className="header-preview">{item.explanation}</span>
                    </div>

                    <div className="header-right">
                      {dateDisplay && (
                        <span className="meta-date-chip">
                          <Calendar size={11} />
                          <span>{dateDisplay}</span>
                        </span>
                      )}
                      <button 
                        type="button" 
                        className="delete-mini-btn" 
                        title="문법 삭제"
                        onClick={(e) => handleDelete('grammar', item, e)}
                      >
                        <Trash2 size={15} />
                      </button>
                      <span className="accordion-chevron">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </div>
                  </div>

                  {/* 펼친 내용 */}
                  {isExpanded && (
                    <div className="accordion-body-content">
                      <p className="explanation-desc">{item.explanation}</p>

                      {/* 원문 디폴트 예시 */}
                      {item.originalSentence && (
                        <div className="original-sentence-box">
                          <div className="box-tag">
                            <Quote size={12} />
                            <span>처음 담았던 원문</span>
                          </div>
                          <p className="en-text">{item.originalSentence}</p>
                          <button 
                            type="button" 
                            className="mini-speak-btn" 
                            onClick={(e) => handleSpeak(item.originalSentence, e)}
                          >
                            <Volume2 size={13} /> <span>원문 듣기</span>
                          </button>
                        </div>
                      )}

                      {/* AI 예문 생성 섹션 */}
                      <div className="variations-section">
                        <div className="variations-header">
                          <span className="label">✨ 이 문법을 사용한 예문들</span>
                          <button 
                            type="button" 
                            className="gen-variations-btn"
                            disabled={generatingId === item.id}
                            onClick={(e) => handleGenerateVariations('grammar', item, e)}
                          >
                            {generatingId === item.id ? (
                              <>
                                <Loader2 size={14} className="spin-loader" />
                                <span>새 예문 생성 중...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                <span>새 예문 생성</span>
                              </>
                            )}
                          </button>
                        </div>

                        {generatingId === item.id ? (
                          <div className="variations-loading-box">
                            <Loader2 size={16} className="spin-loader" />
                            <span>기존 예문을 비우고 새로운 실생활 예문을 생성 중입니다...</span>
                          </div>
                        ) : item.variations && item.variations.length > 0 ? (
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
                                    <button 
                                      type="button" 
                                      className="mini-speak-btn" 
                                      onClick={(e) => handleSpeak(v.en, e)}
                                    >
                                      <Volume2 size={14} />
                                    </button>
                                    <button 
                                      type="button" 
                                      className={`save-to-sentence-btn ${isSaved ? 'saved' : ''}`}
                                      onClick={(e) => handleSaveToSentences(v, item, '문법', vKey, e)}
                                      disabled={isSaved}
                                    >
                                      {isSaved ? (
                                        <>
                                          <Check size={13} /> <span>문장학습에 담김</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus size={13} /> <span>문장학습에 저장</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="no-variations-hint">새 예문 생성을 누르면 맞춤형 문법 활용 예문이 만들어집니다.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. 숙어장 탭 내용 */}
      {activeTab === 'idioms' && (
        <div className="accordion-list-section">
          {processedIdioms.length === 0 ? (
            <div className="library-empty-box">등록된 숙어가 없습니다.</div>
          ) : (
            processedIdioms.map((item) => {
              const isExpanded = !!expandedIds[item.id];
              const dateDisplay = formatDate(item.createdAt);

              return (
                <div key={item.id} className={`accordion-card idiom-theme ${isExpanded ? 'is-open' : ''}`}>
                  {/* 접힌 기본 행 */}
                  <div className="accordion-header-row" onClick={() => toggleExpand(item.id)}>
                    <div className="header-left">
                      <span className="idiom-badge">숙어/표현</span>
                      <strong className="header-title">{item.idiom}</strong>
                      <span className="header-preview">{item.meaning}</span>
                    </div>

                    <div className="header-right">
                      {dateDisplay && (
                        <span className="meta-date-chip">
                          <Calendar size={11} />
                          <span>{dateDisplay}</span>
                        </span>
                      )}
                      <button 
                        type="button" 
                        className="tts-mini-icon-btn" 
                        title="발음 듣기"
                        onClick={(e) => handleSpeak(item.idiom, e)}
                      >
                        <Volume2 size={16} />
                      </button>
                      <button 
                        type="button" 
                        className="delete-mini-btn" 
                        title="숙어 삭제"
                        onClick={(e) => handleDelete('idiom', item, e)}
                      >
                        <Trash2 size={15} />
                      </button>
                      <span className="accordion-chevron">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </div>
                  </div>

                  {/* 펼친 내용 */}
                  {isExpanded && (
                    <div className="accordion-body-content">
                      <p className="nuance-desc">{item.meaning}</p>

                      {/* 원문 디폴트 예시 */}
                      {item.originalSentence && (
                        <div className="original-sentence-box">
                          <div className="box-tag">
                            <Quote size={12} />
                            <span>처음 담았던 원문</span>
                          </div>
                          <p className="en-text">{item.originalSentence}</p>
                          <button 
                            type="button" 
                            className="mini-speak-btn" 
                            onClick={(e) => handleSpeak(item.originalSentence, e)}
                          >
                            <Volume2 size={13} /> <span>원문 듣기</span>
                          </button>
                        </div>
                      )}

                      {/* AI 예문 생성 섹션 */}
                      <div className="variations-section">
                        <div className="variations-header">
                          <span className="label">✨ 이 숙어를 사용한 실생활 예문</span>
                          <button 
                            type="button" 
                            className="gen-variations-btn"
                            disabled={generatingId === item.id}
                            onClick={(e) => handleGenerateVariations('idiom', item, e)}
                          >
                            {generatingId === item.id ? (
                              <>
                                <Loader2 size={14} className="spin-loader" />
                                <span>새 예문 생성 중...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                <span>새 예문 생성</span>
                              </>
                            )}
                          </button>
                        </div>

                        {generatingId === item.id ? (
                          <div className="variations-loading-box">
                            <Loader2 size={16} className="spin-loader" />
                            <span>기존 예문을 비우고 새로운 실생활 예문을 생성 중입니다...</span>
                          </div>
                        ) : item.variations && item.variations.length > 0 ? (
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
                                    <button 
                                      type="button" 
                                      className="mini-speak-btn" 
                                      onClick={(e) => handleSpeak(v.en, e)}
                                    >
                                      <Volume2 size={14} />
                                    </button>
                                    <button 
                                      type="button" 
                                      className={`save-to-sentence-btn ${isSaved ? 'saved' : ''}`}
                                      onClick={(e) => handleSaveToSentences(v, item, '숙어', vKey, e)}
                                      disabled={isSaved}
                                    >
                                      {isSaved ? (
                                        <>
                                          <Check size={13} /> <span>문장학습에 담김</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus size={13} /> <span>문장학습에 저장</span>
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
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
