import React from 'react';
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/home/HomeHero";

export default function ProgressiveIndex() {
  return (
    <div className="min-h-screen">
      <Header />
      <HomeHero />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-roam-blue mb-4">Welcome to ROAM</h1>
          <p className="text-xl text-gray-600 mb-8">Your marketplace for on-demand services</p>
          <p className="text-sm text-gray-500">Progressive Index - Step 2: Header + HomeHero loaded successfully!</p>
        </div>
      </main>
    </div>
  );
}