"use client";
import { Scissors } from "lucide-react";
import { useEffect, useState } from "react";

const MESSAGES: Record<string, string> = {
  access_denied: "Google sign-in was cancelled.",
  bad_state: "Sign-in expired or was tampered with. Please try again.",
  no_code: "Google did not return a sign-in code. Please try again.",
  token_exchange_failed: "Google rejected the sign-in request",
  userinfo_failed: "Could not read your Google profile. Please try again.",
  server_error: "Something went wrong on the server while signing you in. Check the Vercel function logs.",
};

export default function Login() {
  const [error, setError] = useState("");

  useEffect(() => {
    // Already signed in? Skip the login page.
    fetch("/api/me").then((r) => {
      if (r.ok) window.location.href = "/dashboard";
    });
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code) {
      const base = MESSAGES[code] ?? "Sign-in failed. Please try again.";
      const reason = params.get("reason");
      setError(code === "token_exchange_failed" && reason ? `${base} (${reason}).` : base);
    }
  }, []);

  return (
    <main className="login">
      <div className="login-card">
        <div className="logo big"><Scissors size={28} /></div>
        <h1>TaskFlow</h1>
        <p className="muted">Create tasks, assign them to your team and get notified by email.</p>
        {error && <p className="error">{error}</p>}
        {/* Plain link: the Flask backend starts the OAuth redirect */}
        <a className="btn google" href="/api/auth/google/login">
          <span className="g">G</span> Sign in with Google
        </a>
      </div>
    </main>
  );
}
