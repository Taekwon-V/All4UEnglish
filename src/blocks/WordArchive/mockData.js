export const mockArchiveData = {
  words: [
    {
      id: "w1",
      word: "Reluctant",
      phonetic: "[rɪˈlʌktənt]",
      nuanceKo: "단순한 싫음을 넘어 마음속 망설임과 부담감이 섞인 상태",
      status: "review",
      isBookmarked: true,
      dailyExample: "I was reluctant to ask for help, but I had no choice."
    },
    {
      id: "w2",
      word: "Bitter",
      phonetic: "[ˈbɪtər]",
      nuanceKo: "살을 에는 듯이 지독하게 매서운 추위를 생생하게 묘사",
      status: "mastered",
      isBookmarked: false,
      dailyExample: "Wear a thick scarf; it's bitterly cold outside."
    },
    {
      id: "w3",
      word: "Cozy",
      phonetic: "[ˈkoʊzi]",
      nuanceKo: "몸과 마음이 따뜻하고 편안하게 감싸이는 아늑함",
      status: "mastered",
      isBookmarked: true,
      dailyExample: "The warm tea made the cafe feel extra cozy."
    }
  ],
  sessions: [
    {
      id: "s1",
      createdAt: new Date().toISOString(),
      originalText: "She was reluctant to leave the cozy room, fearing the bitter cold outside.",
      wordCount: 3
    }
  ]
};
