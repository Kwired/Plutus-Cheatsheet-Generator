import { jsPDF } from "jspdf";

export function exportCodeBlockPDF(
  code: string,
  filename = "code.pdf",
  projectName = "Plutus Cheatsheet Generator"
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // Code block style
  doc.setFont("courier", "normal");
  doc.setFontSize(10);

  const lines = doc.splitTextToSize(code, pageWidth - margin * 2);

  lines.forEach((line: string) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 5;
  });

  // Footer
  const url =
    typeof window !== "undefined" ? window.location.href : "";
  const year = new Date().getFullYear();

  doc.setFontSize(9);
  doc.text(
    `Source: ${url}`,
    margin,
    285
  );

  doc.text(
    `© ${year} ${projectName}. All rights reserved.`,
    margin,
    290
  );

  doc.save(filename);
}
