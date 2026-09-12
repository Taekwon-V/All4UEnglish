export const mockGeminiData = {
  inputText: "She was reluctant to leave the warm room, fearing the bitter cold outside.",
  mockResult: {
    originalText: "She was reluctant to leave the warm room, fearing the bitter cold outside.",
    summary: "방을 나서기를 망설이는 상황 묘사 및 감정 어휘",
    vocabularyList: [
      {
        id: "v1",
        word: "Reluctant",
        phonetic: "[rɪˈlʌktənt]",
        partOfSpeech: "형용사",
        nuanceKo: "단순한 싫음을 넘어 마음속으로 망설이고 주저하는 심리 상태",
        highlightedSentence: "She was reluctant to leave the warm room, fearing the bitter cold outside.",
        dailyExample: "I was reluctant to ask for help, but I had no choice.",
        dailyExampleKo: "도움을 청하기가 망설여졌지만, 다른 방법이 없었어요."
      },
      {
        id: "v2",
        word: "Bitter",
        phonetic: "[ˈbɪtər]",
        partOfSpeech: "형용사",
        nuanceKo: "살을 에는 듯이 지독하게 매서운 추위를 생생하게 묘사",
        highlightedSentence: "She was reluctant to leave the warm room, fearing the bitter cold outside.",
        dailyExample: "Wear a thick scarf; it's bitterly cold outside today.",
        dailyExampleKo: "두꺼운 목도리 둘러요. 오늘 밖이 살을 에는 듯 춥거든요."
      }
    ],
    grammarInfo: {
      patternFormula: "be reluctant to + [동사원형]",
      tag: "#심리묘사 #망설임표현",
      explanation: "어떤 행동을 취하기를 망설이거나 꺼려할 때 자연스럽게 연결하는 표현입니다.",
      chunks: [
        { chunk: "She was reluctant", role: "주어와 망설이는 심리", color: "#FEF3C7" },
        { chunk: "to leave the warm room", role: "망설이는 구체적 행동", color: "#D1FAE5" },
        { chunk: "fearing the cold", role: "이유 부연 설명", color: "#FEE2E2" }
      ],
      variations: [
        { en: "He was reluctant to admit his mistake.", ko: "그는 실수를 인정하기를 망설였습니다." },
        { en: "They were reluctant to change the original plan.", ko: "그들은 원래 계획을 바꾸기를 주저했습니다." },
        { en: "I'm reluctant to spend too much money on clothes.", ko: "저는 옷에 너무 많은 돈을 쓰는 건 망설여져요." }
      ]
    },
    roleplay: {
      situation: "📍 겨울날 친구와 카페를 나서기 직전",
      speakerA: "Are you ready to head out? It's getting late.",
      speakerAKo: "이제 나갈 준비 됐어? 시간이 꽤 늦었네.",
      speakerB: "To be honest, I'm reluctant to step outside into this wind!",
      speakerBKo: "솔직히 이 칼바람 속에 나가기가 너무 망설여진다!"
    },
    quizzes: [
      {
        id: "q1",
        type: "chunk-reorder",
        question: "다음 우리말에 맞게 블록을 순서대로 터치하세요.",
        koreanHint: "그는 자신의 실수를 인정하기를 망설였습니다.",
        correctTokens: ["He was reluctant", "to admit", "his mistake"],
        explanation: "'be reluctant to' 뒤에 동사원형 admit이 옵니다."
      },
      {
        id: "q2",
        type: "multiple-choice",
        question: "빈칸에 들어갈 가장 알맞은 단어를 고르세요.",
        sentenceWithBlank: "I was ______ to make a decision without consulting you first.",
        options: ["reluctant", "reluctance", "reluctantly", "reluct"],
        correctIndex: 0,
        explanation: "be동사 was 뒤에서 보어로 사용될 형용사 reluctant가 정답입니다."
      }
    ]
  }
};
