import { useState, useRef, useEffect } from "react";

export type SearchFilters = {
  query: string;
  version: string;
  complexity: string;
  useCase: string;
};

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative w-full md:w-auto" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border-2 border-slate-200 rounded-lg pl-4 pr-3 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[rgba(255,140,0,0.932)] focus:ring-4 focus:ring-orange-50 transition-all cursor-pointer min-w-[150px]"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-auto py-1 text-sm top-full left-0">
          <li
            onClick={() => { onChange(""); setIsOpen(false); }}
            className={`cursor-pointer select-none py-2 px-4 hover:bg-orange-50 transition-colors ${value === "" ? "font-semibold text-[rgba(255,140,0,0.932)] bg-orange-50/50" : "text-slate-700"}`}
          >
            {placeholder}
          </li>
          {options.map((option) => (
            <li
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`cursor-pointer select-none py-2 px-4 hover:bg-orange-50 transition-colors ${value === option.value ? "font-semibold text-[rgba(255,140,0,0.932)] bg-orange-50/50" : "text-slate-700"}`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Search({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-3 w-full relative z-20">
      <div className="flex flex-1 overflow-hidden rounded-lg bg-white border-2 border-slate-200 focus-within:border-[rgba(255,140,0,0.932)] focus-within:ring-4 focus-within:ring-orange-50 transition-all">
        <input
          type="text"
          placeholder="Search snippets..."
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="w-full bg-transparent px-4 py-2.5 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 placeholder:font-normal"
        />
        <button
          type="button"
          className="flex items-center justify-center bg-[rgba(255,140,0,0.932)] hover:bg-[#e67e00] px-5 transition-colors focus:outline-none"
          aria-label="Search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 192.904 192.904"
            width="16px"
            className="fill-white"
          >
            <path d="m190.707 180.101-47.078-47.077c11.702-14.072 18.752-32.142 18.752-51.831C162.381 36.423 125.959 0 81.191 0 36.422 0 0 36.423 0 81.193c0 44.767 36.422 81.187 81.191 81.187 19.688 0 37.759-7.049 51.831-18.751l47.079 47.078a7.474 7.474 0 0 0 5.303 2.197 7.498 7.498 0 0 0 5.303-12.803zM15 81.193C15 44.694 44.693 15 81.191 15c36.497 0 66.189 29.694 66.189 66.193 0 36.496-29.692 66.187-66.189 66.187C44.693 147.38 15 117.689 15 81.193z"></path>
          </svg>
        </button>
      </div>

      <CustomSelect
        value={filters.version}
        onChange={(val) => onChange({ ...filters, version: val })}
        placeholder="All Versions"
        options={[
          { value: "V1", label: "Plutus V1" },
          { value: "V2", label: "Plutus V2" },
          { value: "V3", label: "Plutus V3" },
        ]}
      />

      <CustomSelect
        value={filters.complexity}
        onChange={(val) => onChange({ ...filters, complexity: val })}
        placeholder="Any Complexity"
        options={[
          { value: "Beginner", label: "Beginner" },
          { value: "Intermediate", label: "Intermediate" },
          { value: "Advanced", label: "Advanced" },
          { value: "Expert", label: "Expert" },
        ]}
      />

      <CustomSelect
        value={filters.useCase}
        onChange={(val) => onChange({ ...filters, useCase: val })}
        placeholder="All Use Cases"
        options={[
          { value: "DeFi", label: "DeFi" },
          { value: "NFTs", label: "NFTs" },
          { value: "Oracle", label: "Oracle" },
          { value: "Security", label: "Security" },
          { value: "Utility", label: "Utility" },
        ]}
      />
    </div>
  );
}

