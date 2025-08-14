"use client"
import React, { useState } from 'react'
import { Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarLogo,
  NavbarButton, } from "@/components/ui/resizable-navbar";

export default function ModelsNav() {
    const [mobileOpen, setMobileOpen] = useState(false);
      const navLinks = [
        { name: "Socratic", link: "/models/socratic" },
        { name: "Feynman", link: "/models/feynman" },
        { name: "", link: "/services" },
        { name: "", link: "/contact" },
      ];
  return (
    <Navbar>
        {/* Desktop Navbar */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navLinks} />
          <NavbarButton variant="primary">Sign Up</NavbarButton>
        </NavBody>

        {/* Mobile Navbar */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            />
          </MobileNavHeader>
          <MobileNavMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
            {navLinks.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                className="block w-full px-4 py-2 text-lg text-gray-700 dark:text-gray-200"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <NavbarButton className="mt-4 w-full">Sign Up</NavbarButton>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
  )
}
