// src/components/Navbar.tsx
// import React from "react";
import { Link } from "react-router-dom";
import CardanoIcon from "./CardanoIcon";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function Navbar() {
  const navLinks = [
    // { name: 'Home', path: '/' },
    { name: "Docs", path: "/docs" },
    { name: "Contribute", path: "/contribute" },
    // { name: 'Daily Revision', path: '/daily-revision' },
    // { name: 'Bookmarks', path: '/bookmarks' },
    // { name: 'Progress', path: '/progress' },
  ];

  return (
    <>
      <header className="bg-white border-b border-gray-200">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* LEFT: Logo */}
            <div className="flex items-center">
              <Link to="/" className="inline-flex items-center space-x-2 logolink">
                <CardanoIcon />
                <span className="font-bold text-lg text-red-900">Plutus Cheatsheet</span>
              </Link>
            </div>

            {/* RIGHT: Desktop nav + Mobile menu */}
            <div className="flex items-center space-x-4">
              {/* Desktop nav (hidden on small screens) */}
              <nav className="hidden sm:flex sm:space-x-8 items-center">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary border-b-2 border-transparent hover:border-primary"
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>

              {/* Mobile menu button (visible on small screens) */}
              <div className="sm:hidden items-center">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      className="inline-flex gap-2 rounded-md border border-pink-100 bg-white px-3 py-2 text-sm font-semibold text-pink-600 shadow-sm transition-colors duration-150 hover:border-pink-600 hover:bg-pink-600 hover:text-white dark:border-transparent focus:outline-none"
                      size="icon"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Plutus Cheatsheet Generator</SheetTitle>
                      <SheetDescription>
                        Your All required plutus details are here
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 flex flex-col space-y-3">
                      {navLinks.map((link) => (
                        <Link
                          key={link.name}
                          to={link.path}
                          className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default Navbar;
