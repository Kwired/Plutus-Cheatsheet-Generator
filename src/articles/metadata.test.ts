import { describe, it, expect } from "vitest";
import { getAllArticles } from "./index";

describe("Article Metadata Integrity", () => {
  const allMeta = getAllArticles();

  it("no two articles share the same title", () => {
    const titles = allMeta.map((m) => m.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("exploit-tagged articles are at least Advanced", () => {
    const exploits = allMeta.filter((m) => m.tags.includes("exploit"));
    expect(exploits.length).toBeGreaterThan(0);
    for (const meta of exploits) {
      expect(["Advanced", "Expert"]).toContain(meta.complexity);
    }
  });

  it("beginner articles exist in the registry", () => {
    const beginners = allMeta.filter((m) => m.complexity === "Beginner");
    expect(beginners.length).toBeGreaterThan(0);
  });

  it("expert articles exist in the registry", () => {
    const experts = allMeta.filter((m) => m.complexity === "Expert");
    expect(experts.length).toBeGreaterThan(0);
  });

  it("every tag is a non-empty lowercase string", () => {
    for (const meta of allMeta) {
      for (const tag of meta.tags) {
        expect(tag.length).toBeGreaterThan(0);
        expect(tag).toBe(tag.toLowerCase());
      }
    }
  });

  it("all articles include the plutus tag", () => {
    for (const meta of allMeta) {
      expect(meta.tags).toContain("plutus");
    }
  });

  it("most articles include the cardano tag", () => {
    const withCardano = allMeta.filter((m) => m.tags.includes("cardano"));
    const ratio = withCardano.length / allMeta.length;
    expect(ratio).toBeGreaterThan(0.8);
  });

  it("readTime follows the pattern 'N min read'", () => {
    const pattern = /^\d+ min read$/;
    for (const meta of allMeta) {
      expect(meta.readTime).toMatch(pattern);
    }
  });

  it("articles with an author have valid avatar URLs", () => {
    const withAuthor = allMeta.filter((m) => m.author);
    const urlPattern = /^https?:\/\//;
    for (const meta of withAuthor) {
      expect(meta.author.avatar).toMatch(urlPattern);
    }
  });

  it("at least three different useCases are represented", () => {
    const cases = new Set(allMeta.map((m) => m.useCase));
    expect(cases.size).toBeGreaterThanOrEqual(3);
  });

  it("at least three different complexity levels are represented", () => {
    const levels = new Set(allMeta.map((m) => m.complexity));
    expect(levels.size).toBeGreaterThanOrEqual(3);
  });

  it("DeFi articles span multiple complexity levels", () => {
    const defi = allMeta.filter((m) => m.useCase === "DeFi");
    const levels = new Set(defi.map((m) => m.complexity));
    expect(levels.size).toBeGreaterThanOrEqual(2);
  });

  it("auction articles all use V2", () => {
    const auctions = allMeta.filter((m) => m.useCase === "Auctions");
    for (const meta of auctions) {
      expect(meta.plutusVersion).toBe("V2");
    }
  });
});
