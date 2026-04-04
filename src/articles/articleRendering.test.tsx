import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { articles } from "./index";

// stub out CodeBlock — we just care that articles call it, not how it looks
vi.mock("@/components/layouts/CodeBlock", () => ({
  default: (props: { filename?: string }) => <pre data-testid="codeblock">{props.filename || "code"}</pre>,
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

// grab only the actual articles (skip stubs that have no id or title)
const validArticles = articles.filter((a) => a.meta?.id && a.meta?.title);

describe("all articles render", () => {
  for (const entry of validArticles) {
    const { id, title } = entry.meta;

    describe(title, () => {
      it("mounts without throwing", () => {
        const Comp = entry.component;
        const { container } = render(<Comp />);
        expect(container.innerHTML.length).toBeGreaterThan(0);
      });

      it("uses the .article-content wrapper", () => {
        const Comp = entry.component;
        const { container } = render(<Comp />);
        expect(container.querySelector(".article-content")).not.toBeNull();
      });

      it("has section headings", () => {
        const Comp = entry.component;
        const { container } = render(<Comp />);
        // every article should have at least one h2 or h3
        const headings = container.querySelectorAll("h2, h3");
        expect(headings.length).toBeGreaterThanOrEqual(1);
      });

      it("has paragraphs of text", () => {
        const Comp = entry.component;
        const { container } = render(<Comp />);
        const pTags = container.querySelectorAll("p");
        expect(pTags.length).toBeGreaterThanOrEqual(1);
      });

      // some of the smaller scenario articles (like NFTMintFirstTime) don't
      // use CodeBlock at all, so only check the ones that do
      it("codeblocks are not empty when present", () => {
        const Comp = entry.component;
        const { container } = render(<Comp />);
        container.querySelectorAll("[data-testid='codeblock']").forEach((el) => {
          expect(el.textContent!.trim()).not.toBe("");
        });
      });
    });
  }
});
