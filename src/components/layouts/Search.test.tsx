import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Search from "./Search";
import type { SearchFilters } from "./Search";

function renderSearch(overrides: Partial<SearchFilters> = {}, onChange = vi.fn()) {
  const defaults: SearchFilters = {
    query: "",
    version: "",
    complexity: "",
    useCase: "",
  };

  return {
    onChange,
    ...render(
      <Search filters={{ ...defaults, ...overrides }} onChange={onChange} />
    ),
  };
}

describe("Search", () => {
  it("renders the search input", () => {
    renderSearch();
    expect(screen.getByPlaceholderText("Search snippets...")).toBeInTheDocument();
  });

  it("calls onChange for each keystroke", async () => {
    const onChange = vi.fn();
    renderSearch({}, onChange);
    const input = screen.getByPlaceholderText("Search snippets...");
    await userEvent.type(input, "ab");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("shows the version dropdown button", () => {
    renderSearch();
    expect(screen.getByText("All Versions")).toBeInTheDocument();
  });

  it("shows the complexity dropdown button", () => {
    renderSearch();
    expect(screen.getByText("Any Complexity")).toBeInTheDocument();
  });

  it("shows the use case dropdown button", () => {
    renderSearch();
    expect(screen.getByText("All Use Cases")).toBeInTheDocument();
  });

  it("opens version dropdown and shows options on click", async () => {
    renderSearch();
    const versionBtn = screen.getByText("All Versions");
    await userEvent.click(versionBtn);
    expect(screen.getByText("Plutus V1")).toBeInTheDocument();
    expect(screen.getByText("Plutus V2")).toBeInTheDocument();
    expect(screen.getByText("Plutus V3")).toBeInTheDocument();
  });

  it("opens complexity dropdown and shows options on click", async () => {
    renderSearch();
    const btn = screen.getByText("Any Complexity");
    await userEvent.click(btn);
    expect(screen.getByText("Beginner")).toBeInTheDocument();
    expect(screen.getByText("Intermediate")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    expect(screen.getByText("Expert")).toBeInTheDocument();
  });

  it("fires onChange with the selected version", async () => {
    const onChange = vi.fn();
    renderSearch({}, onChange);
    await userEvent.click(screen.getByText("All Versions"));
    await userEvent.click(screen.getByText("Plutus V2"));
    const call = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(call.version).toBe("V2");
  });

  it("displays the currently selected version label", () => {
    renderSearch({ version: "V2" });
    expect(screen.getByText("Plutus V2")).toBeInTheDocument();
  });

  it("displays the current search query value", () => {
    renderSearch({ query: "vesting" });
    const input = screen.getByPlaceholderText("Search snippets...");
    expect(input).toHaveValue("vesting");
  });
});
