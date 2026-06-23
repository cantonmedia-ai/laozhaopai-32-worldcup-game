"use client";

import { useState } from "react";
import { CircleUserRound, Loader2, Mail } from "lucide-react";
import { logClientAction, logClientError } from "@/lib/monitoring-client";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthMode = "signup" | "login";

function getRedirectOrigin() {
  return window.location.origin;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function createReferralCode() {
  return `LZP${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function getProvider(userProvider: unknown, fallback: "google" | "email") {
  return typeof userProvider === "string" && userProvider ? userProvider : fallback;
}

function friendlyAuthError(message: string, mode: AuthMode) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("already") || lowerMessage.includes("registered")) {
    return "This email is already registered. Please login instead.";
  }

  if (lowerMessage.includes("invalid login") || lowerMessage.includes("credentials")) {
    return "Email or password is wrong. Please try again.";
  }

  if (lowerMessage.includes("password")) {
    return mode === "signup"
      ? "Password must be at least 8 characters."
      : "Email or password is wrong. Please try again.";
  }

  return message || "Something went wrong. Please try again.";
}

function getGoogleButtonText(mode: AuthMode, loading: boolean) {
  if (loading) return "Opening Google...";
  return "Continue with Google";
}

async function ensurePlayerProfile(
  fallbackProvider: "google" | "email",
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Please sign in first.");

  const provider = getProvider(user.app_metadata?.provider, fallbackProvider);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, profile_completed, display_name, nickname, email_verified, auth_provider, provider, login_provider",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  const profilePayload = {
    auth_user_id: user.id,
    user_id: user.id,
    email: user.email,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    login_provider: provider,
    provider,
    auth_provider: provider,
    ...(provider === "google" ? { email_verified: true } : {}),
    updated_at: new Date().toISOString(),
  };

  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      ...profilePayload,
      profile_completed: false,
      referral_code: createReferralCode(),
      created_at: new Date().toISOString(),
    });

    if (insertError) throw new Error(insertError.message);
    return { completed: false };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(profilePayload)
    .eq("auth_user_id", user.id);

  if (updateError) throw new Error(updateError.message);

  return {
    completed: Boolean(profile.profile_completed && (profile.display_name || profile.nickname)),
    emailVerified: profile.email_verified !== false,
    provider: profile.auth_provider || profile.provider || profile.login_provider || provider,
  };
}

export function AuthButtons({
  next = "/game",
  showSetupNote = false,
  initialMode = "signup",
}: {
  next?: string;
  showSetupNote?: boolean;
  initialMode?: AuthMode;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState<"google" | "signup" | "login" | "">("");
  const [errorMessage, setErrorMessage] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  function goToProfileSetup() {
    window.location.href = `/profile/setup?next=${encodeURIComponent(next)}`;
  }

  function goToVerifyEmail() {
    window.location.href = `/verify-email?next=${encodeURIComponent(next)}`;
  }

  function goToNext() {
    window.location.href = next;
  }

  async function signInWithGoogle() {
    setLoading("google");
    setErrorMessage("");
    void logClientAction({
      actionType: "signup_started",
      actionStatus: "info",
      pagePath: "/login",
      message: "Google login started.",
      metadata: { provider: "google", mode },
    });

    try {
      if (!isSupabaseConfigured()) {
        goToProfileSetup();
        return;
      }

      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", getRedirectOrigin());
      redirectTo.searchParams.set("next", next);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
        },
      });

      if (error) throw new Error(error.message);
    } catch (error) {
      void logClientAction({
        actionType: "login_failed",
        actionStatus: "failed",
        pagePath: "/login",
        message: error instanceof Error ? error.message : "Google login failed.",
        metadata: { provider: "google", mode },
      });
      void logClientError({
        errorType: "auth_error",
        errorMessage: error instanceof Error ? error.message : "Google login failed.",
        functionName: "signInWithGoogle",
        pagePath: "/login",
        metadata: { provider: "google", mode },
      });
      setLoading("");
      setErrorMessage(
        error instanceof Error ? error.message : "Google login failed.",
      );
    }
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const email = normalizeEmail(signupEmail);

    if (!isValidEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (signupPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (signupPassword !== confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setLoading("signup");
    void logClientAction({
      actionType: "signup_started",
      actionStatus: "info",
      pagePath: "/login",
      message: "Email signup started.",
      metadata: { provider: "email" },
    });

    try {
      if (!isSupabaseConfigured()) {
        goToProfileSetup();
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: signupPassword,
      });

      if (error) throw new Error(friendlyAuthError(error.message, "signup"));

      await fetch("/api/email/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => null);

      if (!data.session) {
        void logClientAction({
          actionType: "signup_completed",
          actionStatus: "success",
          pagePath: "/login",
          message: "Email signup created pending verification.",
          metadata: { provider: "email" },
        });
        setErrorMessage("Account created. Please check your email to verify your account.");
        return;
      }

      await ensurePlayerProfile("email");
      void logClientAction({
        actionType: "signup_completed",
        actionStatus: "success",
        pagePath: "/login",
        message: "Email signup completed.",
        metadata: { provider: "email" },
      });
      goToVerifyEmail();
    } catch (error) {
      void logClientAction({
        actionType: "login_failed",
        actionStatus: "failed",
        pagePath: "/login",
        message: error instanceof Error ? error.message : "Email signup failed.",
        metadata: { provider: "email", mode: "signup" },
      });
      void logClientError({
        errorType: "auth_error",
        errorMessage: error instanceof Error ? error.message : "Email signup failed.",
        functionName: "createAccount",
        pagePath: "/login",
        metadata: { provider: "email" },
      });
      setErrorMessage(
        error instanceof Error
          ? friendlyAuthError(error.message, "signup")
          : "Unable to create account. Please try again.",
      );
    } finally {
      setLoading("");
    }
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const email = normalizeEmail(loginEmail);

    if (!isValidEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!loginPassword) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setLoading("login");
    void logClientAction({
      actionType: "signup_started",
      actionStatus: "info",
      pagePath: "/login",
      message: "Email login started.",
      metadata: { provider: "email", mode: "login" },
    });

    try {
      if (!isSupabaseConfigured()) {
        goToProfileSetup();
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) throw new Error(friendlyAuthError(error.message, "login"));

      const profile = await ensurePlayerProfile("email");
      if (profile.provider === "email" && !profile.emailVerified) {
        void logClientAction({
          actionType: "login_success",
          actionStatus: "warning",
          pagePath: "/login",
          message: "Email login succeeded but verification is pending.",
          metadata: { provider: "email" },
        });
        goToVerifyEmail();
        return;
      }

      if (profile.completed) {
        void logClientAction({
          actionType: "login_success",
          actionStatus: "success",
          pagePath: "/login",
          message: "Email login completed.",
          metadata: { provider: "email", profileCompleted: true },
        });
        goToNext();
        return;
      }

      void logClientAction({
        actionType: "login_success",
        actionStatus: "success",
        pagePath: "/login",
        message: "Email login completed. Profile setup required.",
        metadata: { provider: "email", profileCompleted: false },
      });
      goToProfileSetup();
    } catch (error) {
      void logClientAction({
        actionType: "login_failed",
        actionStatus: "failed",
        pagePath: "/login",
        message: error instanceof Error ? error.message : "Email login failed.",
        metadata: { provider: "email", mode: "login" },
      });
      void logClientError({
        errorType: "auth_error",
        errorMessage: error instanceof Error ? error.message : "Email login failed.",
        functionName: "login",
        pagePath: "/login",
        metadata: { provider: "email" },
      });
      setErrorMessage(
        error instanceof Error
          ? friendlyAuthError(error.message, "login")
          : "Unable to login. Please try again.",
      );
    } finally {
      setLoading("");
    }
  }

  const isBusy = Boolean(loading);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 rounded bg-slate-100 p-1 text-sm font-black">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setMode("signup");
            setErrorMessage("");
          }}
          className={`h-10 rounded transition ${
            mode === "signup"
              ? "bg-[#d71920] text-white shadow"
              : "text-slate-600 hover:text-slate-950"
          } disabled:opacity-60`}
        >
          Sign Up
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setMode("login");
            setErrorMessage("");
          }}
          className={`h-10 rounded transition ${
            mode === "login"
              ? "bg-[#071525] text-white shadow"
              : "text-slate-600 hover:text-slate-950"
          } disabled:opacity-60`}
        >
          Sign In
        </button>
      </div>

      <button
        type="button"
        disabled={isBusy}
        onClick={signInWithGoogle}
        className="flex h-13 w-full min-w-0 items-center justify-center gap-2 rounded bg-white px-4 text-center font-black text-slate-950 shadow hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
      >
        {loading === "google" ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <CircleUserRound size={18} />
        )}
        {getGoogleButtonText(mode, loading === "google")}
      </button>
      <p className="-mt-2 text-center text-xs font-bold text-slate-500">
        Recommended. No email verification required.
      </p>

      <div className="flex items-center gap-3 text-xs font-black uppercase text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {mode === "signup" ? (
        <form onSubmit={createAccount} className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-black text-slate-700">
            Register with Email
            <input
              type="email"
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
              className="h-12 rounded border border-slate-200 bg-white px-3 font-semibold text-slate-950 outline-none focus:border-[#d71920]"
              placeholder="player@email.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-black text-slate-700">
            Password
            <input
              type="password"
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
              className="h-12 rounded border border-slate-200 bg-white px-3 font-semibold text-slate-950 outline-none focus:border-[#d71920]"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-black text-slate-700">
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-12 rounded border border-slate-200 bg-white px-3 font-semibold text-slate-950 outline-none focus:border-[#d71920]"
              placeholder="Type it again"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <button
            type="submit"
            disabled={isBusy}
            className="mt-1 flex h-13 w-full items-center justify-center gap-2 rounded bg-[#d71920] px-4 font-black text-white shadow-lg shadow-red-900/20 hover:bg-red-700 disabled:cursor-wait disabled:bg-slate-400"
          >
            {loading === "signup" ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
            {loading === "signup" ? "Creating..." : "Register with Email"}
          </button>
          <p className="-mt-1 text-center text-xs font-bold text-slate-500">
            Verification email required before joining games.
          </p>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setMode("login");
              setErrorMessage("");
            }}
            className="text-center text-sm font-black text-[#0f8a4b] hover:text-[#0b6f3b] disabled:opacity-60"
          >
            Already have an account? Sign In
          </button>
        </form>
      ) : (
        <form onSubmit={login} className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-black text-slate-700">
            Email
            <input
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              className="h-12 rounded border border-slate-200 bg-white px-3 font-semibold text-slate-950 outline-none focus:border-[#d71920]"
              placeholder="player@email.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-black text-slate-700">
            Password
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              className="h-12 rounded border border-slate-200 bg-white px-3 font-semibold text-slate-950 outline-none focus:border-[#d71920]"
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isBusy}
            className="mt-1 flex h-13 w-full items-center justify-center gap-2 rounded bg-[#071525] px-4 font-black text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-400"
          >
            {loading === "login" ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
            {loading === "login" ? "Logging in..." : "Login"}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setMode("signup");
              setErrorMessage("");
            }}
            className="text-center text-sm font-black text-[#0f8a4b] hover:text-[#0b6f3b] disabled:opacity-60"
          >
            New player? Sign Up
          </button>
        </form>
      )}

      {errorMessage ? (
        <p className="rounded bg-red-50 p-3 text-center text-xs font-bold text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {showSetupNote && !isSupabaseConfigured() ? (
        <p className="rounded bg-amber-50 p-3 text-center text-xs font-bold text-amber-900">
          Login will be available once account setup is connected.
        </p>
      ) : null}
    </div>
  );
}
