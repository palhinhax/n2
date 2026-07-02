"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User } from "lucide-react";

interface NavbarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Navbar({ onMenuClick, showMenuButton }: NavbarProps) {
  const { data: session } = useSession();

  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-4 md:px-6">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-4 md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <Link href="/" className="font-bold text-xl">
          SaaS Template
        </Link>

        <div className="ml-auto flex items-center space-x-4">
          {session ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm">{session.user?.name || session.user?.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
