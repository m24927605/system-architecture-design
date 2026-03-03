"use client";

import { useLocale } from "next-intl";

const QUESTIONS = {
  en: [
    "Why a 3-phase architecture?",
    "Why Go instead of Python?",
    "How does fault tolerance work?",
    "Explain the cost crossover",
    "What is Write-then-ACK?",
    "How does KEDA scaling work?",
  ],
  zh: [
    "\u70BA\u4EC0\u9EBC\u8A2D\u8A08\u4E09\u968E\u6BB5\u67B6\u69CB\uFF1F",
    "\u70BA\u4EC0\u9EBC\u9078 Go \u800C\u4E0D\u662F Python\uFF1F",
    "\u5BB9\u932F\u6A5F\u5236\u600E\u9EBC\u904B\u4F5C\uFF1F",
    "\u6210\u672C\u4EA4\u53C9\u9EDE\u600E\u9EBC\u7B97\u7684\uFF1F",
    "Write-then-ACK \u662F\u4EC0\u9EBC\uFF1F",
    "KEDA \u64F4\u5C55\u600E\u9EBC\u904B\u4F5C\uFF1F",
  ],
};

interface Props {
  onSelect: (question: string) => void;
}

export default function QuickQuestions({ onSelect }: Props) {
  const locale = useLocale();
  const questions = locale === "zh" ? QUESTIONS.zh : QUESTIONS.en;

  return (
    <div className="flex flex-wrap gap-2 p-3">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="px-3 py-1.5 text-xs rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-accent-start transition-colors cursor-pointer"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
