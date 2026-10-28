import { useState, type ImgHTMLAttributes } from "react";

export function FoodImage({
  src,
  alt,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string;
  alt: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const fallback = !src || failedSrc === src;
  return (
    <img
      {...props}
      src={fallback ? "/images/food-placeholder.svg" : src}
      alt={alt}
      loading={props.loading ?? "lazy"}
      decoding="async"
      onError={fallback ? undefined : () => setFailedSrc(src)}
    />
  );
}
