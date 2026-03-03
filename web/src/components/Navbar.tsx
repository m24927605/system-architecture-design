"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import LanguageSwitch from "./LanguageSwitch";

const NAV_ITEMS = [
  { key: "overview", href: "#hero" },
  { key: "architecture", href: "#architecture" },
  { key: "taskFlow", href: "#task-flow" },
  { key: "capacity", href: "#capacity" },
  { key: "cost", href: "#cost" },
  { key: "tech", href: "#tech" },
  { key: "traits", href: "#traits" },
  { key: "deploy", href: "#deploy" },
] as const;

export default function Navbar() {
  const t = useTranslations("nav");
  const [activeSection, setActiveSection] = useState("hero");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = NAV_ITEMS.map((item) => item.href.slice(1));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.getBoundingClientRect().top <= 100) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    const el = document.getElementById(href.slice(1));
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-bg-primary/80 backdrop-blur-xl border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wider text-accent-start">HEPH-AI</span>
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => scrollTo(item.href)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeSection === item.href.slice(1)
                  ? "text-cyan bg-cyan/10"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t(item.key)}
            </button>
          ))}
        </div>
        <LanguageSwitch />
      </div>
    </motion.nav>
  );
}
