import type { NormalizedContainerNode, NormalizedNode, NormalizedQuestionNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.ArithmeticQuiz";

/** H5P.ArithmeticQuiz generates its problems at runtime, so content.json only
 * holds the configuration:
 *   { quizType?: "arithmetic"|"equation",
 *     arithmeticType?: "addition"|"subtraction"|"multiplication"|"division",
 *     maxQuestions?: number }
 * eXeLearning has no random-quiz generator, so we expand the spec into a fixed
 * set of multichoice questions (deterministic so tests are stable). The author
 * can edit them in eXe afterwards.
 */
const OPERATORS: Record<string, { symbol: string; apply: (a: number, b: number) => number }> = {
  addition: { symbol: "+", apply: (a, b) => a + b },
  subtraction: { symbol: "-", apply: (a, b) => a - b },
  multiplication: { symbol: "×", apply: (a, b) => a * b },
  division: { symbol: "÷", apply: (a, b) => a / b }
};

function pickOperands(arith: string, index: number): [number, number] {
  // Deterministic pseudo-pairs: indexed walks through a small grid.
  const seed = index + 1;
  if (arith === "division") {
    const b = ((seed % 9) + 2) | 0;
    const q = ((seed * 3) % 9) + 1;
    return [b * q, b];
  }
  if (arith === "subtraction") {
    const a = ((seed * 7) % 20) + 10;
    const b = (seed * 3) % a;
    return [a, b];
  }
  if (arith === "multiplication") {
    return [((seed * 2) % 11) + 1, ((seed * 5) % 11) + 1];
  }
  return [((seed * 3) % 19) + 1, ((seed * 5) % 19) + 1];
}

export function adapt(content: any): NormalizedNode {
  const arithRaw =
    typeof content?.arithmeticType === "string" ? content.arithmeticType : "addition";
  const arith: keyof typeof OPERATORS = OPERATORS[arithRaw] ? arithRaw : "addition";
  const op = OPERATORS[arith]!;
  const max =
    typeof content?.maxQuestions === "number" && content.maxQuestions > 0
      ? Math.min(content.maxQuestions, 20)
      : 10;

  const children: NormalizedQuestionNode[] = [];
  for (let i = 0; i < max; i++) {
    const [a, b] = pickOperands(arith, i);
    const correct = op.apply(a, b);
    const distractors = new Set<number>();
    for (let bump = 1; distractors.size < 3 && bump < 50; bump++) {
      for (const sign of [1, -1]) {
        const candidate = correct + sign * bump;
        if (candidate !== correct && candidate > 0) distractors.add(candidate);
        if (distractors.size >= 3) break;
      }
    }
    // Guarantee 3 distractors even when `correct` is tiny — fill with offsets above.
    let safety = 100;
    while (distractors.size < 3) distractors.add(correct + safety++);
    const wrongs = [...distractors];
    const answers = [correct, ...wrongs]
      .map((v, idx) => ({ text: String(v), correct: idx === 0 }))
      .sort((x, y) => (x.text > y.text ? 1 : -1));
    children.push({
      id: uniqueId("aq-q"),
      sourceType: machineName,
      kind: "question",
      questionType: "multichoice",
      prompt: `${a} ${op.symbol} ${b} = ?`,
      answers
    });
  }

  const container: NormalizedContainerNode = {
    id: uniqueId("aq"),
    sourceType: machineName,
    kind: "container",
    children
  };
  return container;
}
