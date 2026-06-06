import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getHomepageSettings, defaultSettings, HomepageSettings } from "@/lib/settings";

import { Button } from "@/components/ui/button";
import { Stethoscope, Moon, Sun, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { roleHome } from "@/lib/case-utils";

export function GlobalNavbar({ isFixed = false }: { isFixed?: boolean }) {
  const { user, role, signOut } = useAuth();
  const router = useRouter();

  const [dark, setDark] = useState(false);
  const [settings, setSettings] = useState<HomepageSettings>(defaultSettings);

  useEffect(() => {
    setSettings(getHomepageSettings());
  }, []);

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

  const handleLogout = async () => {
    await signOut();
    sessionStorage.removeItem("healthbridge_submitted_case_ids");
    toast.success("Logged out successfully");
    router.navigate({ to: "/" });
  };

  return (
    <div className={`w-full shrink-0 z-50 ${isFixed ? 'fixed top-0 left-0 right-0' : 'sticky top-0'} p-2`}>
      <nav className="w-full glass rounded-2xl shadow-sm transition-all border border-white/20 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 lg:px-10 py-4">
          {/* Logo */}
          <Link 
            to={role ? roleHome[role] : "/"} 
            className="flex items-center gap-2 hover:scale-105 transition-transform glass py-1.5 px-4 rounded-full shadow-sm"
          >
            <Stethoscope className="h-5 w-5 text-[#0033a0] dark:text-blue-400" />
            <span className="font-serif text-lg font-medium text-[#0033a0] dark:text-blue-300">
              {settings.hospitalName}
            </span>
            <span className="text-sm font-sans font-medium text-gray-800 dark:text-gray-200 hidden sm:inline">
              Family Doctor
            </span>
          </Link>

          {/* Right Side - Links & Auth */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleDark} 
                aria-label="Toggle theme" 
                className="rounded-full text-gray-800 hover:text-[#0033a0] hover:bg-black/5 dark:hover:bg-white/10 dark:text-gray-300 transition-colors"
              >
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {user ? (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={handleLogout} 
                    className="bg-[#0033a0] hover:bg-[#002277] text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all px-6 text-sm h-10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button className="bg-[#0033a0] hover:bg-[#002277] text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all px-8 text-sm h-10">
                    Log In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
