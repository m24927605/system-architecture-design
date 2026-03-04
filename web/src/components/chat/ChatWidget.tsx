"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage from "./ChatMessage";
import QuickQuestions from "./QuickQuestions";

export default function ChatWidget() {
  const t = useTranslations("chat");
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuickQuestion = (question: string) => {
    sendMessage({ text: question });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    sendMessage({ text });
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-accent-start to-accent-end text-white flex items-center justify-center shadow-lg shadow-accent-start/25 hover:shadow-accent-start/40 transition-shadow cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? "\u2715" : "\uD83D\uDCAC"}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[600px] bg-bg-primary border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <span className="text-lg">{"\uD83E\uDD16"}</span>
              <span className="font-medium text-sm">{t("title")}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 min-h-[300px] max-h-[400px]">
              {messages.length === 0 ? (
                <div>
                  <p className="text-text-secondary text-sm mb-3 text-center">
                    {t("placeholder")}
                  </p>
                  <QuickQuestions onSelect={handleQuickQuestion} />
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <ChatMessage key={m.id} message={m} />
                  ))}
                  {isLoading && (
                    <div className="text-text-secondary text-sm animate-pulse">
                      {t("thinking")}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-border p-3 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("placeholder")}
                className="flex-1 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-start"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent-start to-accent-end text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                {"\u2192"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
