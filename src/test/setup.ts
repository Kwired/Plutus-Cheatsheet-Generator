import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "gtag", {
  value: () => {},
  writable: true,
});

Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: () => Promise.resolve(),
    readText: () => Promise.resolve(""),
  },
  writable: true,
});
