"use client"
import HeroSection from "@/components/hero-section";
import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth() || {};
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [loading, user]);

  return (
    <>
      <HeroSection />
    </>
  );
}
