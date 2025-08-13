import HoverEffect from "@/components/ui/card-hover-effect";


export default function CardHoverEffectDemo() {
  return (
    <div className="max-w-5xl mx-auto px-8">
      <HoverEffect items={projects} />
    </div>
  );
}
export const projects = [
  {
    title: "Socratic",
    description:
      "An AI model that helps you learn by guiding you through questions and prompts, encouraging you to discover answers yourself.",
    link: "/models/socratic",
  },
  {
    title: "Feynman",
    description:
      "Explains concepts in the simplest possible way, breaking down complex ideas into clear, everyday language.",
    link: "/models/feynman",
  },
  {
    title: "Creative Writer",
    description:
      "Specializes in storytelling, world-building, and crafting engaging narratives for books, scripts, or games.",
    link: "/models/creative-writer",
  },
  {
    title: "Code Companion",
    description:
      "Expert in multiple programming languages, helping you debug, optimize, and learn software development.",
    link: "/models/code-companion",
  },
  {
    title: "Data Analyst",
    description:
      "Turns raw data into meaningful insights through statistical analysis, visualization, and predictive modeling.",
    link: "/models/data-analyst",
  },
  {
    title: "Research Assistant",
    description:
      "Quickly finds, summarizes, and synthesizes academic papers, technical documents, and reference materials.",
    link: "/models/research-assistant",
  },
];
