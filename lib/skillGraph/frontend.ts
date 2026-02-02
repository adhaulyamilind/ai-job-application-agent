import { SkillNode } from "./types";

export const frontendSkills: Record<string, SkillNode> = {
  react: {
    id: "react",
    displayName: "React",
    aliases: ["reactjs", "react.js"],
    domain: "frontend"
  },
  nextjs: {
    id: "nextjs",
    displayName: "Next.js",
    aliases: ["next js", "nextjs"],
    domain: "frontend"
  },
  uiOptimization: {
    id: "ui-optimization",
    displayName: "UI Optimization",
    aliases: ["performance", "ui performance", "optimization"],
    domain: "frontend"
  },
  frontendArchitecture: {
    id: "frontend-architecture",
    displayName: "Frontend Architecture",
    aliases: ["architecture", "frontend design"],
    domain: "frontend"
  }
};

export const frontendEdges = [
  {
    from: "nextjs",
    to: "react",
    weight: 0.9,
    reason: "Next.js is built on React"
  },
  {
    from: "ui-optimization",
    to: "react",
    weight: 0.7,
    reason: "React apps require UI optimization"
  },
  {
    from: "frontend-architecture",
    to: "react",
    weight: 0.6,
    reason: "Frontend architecture often implies React"
  }
];
