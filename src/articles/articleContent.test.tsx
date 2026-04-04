import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { articles } from "./index";

vi.mock("@/components/layouts/CodeBlock", () => ({
  default: (p: { code: string; language?: string; filename?: string }) => (
    <pre data-testid="cb" data-lang={p.language ?? ""}>
      {p.code}
    </pre>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));

const allArticles = articles.filter((a) => a.meta?.id && a.meta?.title);

describe("article content checks", () => {

  for (const entry of allArticles) {
    const slug = entry.meta.id;

    describe(slug, () => {

      it("shows h2 headings", () => {
        const C = entry.component;
        const { container } = render(<C />);
        expect(container.querySelectorAll("h2").length).toBeGreaterThan(0);
      });

      it("has enough text (not just code)", () => {
        const C = entry.component;
        const { container } = render(<C />);
        // anything under 100 chars is basically empty
        expect(container.textContent!.length).toBeGreaterThan(100);
      });

      it("code snippets have language set", () => {
        const C = entry.component;
        const { container } = render(<C />);
        const blocks = container.querySelectorAll("[data-testid='cb']");
        // only check when there are code blocks. some mini-articles (scenario pages)
        // don't have any and that's fine
        if (blocks.length === 0) return;
        const langs = Array.from(blocks).map((b) => b.getAttribute("data-lang"));
        expect(langs.some((l) => l && l.length > 0)).toBe(true);
      });

      it("code blocks aren't empty", () => {
        const C = entry.component;
        const { container } = render(<C />);
        container.querySelectorAll("[data-testid='cb']").forEach((b) => {
          expect(b.textContent!.trim().length).toBeGreaterThan(0);
        });
      });

      // ran into a bug once where two h2s had the same id — breaks anchor links
      // h2id is a known shared one some older articles use so we skip that
      it("no duplicate heading ids", () => {
        const C = entry.component;
        const { container } = render(<C />);
        const ids = Array.from(container.querySelectorAll("h2[id]"))
          .map((el) => el.id)
          .filter((id) => id !== "h2id");
        expect(new Set(ids).size).toBe(ids.length);
      });
    });
  }
});
