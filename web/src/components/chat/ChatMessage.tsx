"use client";

import { motion } from "framer-motion";
import type { UIMessage } from "ai";

interface Props {
  message: UIMessage;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  // Extract text content from message parts
  const textContent = message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");

  if (!textContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-cyan/10 border border-cyan/30 text-text-primary"
            : "bg-bg-card border border-border text-text-primary"
        }`}
      >
        {textContent}
      </div>
    </motion.div>
  );
}
