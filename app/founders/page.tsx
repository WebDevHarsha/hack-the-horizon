"use client";
import TotalNav from "@/components/totalnav";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";
import React from "react";

const people = [
  {
    id: 1,
    name: "Sri Harsha V A",
    designation: "Fullstack Dev",
    image:"/harsha.jpg"
},
  {
    id: 2,
    name: "Swayam Biswal",
    designation: "Backend Dev",
    image:"/swayam.jpg"
  },
  {
    id: 3,
    name: "Ankit Singh",
    designation: "Hardware Engineer",
    image:"/ankit.jpg"
    },
  {
    id: 4,
    name: "Ankit Mahato",
    designation: "UX Designer",
    image:"/ankit-mahato.jpg"
    }
];

export default function AnimatedTooltipPreview() {
  return (
    <>
      <TotalNav></TotalNav>
      <div className="flex flex-row  items-center justify-center mt-30 w-full">
        <AnimatedTooltip items={people} />
      </div>
    </>
  );
}
