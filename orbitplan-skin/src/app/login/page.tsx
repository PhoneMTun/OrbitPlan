"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getGoogleAuthUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.7C16.9 2.8 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.3-.2-2H12Z"
      />
      <path
        fill="#34A853"
        d="M2 12c0 2 .7 3.9 1.9 5.4l3.1-2.4c-.4-.8-.6-1.8-.6-3s.2-2.1.6-3L3.9 6.6A9.9 9.9 0 0 0 2 12Z"
      />
      <path
        fill="#FBBC05"
        d="M12 22c2.7 0 4.9-.9 6.5-2.5l-3.2-2.5c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.5-4l-3.2 2.4C5.1 19.8 8.3 22 12 22Z"
      />
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.9h5.5c-.3 1.4-1.1 2.6-2.3 3.4l3.2 2.5c1.9-1.8 3.2-4.4 3.2-7.8Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
      <path d="M12 .5C5.6.5.5 5.7.5 12.2c0 5.2 3.4 9.7 8.1 11.3.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1.1.1-.8.4-1.4.8-1.7-2.7-.3-5.6-1.4-5.6-6.1 0-1.3.4-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.3 2.8.1 3.1.8.9 1.2 1.9 1.2 3.2 0 4.7-2.9 5.8-5.6 6.1.4.4.9 1.1.9 2.3v3.4c0 .3.2.7.8.6 4.7-1.6 8.1-6.1 8.1-11.3C23.5 5.7 18.4.5 12 .5Z" />
    </svg>
  );
}

function AuthOptionButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:border-[rgba(120,145,255,0.44)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(108,242,255,0.7)] to-transparent opacity-0 transition group-hover:opacity-100" />
      <span className="pointer-events-none absolute inset-y-8 right-0 w-px bg-gradient-to-b from-transparent via-[rgba(143,56,255,0.7)] to-transparent opacity-0 transition group-hover:opacity-100" />
      <span className="relative z-10 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-primary)]">
          {icon}
        </span>
        <span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Social Login</span>
          <span className="block">{label}</span>
        </span>
      </span>
    </button>
  );
}

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("admin@orbitplan.local");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== "orbitplan:google-connected") return;
      router.replace("/");
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const url = await getGoogleAuthUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(30,123,255,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(143,56,255,0.18),transparent_28%),linear-gradient(160deg,#02030b_0%,#050919_48%,#02030b_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />

      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--border)] bg-[rgba(7,11,26,0.86)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(108,242,255,0.8)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-10 right-0 w-px bg-gradient-to-b from-transparent via-[rgba(143,56,255,0.8)] to-transparent" />
        <div className="pointer-events-none absolute left-5 top-5 h-3 w-3 rounded-full border border-[rgba(108,242,255,0.5)]" />
        <div className="pointer-events-none absolute bottom-5 right-5 h-3 w-3 rounded-full border border-[rgba(143,56,255,0.5)]" />

        <div className="relative z-10">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">OrbitPlan Secure Access</p>
            <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">Login With Socials And Email</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Admin login is active now. Social buttons are UI placeholders until external providers are wired.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AuthOptionButton
              label={googleLoading ? "Opening Google..." : "Continue with Google"}
              icon={<GoogleIcon />}
              onClick={() => void handleGoogleLogin()}
              disabled={googleLoading}
            />
            <AuthOptionButton label="Continue with GitHub" icon={<GitHubIcon />} disabled />
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">or</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <button
            type="button"
            onClick={() => setShowEmailLogin((current) => !current)}
            className="w-full rounded-2xl border border-[rgba(108,242,255,0.28)] bg-[linear-gradient(135deg,rgba(30,123,255,0.12),rgba(143,56,255,0.08))] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[rgba(108,242,255,0.5)]"
          >
            {showEmailLogin ? "Hide Email Login" : "Continue With Email"}
          </button>

          <AnimatePresence initial={false}>
            {showEmailLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)]">
                  <div className="border-b border-[var(--border)] bg-[linear-gradient(135deg,rgba(30,123,255,0.08),rgba(143,56,255,0.08))] px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Email Access</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Secure Admin Login</p>
                  </div>
                  <div className="space-y-4 p-5">
                  <Input
                    label="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@orbitplan.local"
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter admin password"
                  />

                    <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                      {submitting ? "Signing In..." : "Sign In Securely"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p>}

          <div className="mt-8 flex items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
            <span className="max-w-[70%]">Use `ADMIN_EMAIL` and `ADMIN_PASSWORD` from API env.</span>
            <Link href="/" className="font-semibold text-[var(--accent)] hover:underline">
              Back home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
