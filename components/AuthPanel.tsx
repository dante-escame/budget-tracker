"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type Mode = "signin" | "signup";

export default function AuthPanel() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignIn = mode === "signin";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      if (isSignIn) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setMessage("Invalid email or password.");
          return;
        }

        window.location.reload();
        return;
      }

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Could not create your account.");
        return;
      }

      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        setMessage("Account created, but automatic sign in failed.");
        return;
      }

      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Free Fullstack Starter</p>
        <h1>Budget Tracker</h1>
        <p className="auth-copy">
          Sign in with your email and password to keep your own imported statements, categories,
          and monthly summaries separate from every other user.
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={!isSignIn ? "ghost-button" : ""}
            onClick={() => {
              setMode("signin");
              setMessage("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={isSignIn ? "ghost-button" : ""}
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : isSignIn ? "Sign in" : "Create account"}
          </button>
        </form>

        {message ? <p className="status-message">{message}</p> : null}

        <div className="auth-note">
          <p>Free stack targets:</p>
          <ul>
            <li>Vercel for deploy</li>
            <li>Next.js route handlers as serverless backend</li>
            <li>MongoDB Atlas free tier with Mongoose</li>
            <li>NextAuth credentials auth</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
