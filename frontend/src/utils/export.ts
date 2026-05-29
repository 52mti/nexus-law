export const exportToWord = (element: HTMLElement | null, filename: string) => {
  if (!element) return;
  
  const htmlContent = element.innerHTML;
  
  // MS Word document template (Office HTML wrapper)
  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
    "xmlns:w='urn:schemas-microsoft-com:office:word' " +
    "xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>Export Document</title>" +
    "<style>" +
    "body { font-family: 'Segoe UI', 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #333333; }" +
    "h1 { font-size: 24pt; font-weight: bold; text-align: center; margin-bottom: 20pt; color: #111111; }" +
    "h2 { font-size: 16pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; color: #1d4ed8; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }" +
    "h3 { font-size: 13pt; font-weight: bold; margin-top: 14pt; margin-bottom: 4px; color: #374151; }" +
    "p { margin-bottom: 10pt; text-align: justify; text-indent: 2em; }" +
    "ul, ol { margin-top: 0; margin-bottom: 10pt; padding-left: 20pt; }" +
    "li { margin-bottom: 4pt; }" +
    "table { width: 100%; border-collapse: collapse; margin: 15pt 0; }" +
    "th { background-color: #f3f4f6; font-weight: bold; text-align: left; padding: 8pt; border: 1px solid #d1d5db; }" +
    "td { padding: 8pt; border: 1px solid #e5e7eb; }" +
    "strong { font-weight: bold; color: #000000; }" +
    "blockquote { margin: 15pt 0; padding-left: 10pt; border-left: 3px solid #d1d5db; color: #6b7280; }" +
    "</style>" +
    "</head><body>";
  
  const footer = "</body></html>";
  const sourceHTML = header + htmlContent + footer;
  
  const blob = new Blob(['\ufeff' + sourceHTML], {
    type: 'application/msword;charset=utf-8'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
