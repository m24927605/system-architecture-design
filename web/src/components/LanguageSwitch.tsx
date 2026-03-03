"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export default function LanguageSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const next = locale === "en" ? "zh" : "en";
    router.replace(pathname, { locale: next });
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-cyan transition-colors"
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}
