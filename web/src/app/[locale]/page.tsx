import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import ArchitectureEvolution from "@/components/sections/ArchitectureEvolution";
import SectionWrapper from "@/components/ui/SectionWrapper";
import GradientText from "@/components/ui/GradientText";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations();

  return (
    <>
      <Navbar />
      <main>
        <Hero />

        <ArchitectureEvolution />

        <SectionWrapper id="task-flow">
          <h2 className="text-3xl font-bold mb-4"><GradientText>{t("taskFlow.title")}</GradientText></h2>
          <p className="text-text-secondary">{t("taskFlow.subtitle")}</p>
        </SectionWrapper>

        <SectionWrapper id="capacity">
          <h2 className="text-3xl font-bold mb-4"><GradientText>{t("capacity.title")}</GradientText></h2>
          <p className="text-text-secondary">{t("capacity.subtitle")}</p>
        </SectionWrapper>

        <SectionWrapper id="cost">
          <h2 className="text-3xl font-bold mb-4"><GradientText>{t("cost.title")}</GradientText></h2>
          <p className="text-text-secondary">{t("cost.subtitle")}</p>
        </SectionWrapper>

        <SectionWrapper id="tech">
          <h2 className="text-3xl font-bold mb-4"><GradientText>{t("tech.title")}</GradientText></h2>
          <p className="text-text-secondary">{t("tech.subtitle")}</p>
        </SectionWrapper>

        <SectionWrapper id="traits">
          <h2 className="text-3xl font-bold mb-4"><GradientText>{t("traits.title")}</GradientText></h2>
          <p className="text-text-secondary">{t("traits.subtitle")}</p>
        </SectionWrapper>

        <SectionWrapper id="deploy">
          <h2 className="text-3xl font-bold mb-4"><GradientText>{t("deploy.title")}</GradientText></h2>
          <p className="text-text-secondary">{t("deploy.subtitle")}</p>
        </SectionWrapper>
      </main>
    </>
  );
}
