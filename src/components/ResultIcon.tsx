interface Props {
  value: string;
  className?: string;
  alt?: string;
}

/**
 * Mostra un'icona di risultato: emoji oppure immagine personalizzata
 * (se `value` è un URL http(s) o path che inizia con `/`).
 */
export function ResultIcon({ value, className = "text-3xl", alt = "icona" }: Props) {
  const isUrl = /^(https?:\/\/|\/)/i.test(value);
  if (isUrl) {
    return (
      <img
        src={value}
        alt={alt}
        className={`inline-block object-cover rounded-md ${className}`}
        style={{ aspectRatio: "1 / 1" }}
      />
    );
  }
  return <span className={className}>{value}</span>;
}
