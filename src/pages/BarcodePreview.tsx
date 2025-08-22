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
      <div className="w-full flex gap-2">
        <Button onClick={handlePrint} className="flex-1" variant="default">
          🖨️ Imprimir
        </Button>
        <Button
          onClick={async () => {
            try {
              if (!svgRef.current) return;
              const svg = svgRef.current;
              const serializer = new XMLSerializer();
              let svgString = serializer.serializeToString(svg);

              if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
                svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
              }

              // Crear blob y cargarlo en una imagen para dibujar en canvas
              const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const img = new Image();
              img.onload = () => {
                try {
                  // Intentar obtener tamaño desde bbox, si falla usar bounding rect
                  let width = 0;
                  let height = 0;
                  try {
                    const bbox = svg.getBBox();
                    width = bbox.width || Math.ceil(svg.getBoundingClientRect().width) || 300;
                    height = bbox.height || Math.ceil(svg.getBoundingClientRect().height) || 100;
                  } catch (e) {
                    const rect = svg.getBoundingClientRect();
                    width = Math.ceil(rect.width) || 300;
                    height = Math.ceil(rect.height) || 100;
                  }

                  // Escala para alta calidad (ajusta si necesitas más resolución)
                  const scale = 4;
                  const canvas = document.createElement('canvas');
                  canvas.width = Math.max(1, Math.ceil(width * scale));
                  canvas.height = Math.max(1, Math.ceil(height * scale));
                  const ctx = canvas.getContext('2d');
                  if (!ctx) throw new Error('No se pudo obtener el contexto del canvas');

                  // Fondo blanco (evita transparencias indeseadas en JPG)
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);

                  // Dibujar imagen escalada
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                  // Exportar como JPEG de alta calidad
                  canvas.toBlob((outBlob) => {
                    if (!outBlob) {
                      URL.revokeObjectURL(url);
                      return;
                    }
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(outBlob);
                    link.download = `${sku || 'barcode'}-alta.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                  }, 'image/jpeg', 0.95);
                } catch (err) {
                  console.error('Error generando JPG del código de barras', err);
                  URL.revokeObjectURL(url);
                }
              };
              img.onerror = (err) => {
                console.error('Error cargando SVG para conversión a imagen', err);
                URL.revokeObjectURL(url);
              };
              img.src = url;
            } catch (error) {
              console.error('Error en descarga JPG:', error);
              alert('No se pudo generar la imagen JPG. Revisa la consola para más detalles.');
            }
          }}
          className="w-36"
          variant="default"
        >
          📥 Descargar JPG
        </Button>
      </div>
    </div>
  );
}
