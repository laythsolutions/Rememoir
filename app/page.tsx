import type { Metadata } from "next";
import { HomeView } from "@/components/HomeView";

export const metadata: Metadata = {
  title: "Rememoir — My memories, my thoughts, my reflections, Me.",
};

export default function HomePage() {
  return <HomeView />;
}
