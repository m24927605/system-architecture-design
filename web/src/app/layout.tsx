import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Processing Platform — Architecture Design",
  description: "Interactive 3-phase architecture visualization for an AI Processing Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
