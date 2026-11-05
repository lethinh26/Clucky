"use client";

import { useState, type ImgHTMLAttributes } from "react";

export function FoodImage({
  src,
  alt,
  usePlaceholder = true,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string;
  alt: string;
  usePlaceholder?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const fallback = usePlaceholder && (!src || failedSrc === src);
  return (
    <img
      {...props}
      src={fallback ? "/images/food-placeholder.svg" : src}
      alt={alt}
      loading={props.loading ?? "lazy"}
      decoding="async"
      onError={fallback || !usePlaceholder ? undefined : () => setFailedSrc(src)}
    />
  );
}
