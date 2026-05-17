import { useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  fallback?: string;
  className?: string;
};

/**
 * Immagine da Pikipedia con fallback ad emoji se l'URL fallisce o è vuoto.
 * Non blocca mai l'app: in caso di errore mostra solo l'emoji placeholder.
 */
export function WikiImage({ src, alt, fallback = "❓", className = "" }: Props) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-night/40 border border-primary/15 rounded-xl ${className}`}
        aria-label={alt}
      >
        <span className="text-3xl">{fallback}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      loading="lazy"
      className={`object-contain bg-night/40 border border-primary/15 rounded-xl ${className}`}
    />
  );
}
