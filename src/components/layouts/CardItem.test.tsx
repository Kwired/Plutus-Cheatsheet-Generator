import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CardItem from "./CardItem";
import type { CardData } from "./CardItem";

function renderCard(overrides: Partial<CardData> = {}) {
  const defaults: CardData = {
    id: "test-card",
    title: "Test Validator",
    description: "A test description for the card",
    image: "https://example.com/img.png",
    timeLabel: "1/1/2025",
    views: "2.3k",
    readtime: "5 min read",
    plutusVersion: "V2",
    complexity: "Intermediate",
  };

  return render(
    <MemoryRouter>
      <CardItem card={{ ...defaults, ...overrides }} />
    </MemoryRouter>
  );
}

describe("CardItem", () => {
  it("renders the title", () => {
    renderCard({ title: "Always Succeeds" });
    expect(screen.getByText("Always Succeeds")).toBeInTheDocument();
  });

  it("renders the description", () => {
    renderCard({ description: "A Plutus validator that always passes" });
    expect(
      screen.getByText("A Plutus validator that always passes")
    ).toBeInTheDocument();
  });

  it("shows the plutusVersion badge", () => {
    renderCard({ plutusVersion: "V2" });
    expect(screen.getByText("V2")).toBeInTheDocument();
  });

  it("shows the complexity badge", () => {
    renderCard({ complexity: "Expert" });
    expect(screen.getByText("Expert")).toBeInTheDocument();
  });

  it("renders a View link pointing to the article", () => {
    renderCard({ id: "my-article" });
    const link = screen.getByRole("link", { name: "View" });
    expect(link).toHaveAttribute("href", "/article/my-article");
  });

  it("displays the time label", () => {
    renderCard({ timeLabel: "3/15/2025" });
    expect(screen.getByText("3/15/2025")).toBeInTheDocument();
  });

  it("displays the read time", () => {
    renderCard({ readtime: "8 min read" });
    expect(screen.getByText("8 min read")).toBeInTheDocument();
  });

  it("does not crash when plutusVersion is empty", () => {
    renderCard({ plutusVersion: "" });
    expect(screen.getByText("Test Validator")).toBeInTheDocument();
  });

  it("does not crash when complexity is empty", () => {
    renderCard({ complexity: "" });
    expect(screen.getByText("Test Validator")).toBeInTheDocument();
  });
});
