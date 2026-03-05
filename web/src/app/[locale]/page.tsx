import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import ArchitectureEvolution from "@/components/sections/ArchitectureEvolution";
import CapacityCalculator from "@/components/sections/CapacityCalculator";
import CostAnalysis from "@/components/sections/CostAnalysis";
import TechSelection from "@/components/sections/TechSelection";
import ArchitectureTraits from "@/components/sections/ArchitectureTraits";
import Observability from "@/components/sections/Observability";
import DeploymentPipeline from "@/components/sections/DeploymentPipeline";
import ChatWidget from "@/components/chat/ChatWidget";
import { CapacityProvider } from "@/contexts/CapacityContext";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <CapacityProvider>
          <Hero />

          <ArchitectureEvolution />

          <CapacityCalculator />

          <CostAnalysis />

          <TechSelection />

          <ArchitectureTraits />

          <Observability />

          <DeploymentPipeline />
        </CapacityProvider>
      </main>
      <ChatWidget />
    </>
  );
}
