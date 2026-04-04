import { describe, it, expect } from "vitest";
import { articles, type ArticleMeta } from "./index";

/*
  quick sanity checks on every article's metadata.
  catches stuff like missing tags, bad dates, typos in complexity etc.
*/

const entries = articles.filter((a) => a.meta?.id);

describe("article metadata", () => {
  for (const entry of entries) {
    const m = entry.meta as ArticleMeta;

    describe(`${m.id}`, () => {
      it("id and title are filled in", () => {
        expect(m.id).toBeTruthy();
        expect(m.title.length).toBeGreaterThan(0);
      });

      it("subtitle exists", () => {
        expect(m.subtitle).toBeTruthy();
      });

      it("date is valid ISO", () => {
        expect(new Date(m.date).toString()).not.toBe("Invalid Date");
      });

      it("readTime looks right", () => {
        // should be like "5 min read"
        expect(m.readTime).toMatch(/^\d+ min read$/);
      });

      it("tags", () => {
        expect(m.tags.length).toBeGreaterThan(0);
        expect(m.tags).toContain("plutus");
        // no uppercase in tags
        m.tags.forEach((t) => expect(t).toBe(t.toLowerCase()));
      });

      it("plutusVersion is V1/V2/V3", () => {
        expect(["V1", "V2", "V3"]).toContain(m.plutusVersion);
      });

      it("complexity is one of the four levels", () => {
        expect(["Beginner", "Intermediate", "Advanced", "Expert"]).toContain(m.complexity);
      });

      it("useCase is set", () => {
        expect(m.useCase).toBeTruthy();
      });

      // the three NFT scenario articles don't have author, everything else should
      it("author info (when provided)", () => {
        if (!m.author) return;
        expect(m.author.name).toBeTruthy();
        expect(m.author.avatar).toMatch(/^https?:\/\//);
      });
    });
  }
});
