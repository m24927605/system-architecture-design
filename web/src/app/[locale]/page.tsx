import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import ArchitectureEvolution from "@/components/sections/ArchitectureEvolution";
import TaskFlow from "@/components/sections/TaskFlow";
import CapacityCalculator from "@/components/sections/CapacityCalculator";
import CostAnalysis from "@/components/sections/CostAnalysis";
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

        <TaskFlow />

        <CapacityCalculator />

        <CostAnalysis />

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
