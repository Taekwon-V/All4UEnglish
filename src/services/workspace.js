/**
 * Workspace Service (학습공간 배정 및 관리)
 * - 개인 유저 ID(Google ID)에 독립된 학습공간(spaceId)을 부여
 * - 개별 학습 데이터에는 개인 ID를 넣지 않고, 학습공간과 데이터를 매칭
 */
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

export const MASTER_SPACE_ID = 'space_master';

/**
 * 고유한 공간 ID 생성 (예: sp_k9f20a)
 */
const generateSpaceId = () => {
  return 'sp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
};

export const WorkspaceService = {
  /**
   * 유저의 학습공간 조회 또는 최초 배정
   * @param {string} userEmail - 유저 이메일
   * @param {string} displayName - 유저 이름
   * @param {boolean} isMaster - 마스터 관리자 여부
   * @returns {Promise<{spaceId: string, spaceName: string, isNew: boolean}>}
   */
  getOrCreateUserSpace: async (userEmail, displayName = '', isMaster = false) => {
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    if (!cleanEmail) {
      return { spaceId: MASTER_SPACE_ID, spaceName: '기본 학습공간', isNew: false };
    }

    // 마스터 관리자는 항상 기존 학습 자산이 보존된 MASTER_SPACE_ID로 배정
    if (isMaster) {
      const masterInfo = {
        spaceId: MASTER_SPACE_ID,
        spaceName: '마스터 메인 공간',
        userEmail: cleanEmail,
        updatedAt: new Date().toISOString()
      };
      if (db) {
        try {
          await setDoc(doc(db, 'user_spaces', cleanEmail), masterInfo, { merge: true });
          await setDoc(doc(db, 'spaces', MASTER_SPACE_ID), {
            spaceId: MASTER_SPACE_ID,
            name: '마스터 메인 공간',
            ownerEmail: cleanEmail,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn('[Workspace] Master space sync warning:', e.message);
        }
      }
      return { spaceId: MASTER_SPACE_ID, spaceName: '마스터 메인 공간', isNew: false };
    }

    // 일반 유저: 기존 배정된 학습공간 확인
    if (db) {
      try {
        const userSpaceRef = doc(db, 'user_spaces', cleanEmail);
        const snap = await getDoc(userSpaceRef);

        if (snap.exists()) {
          const data = snap.data();
          return {
            spaceId: data.spaceId,
            spaceName: data.spaceName || `${displayName || '학습자'}의 학습공간`,
            isNew: false
          };
        }

        // 최초 방문 유저: 새 학습공간 생성 및 배정
        const newSpaceId = generateSpaceId();
        const spaceName = displayName ? `${displayName}의 학습공간` : `${cleanEmail.split('@')[0]}의 학습공간`;
        const now = new Date().toISOString();

        // 1. 유저-공간 매핑 저장
        await setDoc(userSpaceRef, {
          userEmail: cleanEmail,
          spaceId: newSpaceId,
          spaceName,
          createdAt: now
        });

        // 2. 공간 메타데이터 등록
        await setDoc(doc(db, 'spaces', newSpaceId), {
          spaceId: newSpaceId,
          name: spaceName,
          ownerEmail: cleanEmail,
          createdAt: now
        });

        return { spaceId: newSpaceId, spaceName, isNew: true };
      } catch (e) {
        console.error('[Workspace] Space lookup error:', e);
      }
    }

    // Firestore 미연동 또는 오류 시 로컬 스토리지 기반 배정
    const localKey = `all4u_user_space_${cleanEmail}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // pass
      }
    }

    const fallbackSpaceId = generateSpaceId();
    const fallbackInfo = {
      spaceId: fallbackSpaceId,
      spaceName: `${displayName || cleanEmail.split('@')[0]}의 학습공간`,
      isNew: true
    };
    localStorage.setItem(localKey, JSON.stringify(fallbackInfo));
    return fallbackInfo;
  },

  /**
   * 유저에게 배정된 현재 학습공간 정보 조회
   */
  getUserSpace: async (userEmail) => {
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    if (!cleanEmail || !db) return null;
    try {
      const snap = await getDoc(doc(db, 'user_spaces', cleanEmail));
      return snap.exists() ? snap.data() : null;
    } catch {
      return null;
    }
  }
};
