import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import ArchitectureEvolution from "@/components/sections/ArchitectureEvolution";
import TaskFlow from "@/components/sections/TaskFlow";
import CapacityCalculator from "@/components/sections/CapacityCalculator";
import CostAnalysis from "@/components/sections/CostAnalysis";
import TechSelection from "@/components/sections/TechSelection";
import ArchitectureTraits from "@/components/sections/ArchitectureTraits";
import DeploymentPipeline from "@/components/sections/DeploymentPipeline";
import ChatWidget from "@/components/chat/ChatWidget";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />

        <ArchitectureEvolution />

        <TaskFlow />

        <CapacityCalculator />

        <CostAnalysis />

        <TechSelection />

        <ArchitectureTraits />

        <DeploymentPipeline />
      </main>
      <ChatWidget />
    </>
  );
}
