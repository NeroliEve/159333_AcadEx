"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

type BrandTitleProps = {
  className?: string;
  height?: number;
  priority?: boolean;
  width?: number;
};

export function BrandTitle({
  className,
  height = 40,
  priority = false,
  width = 200,
}: BrandTitleProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const src = mounted && resolvedTheme === "dark"
    ? "/acadex-title-dark.svg"
    : "/acadex-title-light.svg";

  return (
    <Image
      src={src}
      alt="Acadex"
      width={width}
      height={height}
      className={className ?? "h-8 w-auto"}
      priority={priority}
    />
  );
}