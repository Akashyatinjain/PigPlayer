"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Lock, Mail, User, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { getErrorMessage } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const ok = await register(name, email, password);
      if (ok) {
        router.push("/");
      } else {
        setError(useAuthStore.getState().error || "Failed to create account");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create account"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#07090D] p-4 text-[#F8FAFC]">
      <div className="w-full max-w-md bg-[#0E121A]/90 border border-white/[0.08] rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-3 shadow-lg shadow-[#FF4D80]/25 border border-[#FF4D80]/30">
            <Image src="/piggy-logo.jpg" alt="piGGyPlayer" width={56} height={56} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create your account
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Start listening and uploading your personal music library
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full min-h-11 pl-10 pr-4 py-2.5 text-base sm:text-sm bg-white/[0.06] border border-white/[0.08] rounded-xl text-white placeholder-[#64748B] focus:outline-none focus:border-[#FF4D80] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full min-h-11 pl-10 pr-4 py-2.5 text-base sm:text-sm bg-white/[0.06] border border-white/[0.08] rounded-xl text-white placeholder-[#64748B] focus:outline-none focus:border-[#FF4D80] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full min-h-11 pl-10 pr-4 py-2.5 text-base sm:text-sm bg-white/[0.06] border border-white/[0.08] rounded-xl text-white placeholder-[#64748B] focus:outline-none focus:border-[#FF4D80] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-[#FF4D80] hover:bg-[#FF6694] active:scale-[0.99] text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-[#FF4D80]/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-xs text-[#94A3B8]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#FF4D80] hover:text-[#FF6694] hover:underline"
            >
              Sign in
            </Link>{" "}
            or{" "}
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] hover:underline">
              browse as guest
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
