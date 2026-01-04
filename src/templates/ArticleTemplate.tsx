// templates/ArticleTemplate.tsx
import CodeBlock from "@/components/layouts/CodeBlock";

// Copy this template to create new articles
export const articleMeta = {
  id: "article-id", // Unique ID (no spaces, use hyphens)
  title: "Article Title",
  subtitle: "Article subtitle here",
  date: new Date().toISOString().split('T')[0],
  readTime: "5 min read",
  tags: ["plutus", "haskell", "example"],
  author: {
    name: "Author Name",
    avatar: "https://i.pravatar.cc/48?img=1"
  }
};

export default function ArticleTemplate() {
  const haskellCode = `-- Your Plutus code here
module YourModule where

import Plutus.V2.Ledger.Api

-- Your code goes here`;

  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>
      <p>Start your article here...</p>
      
      <h2 id="code">Code Example</h2>
      <p>Explain your code here:</p>
      
      <CodeBlock 
        code={haskellCode} 
        language="haskell"
        filename="YourModule.hs"
      />
      
      <h3 id="explanation">Explanation</h3>
      <p>Explain what the code does...</p>
      
      <h3 id="usage">Usage</h3>
      <p>How to use this code...</p>
    </div>
  );
}