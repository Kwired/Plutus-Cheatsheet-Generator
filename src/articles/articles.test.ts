import { describe, it, expect } from "vitest";
import {
  articles,
  getAllArticles,
  getArticleById,
  getArticleIndex,
  getNextArticle,
  getPrevArticle,
} from "./index";

describe("Article Registry", () => {
  const allMeta = getAllArticles();

  it("has at least 40 articles registered", () => {
    expect(articles.length).toBeGreaterThanOrEqual(40);
  });

  it("returns all article metadata from getAllArticles", () => {
    expect(allMeta.length).toBe(articles.length);
  });

  it("every article has a unique id", () => {
    const ids = allMeta.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every article has a non-empty title", () => {
    for (const meta of allMeta) {
      expect(meta.title.length).toBeGreaterThan(0);
    }
  });

  it("every article has a subtitle", () => {
    for (const meta of allMeta) {
      expect(meta.subtitle).toBeDefined();
      expect(typeof meta.subtitle).toBe("string");
    }
  });

  it("every article has a valid plutusVersion", () => {
    const valid = ["V1", "V2", "V3"];
    for (const meta of allMeta) {
      expect(valid).toContain(meta.plutusVersion);
    }
  });

  it("every article has a valid complexity level", () => {
    const valid = ["Beginner", "Intermediate", "Advanced", "Expert"];
    for (const meta of allMeta) {
      expect(valid).toContain(meta.complexity);
    }
  });

  it("every article has a useCase string", () => {
    for (const meta of allMeta) {
      expect(meta.useCase).toBeDefined();
      expect(meta.useCase.length).toBeGreaterThan(0);
    }
  });

  it("every article has a readTime field", () => {
    for (const meta of allMeta) {
      expect(meta.readTime).toBeDefined();
      expect(meta.readTime).toContain("min");
    }
  });

  it("most articles have an author with name and avatar", () => {
    const withAuthor = allMeta.filter((m) => m.author);
    expect(withAuthor.length).toBeGreaterThan(allMeta.length * 0.8);
    for (const meta of withAuthor) {
      expect(meta.author.name.length).toBeGreaterThan(0);
      expect(meta.author.avatar).toContain("http");
    }
  });

  it("every article has at least one tag", () => {
    for (const meta of allMeta) {
      expect(Array.isArray(meta.tags)).toBe(true);
      expect(meta.tags.length).toBeGreaterThan(0);
    }
  });

  it("every article has a date that parses to a valid Date", () => {
    for (const meta of allMeta) {
      const d = new Date(meta.date);
      expect(d.getTime()).not.toBeNaN();
    }
  });

  it("every article entry has a component function", () => {
    for (const entry of articles) {
      expect(typeof entry.component).toBe("function");
    }
  });
});

describe("getArticleById", () => {
  it("returns the correct article for a known id", () => {
    const article = getArticleById("always-succeeds");
    expect(article).toBeDefined();
    expect(article!.meta.title).toBe("Always Succeeds");
  });

  it("returns undefined for a non-existent id", () => {
    const result = getArticleById("does-not-exist-xyz");
    expect(result).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getArticleById("")).toBeUndefined();
  });
});

describe("getArticleIndex", () => {
  it("returns a valid index for a registered article", () => {
    const idx = getArticleIndex("always-succeeds");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(articles.length);
  });

  it("returns -1 for a missing id", () => {
    expect(getArticleIndex("nope")).toBe(-1);
  });
});

describe("getNextArticle / getPrevArticle", () => {
  it("next article of the first entry is the second entry", () => {
    const firstId = getAllArticles()[0].id;
    const secondId = getAllArticles()[1].id;
    const next = getNextArticle(firstId);
    expect(next).not.toBeNull();
    expect(next!.meta.id).toBe(secondId);
  });

  it("prev article of the first entry is null", () => {
    const firstId = getAllArticles()[0].id;
    expect(getPrevArticle(firstId)).toBeNull();
  });

  it("next article of the last entry is null", () => {
    const lastId = getAllArticles()[getAllArticles().length - 1].id;
    expect(getNextArticle(lastId)).toBeNull();
  });

  it("prev article of the last entry is the second-to-last", () => {
    const all = getAllArticles();
    const lastId = all[all.length - 1].id;
    const prev = getPrevArticle(lastId);
    expect(prev).not.toBeNull();
    expect(prev!.meta.id).toBe(all[all.length - 2].id);
  });

  it("returns null for an unknown id", () => {
    expect(getNextArticle("unknown-id")).toBeNull();
    expect(getPrevArticle("unknown-id")).toBeNull();
  });
});
