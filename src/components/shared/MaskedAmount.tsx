"use client";

import { usePrivacyStore } from "@/stores/privacy.store";

interface Props {
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MaskedAmount({ value, className, style }: Props) {
  const hidden = usePrivacyStore((s) => s.hidden);

  return (
    <span className={className} style={style} aria-label={hidden ? "monto oculto" : undefined}>
      {hidden ? "••••" : value}
    </span>
  );
}
