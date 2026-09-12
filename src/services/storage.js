/**
 * Storage Service (Hybrid Firestore Cloud DB + LocalStorage Cache)
 * 4대 학습 자산(문장장, 문법장, 숙어장, 단어장) 및 플레이리스트의 클라우드 영구 저장소
 */
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

let currentSpaceId = 'space_master';

const STORAGE_KEYS = {
  get SESSIONS() { return `all4u_${currentSpaceId}_study_sessions`; },
  get SENTENCES() { return `all4u_${currentSpaceId}_sentences`; },
  get GRAMMAR() { return `all4u_${currentSpaceId}_grammar`; },
  get IDIOMS() { return `all4u_${currentSpaceId}_idioms`; },
  get WORDS() { return `all4u_${currentSpaceId}_vocab`; },
  get PLAYLISTS() { return `all4u_${currentSpaceId}_playlists`; }
};

// 기본 초기 샘플 데이터
const INITIAL_SENTENCES = [
  {
    id: 's-init-1',
    text: "I was wondering if you could help me find a quiet cafe around here.",
    translation: "혹시 이 근처에 조용한 카페 찾는 것 좀 도와주실 수 있나요?",
    source: "직접 입력",
    tags: ["일상", "카페", "정중한부탁"],
    isBookmarked: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 's-init-2',
    text: "She was reluctant to leave the cozy room, so she decided to call it a day.",
    translation: "그녀는 아늑한 방을 떠나기가 망설여져서 오늘은 이만 끝내기로 했다.",
    source: "원서 읽기",
    tags: ["감정", "숙어"],
    isBookmarked: false,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_GRAMMAR = [
  {
    id: 'g-init-1',
    pattern: "I was wondering if you could + [동사원형]",
    tag: "#정중한_부탁",
    explanation: "상대방에게 부담을 주지 않고 조심스럽게 호의나 도움을 구할 때 쓰는 표현입니다.",
    originalSentence: "I was wondering if you could help me find a quiet cafe around here.",
    variations: [
      { en: "I was wondering if you could check this email for me?", ko: "혹시 이 이메일 한번 봐주실 수 있을까요?" },
      { en: "I was wondering if you could recommend a good movie?", ko: "혹시 좋은 영화 한 편 추천해 주실 수 있나요?" }
    ],
    isBookmarked: true,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_IDIOMS = [
  {
    id: 'i-init-1',
    idiom: "call it a day",
    meaning: "오늘 하루 일을 이쯤에서 마무리하다 / 끝내다",
    originalSentence: "She was reluctant to leave the cozy room, so she decided to call it a day.",
    variations: [
      { en: "We've been working for six hours, let's call it a day.", ko: "6시간 동안 일했으니 오늘은 이만 마무리합시다." },
      { en: "I'm too tired to keep reading, time to call it a day.", ko: "너무 피곤해서 더 못 읽겠어요, 이제 그만 잘래요." }
    ],
    isBookmarked: true,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_WORDS = [
  {
    id: 'w-init-1',
    word: "reluctant",
    phonetic: "[rɪˈlʌktənt]",
    partOfSpeech: "형용사",
    nuanceKo: "마음속에서 주저하고 망설이며 내키지 않아 하는 상태",
    originalSentence: "She was reluctant to leave the cozy room, so she decided to call it a day.",
    variations: [
      { en: "He was reluctant to admit his mistake at first.", ko: "그는 처음에는 자신의 실수를 인정하기를 망설였습니다." },
      { en: "She was reluctant to spend money on things she didn't need.", ko: "그녀는 불필요한 것에 돈 쓰는 것을 꺼려했습니다." }
    ],
    status: "review",
    isBookmarked: true,
    reviewCount: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'w-init-2',
    word: "cozy",
    phonetic: "[ˈkoʊzi]",
    partOfSpeech: "형용사",
    nuanceKo: "따뜻하고 편안하게 감싸여 안락한 느낌",
    originalSentence: "She was reluctant to leave the cozy room, so she decided to call it a day.",
    variations: [
      { en: "This small cafe has a very cozy atmosphere.", ko: "이 작은 카페는 분위기가 무척 아늑해요." },
      { en: "I love staying in a cozy bed on rainy Sundays.", ko: "비 오는 일요일엔 아늑한 침대에 누워 있는 게 정말 좋아요." }
    ],
    status: "mastered",
    isBookmarked: false,
    reviewCount: 4,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_PLAYLISTS = [
  {
    id: 'pl-init-1',
    title: "🎧 카페 & 일상 베스트 표현",
    description: "산책할 때 편안하게 반복해서 듣는 핵심 문장들",
    sentenceIds: ['s-init-1', 's-init-2'],
    createdAt: new Date().toISOString()
  }
];

// Firestore 백그라운드 싱크 헬퍼 (학습공간 spaces/{currentSpaceId}/... 경로와 매칭)
const syncToFirestore = async (collectionName, docId, data) => {
  if (!db) return;
  try {
    await setDoc(doc(db, 'spaces', currentSpaceId, collectionName, docId), data, { merge: true });
  } catch (e) {
    console.debug(`[Firestore Sync Pending: spaces/${currentSpaceId}/${collectionName}/${docId}]`, e.message);
  }
};

const deleteFromFirestore = async (collectionName, docId) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'spaces', currentSpaceId, collectionName, docId));
  } catch (e) {
    console.debug(`[Firestore Delete Pending: spaces/${currentSpaceId}/${collectionName}/${docId}]`, e.message);
  }
};

export const StorageService = {
  /**
   * 현재 활성 학습공간(spaceId) 지정
   */
  setActiveSpace: (spaceId) => {
    if (spaceId) {
      currentSpaceId = spaceId;

      // 마스터 계정의 경우 이전 캐시 키(all4u_*_master)에서 자동 마이그레이션
      if (spaceId === 'space_master') {
        const legacyMap = [
          { oldK: 'all4u_sentences_master', newK: 'all4u_space_master_sentences' },
          { oldK: 'all4u_grammar_master', newK: 'all4u_space_master_grammar' },
          { oldK: 'all4u_idioms_master', newK: 'all4u_space_master_idioms' },
          { oldK: 'all4u_vocab_master', newK: 'all4u_space_master_vocab' },
          { oldK: 'all4u_playlists_master', newK: 'all4u_space_master_playlists' }
        ];
        legacyMap.forEach(({ oldK, newK }) => {
          const oldVal = localStorage.getItem(oldK);
          const newVal = localStorage.getItem(newK);
          if (oldVal && !newVal) {
            localStorage.setItem(newK, oldVal);
          }
        });
      }
    }
  },

  /**
   * 현재 활성 학습공간 ID 조회
   */
  getActiveSpace: () => currentSpaceId,

  /**
   * 앱 시작 및 로그인 시 지정된 학습공간(spaceId) 클라우드 데이터와 자동 동기화
   */
  initCloudSync: async (spaceId = currentSpaceId) => {
    if (!db) return;
    const targetSpace = spaceId || currentSpaceId;
    try {
      // 1. 문장 동기화 (spaces/{targetSpace}/sentences)
      let sSnap = await getDocs(collection(db, 'spaces', targetSpace, 'sentences'));
      // 마스터 공간 최초 진입 시 기존 루트 컬렉션이 있다면 마이그레이션
      if (sSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'sentences'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            await setDoc(doc(db, 'spaces', targetSpace, 'sentences', d.id), d.data(), { merge: true });
          }
          sSnap = await getDocs(collection(db, 'spaces', targetSpace, 'sentences'));
        }
      }
      if (!sSnap.empty) {
        const cloudSentences = sSnap.docs.map(d => d.data());
        localStorage.setItem(`all4u_${targetSpace}_sentences`, JSON.stringify(cloudSentences));
      }

      // 2. 단어 동기화 (spaces/{targetSpace}/words)
      let wSnap = await getDocs(collection(db, 'spaces', targetSpace, 'words'));
      if (wSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'words'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            await setDoc(doc(db, 'spaces', targetSpace, 'words', d.id), d.data(), { merge: true });
          }
          wSnap = await getDocs(collection(db, 'spaces', targetSpace, 'words'));
        }
      }
      if (!wSnap.empty) {
        const cloudWords = wSnap.docs.map(d => d.data());
        localStorage.setItem(`all4u_${targetSpace}_vocab`, JSON.stringify(cloudWords));
      }

      // 3. 문법 동기화 (spaces/{targetSpace}/grammar)
      let gSnap = await getDocs(collection(db, 'spaces', targetSpace, 'grammar'));
      if (gSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'grammar'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            await setDoc(doc(db, 'spaces', targetSpace, 'grammar', d.id), d.data(), { merge: true });
          }
          gSnap = await getDocs(collection(db, 'spaces', targetSpace, 'grammar'));
        }
      }
      if (!gSnap.empty) {
        const cloudGrammar = gSnap.docs.map(d => d.data());
        localStorage.setItem(`all4u_${targetSpace}_grammar`, JSON.stringify(cloudGrammar));
      }

      // 4. 숙어 동기화 (spaces/{targetSpace}/idioms)
      let iSnap = await getDocs(collection(db, 'spaces', targetSpace, 'idioms'));
      if (iSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'idioms'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            await setDoc(doc(db, 'spaces', targetSpace, 'idioms', d.id), d.data(), { merge: true });
          }
          iSnap = await getDocs(collection(db, 'spaces', targetSpace, 'idioms'));
        }
      }
      if (!iSnap.empty) {
        const cloudIdioms = iSnap.docs.map(d => d.data());
        localStorage.setItem(`all4u_${targetSpace}_idioms`, JSON.stringify(cloudIdioms));
      }

      // 5. 플레이리스트 동기화 (spaces/{targetSpace}/playlists)
      let pSnap = await getDocs(collection(db, 'spaces', targetSpace, 'playlists'));
      if (pSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'playlists'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            await setDoc(doc(db, 'spaces', targetSpace, 'playlists', d.id), d.data(), { merge: true });
          }
          pSnap = await getDocs(collection(db, 'spaces', targetSpace, 'playlists'));
        }
      }
      if (!pSnap.empty) {
        const cloudPlaylists = pSnap.docs.map(d => d.data());
        localStorage.setItem(`all4u_${targetSpace}_playlists`, JSON.stringify(cloudPlaylists));
      }
    } catch (e) {
      console.debug('Cloud sync initial check:', e.message);
    }
  },

  // ================= 1. 문장학습 (Sentences) =================
  getSentences: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SENTENCES);
      const list = data ? JSON.parse(data) : INITIAL_SENTENCES;
      // status 기본값 보장 (마이그레이션)
      return list.map(s => ({
        ...s,
        status: s.status || 'learning' // 'learning' (학습 중) | 'mastered' (학습 완료)
      }));
    } catch {
      return INITIAL_SENTENCES;
    }
  },

  saveSentence: (sentenceData) => {
    try {
      const sentences = StorageService.getSentences();
      const existingIdx = sentences.findIndex(s => s.text.trim().toLowerCase() === sentenceData.text.trim().toLowerCase());
      
      let updated;
      let targetItem;
      if (existingIdx >= 0) {
        updated = [...sentences];
        targetItem = { 
          ...sentences[existingIdx], 
          ...sentenceData,
          status: sentenceData.status || sentences[existingIdx].status || 'learning'
        };
        updated[existingIdx] = targetItem;
      } else {
        targetItem = {
          ...sentenceData,
          id: sentenceData.id || 's-' + Date.now(),
          status: sentenceData.status || 'learning',
          tags: sentenceData.tags || [],
          isBookmarked: sentenceData.isBookmarked || false,
          reviewCount: 1,
          createdAt: sentenceData.createdAt || new Date().toISOString()
        };
        updated = [targetItem, ...sentences];
      }
      localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(updated));
      syncToFirestore('sentences', targetItem.id, targetItem);
      return updated;
    } catch (e) {
      console.error('문장 저장 실패:', e);
      return [];
    }
  },

  setSentenceStatus: (sentenceId, status) => {
    let changed = null;
    const sentences = StorageService.getSentences().map(s => {
      if (s.id === sentenceId) {
        changed = { 
          ...s, 
          status,
          reviewedAt: new Date().toISOString(),
          reviewCount: (s.reviewCount || 0) + (status === 'mastered' ? 1 : 0)
        };
        return changed;
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
    if (changed) syncToFirestore('sentences', changed.id, changed);
    return sentences;
  },

  deleteSentence: (sentenceId) => {
    const sentences = StorageService.getSentences().filter(s => s.id !== sentenceId);
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
    deleteFromFirestore('sentences', sentenceId);
    return sentences;
  },

  toggleSentenceBookmark: (sentenceId) => {
    let changed = null;
    const sentences = StorageService.getSentences().map(s => {
      if (s.id === sentenceId) {
        changed = { ...s, isBookmarked: !s.isBookmarked };
        return changed;
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
    if (changed) syncToFirestore('sentences', changed.id, changed);
    return sentences;
  },

  // ================= 2. 문법장 (Grammar) =================
  getGrammar: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GRAMMAR);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(INITIAL_GRAMMAR));
        return INITIAL_GRAMMAR;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_GRAMMAR;
    }
  },

  saveGrammar: (grammarData) => {
    try {
      const list = StorageService.getGrammar();
      const existingIdx = list.findIndex(g => g.pattern.trim().toLowerCase() === grammarData.pattern.trim().toLowerCase());
      
      let updated;
      let targetItem;
      if (existingIdx >= 0) {
        updated = [...list];
        targetItem = { ...list[existingIdx], ...grammarData };
        updated[existingIdx] = targetItem;
      } else {
        targetItem = {
          ...grammarData,
          id: grammarData.id || 'g-' + Date.now(),
          variations: grammarData.variations || [],
          isBookmarked: grammarData.isBookmarked || false,
          createdAt: new Date().toISOString()
        };
        updated = [targetItem, ...list];
      }
      localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(updated));
      syncToFirestore('grammar', targetItem.id, targetItem);
      return updated;
    } catch (e) {
      console.error('문법 저장 실패:', e);
      return [];
    }
  },

  setGrammarVariations: (grammarId, variations) => {
    let changed = null;
    const list = StorageService.getGrammar().map(item => {
      if (item.id === grammarId) {
        changed = { ...item, variations: variations || [] };
        return changed;
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(list));
    if (changed) syncToFirestore('grammar', changed.id, changed);
    return list;
  },

  addGrammarVariation: (grammarId, variation) => {
    let changed = null;
    const list = StorageService.getGrammar().map(item => {
      if (item.id === grammarId) {
        const variations = item.variations || [];
        if (!variations.some(v => v.en === variation.en)) {
          changed = { ...item, variations: [...variations, variation] };
          return changed;
        }
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(list));
    if (changed) syncToFirestore('grammar', changed.id, changed);
    return list;
  },

  // ================= 3. 숙어장 (Idioms) =================
  getIdioms: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IDIOMS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.IDIOMS, JSON.stringify(INITIAL_IDIOMS));
        return INITIAL_IDIOMS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_IDIOMS;
    }
  },

  saveIdiom: (idiomData) => {
    try {
      const list = StorageService.getIdioms();
      const existingIdx = list.findIndex(i => i.idiom.trim().toLowerCase() === idiomData.idiom.trim().toLowerCase());
      
      let updated;
      let targetItem;
      if (existingIdx >= 0) {
        updated = [...list];
        targetItem = { ...list[existingIdx], ...idiomData };
        updated[existingIdx] = targetItem;
      } else {
        targetItem = {
          ...idiomData,
          id: idiomData.id || 'i-' + Date.now(),
          variations: idiomData.variations || [],
          isBookmarked: idiomData.isBookmarked || false,
          createdAt: new Date().toISOString()
        };
        updated = [targetItem, ...list];
      }
      localStorage.setItem(STORAGE_KEYS.IDIOMS, JSON.stringify(updated));
      syncToFirestore('idioms', targetItem.id, targetItem);
      return updated;
    } catch (e) {
      console.error('숙어 저장 실패:', e);
      return [];
    }
  },

  setIdiomVariations: (idiomId, variations) => {
    let changed = null;
    const list = StorageService.getIdioms().map(item => {
      if (item.id === idiomId) {
        changed = { ...item, variations: variations || [] };
        return changed;
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.IDIOMS, JSON.stringify(list));
    if (changed) syncToFirestore('idioms', changed.id, changed);
    return list;
  },

  addIdiomVariation: (idiomId, variation) => {
    let changed = null;
    const list = StorageService.getIdioms().map(item => {
      if (item.id === idiomId) {
        const variations = item.variations || [];
        if (!variations.some(v => v.en === variation.en)) {
          changed = { ...item, variations: [...variations, variation] };
          return changed;
        }
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.IDIOMS, JSON.stringify(list));
    if (changed) syncToFirestore('idioms', changed.id, changed);
    return list;
  },

  // ================= 4. 단어장 (Vocabulary) =================
  getWords: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORDS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(INITIAL_WORDS));
        return INITIAL_WORDS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_WORDS;
    }
  },

  saveWord: (wordData) => {
    try {
      const words = StorageService.getWords();
      const existingIdx = words.findIndex(w => w.word.trim().toLowerCase() === wordData.word.trim().toLowerCase());

      let updatedWords;
      let targetItem;
      if (existingIdx >= 0) {
        updatedWords = [...words];
        targetItem = {
          ...words[existingIdx],
          ...wordData,
          reviewCount: (words[existingIdx].reviewCount || 0) + 1
        };
        updatedWords[existingIdx] = targetItem;
      } else {
        targetItem = {
          ...wordData,
          id: wordData.id || 'w-' + Date.now(),
          status: wordData.status || 'review',
          isBookmarked: wordData.isBookmarked || false,
          variations: wordData.variations || [],
          reviewCount: 1,
          createdAt: new Date().toISOString()
        };
        updatedWords = [targetItem, ...words];
      }

      localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(updatedWords));
      syncToFirestore('words', targetItem.id, targetItem);
      return updatedWords;
    } catch (e) {
      console.error('단어 저장 실패:', e);
      return [];
    }
  },

  setWordVariations: (wordId, variations) => {
    let changed = null;
    const list = StorageService.getWords().map(item => {
      if (item.id === wordId) {
        changed = { ...item, variations: variations || [] };
        return changed;
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(list));
    if (changed) syncToFirestore('words', changed.id, changed);
    return list;
  },

  addWordVariation: (wordId, variation) => {
    let changed = null;
    const list = StorageService.getWords().map(item => {
      if (item.id === wordId) {
        const variations = item.variations || [];
        if (!variations.some(v => v.en === variation.en)) {
          changed = { ...item, variations: [...variations, variation] };
          return changed;
        }
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(list));
    if (changed) syncToFirestore('words', changed.id, changed);
    return list;
  },

  setWordStatus: (wordId, status) => {
    let changed = null;
    const words = StorageService.getWords().map(w => {
      if (w.id === wordId) {
        changed = { ...w, status };
        return changed;
      }
      return w;
    });
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(words));
    if (changed) syncToFirestore('words', changed.id, changed);
    return words;
  },

  toggleBookmark: (wordId) => {
    let changed = null;
    const words = StorageService.getWords().map(w => {
      if (w.id === wordId) {
        changed = { ...w, isBookmarked: !w.isBookmarked };
        return changed;
      }
      return w;
    });
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(words));
    if (changed) syncToFirestore('words', changed.id, changed);
    return words;
  },

  // ================= 5. 플레이리스트 (Playlists) =================
  getPlaylists: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(INITIAL_PLAYLISTS));
        return INITIAL_PLAYLISTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PLAYLISTS;
    }
  },

  savePlaylist: (playlistData) => {
    try {
      const playlists = StorageService.getPlaylists();
      const existingIdx = playlists.findIndex(p => p.id === playlistData.id);

      let updated;
      let targetItem;
      if (existingIdx >= 0) {
        updated = [...playlists];
        targetItem = { ...playlists[existingIdx], ...playlistData };
        updated[existingIdx] = targetItem;
      } else {
        targetItem = {
          ...playlistData,
          id: playlistData.id || 'pl-' + Date.now(),
          sentenceIds: playlistData.sentenceIds || [],
          createdAt: new Date().toISOString()
        };
        updated = [targetItem, ...playlists];
      }
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updated));
      syncToFirestore('playlists', targetItem.id, targetItem);
      return updated;
    } catch (e) {
      console.error('플레이리스트 저장 실패:', e);
      return [];
    }
  },

  addSentenceToPlaylist: (playlistId, sentenceId) => {
    let changed = null;
    const playlists = StorageService.getPlaylists().map(pl => {
      if (pl.id === playlistId && !pl.sentenceIds.includes(sentenceId)) {
        changed = { ...pl, sentenceIds: [...pl.sentenceIds, sentenceId] };
        return changed;
      }
      return pl;
    });
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    if (changed) syncToFirestore('playlists', changed.id, changed);
    return playlists;
  },

  removeSentenceFromPlaylist: (playlistId, sentenceId) => {
    let changed = null;
    const playlists = StorageService.getPlaylists().map(pl => {
      if (pl.id === playlistId) {
        changed = { ...pl, sentenceIds: pl.sentenceIds.filter(id => id !== sentenceId) };
        return changed;
      }
      return pl;
    });
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    if (changed) syncToFirestore('playlists', changed.id, changed);
    return playlists;
  },

  deletePlaylist: (playlistId) => {
    const playlists = StorageService.getPlaylists().filter(pl => pl.id !== playlistId);
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    deleteFromFirestore('playlists', playlistId);
    return playlists;
  },

  // ================= 6. 학습 세션 =================
  saveSession: (sessionData) => {
    try {
      const sessions = StorageService.getSessions();
      const newSession = {
        ...sessionData,
        id: sessionData.id || 'session-' + Date.now(),
        createdAt: sessionData.createdAt || new Date().toISOString()
      };
      const updatedSessions = [newSession, ...sessions.filter(s => s.id !== newSession.id)];
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updatedSessions));
      syncToFirestore('sessions', newSession.id, newSession);
      return newSession;
    } catch {
      return sessionData;
    }
  },

  getSessions: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};
