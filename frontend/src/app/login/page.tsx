"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Lock, Mail, Loader2, Sparkles } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { getErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to sign in. Please verify your credentials."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail("demo@piggyplayer.app");
    setPassword("password123");
    setIsLoading(true);
    setError(null);
    try {
      await login("demo@piggyplayer.app", "password123");
      router.push("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Demo login failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="soundify-shell min-h-[100dvh] w-full flex items-center justify-center bg-[#0b0d10] p-4 text-[#f5f7fa]">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-3 shadow-md shadow-pink-500/20">
            <Image src="/piggy-logo.jpg" alt="piGGyPlayer" width={56} height={56} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back to pi<span className="text-pink-500">GG</span>yPlayer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to access your personal library and playlists
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full min-h-11 pl-10 pr-4 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-11 pl-10 pr-4 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Use Demo Account (demo@piggyplayer.app)</span>
          </button>

          <p className="text-center text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:underline"
            >
              Sign up
            </Link>{" "}
            or{" "}
            <Link href="/" className="text-slate-600 hover:underline">
              browse as guest
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
