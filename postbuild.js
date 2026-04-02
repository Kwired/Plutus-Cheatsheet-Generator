import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = "https://plutus-cheatsheet.vercel.app";

const distDir = path.join(__dirname, "dist");
const apiPath = path.join(__dirname, "dist/articles.json");
const indexHtmlPath = path.join(distDir, "index.html");

try {
    if (!fs.existsSync(apiPath)) {
        throw new Error("articles.json not found in dist. Ensure generate-sitemap.js runs before build.");
    }
    if (!fs.existsSync(indexHtmlPath)) {
        throw new Error("index.html not found in dist. Ensure Vite build ran successfully.");
    }

    const articlesData = JSON.parse(fs.readFileSync(apiPath, "utf-8"));
    const baseHtml = fs.readFileSync(indexHtmlPath, "utf-8");

    // We will replace <title>plutus-cheatsheet-generator</title> with custom tags
    const titleRegex = /<title>plutus-cheatsheet-generator<\/title>/i;

    let generatedCount = 0;

    for (const article of articlesData) {
        const articleDir = path.join(distDir, "article", article.id);
        fs.mkdirSync(articleDir, { recursive: true });

        // Escape helper
        const escapeHtml = (unsafe) => {
            return (unsafe || "").toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const ogTitle = escapeHtml(article.title);
        const ogDesc = escapeHtml(article.subtitle || `Learn about ${article.title} in Plutus`);
        const ogUrl = `${DOMAIN}/article/${article.id}`;

        // Custom meta tags to inject
        const metaTags = `
    <title>${ogTitle} | Plutus Cheatsheet</title>
    <meta name="description" content="${ogDesc}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDesc}" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:site_name" content="Plutus Cheatsheet" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDesc}" />
        `.trim();

        // Inject the meta tags in place of the default <title>
        const articleHtml = baseHtml.replace(titleRegex, metaTags);

        fs.writeFileSync(path.join(articleDir, "index.html"), articleHtml);
        generatedCount++;
    }

    console.log(`✅ Postbuild: Generated ${generatedCount} static index.html pages for articles!`);
} catch (error) {
    console.error("❌ Error in postbuild script:", error);
    process.exit(1);
}
