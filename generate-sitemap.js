import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = "https://plutus-cheatsheet.vercel.app"; // Change this if you have a custom domain

const articlesDir = path.join(__dirname, "src/articles");
const sitemapPath = path.join(__dirname, "public/sitemap.xml");
const apiPath = path.join(__dirname, "public/articles.json");

try {
    const files = fs.readdirSync(articlesDir);
    const articleIds = [];
    const articlesData = [];

    for (const file of files) {
        if (file.endsWith(".tsx") && file !== "index.ts") {
            const filePath = path.join(articlesDir, file);
            const content = fs.readFileSync(filePath, "utf-8");

            // Match the `id: "some-id"` inside the articleMeta object
            const idMatch = content.match(/id:\s*["']([^"']+)["']/);
            if (idMatch && idMatch[1]) {
                const id = idMatch[1];
                articleIds.push(id);

                // Extract basic metadata for the Discord Bot
                const titleMatch = content.match(/title:\s*["'](.*?)["']/);
                const subtitleMatch = content.match(/subtitle:\s*["'](.*?)["']/);
                const dateMatch = content.match(/date:\s*["']([^"']+)["']/);
                const versionMatch = content.match(/plutusVersion:\s*["']([^"']+)["']/);
                const complexityMatch = content.match(/complexity:\s*["']([^"']+)["']/);
                const tagsMatch = content.match(/tags:\s*\[(.*?)\]/);

                let tags = [];
                if (tagsMatch && tagsMatch[1]) {
                    tags = tagsMatch[1].split(",").map(t => t.replace(/["'\s]/g, "")).filter(Boolean);
                }

                articlesData.push({
                    id,
                    url: `${DOMAIN}/article/${id}`,
                    title: titleMatch ? titleMatch[1] : id,
                    subtitle: subtitleMatch ? subtitleMatch[1] : "",
                    date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
                    plutusVersion: versionMatch ? versionMatch[1] : "V2",
                    complexity: complexityMatch ? complexityMatch[1] : "Intermediate",
                    tags
                });
            }
        }
    }

    // --- 1. GENERATE SITEMAP.XML --- 
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Dynamic Articles -->
${articleIds
            .map(
                (id) => `  <url>
    <loc>${DOMAIN}/article/${id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
            )
            .join("\n")}
</urlset>`;

    fs.writeFileSync(sitemapPath, sitemapContent);
    console.log(`✅ Sitemap successfully generated with ${articleIds.length} articles!`);

    // --- 2. GENERATE ARTICLES.JSON (API for Discord Bot) ---
    fs.writeFileSync(apiPath, JSON.stringify(articlesData, null, 2));
    console.log(`✅ articles.json successfully generated with ${articlesData.length} articles!`);

} catch (error) {
    console.error("❌ Error generating sitemap/api:", error);
}
