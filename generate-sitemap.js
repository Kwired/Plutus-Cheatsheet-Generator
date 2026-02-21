import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = "https://plutus-cheatsheet.vercel.app";

const articlesDir = path.join(__dirname, "src/articles");
const sitemapPath = path.join(__dirname, "public/sitemap.xml");

try {
    const files = fs.readdirSync(articlesDir);
    const articleIds = [];

    for (const file of files) {
        if (file.endsWith(".tsx") && file !== "index.ts") {
            const filePath = path.join(articlesDir, file);
            const content = fs.readFileSync(filePath, "utf-8");

            // Match the `id: "some-id"` inside the articleMeta object
            const idMatch = content.match(/id:\s*["']([^"']+)["']/);
            if (idMatch && idMatch[1]) {
                articleIds.push(idMatch[1]);
            }
        }
    }

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
} catch (error) {
    console.error("❌ Error generating sitemap:", error);
}
