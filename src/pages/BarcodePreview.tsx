import { useRef, useEffect } from "react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";

export function BarcodePreview({ sku }: { sku: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, sku, {
        format: "CODE128",
        lineColor: "#222",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 18,
        margin: 10,
      });
    }
  }, [sku]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=250');
    if (printWindow && svgRef.current) {
      printWindow.document.write(`
        <html><head><title>Imprimir Código de Barras</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;">
        ${svgRef.current.outerHTML}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 200);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <svg ref={svgRef} />
      <Button onClick={handlePrint} className="w-full" variant="default">
        🖨️ Imprimir
      </Button>
    </div>
  );
}
