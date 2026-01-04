import { useState } from "react";
import { Copy, Check, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCodeBlockPDF } from "./exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
}
export function exportMarkdown(content: string, filename = "code.md") {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

// function getCodeAsMarkdown(code: string, language?: string, filename?: string) {
//   const header = filename ? `<!-- ${filename} -->\n\n` : ""
//   return `${header}\`\`\`${language ?? ""}\n${code}\n\`\`\`\n`
// }
function getCodeAsMarkdown(
  code: string,
  language?: string,
  filename?: string
) {
  const header = filename ? `<!-- ${filename} -->\n\n` : ""

  return (
    `${header}\`\`\`${language ?? ""}\n` +
    `${code}\n` +
    `\`\`\`` +
    exportFooter("Plutus Cheatsheet Generator")
  )
}

function exportFooter(projectName = "Plutus Cheatsheet Generator") {
  const url =
    typeof window !== "undefined" ? window.location.href : ""

  const year = new Date().getFullYear()

  return `\n\n---\n\nSource: ${url}\n© ${year} ${projectName}. All rights reserved.\n`
}

export default function CodeBlock({
  code,
  language = "haskell",
  filename,
  className = "",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-700 bg-gray-900 ${className} my-6`}>
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-gray-800 border-b border-gray-700">
      {/* <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700"> */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          {filename ? (
            <span className="text-sm font-mono text-gray-300">{filename}</span>
          ) : (
            <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300 uppercase">
              {language}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </Button>

        {/* <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              exportMarkdown(
                getCodeAsMarkdown(code, language, filename),
                `${filename ?? "code"}.md`
              )
            }
            className="h-7 gap-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700"
          >
            <Download className="h-3.5 w-3.5" />
            Export
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            exportCodeBlockPDF(
              code,
              `${filename ?? "code"}.pdf`
            )
          }
          className="h-7 gap-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700"
        >
          <FileText className="h-3.5 w-3.5" />
          PDF
        </Button> */}

        <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700"
    >
      <Download className="h-3.5 w-3.5" />
      Export
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent
    align="end"
    className="w-40"
  >
    {/* Markdown export */}
    <DropdownMenuItem
      onClick={() =>
        exportMarkdown(
          getCodeAsMarkdown(code, language, filename),
          `${filename ?? "code"}.md`
        )
      }
      className="flex gap-2"
    >
      <Download className="h-4 w-4" />
      Markdown (.md)
    </DropdownMenuItem>

    {/* PDF export */}
    <DropdownMenuItem
      onClick={() =>
        exportCodeBlockPDF(
          code,
          `${filename ?? "code"}.pdf`
        )
      }
      className="flex gap-2"
    >
      <FileText className="h-4 w-4" />
      PDF (.pdf)
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
</div>
  </div>

      {/* Code content */}
      <pre className="p-4 overflow-x-auto">
        <code className="font-mono text-sm text-gray-200 leading-relaxed block whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}