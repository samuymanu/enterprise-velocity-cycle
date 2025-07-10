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
      <div className="w-12 h-12 flex items-center justify-center bg-muted rounded border border-border text-muted-foreground text-xl" title="Imagen no disponible">
        🖼️
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
    />
  );
};

export default ProductImage;
