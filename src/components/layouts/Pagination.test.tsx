import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "./Pagination";

describe("Pagination", () => {
  it("renders the results summary text", () => {
    render(
      <Pagination total={50} page={1} perPage={12} onPageChange={() => {}} />
    );
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("disables the previous button on page 1", () => {
    render(
      <Pagination total={50} page={1} perPage={12} onPageChange={() => {}} />
    );
    const prevBtn = screen.getByLabelText("Previous page");
    expect(prevBtn).toBeDisabled();
  });

  it("disables the next button on the last page", () => {
    render(
      <Pagination total={50} page={5} perPage={12} onPageChange={() => {}} />
    );
    const nextBtn = screen.getByLabelText("Next page");
    expect(nextBtn).toBeDisabled();
  });

  it("enables the next button when not on the last page", () => {
    render(
      <Pagination total={50} page={1} perPage={12} onPageChange={() => {}} />
    );
    const nextBtn = screen.getByLabelText("Next page");
    expect(nextBtn).not.toBeDisabled();
  });

  it("calls onPageChange with the next page when clicking next", async () => {
    const handler = vi.fn();
    render(
      <Pagination total={50} page={2} perPage={12} onPageChange={handler} />
    );
    const nextBtn = screen.getByLabelText("Next page");
    await userEvent.click(nextBtn);
    expect(handler).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with the previous page when clicking prev", async () => {
    const handler = vi.fn();
    render(
      <Pagination total={50} page={3} perPage={12} onPageChange={handler} />
    );
    const prevBtn = screen.getByLabelText("Previous page");
    await userEvent.click(prevBtn);
    expect(handler).toHaveBeenCalledWith(2);
  });

  it("does not render nav buttons when there is only one page", () => {
    render(
      <Pagination total={5} page={1} perPage={12} onPageChange={() => {}} />
    );
    expect(screen.queryByLabelText("Previous page")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next page")).not.toBeInTheDocument();
  });

  it("highlights the active page button with aria-current", () => {
    render(
      <Pagination total={50} page={2} perPage={12} onPageChange={() => {}} />
    );
    const activeBtn = screen.getByRole("button", { name: "2" });
    expect(activeBtn).toHaveAttribute("aria-current", "page");
  });

  it("clicking a page number fires onPageChange", async () => {
    const handler = vi.fn();
    render(
      <Pagination total={50} page={1} perPage={12} onPageChange={handler} />
    );
    const page2 = screen.getByRole("button", { name: "2" });
    await userEvent.click(page2);
    expect(handler).toHaveBeenCalledWith(2);
  });

  it("renders the correct total pages for various totals", () => {
    const { unmount } = render(
      <Pagination total={24} page={1} perPage={12} onPageChange={() => {}} />
    );
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "3" })).not.toBeInTheDocument();
    unmount();
  });
});
