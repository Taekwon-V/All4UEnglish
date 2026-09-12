import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Layers, Bookmark, Sparkles, Volume2, Plus, 
  Check, Trash2, Search, Filter, Quote, ArrowUpRight, Loader2,
  ChevronDown, ChevronUp, Calendar, ArrowUpDown, X, Zap,
  CheckCircle2, RotateCcw
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { GeminiService } from '../../services/gemini';
import { SpeechService } from '../../services/speech';
import './StudyLibrary.css';

export default function StudyLibrary({ initialTab = 'words', onNavigateToSentence }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'words' | 'grammar' | 'idioms'
  const [statusFilter, setStatusFilter] = useState('learning'); // 'learning' | 'mastered'
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

  // ================= 직접 추가 모달 상태 =================
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState('word'); // 'word' | 'grammar' | 'idiom'
  const [addTerm, setAddTerm] = useState('');
  const [addTag, setAddTag] = useState('동사');
  const [addMeaning1, setAddMeaning1] = useState('');
  const [addMeaning2, setAddMeaning2] = useState('');
  const [addMeaning3, setAddMeaning3] = useState('');
  const [addNuance, setAddNuance] = useState('');
  const [addSentence, setAddSentence] = useState('');
  const [isAiFilling, setIsAiFilling] = useState(false);

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

  // 날짜 포맷 (세부용 YYYY.MM.DD)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  // 요청사항: 2번째 줄용 짧은 생성월 (YY.MM 형태)
  const formatShortMonth = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yy}.${mm}`;
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

  // 학습 상태 토글 (학습 중 <-> 학습 완료)
  const handleToggleStatus = (type, item, newStatus, e) => {
    e?.stopPropagation();
    if (type === 'words' || type === 'word') {
      StorageService.setWordStatus(item.id, newStatus);
    } else if (type === 'grammar') {
      StorageService.setGrammarStatus(item.id, newStatus);
    } else if (type === 'idioms' || type === 'idiom') {
      StorageService.setIdiomStatus(item.id, newStatus);
    }
    refreshData();
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

  // ================= 직접 추가 모달 열기 & AI 자동 채우기 =================
  const handleOpenAddModal = () => {
    const defaultType = activeTab === 'words' ? 'word' : activeTab === 'grammar' ? 'grammar' : 'idiom';
    setAddType(defaultType);
    setAddTerm('');
    setAddTag(defaultType === 'word' ? '동사' : defaultType === 'grammar' ? 'to+V' : '동사구');
    setAddMeaning1('');
    setAddMeaning2('');
    setAddMeaning3('');
    setAddNuance('');
    setAddSentence('');
    setIsAddModalOpen(true);
  };

  const handleTypeChange = (type) => {
    setAddType(type);
    if (type === 'word') setAddTag('동사');
    else if (type === 'grammar') setAddTag('to+V');
    else if (type === 'idiom') setAddTag('동사구');
  };

  const handleAiAutoFill = async () => {
    if (!addTerm.trim()) {
      alert('먼저 영어 표현을 입력해 주세요.');
      return;
    }
    setIsAiFilling(true);
    try {
      const result = await GeminiService.lookupExpression(addType, addTerm.trim());
      if (result) {
        if (addType === 'word') {
          if (result.partOfSpeech) setAddTag(result.partOfSpeech);
          if (result.dictionaryMeanings && result.dictionaryMeanings.length > 0) {
            setAddMeaning1(result.dictionaryMeanings[0] || '');
            setAddMeaning2(result.dictionaryMeanings[1] || '');
            setAddMeaning3(result.dictionaryMeanings[2] || '');
          }
          if (result.nuanceKo) setAddNuance(result.nuanceKo);
          if (result.sampleSentence) setAddSentence(result.sampleSentence);
        } else if (addType === 'grammar') {
          if (result.tag) setAddTag(result.tag);
          if (result.explanation) setAddNuance(result.explanation);
          if (result.sampleSentence) setAddSentence(result.sampleSentence);
        } else if (addType === 'idiom') {
          if (result.roleTag) setAddTag(result.roleTag);
          if (result.meaning) setAddNuance(result.meaning);
          if (result.sampleSentence) setAddSentence(result.sampleSentence);
        }
      }
    } catch (err) {
      console.error('AI 자동 채우기 오류:', err);
    } finally {
      setIsAiFilling(false);
    }
  };

  const handleSaveDirectItem = (e) => {
    e.preventDefault();
    if (!addTerm.trim()) {
      alert('영어 표현을 입력해 주세요.');
      return;
    }

    if (addType === 'word') {
      const dictMeanings = [addMeaning1, addMeaning2, addMeaning3].filter(m => m.trim().length > 0);
      StorageService.saveWord({
        word: addTerm.trim(),
        partOfSpeech: addTag.trim() || '단어',
        dictionaryMeanings: dictMeanings,
        nuanceKo: addNuance.trim() || (dictMeanings.length > 0 ? dictMeanings.join(', ') : '직접 등록한 단어입니다.'),
        originalSentence: addSentence.trim()
      });
      setActiveTab('words');
    } else if (addType === 'grammar') {
      StorageService.saveGrammar({
        pattern: addTerm.trim(),
        tag: addTag.trim() ? (addTag.startsWith('#') ? addTag : `#${addTag}`) : '#문법패턴',
        explanation: addNuance.trim() || '직접 등록한 문법 패턴입니다.',
        originalSentence: addSentence.trim()
      });
      setActiveTab('grammar');
    } else if (addType === 'idiom') {
      StorageService.saveIdiom({
        idiom: addTerm.trim(),
        roleTag: addTag.trim() || '숙어/표현',
        meaning: addNuance.trim() || '직접 등록한 숙어 표현입니다.',
        originalSentence: addSentence.trim()
      });
      setActiveTab('idioms');
    }

    refreshData();
    setIsAddModalOpen(false);
  };

  // 단어에 대한 사전적 대표 의미 / 품사 보완 및 오염 데이터 자동 치유 헬퍼
  const getEnrichedWord = (w) => {
    let dictMeanings = w.dictionaryMeanings;
    let pos = w.partOfSpeech;
    let nuance = w.nuanceKo || '';
    const lower = (w.word || '').toLowerCase().trim();

    // 1. 억지 상투적 문구 제거
    if (nuance.includes('감정과 의도') || nuance.includes('중요 어휘') || nuance.includes('문맥 속에서')) {
      nuance = '';
    }

    // 2. 오염된 잘못된 사전 뜻('궁금해하다') 치유 및 정확한 사전 뜻 배정
    if (lower === 'busy') {
      dictMeanings = ["바쁜", "분주한", "통화 중인"];
      pos = "형용사";
      nuance = "할 일이 많은 상태뿐 아니라 식당이 붐비거나 통화 중일 때도 쓰입니다.";
    } else if (lower === 'iced') {
      dictMeanings = ["얼음을 넣은", "차가운", "설탕을 입힌"];
      pos = "형용사";
      nuance = "얼음을 띄워 차갑게 만든 시원한 음료에 주로 쓰입니다.";
    } else if (lower === 'achieve') {
      dictMeanings = ["달성하다", "성취하다", "이루어 내다"];
      pos = "동사";
    } else if (dictMeanings && dictMeanings.some(m => m.includes('궁금해하다')) && lower !== 'wondering') {
      // 잘못 복사된 더미 뜻 제거
      dictMeanings = [w.word];
    }

    return {
      ...w,
      dictionaryMeanings: dictMeanings || [],
      partOfSpeech: pos || '단어',
      nuanceKo: nuance
    };
  };

  // 정렬 & 검색 필터링
  const getProcessedItems = (list, type) => {
    let filtered = list;

    // 학습 상태 분리 필터 (학습 중 vs 학습 완료)
    if (statusFilter === 'learning') {
      filtered = filtered.filter(item => item.status !== 'mastered');
    } else if (statusFilter === 'mastered') {
      filtered = filtered.filter(item => item.status === 'mastered');
    }

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

  const currentCategoryList = activeTab === 'words' ? words : activeTab === 'grammar' ? grammar : idioms;
  const learningCount = currentCategoryList.filter(item => item.status !== 'mastered').length;
  const masteredCount = currentCategoryList.filter(item => item.status === 'mastered').length;

  return (
    <div className="study-library-container">
      {/* 상단 고정 헤더: 탭 + 서브 학습상태 탭 + 검색 + 정렬 + 직접 추가 버튼 */}
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

        {/* 2단 학습 중 vs 학습 완료 서브 세그먼트 바 */}
        <div className="library-sub-status-bar">
          <button 
            type="button" 
            className={`lib-sub-status-btn ${statusFilter === 'learning' ? 'active' : ''}`}
            onClick={() => setStatusFilter('learning')}
          >
            <BookOpen size={14} />
            <span>학습 중 ({learningCount})</span>
          </button>

          <button 
            type="button" 
            className={`lib-sub-status-btn ${statusFilter === 'mastered' ? 'active' : ''}`}
            onClick={() => setStatusFilter('mastered')}
          >
            <CheckCircle2 size={14} />
            <span>학습 완료 ({masteredCount})</span>
          </button>
        </div>

        {/* 검색, 정렬 및 [+ 직접 추가] 컨트롤 바 */}
        <div className="library-controls-row">
          <div className="library-search-bar">
            <Search size={15} className="search-icon" />
            <input 
              type="text" 
              placeholder="단어, 뜻, 패턴, 예문 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="library-sort-wrapper">
            <ArrowUpDown size={13} className="sort-icon" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="library-sort-select"
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="alpha">가나다순</option>
            </select>
          </div>

          <button 
            type="button" 
            className="direct-add-btn" 
            onClick={handleOpenAddModal}
            title="서재에 직접 추가하기"
          >
            <Plus size={15} />
            <span>추가</span>
          </button>
        </div>
      </div>

      {/* ================= 1. 단어장 탭 내용 ================= */}
      {activeTab === 'words' && (
        <div className="accordion-list-section">
          {processedWords.length === 0 ? (
            <div className="library-empty-box">등록된 단어가 없습니다. [+ 추가] 버튼으로 등록해보세요!</div>
          ) : (
            processedWords.map((item) => {
              const isExpanded = !!expandedIds[item.id];
              const dateDisplay = formatDate(item.createdAt);
              const shortMonth = formatShortMonth(item.createdAt);

              return (
                <div key={item.id} className={`accordion-card word-theme ${isExpanded ? 'is-open' : ''}`}>
                  {/* 접힌 2줄 기본 행 */}
                  <div className="accordion-summary-row" onClick={() => toggleExpand(item.id)}>
                    {/* 첫째 줄: 오로지 영어 표현과 소리버튼만 */}
                    <div className="summary-line-1">
                      <strong className="summary-term">{item.word}</strong>
                      <button 
                        type="button" 
                        className="tts-mini-icon-btn" 
                        title="발음 듣기"
                        onClick={(e) => handleSpeak(item.word, e)}
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>

                    {/* 둘째 줄: 사전적 의미, 생성월(yymm), 쓰레기통 */}
                    <div className="summary-line-2">
                      <div className="summary-meaning-col">
                        <span className="part-badge">{item.partOfSpeech || '단어'}</span>
                        {item.status === 'mastered' && (
                          <span className="mastered-pill-badge">외움 ✓</span>
                        )}
                        <span className="summary-meaning-text">
                          {item.dictionaryMeanings && item.dictionaryMeanings.length > 0 
                            ? item.dictionaryMeanings.join(', ')
                            : item.nuanceKo}
                        </span>
                      </div>

                      <div className="summary-actions-col">
                        {shortMonth && (
                          <span className="meta-yymm-chip" title={`등록일: ${dateDisplay}`}>
                            {shortMonth}
                          </span>
                        )}
                        <button 
                          type="button" 
                          className="delete-mini-btn" 
                          title="단어 삭제"
                          onClick={(e) => handleDelete('word', item, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="accordion-chevron">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 펼쳤을 때 나타나는 세부 설명 박스 */}
                  {isExpanded && (
                    <div className="accordion-body-content">
                      {/* 학습 완료 / 다시 학습 액션 바 */}
                      <div className="lib-item-status-row">
                        {item.status !== 'mastered' ? (
                          <button 
                            type="button" 
                            className="lib-status-toggle-btn master-btn"
                            onClick={(e) => handleToggleStatus('words', item, 'mastered', e)}
                          >
                            <Check size={14} />
                            <span>외웠어요 (학습 완료)</span>
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            className="lib-status-toggle-btn review-btn"
                            onClick={(e) => handleToggleStatus('words', item, 'learning', e)}
                          >
                            <RotateCcw size={13} />
                            <span>다시 학습하기</span>
                          </button>
                        )}
                      </div>

                      {item.phonetic && (
                        <div className="expanded-top-info">
                          <span className="phonetic">{item.phonetic}</span>
                        </div>
                      )}

                      {/* 사전적 대표 의미 */}
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
                            <span>예문 / 원문</span>
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

      {/* ================= 2. 문법장 탭 내용 ================= */}
      {activeTab === 'grammar' && (
        <div className="accordion-list-section">
          {processedGrammar.length === 0 ? (
            <div className="library-empty-box">등록된 문법 패턴이 없습니다. [+ 추가] 버튼으로 등록해보세요!</div>
          ) : (
            processedGrammar.map((item) => {
              const isExpanded = !!expandedIds[item.id];
              const dateDisplay = formatDate(item.createdAt);
              const shortMonth = formatShortMonth(item.createdAt);

              return (
                <div key={item.id} className={`accordion-card grammar-theme ${isExpanded ? 'is-open' : ''}`}>
                  {/* 접힌 2줄 기본 행 */}
                  <div className="accordion-summary-row" onClick={() => toggleExpand(item.id)}>
                    {/* 첫째 줄: 오로지 영어 표현과 소리버튼만 */}
                    <div className="summary-line-1">
                      <strong className="summary-term">{item.pattern}</strong>
                      <button 
                        type="button" 
                        className="tts-mini-icon-btn" 
                        title="발음 듣기"
                        onClick={(e) => handleSpeak(item.pattern, e)}
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>

                    {/* 둘째 줄: 사전적 의미/설명, 생성월(yymm), 쓰레기통 */}
                    <div className="summary-line-2">
                      <div className="summary-meaning-col">
                        <span className="pattern-badge">{item.tag || '#문법패턴'}</span>
                        {item.status === 'mastered' && (
                          <span className="mastered-pill-badge">외움 ✓</span>
                        )}
                        <span className="summary-meaning-text">{item.explanation}</span>
                      </div>

                      <div className="summary-actions-col">
                        {shortMonth && (
                          <span className="meta-yymm-chip" title={`등록일: ${dateDisplay}`}>
                            {shortMonth}
                          </span>
                        )}
                        <button 
                          type="button" 
                          className="delete-mini-btn" 
                          title="문법 삭제"
                          onClick={(e) => handleDelete('grammar', item, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="accordion-chevron">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 펼친 내용 */}
                  {isExpanded && (
                    <div className="accordion-body-content">
                      {/* 학습 완료 / 다시 학습 액션 바 */}
                      <div className="lib-item-status-row">
                        {item.status !== 'mastered' ? (
                          <button 
                            type="button" 
                            className="lib-status-toggle-btn master-btn"
                            onClick={(e) => handleToggleStatus('grammar', item, 'mastered', e)}
                          >
                            <Check size={14} />
                            <span>외웠어요 (학습 완료)</span>
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            className="lib-status-toggle-btn review-btn"
                            onClick={(e) => handleToggleStatus('grammar', item, 'learning', e)}
                          >
                            <RotateCcw size={13} />
                            <span>다시 학습하기</span>
                          </button>
                        )}
                      </div>

                      <p className="explanation-desc">{item.explanation}</p>

                      {/* 원문 디폴트 예시 */}
                      {item.originalSentence && (
                        <div className="original-sentence-box">
                          <div className="box-tag">
                            <Quote size={12} />
                            <span>예문 / 원문</span>
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

      {/* ================= 3. 숙어장 탭 내용 ================= */}
      {activeTab === 'idioms' && (
        <div className="accordion-list-section">
          {processedIdioms.length === 0 ? (
            <div className="library-empty-box">등록된 숙어가 없습니다. [+ 추가] 버튼으로 등록해보세요!</div>
          ) : (
            processedIdioms.map((item) => {
              const isExpanded = !!expandedIds[item.id];
              const dateDisplay = formatDate(item.createdAt);
              const shortMonth = formatShortMonth(item.createdAt);

              return (
                <div key={item.id} className={`accordion-card idiom-theme ${isExpanded ? 'is-open' : ''}`}>
                  {/* 접힌 2줄 기본 행 */}
                  <div className="accordion-summary-row" onClick={() => toggleExpand(item.id)}>
                    {/* 첫째 줄: 오로지 영어 표현과 소리버튼만 */}
                    <div className="summary-line-1">
                      <strong className="summary-term">{item.idiom}</strong>
                      <button 
                        type="button" 
                        className="tts-mini-icon-btn" 
                        title="발음 듣기"
                        onClick={(e) => handleSpeak(item.idiom, e)}
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>

                    {/* 둘째 줄: 사전적 의미/뜻, 생성월(yymm), 쓰레기통 */}
                    <div className="summary-line-2">
                      <div className="summary-meaning-col">
                        <span className="idiom-badge">{item.roleTag || '숙어/표현'}</span>
                        {item.status === 'mastered' && (
                          <span className="mastered-pill-badge">외움 ✓</span>
                        )}
                        <span className="summary-meaning-text">{item.meaning}</span>
                      </div>

                      <div className="summary-actions-col">
                        {shortMonth && (
                          <span className="meta-yymm-chip" title={`등록일: ${dateDisplay}`}>
                            {shortMonth}
                          </span>
                        )}
                        <button 
                          type="button" 
                          className="delete-mini-btn" 
                          title="숙어 삭제"
                          onClick={(e) => handleDelete('idiom', item, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="accordion-chevron">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 펼친 내용 */}
                  {isExpanded && (
                    <div className="accordion-body-content">
                      {/* 학습 완료 / 다시 학습 액션 바 */}
                      <div className="lib-item-status-row">
                        {item.status !== 'mastered' ? (
                          <button 
                            type="button" 
                            className="lib-status-toggle-btn master-btn"
                            onClick={(e) => handleToggleStatus('idioms', item, 'mastered', e)}
                          >
                            <Check size={14} />
                            <span>외웠어요 (학습 완료)</span>
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            className="lib-status-toggle-btn review-btn"
                            onClick={(e) => handleToggleStatus('idioms', item, 'learning', e)}
                          >
                            <RotateCcw size={13} />
                            <span>다시 학습하기</span>
                          </button>
                        )}
                      </div>

                      <p className="nuance-desc">{item.meaning}</p>

                      {/* 원문 디폴트 예시 */}
                      {item.originalSentence && (
                        <div className="original-sentence-box">
                          <div className="box-tag">
                            <Quote size={12} />
                            <span>예문 / 원문</span>
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

      {/* ================= 직접 추가 모달 (바텀시트) ================= */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="direct-add-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <div className="sheet-title-row">
                <span className="sheet-icon-tag">✏️</span>
                <h3>서재에 직접 등록하기</h3>
              </div>
              <button 
                type="button" 
                className="close-sheet-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* 3단 탭 전환기 */}
            <div className="sheet-tab-selector">
              <button 
                type="button" 
                className={`sheet-tab ${addType === 'word' ? 'active' : ''}`}
                onClick={() => handleTypeChange('word')}
              >
                단어 등록
              </button>
              <button 
                type="button" 
                className={`sheet-tab ${addType === 'grammar' ? 'active' : ''}`}
                onClick={() => handleTypeChange('grammar')}
              >
                문법 등록
              </button>
              <button 
                type="button" 
                className={`sheet-tab ${addType === 'idiom' ? 'active' : ''}`}
                onClick={() => handleTypeChange('idiom')}
              >
                숙어 등록
              </button>
            </div>

            <form onSubmit={handleSaveDirectItem} className="sheet-form">
              {/* 표제어 입력 + AI 자동완성 버튼 */}
              <div className="form-group">
                <label className="form-label">
                  {addType === 'word' ? '영어 단어' : addType === 'grammar' ? '문법 패턴' : '숙어 / 관용구'} *
                </label>
                <div className="input-with-ai-btn">
                  <input 
                    type="text" 
                    placeholder={addType === 'word' ? '예: resilient' : addType === 'grammar' ? '예: be used to -ing' : '예: break the ice'}
                    value={addTerm}
                    onChange={(e) => setAddTerm(e.target.value)}
                    className="sheet-text-input"
                    required
                    autoFocus
                  />
                  <button 
                    type="button" 
                    className="btn-ai-autofill"
                    onClick={handleAiAutoFill}
                    disabled={isAiFilling || !addTerm.trim()}
                    title="단어/표현만 넣고 누르면 품사, 사전 뜻, 뉘앙스가 1초 만에 자동 채워집니다!"
                  >
                    {isAiFilling ? (
                      <>
                        <Loader2 size={13} className="spin-loader" />
                        <span>채우는 중...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} />
                        <span>AI 자동채우기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 품사 / 역할 뱃지 선택 (추천 칩 + 직접 입력) */}
              <div className="form-group">
                <label className="form-label">
                  {addType === 'word' ? '품사 구분' : addType === 'grammar' ? '문법 구조 태그' : '구문 역할 태그'}
                </label>
                <div className="tag-chips-row">
                  {addType === 'word' && ['동사', '명사', '형용사', '부사'].map(tag => (
                    <button 
                      key={tag}
                      type="button" 
                      className={`chip-select-btn ${addTag === tag ? 'selected' : ''}`}
                      onClick={() => setAddTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                  {addType === 'grammar' && ['to+V', 'P.P.', 'V-ing', '조동사+V', '접속/가정', '수동태'].map(tag => (
                    <button 
                      key={tag}
                      type="button" 
                      className={`chip-select-btn ${addTag === tag ? 'selected' : ''}`}
                      onClick={() => setAddTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                  {addType === 'idiom' && ['동사구', '형용사구', '부사구', '전치사구', '대화 관용구'].map(tag => (
                    <button 
                      key={tag}
                      type="button" 
                      className={`chip-select-btn ${addTag === tag ? 'selected' : ''}`}
                      onClick={() => setAddTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  placeholder="직접 태그 입력 (예: to+동사원형, 이어동사 등)" 
                  value={addTag}
                  onChange={(e) => setAddTag(e.target.value)}
                  className="sheet-sub-input"
                />
              </div>

              {/* 단어일 때: 대표 사전 의미 3개 */}
              {addType === 'word' && (
                <div className="form-group">
                  <label className="form-label">사전적 대표 의미 (최대 3개)</label>
                  <div className="meanings-inputs-col">
                    <input 
                      type="text" 
                      placeholder="1. 대표 뜻 (예: 회복력 있는)" 
                      value={addMeaning1}
                      onChange={(e) => setAddMeaning1(e.target.value)}
                      className="sheet-sub-input"
                    />
                    <input 
                      type="text" 
                      placeholder="2. 두 번째 뜻 (선택)" 
                      value={addMeaning2}
                      onChange={(e) => setAddMeaning2(e.target.value)}
                      className="sheet-sub-input"
                    />
                    <input 
                      type="text" 
                      placeholder="3. 세 번째 뜻 (선택)" 
                      value={addMeaning3}
                      onChange={(e) => setAddMeaning3(e.target.value)}
                      className="sheet-sub-input"
                    />
                  </div>
                </div>
              )}

              {/* 뉘앙스 / 상세 설명 */}
              <div className="form-group">
                <label className="form-label">
                  {addType === 'word' ? '친절한 뉘앙스 풀이' : addType === 'grammar' ? '문법 패턴 설명' : '숙어 뜻 & 대화 맥락'}
                </label>
                <textarea 
                  rows={2}
                  placeholder={
                    addType === 'word' 
                      ? '어떤 상황에서 원어민들이 주로 사용하는지 뉘앙스를 적어보세요.' 
                      : addType === 'grammar' 
                      ? '이 문법이 쓰이는 원리와 핵심 규칙을 설명해주세요.' 
                      : '이 표현이 쓰이는 실제 회화 상황과 정확한 한국어 뜻을 적어보세요.'
                  }
                  value={addNuance}
                  onChange={(e) => setAddNuance(e.target.value)}
                  className="sheet-textarea"
                />
              </div>

              {/* 예문 (선택) */}
              <div className="form-group">
                <label className="form-label">나만의 예문 (선택)</label>
                <input 
                  type="text" 
                  placeholder="예: She remained resilient despite many challenges." 
                  value={addSentence}
                  onChange={(e) => setAddSentence(e.target.value)}
                  className="sheet-sub-input"
                />
              </div>

              {/* 하단 버튼 바 */}
              <div className="sheet-actions-row">
                <button 
                  type="button" 
                  className="sheet-cancel-btn"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="sheet-submit-btn"
                >
                  서재에 저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
