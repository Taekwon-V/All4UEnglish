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

// 기본 초기 데이터는 비어 있는 상태로 시작 (사용자 정의 학습 자산만 보관)
const INITIAL_SENTENCES = [];
const INITIAL_GRAMMAR = [];
const INITIAL_IDIOMS = [];
const INITIAL_WORDS = [];
const INITIAL_PLAYLISTS = [];


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
      if (sSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'sentences'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            if (!d.id.includes('-init-')) {
              await setDoc(doc(db, 'spaces', targetSpace, 'sentences', d.id), d.data(), { merge: true });
            }
          }
          sSnap = await getDocs(collection(db, 'spaces', targetSpace, 'sentences'));
        }
      }
      if (!sSnap.empty) {
        const cloudSentences = [];
        for (const d of sSnap.docs) {
          if (d.id.includes('-init-')) {
            await deleteDoc(doc(db, 'spaces', targetSpace, 'sentences', d.id)).catch(() => {});
          } else {
            cloudSentences.push(d.data());
          }
        }
        localStorage.setItem(`all4u_${targetSpace}_sentences`, JSON.stringify(cloudSentences));
      }

      // 2. 단어 동기화 (spaces/{targetSpace}/words)
      let wSnap = await getDocs(collection(db, 'spaces', targetSpace, 'words'));
      if (wSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'words'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            if (!d.id.includes('-init-')) {
              await setDoc(doc(db, 'spaces', targetSpace, 'words', d.id), d.data(), { merge: true });
            }
          }
          wSnap = await getDocs(collection(db, 'spaces', targetSpace, 'words'));
        }
      }
      if (!wSnap.empty) {
        const cloudWords = [];
        for (const d of wSnap.docs) {
          if (d.id.includes('-init-')) {
            await deleteDoc(doc(db, 'spaces', targetSpace, 'words', d.id)).catch(() => {});
          } else {
            cloudWords.push(d.data());
          }
        }
        localStorage.setItem(`all4u_${targetSpace}_vocab`, JSON.stringify(cloudWords));
      }

      // 3. 문법 동기화 (spaces/{targetSpace}/grammar)
      let gSnap = await getDocs(collection(db, 'spaces', targetSpace, 'grammar'));
      if (gSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'grammar'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            if (!d.id.includes('-init-')) {
              await setDoc(doc(db, 'spaces', targetSpace, 'grammar', d.id), d.data(), { merge: true });
            }
          }
          gSnap = await getDocs(collection(db, 'spaces', targetSpace, 'grammar'));
        }
      }
      if (!gSnap.empty) {
        const cloudGrammar = [];
        for (const d of gSnap.docs) {
          if (d.id.includes('-init-')) {
            await deleteDoc(doc(db, 'spaces', targetSpace, 'grammar', d.id)).catch(() => {});
          } else {
            cloudGrammar.push(d.data());
          }
        }
        localStorage.setItem(`all4u_${targetSpace}_grammar`, JSON.stringify(cloudGrammar));
      }

      // 4. 숙어 동기화 (spaces/{targetSpace}/idioms)
      let iSnap = await getDocs(collection(db, 'spaces', targetSpace, 'idioms'));
      if (iSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'idioms'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            if (!d.id.includes('-init-')) {
              await setDoc(doc(db, 'spaces', targetSpace, 'idioms', d.id), d.data(), { merge: true });
            }
          }
          iSnap = await getDocs(collection(db, 'spaces', targetSpace, 'idioms'));
        }
      }
      if (!iSnap.empty) {
        const cloudIdioms = [];
        for (const d of iSnap.docs) {
          if (d.id.includes('-init-')) {
            await deleteDoc(doc(db, 'spaces', targetSpace, 'idioms', d.id)).catch(() => {});
          } else {
            cloudIdioms.push(d.data());
          }
        }
        localStorage.setItem(`all4u_${targetSpace}_idioms`, JSON.stringify(cloudIdioms));
      }

      // 5. 플레이리스트 동기화 (spaces/{targetSpace}/playlists)
      let pSnap = await getDocs(collection(db, 'spaces', targetSpace, 'playlists'));
      if (pSnap.empty && targetSpace === 'space_master') {
        const rootSnap = await getDocs(collection(db, 'playlists'));
        if (!rootSnap.empty) {
          for (const d of rootSnap.docs) {
            if (!d.id.includes('-init-')) {
              await setDoc(doc(db, 'spaces', targetSpace, 'playlists', d.id), d.data(), { merge: true });
            }
          }
          pSnap = await getDocs(collection(db, 'spaces', targetSpace, 'playlists'));
        }
      }
      if (!pSnap.empty) {
        const cloudPlaylists = [];
        for (const d of pSnap.docs) {
          if (d.id.includes('-init-')) {
            await deleteDoc(doc(db, 'spaces', targetSpace, 'playlists', d.id)).catch(() => {});
          } else {
            cloudPlaylists.push(d.data());
          }
        }
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
      if (!data) return [];
      const list = JSON.parse(data);
      if (!Array.isArray(list)) return [];
      // s-init- 계열 잔존 더미 데이터 제거
      const cleaned = list.filter(s => !s.id || !s.id.startsWith('s-init-'));
      if (cleaned.length !== list.length) {
        localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(cleaned));
      }
      return cleaned.map(s => ({
        ...s,
        status: s.status || 'learning'
      }));
    } catch {
      return [];
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

  updateSentence: (sentenceId, updatedFields) => {
    let changed = null;
    const sentences = StorageService.getSentences().map(s => {
      if (s.id === sentenceId) {
        changed = { ...s, ...updatedFields, updatedAt: new Date().toISOString() };
        return changed;
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
    if (changed) syncToFirestore('sentences', changed.id, changed);
    return sentences;
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
      if (!data) return [];
      const list = JSON.parse(data);
      if (!Array.isArray(list)) return [];
      const cleaned = list.filter(g => !g.id || !g.id.startsWith('g-init-'));
      if (cleaned.length !== list.length) {
        localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
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

  deleteGrammar: (grammarId) => {
    const list = StorageService.getGrammar().filter(g => g.id !== grammarId);
    localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(list));
    deleteFromFirestore('grammar', grammarId);
    return list;
  },

  // ================= 3. 숙어장 (Idioms) =================
  getIdioms: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IDIOMS);
      if (!data) return [];
      const list = JSON.parse(data);
      if (!Array.isArray(list)) return [];
      const cleaned = list.filter(i => !i.id || !i.id.startsWith('i-init-'));
      if (cleaned.length !== list.length) {
        localStorage.setItem(STORAGE_KEYS.IDIOMS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
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

  deleteIdiom: (idiomId) => {
    const list = StorageService.getIdioms().filter(i => i.id !== idiomId);
    localStorage.setItem(STORAGE_KEYS.IDIOMS, JSON.stringify(list));
    deleteFromFirestore('idioms', idiomId);
    return list;
  },

  // ================= 4. 단어장 (Vocabulary) =================
  getWords: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORDS);
      if (!data) return [];
      const list = JSON.parse(data);
      if (!Array.isArray(list)) return [];
      const cleaned = list.filter(w => !w.id || !w.id.startsWith('w-init-'));
      if (cleaned.length !== list.length) {
        localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
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

  deleteWord: (wordId) => {
    const list = StorageService.getWords().filter(w => w.id !== wordId);
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(list));
    deleteFromFirestore('words', wordId);
    return list;
  },

  // ================= 5. 플레이리스트 (Playlists) =================
  getPlaylists: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (!data) return [];
      const list = JSON.parse(data);
      if (!Array.isArray(list)) return [];
      const cleaned = list.filter(p => !p.id || !p.id.startsWith('pl-init-'));
      if (cleaned.length !== list.length) {
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
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
