import { ReactNode, useState } from "react";
import { useAuth, AppRole } from "@/hooks/use-auth";
import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Stethoscope, Eye, EyeOff } from "lucide-react";
import { z } from "zod";


export function RequireRole({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { user, role, loading, refreshRole, signOut } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  // Determine what type of login to show
  const isNurseAllowed = allow.includes("nurse");
  const isDoctorAllowed = allow.includes("doctor1") || allow.includes("doctor2");
  const isAdminAllowed = allow.includes("admin");

  // Check if current logged in user has the required role
  const isAuthorized = user && role && allow.includes(role);

  if (!isAuthorized) {
    if (user && role) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4 text-center">
          <Stethoscope className="h-12 w-12 text-red-500 animate-bounce" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-300 max-w-md">
            You are currently logged in as a <strong className="capitalize text-teal-600 dark:text-teal-400">{role === "doctor1" || role === "doctor2" ? "Doctor" : role}</strong>, which does not have permission to view this page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button 
              className="font-semibold shadow-xs"
              onClick={() => window.location.href = role === "patient" ? "/patient" : role === "nurse" ? "/nurse" : role === "admin" ? "/admin" : "/doctor"}
            >
              Go to My Dashboard
            </Button>
            <Button
              variant="outline"
              className="border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-650 font-semibold"
              onClick={async () => {
                await signOut();
                toast.success("Logged out successfully");
                window.location.href = "/auth";
              }}
            >
              Sign Out / Switch Account
            </Button>
          </div>
        </div>
      );
    }

    let targetRoleLabel = "Staff";
    let icon = <Stethoscope className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />;
    let defaultEmail = "";

    if (isNurseAllowed) {
      targetRoleLabel = "Nurse Console";
      defaultEmail = "nurse1@gmail.com";
    } else if (isDoctorAllowed) {
      targetRoleLabel = "Doctor Portal";
      defaultEmail = "doctor1@gmail.com";
    } else if (isAdminAllowed) {
      targetRoleLabel = "Admin Control";
      defaultEmail = "admin12@gmail.com";
    }

    return (
      <RoleLoginForm
        targetRoleLabel={targetRoleLabel}
        icon={icon}
        defaultEmail={defaultEmail}
        refreshRole={refreshRole}
      />
    );
  }

  return <>{children}</>;
}

function RoleLoginForm({
  targetRoleLabel,
  icon,
  defaultEmail,
  refreshRole,
}: {
  targetRoleLabel: string;
  icon: React.ReactNode;
  defaultEmail: string;
  refreshRole: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleForgotPassword = async () => {
    const emailClean = email.trim();
    if (!emailClean) {
      return toast.error("Please enter your email address in the Email field first.");
    }
    const emailValidated = z.string().email().safeParse(emailClean);
    if (!emailValidated.success) {
      return toast.error("Please enter a valid email address.");
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, emailClean.toLowerCase());
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send password reset email.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return toast.error("Please enter email and password");
    }
    setBusy(true);

    const emailClean = email.trim().toLowerCase();

    try {
      // 1. Try signing in directly
      await signInWithEmailAndPassword(auth, emailClean, password);
      await refreshRole();
      setBusy(false);
      toast.success(`Welcome to ${targetRoleLabel}`);
    } catch (err: any) {
      // 2. Predefined email auto-creation logic
      if (["admin12@gmail.com", "nurse1@gmail.com", "doctor12@gmail.com", "doctor12@gmail", "doctor1@gmail.com", "doctor2@gmail.com"].includes(emailClean)) {
        let roleKey: AppRole = "nurse";
        let dbRoleVal: any = "nurse";
        let name = "payal";

        if (emailClean === "admin12@gmail.com") {
          roleKey = "admin";
          dbRoleVal = "patient"; // Store as patient to bypass constraints if any
          name = "Admin Control";
        } else if (emailClean === "doctor12@gmail.com" || emailClean === "doctor12@gmail" || emailClean === "doctor1@gmail.com") {
          roleKey = "doctor1";
          dbRoleVal = "doctor1";
          name = "Dr. Kadambari Jagtap";
        } else if (emailClean === "doctor2@gmail.com") {
          roleKey = "doctor2";
          dbRoleVal = "doctor2";
          name = "Dr. Omprasad Jagtap";
        }

        try {
          const userCred = await createUserWithEmailAndPassword(auth, emailClean, password);
          
          await setDoc(doc(db, "user_roles", userCred.user.uid), {
            role: dbRoleVal
          });

          await setDoc(doc(db, "profiles", userCred.user.uid), {
            full_name: name,
            email: emailClean,
          });

          await refreshRole();
          setBusy(false);
          toast.success(`Welcome to ${targetRoleLabel}`);
          return;
        } catch (upErr: any) {
          setBusy(false);
          return toast.error("Login failed and predefined creation failed: " + upErr.message);
        }
      }

      setBusy(false);
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <img src="/login_bg_hospital_light.png" alt="Hospital Background" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] dark:bg-slate-950/60" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="border border-white/60 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] relative overflow-hidden backdrop-blur-[20px] text-slate-900 dark:text-white rounded-[2rem] p-2">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
              {icon}
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{targetRoleLabel} Login</CardTitle>
            <CardDescription className="text-sm text-slate-605 dark:text-slate-300 mt-1">
              Please authenticate to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-800 dark:text-slate-200 font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-slate-800 dark:text-slate-200 font-medium">Password</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-xl border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500 h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-700 hover:to-sky-600 text-white shadow-md transition-all duration-300 mt-2 cursor-pointer" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
