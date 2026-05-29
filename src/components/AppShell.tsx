import { ReactNode, useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, Stethoscope } from "lucide-react";
import { roleHome } from "@/lib/case-utils";
import { GlobalNavbar } from "@/components/GlobalNavbar";

export function AppShell({ children, title, fullWidth = false }: { children: ReactNode; title?: string; fullWidth?: boolean }) {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalNavbar isFixed={false} />
      <main className={fullWidth ? "w-full flex-1" : "mx-auto max-w-7xl w-full px-4 py-6 pb-24 md:pb-6"}>{children}</main>
    </div>
  );
}
