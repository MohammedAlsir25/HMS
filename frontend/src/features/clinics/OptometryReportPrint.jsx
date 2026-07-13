import { useEffect, useRef } from 'react';

export default function OptometryReportPrint({ printData, onClose }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !printData?.htmlPrint) return;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @media print {
            body { font-family: sans-serif; margin: 0; padding: 20px; }
            @page { margin: 15mm; }
          }
          body { font-family: sans-serif; margin: 0; padding: 20px; }
        </style>
      </head>
      <body>${printData.htmlPrint}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.print();
    }, 500);
  }, [printData]);

  const handleThermalPrint = () => {
    if (!printData?.thermalText) return;
    const thermalWindow = window.open('', '_blank', 'width=400,height=600');
    if (!thermalWindow) return;
    thermalWindow.document.write(`
      <html><head><style>
        body { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre; padding: 10px; width: 280px; margin: 0; }
        @media print { @page { margin: 0; size: 80mm auto; } }
      </style></head><body><pre>${printData.thermalText}</pre>
      <script>setTimeout(function(){window.print();window.close();},300);<\/script>
      </body></html>
    `);
    thermalWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-paper rounded-xl shadow-2xl w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-silver">
          <h2 className="text-subheading font-semibold text-obsidian">Print Optometry Report</h2>
          <div className="flex items-center gap-2">
            {printData?.thermalText && (
              <button
                onClick={handleThermalPrint}
                className="px-4 py-2 text-sm font-medium bg-bone text-obsidian rounded-lg hover:bg-silver transition-colors"
              >
                Thermal Print
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate hover:text-obsidian transition-colors"
            >
              Close
            </button>
          </div>
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
