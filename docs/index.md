# Plutus Cheatsheet Generator: Docs

> [!TIP]
> View the [Interactive Portal](./index.html) for a better experience.

Documentation and usage guides for the **Plutus Cheatsheet Generator**.

### 📖 Quick Links
- **[User Guide](./USER_GUIDE.md)**: Search, filters, and export tools.
- **[Developer Setup](../README.md)**: Running the project locally.

---

## 🚀 Overview
The Plutus Cheatsheet Generator provides 66+ curated smart contract snippets, from "Hello World" scripts to DeFi primitives.

![Homepage Interface](../evidence/milestone3/screenshots/homepage.png)

### Features
- **Search**: Find contracts by title, keyword, or identifier.
- **Filtering**: Sort by Plutus Version (V1, V2, V3), Complexity, and Use-Case.
- **Tutorials**: Debugging guides for common Plutus vulnerabilities.
- **Export**: Download tutorials as PDF or Markdown.

---

## 🔍 Search & Filtering
The search and filter system helps find specific implementation patterns or Plutus versions quickly.

![Search and Filtering](../evidence/milestone3/screenshots/search_results.png)

### Filter Options:
1. **Plutus Version**: V1 (Legacy), V2 (Babbage), or V3 (Conway).
2. **Complexity**: Beginner to Expert levels.
3. **Use Case**: DeFi, NFTs, Oracles, and Security.

---

## 🛡️ Security & Debugging
The platform includes guides for identifying and fixing common smart contract vulnerabilities.

![Tutorial Page Example](../evidence/milestone3/screenshots/tutorial_page.png)

### Security Guides:
- **[Double Satisfaction Exploit](https://plutus-cheatsheet.vercel.app/article/doublesatisfaction)**: Input evaluation in the EUTxO model.
- **[Replay Attacks](https://plutus-cheatsheet.vercel.app/article/replayattack)**: Using nonces and transaction-specific data.
- **[Datum Mismatch](https://plutus-cheatsheet.vercel.app/article/datummismatch)**: State-machine errors and type mismatches.

---

## 📥 Exporting
Articles can be exported for local reference or project documentation.

1. Open any article.
2. Click **Export** at the top right.
3. Select **PDF** or **Markdown**.

---

## 🛠️ Technical Stack
- **Framework**: React 19 + TypeScript.
- **Styling**: Tailwind CSS.
- **Performance**: Static page generation.

---

*Found an issue? [Report it on GitHub](https://github.com/kwired/Plutus-Cheatsheet-Generator).*
