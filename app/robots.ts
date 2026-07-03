import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// robots.txt — permite motores de busca e bots de IA (SEO + "GPT SEO"),
// bloqueando apenas áreas privadas.
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/",
    "/admin",
    "/conta",
    "/garagem",
    "/favoritos",
    "/dashboard",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // bots de IA — deixamos indexar para aparecer em respostas de assistentes
      { userAgent: "GPTBot", allow: "/", disallow },
      { userAgent: "OAI-SearchBot", allow: "/", disallow },
      { userAgent: "ChatGPT-User", allow: "/", disallow },
      { userAgent: "PerplexityBot", allow: "/", disallow },
      { userAgent: "Google-Extended", allow: "/", disallow },
      { userAgent: "Applebot-Extended", allow: "/", disallow },
      { userAgent: "ClaudeBot", allow: "/", disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
