"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarLogo,
  NavbarButton, } from "@/components/ui/resizable-navbar";

export default function TotalNav() {
    const [mobileOpen, setMobileOpen] = useState(false);
      const navLinks = [
        { name: "Home", link: "/" },
        { name: "Models", link: "/models" },
        { name: "Founders", link: "/founders" },
        { name: "Contact", link: "/contact" },
      ];
  return (
    <Navbar>
        {/* Desktop Navbar */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navLinks} />
          <Link href="/signup">
            <NavbarButton variant="primary">Sign Up</NavbarButton>
          </Link>
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
              <Link
                key={idx}
                href={item.link}
                className="block w-full px-4 py-2 text-lg text-gray-700 dark:text-gray-200"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link href="/signup">
              <NavbarButton className="mt-4 w-full">Sign Up</NavbarButton>
            </Link>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
  )
}
