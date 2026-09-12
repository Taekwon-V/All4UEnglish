export const mockAuthData = {
  // 허용된 아내 계정 (테스트 기본값)
  allowedWifeEmail: 'wife.english@gmail.com',
  wifeProfile: {
    displayName: '지혜 (Jiwon)',
    email: 'wife.english@gmail.com',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    streakDays: 7
  },
  // 비인가 외부인 계정
  blockedProfile: {
    displayName: '홍길동',
    email: 'stranger@gmail.com',
    photoURL: null
  }
};
