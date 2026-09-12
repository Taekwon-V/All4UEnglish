/**
 * Storage Service (LocalStorage Master Adapter)
 * 4대 학습 자산(문장장, 문법장, 숙어장, 단어장) 및 플레이리스트 영구 저장소
 */

const STORAGE_KEYS = {
  SESSIONS: 'all4u_study_sessions',
  SENTENCES: 'all4u_sentences_master',
  GRAMMAR: 'all4u_grammar_master',
  IDIOMS: 'all4u_idioms_master',
  WORDS: 'all4u_vocab_master',
  PLAYLISTS: 'all4u_playlists_master'
};

// 기본 초기 샘플 데이터 (앱을 처음 켰을 때도 즉시 체험 가능하도록)
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

export const StorageService = {
  // ================= 1. 문장장 (Sentences) =================
  getSentences: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SENTENCES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(INITIAL_SENTENCES));
        return INITIAL_SENTENCES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_SENTENCES;
    }
  },

  saveSentence: (sentenceData) => {
    try {
      const sentences = StorageService.getSentences();
      const existingIdx = sentences.findIndex(s => s.text.trim().toLowerCase() === sentenceData.text.trim().toLowerCase());
      
      let updated;
      if (existingIdx >= 0) {
        updated = [...sentences];
        updated[existingIdx] = { ...sentences[existingIdx], ...sentenceData };
      } else {
        const newSentence = {
          ...sentenceData,
          id: sentenceData.id || 's-' + Date.now(),
          tags: sentenceData.tags || [],
          isBookmarked: sentenceData.isBookmarked || false,
          createdAt: sentenceData.createdAt || new Date().toISOString()
        };
        updated = [newSentence, ...sentences];
      }
      localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('문장 저장 실패:', e);
      return [];
    }
  },

  deleteSentence: (sentenceId) => {
    const sentences = StorageService.getSentences().filter(s => s.id !== sentenceId);
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
    return sentences;
  },

  toggleSentenceBookmark: (sentenceId) => {
    const sentences = StorageService.getSentences().map(s => 
      s.id === sentenceId ? { ...s, isBookmarked: !s.isBookmarked } : s
    );
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
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
      if (existingIdx >= 0) {
        updated = [...list];
        updated[existingIdx] = { ...list[existingIdx], ...grammarData };
      } else {
        const newItem = {
          ...grammarData,
          id: grammarData.id || 'g-' + Date.now(),
          variations: grammarData.variations || [],
          isBookmarked: grammarData.isBookmarked || false,
          createdAt: new Date().toISOString()
        };
        updated = [newItem, ...list];
      }
      localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('문법 저장 실패:', e);
      return [];
    }
  },

  addGrammarVariation: (grammarId, variation) => {
    const list = StorageService.getGrammar().map(item => {
      if (item.id === grammarId) {
        const variations = item.variations || [];
        // 중복 방지
        if (!variations.some(v => v.en === variation.en)) {
          return { ...item, variations: [...variations, variation] };
        }
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(list));
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
      if (existingIdx >= 0) {
        updated = [...list];
        updated[existingIdx] = { ...list[existingIdx], ...idiomData };
      } else {
        const newItem = {
          ...idiomData,
          id: idiomData.id || 'i-' + Date.now(),
          variations: idiomData.variations || [],
          isBookmarked: idiomData.isBookmarked || false,
          createdAt: new Date().toISOString()
        };
        updated = [newItem, ...list];
      }
      localStorage.setItem(STORAGE_KEYS.IDIOMS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('숙어 저장 실패:', e);
      return [];
    }
  },

  addIdiomVariation: (idiomId, variation) => {
    const list = StorageService.getIdioms().map(item => {
      if (item.id === idiomId) {
        const variations = item.variations || [];
        if (!variations.some(v => v.en === variation.en)) {
          return { ...item, variations: [...variations, variation] };
        }
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.IDIOMS, JSON.stringify(list));
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
      if (existingIdx >= 0) {
        updatedWords = [...words];
        updatedWords[existingIdx] = {
          ...words[existingIdx],
          ...wordData,
          reviewCount: (words[existingIdx].reviewCount || 0) + 1
        };
      } else {
        const newWord = {
          ...wordData,
          id: wordData.id || 'w-' + Date.now(),
          status: wordData.status || 'review',
          isBookmarked: wordData.isBookmarked || false,
          variations: wordData.variations || [],
          reviewCount: 1,
          createdAt: new Date().toISOString()
        };
        updatedWords = [newWord, ...words];
      }

      localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(updatedWords));
      return updatedWords;
    } catch (e) {
      console.error('단어 저장 실패:', e);
      return [];
    }
  },

  addWordVariation: (wordId, variation) => {
    const list = StorageService.getWords().map(item => {
      if (item.id === wordId) {
        const variations = item.variations || [];
        if (!variations.some(v => v.en === variation.en)) {
          return { ...item, variations: [...variations, variation] };
        }
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(list));
    return list;
  },

  setWordStatus: (wordId, status) => {
    const words = StorageService.getWords();
    const updated = words.map(w => w.id === wordId ? { ...w, status } : w);
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(updated));
    return updated;
  },

  toggleBookmark: (wordId) => {
    const words = StorageService.getWords();
    const updated = words.map(w => w.id === wordId ? { ...w, isBookmarked: !w.isBookmarked } : w);
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(updated));
    return updated;
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
      if (existingIdx >= 0) {
        updated = [...playlists];
        updated[existingIdx] = { ...playlists[existingIdx], ...playlistData };
      } else {
        const newPl = {
          ...playlistData,
          id: playlistData.id || 'pl-' + Date.now(),
          sentenceIds: playlistData.sentenceIds || [],
          createdAt: new Date().toISOString()
        };
        updated = [newPl, ...playlists];
      }
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('플레이리스트 저장 실패:', e);
      return [];
    }
  },

  addSentenceToPlaylist: (playlistId, sentenceId) => {
    const playlists = StorageService.getPlaylists().map(pl => {
      if (pl.id === playlistId && !pl.sentenceIds.includes(sentenceId)) {
        return { ...pl, sentenceIds: [...pl.sentenceIds, sentenceId] };
      }
      return pl;
    });
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    return playlists;
  },

  removeSentenceFromPlaylist: (playlistId, sentenceId) => {
    const playlists = StorageService.getPlaylists().map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, sentenceIds: pl.sentenceIds.filter(id => id !== sentenceId) };
      }
      return pl;
    });
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    return playlists;
  },

  deletePlaylist: (playlistId) => {
    const playlists = StorageService.getPlaylists().filter(pl => pl.id !== playlistId);
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    return playlists;
  },

  // ================= 6. 학습 세션 (과거 호환 유지) =================
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
