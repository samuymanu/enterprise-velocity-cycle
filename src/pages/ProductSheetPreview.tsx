
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ProductImage from "@/components/inventory/ProductImage";
import html2canvas from "html2canvas";

interface ProductSheetPreviewProps {
  product: {
    sku: string;
    name: string;
    brand?: string;
    category?: { name: string; parentId?: string | null };
    images?: string[];
    attributes?: Array<{
      attribute: { name: string; type: string; unit?: string };
      value: string;
    }>;
    salePrice?: number;
    costPrice?: number;
    stock?: number;
  };
  categoriaPrincipal: string;
  subcategoria: string;
  onPrint?: () => void;
}

export function ProductSheetPreview({ product, categoriaPrincipal, subcategoria, onPrint }: ProductSheetPreviewProps) {
  // Validaciones y valores por defecto para evitar errores
  if (!product) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-red-500">Error: Producto no encontrado</p>
      </div>
    );
  }

  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;
  const productName = product.name || 'Producto sin nombre';
  const productSku = product.sku || 'Sin SKU';
  const productBrand = typeof product.brand === 'string' ? product.brand : 
                      (product.brand && typeof product.brand === 'object' && 'name' in product.brand) ? 
                      (product.brand as any).name : 'Sin marca';
  const productPrice = typeof product.salePrice === 'number' ? product.salePrice : null;
  const productStock = typeof product.stock === 'number' ? product.stock : null;

  return (
    <div className="flex justify-center items-center w-full">
      <div className="bg-white rounded-2xl shadow-2xl border border-card-border p-0 w-full max-w-md flex flex-col items-center relative overflow-hidden product-sheet-print">
      {/* Estilos de impresión para tamaño carta y formato visual */}
      <style>{`
        @media print {
          html, body {
            background: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
            width: 210mm;
            height: 297mm;
          }
          body * {
            visibility: hidden;
          }
          .product-sheet-print, .product-sheet-print * {
            visibility: visible !important;
          }
          .product-sheet-print {
            position: relative !important;
            width: 180mm !important;
            height: auto !important;
            min-width: 0 !important;
            min-height: 0 !important;
            max-width: 180mm !important;
            margin: 20mm auto 0 auto !important;
            padding: 0 !important;
            box-shadow: 0 8px 32px #0002 !important;
            border-radius: 1.5rem !important;
            border: 1px solid #e5e7eb !important;
            background: #fff !important;
            z-index: 9999;
            overflow: visible !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            transform: none !important;
            left: 0 !important;
            top: 0 !important;
          }
          .product-sheet-print .shadow-2xl,
          .product-sheet-print .shadow-md {
            box-shadow: 0 8px 32px #0002 !important;
          }
          .product-sheet-print .rounded-2xl {
            border-radius: 1.5rem !important;
          }
          .product-sheet-print .bg-gradient-to-r {
            background: linear-gradient(90deg, #2563eb 90%, #60a5fa 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .product-sheet-print .w-56,
          .product-sheet-print .h-56 {
            width: 320px !important;
            height: 320px !important;
          }
          .product-sheet-print .product-sheet-imgbox img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }
          .product-sheet-print button,
          .product-sheet-print [role="button"] {
            display: none !important;
          }
        }
      `}</style>
        {/* Logo superior */}
        <div className="w-full flex justify-center items-center bg-gradient-to-r from-primary/90 to-primary/60 py-4 mb-2">
          <div className="text-white font-bold text-xl">BikeShop ERP</div>
        </div>
        {/* Imagen principal */}
        <div className="w-56 h-56 rounded-2xl bg-background-secondary flex items-center justify-center overflow-hidden border border-card-border mt-2 mb-4 shadow-md p-0">
          {firstImage ? (
            <div className="w-full h-full flex items-center justify-center product-sheet-imgbox">
              <ProductImage src={firstImage} alt={product.name} />
              <style>{`
                .product-sheet-imgbox img {
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: contain !important;
                  margin: auto;
                  display: block;
                }
              `}</style>
            </div>
          ) : (
            <span className="text-5xl text-foreground-secondary">🖼️</span>
          )}
        </div>
        {/* Nombre */}
        <div className="w-full text-center mb-2">
          <h2 className="text-2xl font-extrabold text-foreground mb-1 leading-tight tracking-tight">{productName}</h2>
          <div className="text-base text-muted-foreground font-medium mb-2">{productBrand}</div>
        </div>
        {/* Datos principales */}
        <div className="w-full px-6 text-left space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">SKU:</span>
            <span className="font-mono text-base text-foreground">{productSku}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">Categoría:</span>
            <span className="text-base text-foreground">{categoriaPrincipal || 'Sin categoría'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">Subcategoría:</span>
            <span className="text-base text-foreground">{subcategoria || 'Sin subcategoría'}</span>
          </div>
          {productPrice && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">Precio:</span>
              <span className="text-base text-foreground font-bold">${productPrice.toLocaleString()}</span>
            </div>
          )}
          {productStock !== null && productStock !== undefined && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">Stock:</span>
              <span className="text-base text-foreground">{productStock} unidades</span>
            </div>
          )}
        </div>

        {/* Atributos del producto */}
        {product.attributes && Array.isArray(product.attributes) && product.attributes.length > 0 && (
          <div className="w-full px-6 mb-4">
            <h3 className="font-semibold text-primary mb-2">Especificaciones:</h3>
            <div className="space-y-1">
              {product.attributes.map((attr, index) => {
                // Validar estructura del atributo
                if (!attr || !attr.attribute || !attr.attribute.name || attr.value === undefined) {
                  return null;
                }
                
                return (
                  <div key={index} className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{attr.attribute.name}:</span>
                    <span className="text-base text-foreground">
                      {String(attr.value)}{attr.attribute.unit ? ` ${attr.attribute.unit}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Botón imprimir y compartir */}
        <div className="w-full px-6 pb-6 flex flex-col gap-2 ficha-botones">
          {onPrint && (
            <Button onClick={onPrint} className="w-full font-semibold text-base py-2 shadow-md" variant="default">🖨️ Imprimir</Button>
          )}
          <Button
            className="w-full font-semibold text-base py-2 shadow-md bg-green-600 hover:bg-green-700 text-white"
            variant="default"
            onClick={() => {
              let ficha = `*${productName}*\nMarca: ${productBrand}\nSKU: ${productSku}\nCategoría: ${categoriaPrincipal || 'Sin categoría'}\nSubcategoría: ${subcategoria || 'Sin subcategoría'}`;
              
              if (productPrice) {
                ficha += `\nPrecio: $${productPrice.toLocaleString()}`;
              }
              
              if (product.attributes && Array.isArray(product.attributes) && product.attributes.length > 0) {
                ficha += '\n\n*Especificaciones:*';
                product.attributes.forEach(attr => {
                  if (attr && attr.attribute && attr.attribute.name && attr.value !== undefined) {
                    ficha += `\n• ${attr.attribute.name}: ${String(attr.value)}${attr.attribute.unit ? ` ${attr.attribute.unit}` : ''}`;
                  }
                });
              }
              
              if (firstImage) {
                try {
                  // Usar la función getBaseUrl del apiService para construir URL correcta
                  const baseUrl = import.meta.env.DEV ? window.location.origin : 'http://localhost:3002';
                  const imgUrl = firstImage.startsWith('http') ? firstImage : `${baseUrl}${firstImage.startsWith('/') ? firstImage : `/${firstImage}`}`;
                  ficha += `\n\n📸 Imagen: ${imgUrl}`;
                } catch (error) {
                  console.warn('Error construyendo URL de imagen:', error);
                }
              }
              
              const url = `https://wa.me/?text=${encodeURIComponent(ficha)}`;
              window.open(url, '_blank');
            }}
          >
            <span style={{fontSize: '1.2em', marginRight: 8}}>🟢</span> Compartir por WhatsApp
          </Button>
          <Button
            className="w-full font-semibold text-base py-2 shadow-md bg-blue-600 hover:bg-blue-700 text-white"
            variant="default"
            onClick={async () => {
              try {
                // Ocultar botones antes de capturar
                const botones = document.querySelector('.ficha-botones') as HTMLElement;
                if (botones) botones.style.display = 'none';
                
                // Esperar a que se oculte
                await new Promise(res => setTimeout(res, 100));
                
                const fichaNode = document.querySelector('.product-sheet-print');
                if (fichaNode) {
                  // Forzar recarga de imagen si es necesario
                  const imgs = fichaNode.querySelectorAll('img');
                  imgs.forEach(img => { 
                    if (!img.complete) {
                      img.onload = () => {};
                    }
                  });
                  
                  const canvas = await html2canvas(fichaNode as HTMLElement, {
                    background: '#fff',
                    useCORS: true,
                    allowTaint: true
                  });
                  
                  const link = document.createElement('a');
                  link.download = `${productSku || 'ficha'}-ficha-tecnica.png`;
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                }
                
                // Restaurar botones
                if (botones) botones.style.display = '';
              } catch (error) {
                console.error('Error generando imagen:', error);
                alert('Error al generar la imagen. Intenta de nuevo.');
                
                // Restaurar botones en caso de error
                const botones = document.querySelector('.ficha-botones') as HTMLElement;
                if (botones) botones.style.display = '';
              }
            }}
          >
            <span style={{fontSize: '1.2em', marginRight: 8}}>📥</span> Descargar como imagen
          </Button>
        </div>
      <style>{`
        /* Oculta los botones al imprimir o exportar imagen */
        @media print {
          .ficha-botones { display: none !important; }
        }
      `}</style>
      </div>
    </div>
  );
}
