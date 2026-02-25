import type { Metadata } from "next";
import { AutobiographyView } from "@/components/AutobiographyView";

export const metadata: Metadata = {
  title: "My Autobiography",
};

export default function AutobiographyPage() {
  return <AutobiographyView />;
}
