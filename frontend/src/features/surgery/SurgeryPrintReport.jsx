import { useEffect, useRef } from 'react';

export default function SurgeryPrintReport({ data, onClose }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !data?.htmlPrint) return;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @media print { body { font-family: sans-serif; margin: 0; padding: 20px; } @page { margin: 15mm; } }
          body { font-family: sans-serif; margin: 0; padding: 20px; }
        </style>
      </head>
      <body>${data.htmlPrint}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => { iframe.contentWindow.print(); }, 500);
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-paper rounded-xl shadow-2xl w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-silver">
          <h2 className="text-subheading font-semibold text-obsidian">Print Surgical Report</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate hover:text-obsidian transition-colors"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            ref={iframeRef}
            className="w-full h-full min-h-[500px] border-0"
            title="Print Preview"
          />
        </div>
      </div>
    </div>
  );
}
