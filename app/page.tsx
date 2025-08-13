"use client"

import TotalNav from "@/components/totalnav";
import { Vortex } from "@/components/ui/vortex";
import React from "react";


export default function page() {
  
  return (
    <>
    <TotalNav></TotalNav>
    <div className="w-full mx-auto rounded-md  h-screen overflow-hidden">
      <Vortex
        backgroundColor="black"
        rangeY={800}
        particleCount={500}
        baseHue={120}
        className="flex items-center flex-col justify-center px-2 md:px-10  py-4 w-full h-full"
      >
        <h2 className="text-white text-2xl md:text-6xl font-bold text-center">
          Learn Anything, Any Way.
        </h2>
        <p className="text-white text-sm md:text-2xl max-w-xl mt-6 text-center">
          Explore AI tutors using Socratic, Feynman, and other methods—plus
          dynamic Manim visuals—to truly understand any concept.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
        </div>
      </Vortex>
    </div>
    </>
  );
}
