import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("hero");
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
    </main>
  );
}
