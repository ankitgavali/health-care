import { ReactNode, useState } from "react";
import { useAuth, AppRole } from "@/hooks/use-auth";
import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Stethoscope } from "lucide-react";

export function RequireRole({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { user, role, loading, refreshRole } = useAuth();

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
          <Stethoscope className="h-12 w-12 text-red-500" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-300 max-w-md">
            You are currently logged in as a <strong>{role}</strong>, which does not have permission to view this page.
          </p>
          <Button 
            className="mt-4"
            onClick={() => window.location.href = role === "patient" ? "/patient" : role === "nurse" ? "/nurse" : role === "admin" ? "/admin" : "/doctor"}
          >
            Go to My Dashboard
          </Button>
        </div>
      );
    }

    let targetRoleLabel = "Staff";
    let icon = <Stethoscope className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />;
    let defaultEmail = "";

    if (isNurseAllowed) {
      targetRoleLabel = "Nurse Console";
      defaultEmail = "nurse12@gmail.com";
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
  const [busy, setBusy] = useState(false);

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
      if (["admin12@gmail.com", "nurse12@gmail.com", "doctor12@gmail.com", "doctor12@gmail", "doctor1@gmail.com", "doctor2@gmail.com"].includes(emailClean)) {
        let roleKey: AppRole = "nurse";
        let dbRoleVal: any = "nurse";
        let name = "Nurse Console";

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
            <CardDescription className="text-sm text-slate-600 dark:text-slate-300 mt-1">
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
                <Label htmlFor="password" className="text-slate-800 dark:text-slate-200 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-xl border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500 h-11"
                />
              </div>

              <Button type="submit" className="w-full h-11 font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-700 hover:to-sky-600 text-white shadow-md transition-all duration-300 mt-2" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {defaultEmail && (
                <div className="mt-4 rounded-lg bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100/50 dark:border-cyan-900/30 p-3 text-xs text-cyan-800 dark:text-cyan-300 flex flex-col gap-1 leading-relaxed">
                  <span className="font-semibold text-cyan-700 dark:text-cyan-300">Demo Credentials:</span>
                  <span>Email: <code className="font-mono bg-cyan-100/50 dark:bg-cyan-900/50 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">{defaultEmail}</code></span>
                  <span>Password: <code className="font-mono bg-cyan-100/50 dark:bg-cyan-900/50 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">123456</code></span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
