interface Props {
  value: string;
  className?: string;
  alt?: string;
}

/**
 * Mostra un'icona di risultato: emoji oppure immagine personalizzata
 * (se `value` è un URL http(s) o path che inizia con `/`).
 *
 * `className` controlla la dimensione tramite font-size (es. text-3xl):
 * l'immagine viene scalata a 1em × 1em così resta coerente con l'emoji.
 */
export function ResultIcon({ value, className = "text-3xl", alt = "icona" }: Props) {
  const isUrl = /^(https?:\/\/|\/)/i.test(value);
  if (isUrl) {
    return (
      <span className={`${className} inline-flex items-center justify-center leading-none`}>
        <img
          src={value}
          alt={alt}
          className="object-cover rounded-md"
          style={{ width: "1em", height: "1em" }}
        />
      </span>
    );
  }
  return <span className={className}>{value}</span>;
}
