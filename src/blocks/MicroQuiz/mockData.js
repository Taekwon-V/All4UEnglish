export const mockQuizData = {
  quizzes: [
    {
      id: "q1",
      type: "chunk-reorder",
      question: "우리말 의미에 맞게 단어 블록을 순서대로 터치하세요.",
      koreanHint: "그는 자신의 실수를 인정하기를 망설였습니다.",
      correctTokens: ["He was reluctant", "to admit", "his mistake"],
      shuffledTokens: ["to admit", "his mistake", "He was reluctant"],
      explanation: "'be reluctant to + 동사원형' 공식을 활용하여 'He was reluctant to admit his mistake'가 됩니다."
    },
    {
      id: "q2",
      type: "multiple-choice",
      question: "문맥상 빈칸에 가장 알맞은 단어를 고르세요.",
      sentenceWithBlank: "I was ______ to leave the cozy room, fearing the bitter cold outside.",
      options: ["reluctant", "reluctance", "reluctantly", "relucting"],
      correctIndex: 0,
      explanation: "be동사 was 뒤에서 주어의 상태를 설명하는 형용사 reluctant가 적절합니다."
    }
  ]
};
