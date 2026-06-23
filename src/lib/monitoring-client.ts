"use client";

import type { ActionStatus, ErrorType } from "@/lib/monitoring";

type ClientActionInput = {
  actionType: string;
  actionStatus: ActionStatus;
  pagePath?: string;
  gameKey?: string;
  matchId?: string | number | null;
  teamId?: string | null;
  referralCode?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ClientErrorInput = {
  errorType: ErrorType;
  errorMessage: string;
  errorStack?: string | null;
  pagePath?: string;
  functionName?: string;
  gameKey?: string;
  matchId?: string | number | null;
  teamId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logClientAction(input: ClientActionInput) {
  try {
    await fetch("/api/monitoring/log-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        pagePath: input.pagePath ?? window.location.pathname,
      }),
    });
  } catch (error) {
    console.error("Client action logging failed", error);
  }
}

export async function logClientError(input: ClientErrorInput) {
  try {
    const response = await fetch("/api/monitoring/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        pagePath: input.pagePath ?? window.location.pathname,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      errorReferenceId?: string;
    };
    return payload.errorReferenceId ?? "";
  } catch (error) {
    console.error("Client error logging failed", error);
    return "";
  }
}
