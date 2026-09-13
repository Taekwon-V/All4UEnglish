import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlayCircle, Plus, Bookmark, Volume2, 
  Trash2, FolderPlus, Check, ChevronRight, Headphones, 
  CheckCircle2, RotateCcw, Search, Sparkles, BookOpen,
  Calendar, Tag, ChevronDown, ChevronUp, ArrowUpDown, X,
  Wand2, Layers, Edit3, AlertCircle, RefreshCw
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { SpeechService } from '../../services/speech';
import { GeminiService } from '../../services/gemini';
import './SentenceManager.css';

export default function SentenceManager({ onPlayPlaylist }) {
  // 메인 3단 세그먼트: 'learning' (학습 중) | 'mastered' (학습 완료) | 'playlists' (플레이리스트)
  const [activeSection, setActiveSection] = useState('learning');
  
  const [sentences, setSentences] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [words, setWords] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [idioms, setIdioms] = useState([]);

  // 서재 학습자산 AI 추출 로딩 상태 ({ [sentenceId]: boolean }) 및 토스트
  const [extractingMap, setExtractingMap] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  
  // 아코디언 펼침 상태 관리 ({ [id]: boolean })
  const [expandedIds, setExpandedIds] = useState({});

  // 4단 핵심 필터 모드: 'all' (전체) | 'bookmarked' (북마크) | 'tag' (주제별) | 'date' (날짜별)
  const [filterMode, setFilterMode] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all'); // 특정 주제 선택 ('all' 또는 주제명)
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'oldest' | 'alpha'
  const [searchQuery, setSearchQuery] = useState('');

  // 새 주제 인라인 입력 상태 ({ [sentenceId]: string })
  const [newTagInputs, setNewTagInputs] = useState({});

  // AI 파생 예문 로딩 및 결과 ({ [sentenceId]: { loading: boolean, variations: [] } })
  const [variationsState, setVariationsState] = useState({});

  // 플레이리스트 생성 모달
  const [isCreatingPl, setIsCreatingPl] = useState(false);
  const [newPlTitle, setNewPlTitle] = useState('');
  const [newPlDesc, setNewPlDesc] = useState('');
  const [newPlTopic, setNewPlTopic] = useState('');

  // 문장 -> 플레이리스트 담기 모달
  const [targetSentenceForPl, setTargetSentenceForPl] = useState(null);

  // 문장 수정 및 AI 문법 점검 모달 상태
  const [editingSentence, setEditingSentence] = useState(null);
  const [editForm, setEditForm] = useState({ text: '', translation: '', tags: [] });
  const [newTagInputForEdit, setNewTagInputForEdit] = useState('');
  const [grammarCheckState, setGrammarCheckState] = useState({ loading: false, result: null });
  const [isTranslatingEdit, setIsTranslatingEdit] = useState(false);

  const loadData = () => {
    setSentences(StorageService.getSentences());
    setPlaylists(StorageService.getPlaylists());
    setWords(StorageService.getWords());
    setGrammar(StorageService.getGrammar());
    setIdioms(StorageService.getIdioms());
  };

  useEffect(() => {
    loadData();
  }, []);

  // 전체 문장에서 사용자가 등록한 모든 고유 주제(태그) 목록 추출
  const allExistingTopics = useMemo(() => {
    const set = new Set();
    sentences.forEach(s => {
      if (Array.isArray(s.tags)) {
        s.tags.forEach(t => {
          const clean = t.replace(/^#/, '').trim();
          if (clean) set.add(clean);
        });
      }
    });
    const hasUntagged = sentences.some(s => !s.tags || !Array.isArray(s.tags) || s.tags.length === 0);
    if (hasUntagged) {
      set.add('주제없음');
    }
    return Array.from(set);
  }, [sentences]);

  // 특정 주제(태그)에 해당하는 문장 목록 반환 헬퍼
  const getSentencesByTopic = (topic) => {
    return sentences.filter(s => {
      if (topic === '주제없음') {
        return !s.tags || !Array.isArray(s.tags) || s.tags.length === 0;
      }
      const tags = Array.isArray(s.tags) ? s.tags.map(t => t.replace(/^#/, '').trim()) : [];
      return tags.includes(topic);
    });
  };

  // 학습 중 vs 학습 완료 분리
  const currentBaseSentences = useMemo(() => {
    return sentences.filter(s => activeSection === 'learning' ? s.status !== 'mastered' : s.status === 'mastered');
  }, [sentences, activeSection]);

  // 검색 및 필터링 적용
  const filteredSentences = useMemo(() => {
    return currentBaseSentences.filter(s => {
      // 1. 검색어 필터
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        s.text.toLowerCase().includes(q) || 
        (s.translation && s.translation.toLowerCase().includes(q));

      // 2. 모드별 필터
      if (filterMode === 'bookmarked') {
        return matchSearch && !!s.isBookmarked;
      }
      if (filterMode === 'tag' && selectedTopic !== 'all') {
        const currentTags = (Array.isArray(s.tags) && s.tags.length > 0)
          ? s.tags.map(t => t.replace(/^#/, '').trim())
          : ['주제없음'];
        const hasTopic = currentTags.includes(selectedTopic);
        return matchSearch && hasTopic;
      }
      return matchSearch;
    });
  }, [currentBaseSentences, searchQuery, filterMode, selectedTopic]);

  // 정렬 적용 (최신순 / 오래된순 / 알파벳순)
  const sortedSentences = useMemo(() => {
    const list = [...filteredSentences];
    if (sortBy === 'latest') {
      return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    if (sortBy === 'oldest') {
      return list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
    if (sortBy === 'alpha') {
      return list.sort((a, b) => a.text.localeCompare(b.text));
    }
    return list;
  }, [filteredSentences, sortBy]);

  // 날짜 그룹핑 헬퍼
  const getDateGroupKey = (isoString) => {
    if (!isoString) return '이전 보관 문장';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '이전 보관 문장';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return '오늘 담은 문장 🌟';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return '어제 담은 문장 🌤️';
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  };

  // 날짜별 그룹 계층 데이터
  const dateGroupedData = useMemo(() => {
    if (filterMode !== 'date') return null;
    const map = {};
    sortedSentences.forEach(s => {
      const key = getDateGroupKey(s.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return Object.keys(map).map(key => ({
      title: key,
      items: map[key]
    }));
  }, [sortedSentences, filterMode]);

  // 아코디언 토글
  const toggleExpand = (id) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 날짜 포맷 (YY.MM)
  const formatShortMonth = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yy}.${mm}`;
  };

  // 전체 날짜 포맷 (YYYY.MM.DD)
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  // 발음 듣기
  const handleSpeak = (text, e) => {
    if (e) e.stopPropagation();
    SpeechService.speak(text, { lang: 'en-US' });
  };

  // 학습 완료로 전환
  const handleMarkAsMastered = (id, e) => {
    if (e) e.stopPropagation();
    const updated = StorageService.setSentenceStatus(id, 'mastered');
    setSentences(updated);
  };

  // 다시 학습 중으로 전환
  const handleMarkAsLearning = (id, e) => {
    if (e) e.stopPropagation();
    const updated = StorageService.setSentenceStatus(id, 'learning');
    setSentences(updated);
  };

  // 북마크 토글
  const handleToggleBookmark = (id, e) => {
    if (e) e.stopPropagation();
    const updated = StorageService.toggleSentenceBookmark(id);
    setSentences(updated);
  };

  // 문장 삭제
  const handleDeleteSentence = (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('이 문장을 보관함에서 완전히 삭제하시겠습니까?')) {
      const updated = StorageService.deleteSentence(id);
      setSentences(updated);
    }
  };

  // 문장에 주제(태그) 추가
  const handleAddTag = (sentenceId, newTagText) => {
    const cleanTag = (newTagText || '').replace(/^#/, '').trim();
    if (!cleanTag) return;
    const target = sentences.find(s => s.id === sentenceId);
    if (!target) return;
    let currentTags = Array.isArray(target.tags) ? target.tags.map(t => t.replace(/^#/, '').trim()) : [];
    currentTags = currentTags.filter(t => t !== '주제없음');
    if (!currentTags.includes(cleanTag)) {
      currentTags.push(cleanTag);
      const updated = StorageService.updateSentence(sentenceId, { tags: currentTags });
      setSentences(updated);
    }
    setNewTagInputs(prev => ({ ...prev, [sentenceId]: '' }));
  };

  // 문장에서 주제(태그) 제거
  const handleRemoveTag = (sentenceId, tagToRemove) => {
    const target = sentences.find(s => s.id === sentenceId);
    if (!target) return;
    let currentTags = Array.isArray(target.tags) ? target.tags.map(t => t.replace(/^#/, '').trim()) : [];
    currentTags = currentTags.filter(t => t !== tagToRemove.replace(/^#/, '').trim());
    if (currentTags.length === 0) {
      currentTags = ['주제없음'];
    }
    const updated = StorageService.updateSentence(sentenceId, { tags: currentTags });
    setSentences(updated);
  };

  // AI 파생 예문 생성
  const handleGenerateVariations = async (sentence) => {
    const sId = sentence.id;
    setVariationsState(prev => ({
      ...prev,
      [sId]: { loading: true, variations: [] }
    }));
    try {
      const vars = await GeminiService.generateVariations('word', { word: sentence.text }, sentence.text);
      setVariationsState(prev => ({
        ...prev,
        [sId]: { loading: false, variations: vars || [] }
      }));
    } catch {
      setVariationsState(prev => ({
        ...prev,
        [sId]: { loading: false, variations: [] }
      }));
    }
  };

  // 특정 주제로 플레이리스트 생성 모달 열기
  const handleOpenCreateModalWithTopic = (topic) => {
    const matching = getSentencesByTopic(topic);
    setNewPlTopic(topic);
    setNewPlTitle(`[#${topic}] 문장 모음`);
    setNewPlDesc(`${topic} 주제 문장 (${matching.length.toLocaleString()}개)`);
    setIsCreatingPl(true);
  };

  // 모달 내 주제 선택 변경 시
  const handleTopicSelectInModal = (topic) => {
    setNewPlTopic(topic);
    if (topic) {
      const cnt = getSentencesByTopic(topic).length;
      if (!newPlTitle || newPlTitle.startsWith('[#')) {
        setNewPlTitle(`[#${topic}] 문장 모음`);
      }
      if (!newPlDesc || newPlDesc.includes('주제 문장')) {
        setNewPlDesc(`${topic} 주제 문장 (${cnt.toLocaleString()}개)`);
      }
    }
  };

  // 플레이리스트 생성
  const handleCreatePlaylist = () => {
    if (!newPlTitle.trim()) return;

    let sentenceIds = [];
    if (newPlTopic) {
      sentenceIds = getSentencesByTopic(newPlTopic).map(s => s.id);
    }

    StorageService.savePlaylist({
      title: newPlTitle.trim(),
      description: newPlDesc.trim() || (newPlTopic ? `${newPlTopic} 주제 문장 모음` : '맞춤형 문장 플레이리스트'),
      sentenceIds
    });

    setToastMessage(`🎉 '${newPlTitle.trim()}' 플레이리스트가 생성되었습니다! (${sentenceIds.length.toLocaleString()}개 문장 담김)`);
    setTimeout(() => setToastMessage(null), 3000);

    setNewPlTitle('');
    setNewPlDesc('');
    setNewPlTopic('');
    setIsCreatingPl(false);
    loadData();
    setActiveSection('playlists');
  };

  // 플레이리스트에 담기
  const handleAddSentenceToPlaylist = (playlistId) => {
    if (!targetSentenceForPl) return;
    StorageService.addSentenceToPlaylist(playlistId, targetSentenceForPl.id);
    setTargetSentenceForPl(null);
    loadData();
  };

  // 플레이리스트 삭제
  const handleDeletePlaylist = (id) => {
    if (window.confirm('이 플레이리스트를 삭제하시겠습니까?')) {
      StorageService.deletePlaylist(id);
      loadData();
    }
  };

  // 문장 수정 모달 열기
  const handleStartEdit = (sentence) => {
    setEditingSentence(sentence);
    const tags = Array.isArray(sentence.tags)
      ? sentence.tags.map(t => t.replace(/^#/, '').trim()).filter(Boolean)
      : [];
    setEditForm({
      text: sentence.text || '',
      translation: sentence.translation || '',
      tags: tags
    });
    setNewTagInputForEdit('');
    setGrammarCheckState({ loading: false, result: null });
  };

  // 문장 수정 모달 닫기
  const handleCloseEdit = () => {
    setEditingSentence(null);
    setGrammarCheckState({ loading: false, result: null });
  };

  // 문장 수정 내용 저장
  const handleSaveEdit = () => {
    if (!editingSentence) return;
    if (!editForm.text.trim()) {
      alert('영어 문장을 입력해주세요.');
      return;
    }

    const updatedTags = editForm.tags.map(t => `#${t.replace(/^#/, '').trim()}`);
    StorageService.updateSentence(editingSentence.id, {
      text: editForm.text.trim(),
      translation: editForm.translation.trim(),
      tags: updatedTags
    });

    setToastMessage('🎉 문장이 성공적으로 수정되었습니다!');
    setTimeout(() => setToastMessage(null), 3000);
    handleCloseEdit();
    loadData();
  };

  // AI 문법 및 표현 점검 실행
  const handleRunGrammarCheck = async () => {
    if (!editForm.text.trim()) {
      alert('점검할 영어 문장을 입력해주세요.');
      return;
    }
    setGrammarCheckState({ loading: true, result: null });
    try {
      const res = await GeminiService.checkGrammarAndPolish(editForm.text.trim());
      setGrammarCheckState({ loading: false, result: res });
    } catch {
      setGrammarCheckState({
        loading: false,
        result: {
          status: 'error',
          explanation: 'AI 점검에 실패했습니다. 다시 시도해주세요.'
        }
      });
    }
  };

  // AI 교정문 입력창에 원클릭 적용
  const handleApplyCorrection = () => {
    if (!grammarCheckState.result || !grammarCheckState.result.correctedText) return;
    const { correctedText, translation } = grammarCheckState.result;
    setEditForm(prev => ({
      ...prev,
      text: correctedText,
      translation: translation ? translation : prev.translation
    }));
    setToastMessage('⚡ 교정된 문장이 입력창에 적용되었습니다!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 수정 모달 내 번역 자동 생성
  const handleAutoTranslateEdit = async () => {
    if (!editForm.text.trim()) return;
    setIsTranslatingEdit(true);
    try {
      const ko = await GeminiService.quickTranslate(editForm.text.trim());
      if (ko) {
        setEditForm(prev => ({ ...prev, translation: ko }));
      }
    } finally {
      setIsTranslatingEdit(false);
    }
  };

  // 수정 모달 내 태그 삭제
  const handleRemoveTagInEdit = (tagToRemove) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  // 수정 모달 내 새 태그 추가
  const handleAddTagInEdit = () => {
    const clean = newTagInputForEdit.replace(/^#/, '').trim();
    if (!clean) return;
    if (!editForm.tags.includes(clean)) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, clean]
      }));
    }
    setNewTagInputForEdit('');
  };

  // 문장과 연결된 서재 학습 자산 (단어, 문법, 숙어) 필터링
  const getLinkedAssets = (sentenceItem) => {
    const sId = sentenceItem.id;
    const sText = (sentenceItem.text || '').trim().toLowerCase();
    const sOrig = (sentenceItem.originalText || '').trim().toLowerCase();

    const linkedWords = words.filter(w => {
      if (w.sentenceId && w.sentenceId === sId) return true;
      if (w.originalSentence) {
        const orig = w.originalSentence.trim().toLowerCase();
        if (orig === sText || orig === sOrig) return true;
      }
      if (w.word && w.word.length >= 2) {
        try {
          const regex = new RegExp(`\\b${w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(sentenceItem.text) || (sentenceItem.originalText && regex.test(sentenceItem.originalText))) return true;
        } catch {}
      }
      return false;
    });

    const linkedGrammar = grammar.filter(g => {
      if (g.sentenceId && g.sentenceId === sId) return true;
      if (g.originalSentence) {
        const orig = g.originalSentence.trim().toLowerCase();
        if (orig === sText || orig === sOrig) return true;
      }
      return false;
    });

    const linkedIdioms = idioms.filter(i => {
      if (i.sentenceId && i.sentenceId === sId) return true;
      if (i.originalSentence) {
        const orig = i.originalSentence.trim().toLowerCase();
        if (orig === sText || orig === sOrig) return true;
      }
      if (i.idiom && i.idiom.length >= 2) {
        if (sText.includes(i.idiom.trim().toLowerCase()) || sOrig.includes(i.idiom.trim().toLowerCase())) return true;
      }
      return false;
    });

    return { linkedWords, linkedGrammar, linkedIdioms };
  };

  // 문장에서 AI 단어·문법·숙어 추출 및 서재 자동 등록
  const handleExtractAssets = async (sentenceItem) => {
    const sId = sentenceItem.id;
    setExtractingMap(prev => ({ ...prev, [sId]: true }));
    try {
      const result = await GeminiService.discoverFromSentence(sentenceItem.text);
      if (result) {
        let addedCount = 0;
        // 1. 단어 저장
        if (Array.isArray(result.words)) {
          result.words.forEach(w => {
            let dictMeanings = w.dictionaryMeanings;
            if (!Array.isArray(dictMeanings) || dictMeanings.length === 0) {
              const fallback = w.meaningKo || w.nuanceKo || '';
              dictMeanings = fallback ? fallback.split(/[,/·\n]/).map(s => s.trim()).filter(Boolean) : [];
              if (dictMeanings.length === 0) dictMeanings = [w.word];
            }
            StorageService.saveWord({
              word: w.word,
              phonetic: w.phonetic || '',
              partOfSpeech: w.partOfSpeech || '단어',
              dictionaryMeanings: dictMeanings.slice(0, 3),
              nuanceKo: w.nuanceKo || dictMeanings.join(', '),
              originalSentence: sentenceItem.text,
              sentenceId: sId,
              status: 'learning'
            });
            addedCount++;
          });
        }
        // 2. 문법 패턴 저장
        if (result.suggestedGrammar?.pattern) {
          StorageService.saveGrammar({
            pattern: result.suggestedGrammar.pattern,
            tag: result.suggestedGrammar.tag || '#문법패턴',
            explanation: result.suggestedGrammar.explanation || '',
            originalSentence: sentenceItem.text,
            sentenceId: sId,
            status: 'learning'
          });
          addedCount++;
        }
        // 3. 숙어 저장
        if (Array.isArray(result.idioms)) {
          result.idioms.forEach(i => {
            StorageService.saveIdiom({
              idiom: i.idiom,
              meaning: i.meaning,
              originalSentence: sentenceItem.text,
              sentenceId: sId,
              status: 'learning'
            });
            addedCount++;
          });
        }
        loadData();
        setToastMessage(`✨ 단어·문법·숙어가 추출되어 서재에 연결되었습니다! (${addedCount}개)`);
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch (e) {
      console.error('추출 실패:', e);
      setToastMessage('단어·문법·숙어 추출 중 오류가 발생했습니다.');
      setTimeout(() => setToastMessage(null), 2500);
    } finally {
      setExtractingMap(prev => ({ ...prev, [sId]: false }));
    }
  };

  // 연결된 서재 자산 학습 상태 토글
  const handleToggleAssetStatus = (type, assetId, currentStatus) => {
    const nextStatus = currentStatus === 'mastered' ? 'learning' : 'mastered';
    if (type === 'word') {
      StorageService.setWordStatus(assetId, nextStatus);
    } else if (type === 'grammar') {
      StorageService.setGrammarStatus(assetId, nextStatus);
    } else if (type === 'idiom') {
      StorageService.setIdiomStatus(assetId, nextStatus);
    }
    loadData();
  };

  // 개별 문장 아코디언 카드 렌더러
  const renderSentenceRow = (item) => {
    const isExpanded = !!expandedIds[item.id];
    const shortMonth = formatShortMonth(item.createdAt);
    const dateDisplay = formatDate(item.createdAt);
    const tagList = (Array.isArray(item.tags) && item.tags.length > 0)
      ? item.tags.map(t => t.replace(/^#/, '').trim())
      : ['주제없음'];
    const unusedTopics = allExistingTopics.filter(t => t !== '주제없음' && !tagList.includes(t));
    const varData = variationsState[item.id];
    const { linkedWords, linkedGrammar, linkedIdioms } = getLinkedAssets(item);
    const isExtractingAssets = !!extractingMap[item.id];

    return (
      <div key={item.id} className={`sentence-accordion-item ${isExpanded ? 'is-open' : ''}`}>
        {/* 컴팩트 2줄 요약 행 */}
        <div className="sentence-summary-row" onClick={() => toggleExpand(item.id)}>
          {/* 1행: 영어 문장 + 발음 버튼 */}
          <div className="sentence-line-1">
            <span className="sentence-en-text">{item.text}</span>
            <button 
              type="button" 
              className="sentence-mini-voice-btn" 
              title="발음 듣기"
              onClick={(e) => handleSpeak(item.text, e)}
            >
              <Volume2 size={16} />
            </button>
          </div>

          {/* 2행: 한국어 번역 + 생성월 + 북마크 + 화살표 */}
          <div className="sentence-line-2">
            <span className="sentence-ko-text">{item.translation}</span>
            <div className="sentence-meta-col">
              {shortMonth && (
                <span className="sentence-month-chip" title={`등록일: ${dateDisplay}`}>
                  {shortMonth}
                </span>
              )}
              <button 
                type="button" 
                className={`sentence-mini-bookmark ${item.isBookmarked ? 'active' : ''}`}
                title="북마크 토글"
                onClick={(e) => handleToggleBookmark(item.id, e)}
              >
                <Bookmark size={14} fill={item.isBookmarked ? '#f59e0b' : 'none'} color={item.isBookmarked ? '#f59e0b' : '#94a3b8'} />
              </button>
              <span className="sentence-chevron-icon">
                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </span>
            </div>
          </div>
        </div>

        {/* 아코디언 세부 제어판 (펼쳤을 때) */}
        {isExpanded && (
          <div className="sentence-expanded-panel">
            {/* 상단 액션 바: 상태 변경, 플레이리스트, 삭제 */}
            <div className="expanded-top-actions">
              {activeSection === 'learning' ? (
                <button 
                  type="button" 
                  className="exp-action-btn master-btn"
                  onClick={(e) => handleMarkAsMastered(item.id, e)}
                >
                  <Check size={14} />
                  <span>외웠어요 (학습 완료)</span>
                </button>
              ) : (
                <button 
                  type="button" 
                  className="exp-action-btn review-btn"
                  onClick={(e) => handleMarkAsLearning(item.id, e)}
                >
                  <RotateCcw size={13} />
                  <span>다시 학습하기</span>
                </button>
              )}

              <button 
                type="button" 
                className="exp-action-btn edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(item);
                }}
                title="문장 수정 및 AI 문법 점검"
              >
                <Edit3 size={13} />
                <span>문장 수정</span>
              </button>

              <button 
                type="button" 
                className="exp-action-btn playlist-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetSentenceForPl(item);
                }}
              >
                <Plus size={14} />
                <span>플레이리스트 담기</span>
              </button>

              <button 
                type="button" 
                className="exp-action-btn delete-btn"
                onClick={(e) => handleDeleteSentence(item.id, e)}
                title="문장 삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* 연결된 서재 학습 자산 (추출된 단어 · 문법 · 숙어) */}
            <div className="sentence-linked-assets-section">
              <div className="assets-section-top">
                <div className="assets-title-wrap">
                  <Layers size={14} color="#059669" />
                  <span className="assets-section-title">연결된 서재 학습 자산</span>
                </div>
                <button 
                  type="button" 
                  className="extract-assets-btn"
                  onClick={() => handleExtractAssets(item)}
                  disabled={isExtractingAssets}
                  title="AI로 이 문장에서 단어, 문법, 숙어를 추출하여 서재에 자동 연결"
                >
                  <Wand2 size={12} />
                  <span>{isExtractingAssets ? 'AI 추출 중...' : '✨ AI 단어·숙어·문법 추출'}</span>
                </button>
              </div>

              {/* 1. 추출된 단어 목록 */}
              {linkedWords.length > 0 && (
                <div className="asset-category-block">
                  <span className="asset-cat-label">📖 단어장 ({linkedWords.length})</span>
                  <div className="asset-items-wrap">
                    {linkedWords.map(w => {
                      const isMastered = w.status === 'mastered';
                      const meaningsStr = Array.isArray(w.dictionaryMeanings) && w.dictionaryMeanings.length > 0
                        ? w.dictionaryMeanings.join(', ')
                        : w.nuanceKo || '';
                      return (
                        <div key={w.id} className={`asset-badge-card ${isMastered ? 'mastered' : ''}`}>
                          <div className="badge-term-row">
                            <strong className="term-text">{w.word}</strong>
                            <button 
                              type="button" 
                              className="badge-speak-btn"
                              onClick={() => handleSpeak(w.word)}
                              title="발음 듣기"
                            >
                              <Volume2 size={12} />
                            </button>
                          </div>
                          {meaningsStr && <span className="badge-meaning-text">{meaningsStr}</span>}
                          <button 
                            type="button" 
                            className={`badge-status-toggle ${isMastered ? 'done' : 'learning'}`}
                            onClick={() => handleToggleAssetStatus('word', w.id, w.status)}
                            title="학습 상태 변경"
                          >
                            {isMastered ? '외움 ✓' : '학습중'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. 추출된 문법 패턴 목록 */}
              {linkedGrammar.length > 0 && (
                <div className="asset-category-block">
                  <span className="asset-cat-label">🪪 문법장 ({linkedGrammar.length})</span>
                  <div className="asset-items-wrap">
                    {linkedGrammar.map(g => {
                      const isMastered = g.status === 'mastered';
                      return (
                        <div key={g.id} className={`asset-badge-card ${isMastered ? 'mastered' : ''}`}>
                          <div className="badge-term-row">
                            <strong className="term-text">{g.pattern}</strong>
                          </div>
                          {g.explanation && <span className="badge-meaning-text">{g.explanation}</span>}
                          <button 
                            type="button" 
                            className={`badge-status-toggle ${isMastered ? 'done' : 'learning'}`}
                            onClick={() => handleToggleAssetStatus('grammar', g.id, g.status)}
                            title="학습 상태 변경"
                          >
                            {isMastered ? '외움 ✓' : '학습중'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. 추출된 숙어 목록 */}
              {linkedIdioms.length > 0 && (
                <div className="asset-category-block">
                  <span className="asset-cat-label">🔖 숙어장 ({linkedIdioms.length})</span>
                  <div className="asset-items-wrap">
                    {linkedIdioms.map(i => {
                      const isMastered = i.status === 'mastered';
                      return (
                        <div key={i.id} className={`asset-badge-card ${isMastered ? 'mastered' : ''}`}>
                          <div className="badge-term-row">
                            <strong className="term-text">{i.idiom}</strong>
                            <button 
                              type="button" 
                              className="badge-speak-btn"
                              onClick={() => handleSpeak(i.idiom)}
                              title="발음 듣기"
                            >
                              <Volume2 size={12} />
                            </button>
                          </div>
                          {i.meaning && <span className="badge-meaning-text">{i.meaning}</span>}
                          <button 
                            type="button" 
                            className={`badge-status-toggle ${isMastered ? 'done' : 'learning'}`}
                            onClick={() => handleToggleAssetStatus('idiom', i.id, i.status)}
                            title="학습 상태 변경"
                          >
                            {isMastered ? '외움 ✓' : '학습중'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 아직 아무것도 연결되지 않은 경우 안내 */}
              {linkedWords.length === 0 && linkedGrammar.length === 0 && linkedIdioms.length === 0 && (
                <div className="empty-assets-box">
                  <span>아직 이 문장에서 추출된 서재 항목이 없습니다.</span>
                  <span className="empty-assets-hint">상단의 [✨ AI 단어·숙어·문법 추출]을 누르면 즉시 분석되어 서재와 자동 연결됩니다.</span>
                </div>
              )}
            </div>

            {/* 주제(태그) 관리 섹션: 군더더기 텍스트 제거 및 직관적 선택/추가 */}
            <div className="sentence-topic-manager">
              <div className="topic-header-simple">
                <div className="topic-header-left">
                  <Tag size={13} color="#64748b" />
                  <span className="topic-simple-title">주제:</span>
                </div>
                <div className="current-tags-wrap">
                  {tagList.map((tag, tIdx) => {
                    const isDefault = tag === '주제없음';
                    return (
                      <span key={tIdx} className={`topic-pill ${isDefault ? 'default' : 'current'}`}>
                        #{tag}
                        {!isDefault && (
                          <button 
                            type="button" 
                            className="tag-remove-btn" 
                            onClick={() => handleRemoveTag(item.id, tag)}
                            title="삭제"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 기존 사용한 주제 원클릭 선택 (있을 때만) */}
              {unusedTopics.length > 0 && (
                <div className="topic-chip-picker">
                  {unusedTopics.map(t => (
                    <button 
                      key={t}
                      type="button" 
                      className="topic-pill selectable"
                      onClick={() => handleAddTag(item.id, t)}
                    >
                      + #{t}
                    </button>
                  ))}
                </div>
              )}

              {/* 새 주제 직접 추가 인라인 인풋 */}
              <div className="new-tag-input-row">
                <input 
                  type="text" 
                  placeholder="새 주제 입력..."
                  value={newTagInputs[item.id] || ''}
                  onChange={(e) => setNewTagInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(item.id, newTagInputs[item.id]);
                    }
                  }}
                  className="tag-add-input"
                />
                <button 
                  type="button" 
                  className="tag-add-btn"
                  onClick={() => handleAddTag(item.id, newTagInputs[item.id])}
                >
                  추가
                </button>
              </div>
            </div>

            {/* AI 실생활 파생 예문 섹션 */}
            <div className="sentence-variations-section">
              <div className="variations-header">
                <button 
                  type="button" 
                  className="generate-vars-btn"
                  onClick={() => handleGenerateVariations(item)}
                  disabled={varData?.loading}
                >
                  <Sparkles size={13} />
                  <span>{varData?.loading ? 'AI 실생활 파생 예문 만드는 중...' : '✨ 실생활 파생 예문 3개 생성'}</span>
                </button>
              </div>

              {varData?.variations && varData.variations.length > 0 && (
                <div className="vars-result-list">
                  {varData.variations.map((v, vIdx) => (
                    <div key={vIdx} className="var-item-card">
                      <div className="var-en-row">
                        <span className="var-en">{v.en}</span>
                        <button 
                          type="button" 
                          className="var-voice-btn" 
                          onClick={() => handleSpeak(v.en)}
                          title="예문 듣기"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                      <span className="var-ko">{v.ko}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const totalSentencesCount = sentences.length;
  const masteredCount = sentences.filter(s => s.status === 'mastered').length;
  const progressPercent = totalSentencesCount > 0 ? Math.round((masteredCount / totalSentencesCount) * 100) : 0;

  return (
    <div className="sentence-manager-container">
      {toastMessage && (
        <div className="sentence-toast-bubble animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* 1. 상단 3단 메인 세그먼트 (상단 여백 및 탭 디자인 통일) */}
      <div className="sentence-sticky-header">
        <div className="section-segment-bar">
          <button 
            type="button" 
            className={`segment-btn ${activeSection === 'learning' ? 'active' : ''}`}
            onClick={() => setActiveSection('learning')}
          >
            <BookOpen size={15} />
            <span>학습 중 ({sentences.filter(s => s.status !== 'mastered').length})</span>
          </button>

          <button 
            type="button" 
            className={`segment-btn ${activeSection === 'mastered' ? 'active' : ''}`}
            onClick={() => setActiveSection('mastered')}
          >
            <CheckCircle2 size={15} />
            <span>학습 완료 ({masteredCount})</span>
          </button>

          <button 
            type="button" 
            className={`segment-btn ${activeSection === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveSection('playlists')}
          >
            <FolderPlus size={15} />
            <span>플레이리스트 ({playlists.length})</span>
          </button>
        </div>
      </div>

      {/* 학습 진척도 게이지 바 */}
      {activeSection !== 'playlists' && totalSentencesCount > 0 && (
        <div className="learning-progress-card">
          <div className="progress-label-row">
            <span>누적 학습 진척도</span>
            <strong>{masteredCount} / {totalSentencesCount} 문장 ({progressPercent}%)</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* 학습 중 또는 학습 완료 탭 화면 */}
      {(activeSection === 'learning' || activeSection === 'mastered') && (
        <div className="sentences-tab-content">
          {/* 실시간 검색창 */}
          <div className="sentence-search-box">
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="문장 또는 번역 실시간 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          {/* 4단 핵심 필터 모드: [전체] [⭐ 북마크] [🏷️ 주제별] [📅 날짜별] + 정렬 셀렉터 */}
          <div className="filter-and-sort-bar">
            <div className="filter-mode-buttons">
              <button 
                type="button" 
                className={`mode-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => { setFilterMode('all'); setSelectedTopic('all'); }}
              >
                전체
              </button>
              <button 
                type="button" 
                className={`mode-btn ${filterMode === 'bookmarked' ? 'active' : ''}`}
                onClick={() => setFilterMode('bookmarked')}
              >
                ⭐ 북마크
              </button>
              <button 
                type="button" 
                className={`mode-btn ${filterMode === 'tag' ? 'active' : ''}`}
                onClick={() => setFilterMode('tag')}
              >
                🏷️ 주제별
              </button>
              <button 
                type="button" 
                className={`mode-btn ${filterMode === 'date' ? 'active' : ''}`}
                onClick={() => setFilterMode('date')}
              >
                📅 날짜별
              </button>
            </div>

            {/* 정렬 드롭다운 (최신순 / 오래된순 / 알파벳순) */}
            <div className="sort-selector-wrap">
              <ArrowUpDown size={12} color="#64748b" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-dropdown"
              >
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="alpha">알파벳순</option>
              </select>
            </div>
          </div>

          {/* 주제별 모드일 때: 내가 등록/사용한 주제 목록 칩 필터 */}
          {filterMode === 'tag' && (
            <>
              <div className="topic-filter-chips-row">
                <button 
                  type="button" 
                  className={`topic-filter-chip ${selectedTopic === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedTopic('all')}
                >
                  전체 주제
                </button>
                {allExistingTopics.length === 0 ? (
                  <span className="no-topic-chip-msg">등록된 주제가 없습니다. 문장을 펼쳐 주제를 추가해보세요!</span>
                ) : (
                  allExistingTopics.map(t => (
                    <button 
                      key={t}
                      type="button" 
                      className={`topic-filter-chip ${selectedTopic === t ? 'active' : ''}`}
                      onClick={() => setSelectedTopic(t)}
                    >
                      #{t}
                    </button>
                  ))
                )}
              </div>

              {selectedTopic !== 'all' && (
                <div className="topic-action-banner">
                  <div className="topic-action-text">
                    <Tag size={14} color="#059669" />
                    <span>
                      <strong>#{selectedTopic}</strong> 주제 ({getSentencesByTopic(selectedTopic).length.toLocaleString()}문장)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="topic-create-pl-btn"
                    onClick={() => handleOpenCreateModalWithTopic(selectedTopic)}
                  >
                    <Headphones size={14} />
                    <span>이 주제로 플레이리스트 생성</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* 문장 아코디언 리스트 */}
          <div className="sentence-accordion-list">
            {sortedSentences.length === 0 ? (
              <div className="empty-state-box">
                <p>
                  {activeSection === 'learning' 
                    ? '학습 중인 문장이 없습니다. [추천 문장담기]에서 새로운 문장을 등록해보세요!' 
                    : '학습 완료된 문장이 없습니다. [학습 중] 탭에서 [외웠어요]를 체크해보세요!'}
                </p>
              </div>
            ) : filterMode === 'date' && dateGroupedData ? (
              dateGroupedData.map(group => (
                <div key={group.title} className="date-group-section">
                  <div className="date-group-header">
                    <Calendar size={13} color="#059669" />
                    <span className="date-group-title">{group.title}</span>
                    <span className="date-group-count">{group.items.length}문장</span>
                  </div>
                  <div className="date-group-items">
                    {group.items.map(renderSentenceRow)}
                  </div>
                </div>
              ))
            ) : (
              sortedSentences.map(renderSentenceRow)
            )}
          </div>
        </div>
      )}

      {/* 2. 플레이리스트 관리 탭 */}
      {activeSection === 'playlists' && (
        <div className="playlists-section">
          {/* 주제별 빠른 플레이리스트 생성 카드 */}
          {allExistingTopics.filter(t => t !== '주제없음').length > 0 && (
            <div className="quick-topic-pl-card">
              <div className="quick-topic-pl-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={15} color="#059669" />
                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>주제별 빠른 플레이리스트 생성</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>터치 시 해당 주제 전체로 생성</span>
              </div>
              <div className="quick-topic-chips-wrap">
                {allExistingTopics.filter(t => t !== '주제없음').map(t => {
                  const count = getSentencesByTopic(t).length;
                  return (
                    <button
                      key={t}
                      type="button"
                      className="quick-topic-create-chip"
                      onClick={() => handleOpenCreateModalWithTopic(t)}
                    >
                      <span>#{t}</span>
                      <span className="chip-badge">{count.toLocaleString()}개</span>
                      <Plus size={12} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="playlist-create-bar">
            <button 
              type="button" 
              className="create-pl-trigger-btn"
              onClick={() => {
                setNewPlTopic('');
                setNewPlTitle('');
                setNewPlDesc('');
                setIsCreatingPl(true);
              }}
            >
              <Plus size={16} />
              <span>새 플레이리스트 직접 만들기</span>
            </button>
          </div>

          <div className="playlists-grid">
            {playlists.length === 0 ? (
              <div className="empty-state-box">
                <p>생성된 플레이리스트가 없습니다. 나만의 맞춤 재생목록을 만들어보세요!</p>
              </div>
            ) : (
              playlists.map((pl) => {
                const plSentences = sentences.filter(s => pl.sentenceIds?.includes(s.id));
                return (
                  <div key={pl.id} className="playlist-card">
                    <div className="pl-card-top">
                      <h4>{pl.title}</h4>
                      <button 
                        type="button" 
                        className="pl-delete-btn"
                        onClick={() => handleDeletePlaylist(pl.id)}
                        title="플레이리스트 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="pl-desc">{pl.description}</p>
                    
                    <div className="pl-meta-row">
                      <span className="count-tag">{plSentences.length}개 문장 담김</span>
                    </div>

                    {plSentences.length > 0 && (
                      <div className="pl-preview-list">
                        {plSentences.slice(0, 3).map((item, idx) => (
                          <div key={item.id} className="pl-preview-item">
                            <span>{idx + 1}. {item.text}</span>
                          </div>
                        ))}
                        {plSentences.length > 3 && (
                          <span className="more-count">외 {plSentences.length - 3}개 더...</span>
                        )}
                      </div>
                    )}

                    <button 
                      type="button" 
                      className="pl-play-btn"
                      disabled={plSentences.length === 0}
                      onClick={() => onPlayPlaylist && onPlayPlaylist(pl)}
                    >
                      <Headphones size={16} />
                      <span>라디오로 반복 듣기</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 플레이리스트 신규 생성 모달 */}
      {isCreatingPl && (
        <div className="modal-backdrop">
          <div className="modal-sheet">
            <h3>🎧 새 플레이리스트 만들기</h3>
            <p className="modal-guide">산책할 때나 출퇴근할 때 반복해서 들을 맞춤형 문장 모음집입니다.</p>

            <div className="modal-field">
              <label className="modal-field-label">주제(태그) 선택하여 담기</label>
              <select
                value={newPlTopic}
                onChange={(e) => handleTopicSelectInModal(e.target.value)}
                className="modal-input modal-select"
              >
                <option value="">직접 담기 (빈 플레이리스트)</option>
                {allExistingTopics.filter(t => t !== '주제없음').map(t => {
                  const cnt = getSentencesByTopic(t).length;
                  return (
                    <option key={t} value={t}>
                      #{t} ({cnt.toLocaleString()}개 문장 전체)
                    </option>
                  );
                })}
              </select>
            </div>

            {newPlTopic && (
              <div className="topic-included-notice">
                <Check size={14} color="#059669" />
                <span>
                  <strong>#{newPlTopic}</strong> 주제의 <strong>{getSentencesByTopic(newPlTopic).length.toLocaleString()}개</strong> 문장이 자동으로 포함됩니다.
                </span>
              </div>
            )}

            <div className="modal-field">
              <label className="modal-field-label">플레이리스트 이름</label>
              <input 
                type="text" 
                placeholder="예: [#BUI] 문장 모음" 
                value={newPlTitle}
                onChange={(e) => setNewPlTitle(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label className="modal-field-label">설명 (선택)</label>
              <input 
                type="text" 
                placeholder="설명 (선택)" 
                value={newPlDesc}
                onChange={(e) => setNewPlDesc(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="modal-btn cancel" 
                onClick={() => {
                  setIsCreatingPl(false);
                  setNewPlTopic('');
                }}
              >
                취소
              </button>
              <button 
                type="button" 
                className="modal-btn submit" 
                onClick={handleCreatePlaylist}
                disabled={!newPlTitle.trim()}
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 문장을 플레이리스트에 담기 모달 */}
      {targetSentenceForPl && (
        <div className="modal-backdrop">
          <div className="modal-sheet">
            <h3>📂 플레이리스트 선택</h3>
            <p className="target-text-preview">"{targetSentenceForPl.text}"</p>
            <p className="modal-guide">이 문장을 어느 플레이리스트에 담을까요?</p>

            <div className="pl-select-list">
              {playlists.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>
                  등록된 플레이리스트가 없습니다. 먼저 플레이리스트를 만들어보세요!
                </p>
              ) : (
                playlists.map(pl => {
                  const alreadyIncluded = pl.sentenceIds?.includes(targetSentenceForPl.id);
                  return (
                    <button 
                      key={pl.id}
                      type="button" 
                      className={`pl-select-item ${alreadyIncluded ? 'included' : ''}`}
                      disabled={alreadyIncluded}
                      onClick={() => handleAddSentenceToPlaylist(pl.id)}
                    >
                      <div>
                        <strong>{pl.title}</strong>
                        <span className="sub">({pl.sentenceIds?.length || 0}개)</span>
                      </div>
                      {alreadyIncluded ? <Check size={16} color="#059669" /> : <ChevronRight size={16} />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="modal-btn cancel" onClick={() => setTargetSentenceForPl(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 문장 수정 및 AI 문법·표현 점검 모달 */}
      {editingSentence && (
        <div className="modal-backdrop">
          <div className="modal-sheet edit-sentence-sheet">
            <div className="edit-sheet-header">
              <div className="edit-sheet-title">
                <Edit3 size={18} color="#059669" />
                <h3>문장 수정 & AI 문법 점검</h3>
              </div>
              <button 
                type="button" 
                className="edit-close-x" 
                onClick={handleCloseEdit}
              >
                <X size={18} />
              </button>
            </div>

            {/* 영어 문장 입력 + AI 점검 트리거 */}
            <div className="modal-field">
              <div className="modal-field-header-row">
                <label className="modal-field-label">영어 문장</label>
                <button
                  type="button"
                  className="ai-grammar-trigger-btn"
                  onClick={handleRunGrammarCheck}
                  disabled={grammarCheckState.loading || !editForm.text.trim()}
                >
                  <Sparkles size={13} />
                  <span>{grammarCheckState.loading ? 'AI 점검 중...' : '✨ AI 문법·표현 점검'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                className="modal-input modal-textarea"
                value={editForm.text}
                onChange={(e) => {
                  setEditForm(prev => ({ ...prev, text: e.target.value }));
                  if (grammarCheckState.result) {
                    setGrammarCheckState({ loading: false, result: null });
                  }
                }}
                placeholder="영어 문장을 입력하세요"
              />
            </div>

            {/* AI 문법 진단 결과 카드 */}
            {grammarCheckState.result && (
              <div className={`grammar-result-card status-${grammarCheckState.result.status}`}>
                <div className="grammar-res-top">
                  {grammarCheckState.result.status === 'perfect' && (
                    <span className="grammar-badge perfect">
                      <CheckCircle2 size={14} /> 완벽하고 자연스러운 표현입니다!
                    </span>
                  )}
                  {grammarCheckState.result.status === 'grammar_error' && (
                    <span className="grammar-badge error">
                      <AlertCircle size={14} /> 문법 오류 교정 제안
                    </span>
                  )}
                  {grammarCheckState.result.status === 'polish_needed' && (
                    <span className="grammar-badge polish">
                      <Sparkles size={14} /> 더 자연스러운 원어민 표현 추천
                    </span>
                  )}
                </div>

                <p className="grammar-res-explanation">{grammarCheckState.result.explanation}</p>

                {grammarCheckState.result.status !== 'perfect' && grammarCheckState.result.correctedText && (
                  <div className="grammar-suggest-box">
                    <div className="suggest-text-row">
                      <span className="suggest-label">추천 문장:</span>
                      <span className="suggest-text">{grammarCheckState.result.correctedText}</span>
                    </div>
                    {grammarCheckState.result.translation && (
                      <span className="suggest-trans">{grammarCheckState.result.translation}</span>
                    )}
                    <button
                      type="button"
                      className="grammar-apply-btn"
                      onClick={handleApplyCorrection}
                    >
                      <Check size={13} />
                      <span>이 문장으로 바로 적용</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 한국어 번역 영역 + 자동 번역 생성 */}
            <div className="modal-field">
              <div className="modal-field-header-row">
                <label className="modal-field-label">한국어 번역</label>
                <button
                  type="button"
                  className="auto-translate-btn"
                  onClick={handleAutoTranslateEdit}
                  disabled={isTranslatingEdit || !editForm.text.trim()}
                  title="영어 문장을 분석하여 한국어로 번역합니다"
                >
                  <RefreshCw size={12} className={isTranslatingEdit ? 'spinning' : ''} />
                  <span>{isTranslatingEdit ? '번역 중...' : '번역 자동 생성'}</span>
                </button>
              </div>
              <input
                type="text"
                className="modal-input"
                value={editForm.translation}
                onChange={(e) => setEditForm(prev => ({ ...prev, translation: e.target.value }))}
                placeholder="한국어 해석을 입력하세요"
              />
            </div>

            {/* 주제(태그) 편집 영역 */}
            <div className="modal-field">
              <label className="modal-field-label">주제 태그</label>
              <div className="edit-tags-container">
                {editForm.tags.length === 0 ? (
                  <span className="no-edit-tags-hint">등록된 태그가 없습니다.</span>
                ) : (
                  editForm.tags.map(t => (
                    <span key={t} className="edit-tag-pill">
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTagInEdit(t)}
                        className="edit-tag-remove-x"
                        title="태그 삭제"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="edit-add-tag-row">
                <input
                  type="text"
                  className="modal-input edit-tag-input"
                  placeholder="새 태그 추가 (예: 여행)"
                  value={newTagInputForEdit}
                  onChange={(e) => setNewTagInputForEdit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTagInEdit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-add-tag-inline"
                  onClick={handleAddTagInEdit}
                >
                  <Plus size={14} /> 추가
                </button>
              </div>
            </div>

            {/* 모달 액션 버튼 */}
            <div className="modal-actions">
              <button 
                type="button" 
                className="modal-btn cancel" 
                onClick={handleCloseEdit}
              >
                취소
              </button>
              <button 
                type="button" 
                className="modal-btn submit" 
                onClick={handleSaveEdit}
                disabled={!editForm.text.trim()}
              >
                수정 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
