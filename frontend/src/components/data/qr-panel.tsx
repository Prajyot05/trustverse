import * as React from "react";
import QRCode from "react-qr-code";
import { cn } from "cn";

interface QRPanelProps {
  value: string;
  size?: number;
  caption?: React.ReactNode;
  className?: string;
}

/**
 * QR code presented on a neutral paper-white tile so it scans reliably in
 * both themes, with an optional caption below.
 */
export function QRPanel({ value, size = 168, caption, className }: QRPanelProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <QRCode value={value} size={size} fgColor="#0a0a0a" bgColor="#ffffff" />
      </div>
      {caption}
    </div>
  );
}
