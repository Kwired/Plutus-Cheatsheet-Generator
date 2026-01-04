// src/components/CardanoIcon.tsx
// import React from "react";

export default function CardanoIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      preserveAspectRatio="xMidYMid meet"
      className={`${className} inline-block align-middle`} // <- inline-block + align-middle
      role="img"
      aria-label="Cardano logo"
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="4" r="2.2" />
      <circle cx="12" cy="20" r="2.2" />
      <circle cx="4" cy="12" r="2.2" />
      <circle cx="20" cy="12" r="2.2" />
      <circle cx="7" cy="7" r="1.5" />
      <circle cx="17" cy="7" r="1.5" />
      <circle cx="7" cy="17" r="1.5" />
      <circle cx="17" cy="17" r="1.5" />
    </svg>
  );
}
