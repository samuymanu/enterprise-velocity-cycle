import { useState, useEffect } from 'react';

interface ProductImageProps {
  src: string | null;
  alt: string;
}

const ProductImage = ({ src, alt }: ProductImageProps) => {
  const [imageSrc, setImageSrc] = useState('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (src) {
      setImageSrc(`http://localhost:3001${src}`);
      setHasError(false);
    } else {
      setImageSrc('');
      setHasError(true); // Consider no src as an error/placeholder case
    }
  }, [src]);

  const handleError = () => {
    setHasError(true);
  };

  if (hasError || !imageSrc) {
    return (
      <div className="w-12 h-12 flex flex-col items-center justify-center bg-muted rounded border border-border text-muted-foreground text-xs text-center break-all" title="Imagen no disponible">
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
      className="w-12 h-12 object-cover rounded border border-border bg-white"
      onError={handleError}
      title={`${alt}\n${src}`}
      loading="lazy"
    />
  );
};

export default ProductImage;
