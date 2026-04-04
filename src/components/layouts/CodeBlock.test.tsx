import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CodeBlock from "./CodeBlock";

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

describe("CodeBlock", () => {
  const sampleCode = `mkValidator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
mkValidator _ _ _ = ()`;

  it("renders the code content", () => {
    render(<CodeBlock code={sampleCode} />);
    expect(screen.getByText(/mkValidator/)).toBeInTheDocument();
  });

  it("displays the filename when provided", () => {
    render(<CodeBlock code={sampleCode} filename="Validator.hs" />);
    expect(screen.getByText("Validator.hs")).toBeInTheDocument();
  });

  it("shows a Copy button", () => {
    render(<CodeBlock code={sampleCode} />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("shows an Export button", () => {
    render(<CodeBlock code={sampleCode} />);
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("renders the three dot indicators in the header", () => {
    const { container } = render(<CodeBlock code={sampleCode} />);
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBe(3);
  });

  it("renders code inside a pre > code block", () => {
    const { container } = render(<CodeBlock code={sampleCode} />);
    const pre = container.querySelector("pre");
    const code = pre?.querySelector("code");
    expect(pre).toBeInTheDocument();
    expect(code).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <CodeBlock code={sampleCode} className="my-custom-class" />
    );
    expect(container.firstChild).toHaveClass("my-custom-class");
  });
});
