import React from "react";
import Header from "../components/Landing/Header";
import Hero from "../components/Landing/Hero";
import Problem from "../components/Landing/Problem";
import MockupShowcase from "../components/Landing/MockupShowcase";
import HowItWorks from "../components/Landing/HowItWorks";
import Features from "../components/Landing/Features";
import Pricing from "../components/Landing/Pricing";
import FAQ from "../components/Landing/FAQ";
import FinalCTA from "../components/Landing/FinalCTA";
import Footer from "../components/Landing/Footer";
import { Analytics } from "@vercel/analytics/react"

export default function LandingPage() {
  return (
    <main data-testid="landing-page" className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <Header />
      <Analytics />
      <Hero />
      <Problem />
      <MockupShowcase />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}