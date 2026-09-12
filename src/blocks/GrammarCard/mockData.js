export const mockGrammarData = {
  patternFormula: "be reluctant to + [동사원형]",
  tag: "#심리묘사 #망설임표현",
  explanation: "단순히 '싫다'는 의미가 아니라, 내적 부담이나 걱정 때문에 어떤 행동을 망설일 때 사용하는 우아하고 자연스러운 패턴입니다.",
  chunks: [
    { chunk: "She was reluctant", role: "주어와 망설이는 심리", color: "#FEF3C7" },
    { chunk: "to leave the warm room", role: "망설이는 구체적 행동", color: "#D1FAE5" },
    { chunk: "fearing the cold", role: "이유 부연 설명", color: "#FEE2E2" }
  ],
  variations: [
    { en: "He was reluctant to admit his mistake.", ko: "그는 자신의 실수를 인정하기를 망설였습니다." },
    { en: "They were reluctant to change the original plan.", ko: "그들은 원래 계획을 바꾸기를 주저했습니다." },
    { en: "I'm reluctant to spend too much money on clothes.", ko: "저는 옷에 너무 많은 돈을 쓰는 건 망설여져요." }
  ]
};
