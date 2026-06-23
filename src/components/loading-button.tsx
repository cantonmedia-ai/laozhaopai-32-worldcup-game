"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

type LoadingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
};

export function LoadingButton({
  children,
  className,
  disabled,
  loading = false,
  loadingText = "正在处理...",
  icon,
  onClick,
  ...props
}: LoadingButtonProps) {
  const [localLoading, setLocalLoading] = useState(false);
  const activeLoading = loading || localLoading;

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (activeLoading || disabled) {
      event.preventDefault();
      return;
    }

    setLocalLoading(true);
    window.setTimeout(() => setLocalLoading(false), 1200);
    onClick?.(event);
  }

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={disabled || activeLoading}
      className={clsx(
        "button-instant-feedback inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {activeLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
