import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}

const ProductImage = ({ src, alt, className, style, onError }: ProductImageProps) => {
  const [imageSrc, setImageSrc] = useState('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (src) {
      // Si la ruta ya es absoluta, úsala tal cual
      if (/^https?:\/\//.test(src)) {
        setImageSrc(src);
      } else {
        // Para archivos estáticos como imágenes, usar getBaseUrl() en lugar de getApiUrl()
        const baseUrl = apiService.getBaseUrl();
        setImageSrc(`${baseUrl}${src.startsWith('/') ? src : '/' + src}`);
      }
      setHasError(false);
    } else {
      setImageSrc('');
      setHasError(true);
    }
  }, [src]);

  const handleError = () => {
    console.error('Failed to load image:', imageSrc, 'original src:', src);
    setHasError(true);
    if (onError) {
      onError();
    }
  };

  if (hasError || !imageSrc) {
    return (
      <div 
        className={className || "w-12 h-12 flex flex-col items-center justify-center bg-muted rounded border border-border text-muted-foreground text-xs text-center break-all"} 
        style={style}
        title="Imagen no disponible"
      >
        <span className="text-xl">🖼️</span>
        {src && (
          <span className="block mt-1 max-w-[44px] overflow-hidden text-ellipsis" style={{fontSize:'8px'}}>{src}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className || "w-12 h-12 object-cover rounded border border-border bg-white"}
      style={style}
      onError={handleError}
      title={`${alt}\n${src}`}
      loading="lazy"
    />
  );
};

export default ProductImage;
