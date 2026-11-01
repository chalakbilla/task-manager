"use client";
import { Scissors } from "lucide-react";
import { useEffect, useState } from "react";

export default function Login() {
  const [error, setError] = useState("");

  useEffect(() => {
    // Already signed in? Skip the login page.
    fetch("/api/me").then((r) => {
      if (r.ok) window.location.href = "/dashboard";
    });
    if (new URLSearchParams(window.location.search).get("error")) setError("Google sign-in failed. Please try again.");
  }, []);

  return (
    <main className="login">
      <div className="login-card">
        <div className="logo big"><Scissors size={28} /></div>
        <h1>TaskFlow</h1>
        <p className="muted">Create tasks, assign them to your team and get notified by Gmail.</p>
        {error && <p className="error">{error}</p>}
        {/* Plain link: the Flask backend starts the OAuth redirect */}
        <a className="btn google" href="/api/auth/google/login">
          <span className="g">G</span> Sign in with Google
        </a>
      </div>
    </main>
  );
}
