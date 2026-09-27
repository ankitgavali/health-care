import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type AppRole = "patient" | "nurse" | "doctor1" | "doctor2" | "admin";

type AuthCtx = {
  user: User | null;
  role: AppRole | null;
  profileName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (currentUser: User | null) => {
    if (!currentUser) {
      setRole(null);
      return;
    }

    const email = currentUser.email?.trim().toLowerCase();
    if (email === "admin12@gmail.com") {
      setRole("admin");
      return;
    }

    const roleDocRef = doc(db, "user_roles", currentUser.uid);
    const roleDoc = await getDoc(roleDocRef);
    const profileDocRef = doc(db, "profiles", currentUser.uid);
    const profileDoc = await getDoc(profileDocRef);

    if (profileDoc.exists() && profileDoc.data().full_name) {
      setProfileName(profileDoc.data().full_name);
    } else {
      setProfileName(null);
    }

    if (roleDoc.exists() && roleDoc.data().role) {
      setRole(roleDoc.data().role as AppRole);
      return;
    }

    // Auto-detect and persist role if missing in Firestore
    if (email) {
      let roleKey: AppRole | null = null;
      let name = "Hospital Staff";

      if (email === "admin12@gmail.com" || email.includes("admin")) {
        roleKey = "admin";
        name = "Super Admin";
      } else if (email.includes("nurse") || email === "nurse1@gmail.com" || email === "nurse12@gmail.com") {
        roleKey = "nurse";
        name = "Nurse Staff";
      } else if (email.includes("doctor2") || email === "doctor2@gmail.com") {
        roleKey = "doctor2";
        name = "Dr. Omprasad Jagtap";
      } else if (email.includes("doctor") || email === "doctor1@gmail.com" || email === "doctor12@gmail.com") {
        roleKey = "doctor1";
        name = "Dr. Kadambari Jagtap";
      } else if (email.includes("patient") || email === "guest.patient@medicare.local") {
        roleKey = "patient";
        name = "Guest Patient";
      }

      if (roleKey) {
        try {
          await setDoc(roleDocRef, { role: roleKey, user_id: currentUser.uid }, { merge: true });
          await setDoc(profileDocRef, {
            full_name: profileDoc.exists() && profileDoc.data().full_name ? profileDoc.data().full_name : name,
            email,
          }, { merge: true });

          setRole(roleKey);
          if (!profileName) setProfileName(name);
          return;
        } catch (err) {
          console.error("Failed to auto-insert role in Firestore", err);
          setRole(roleKey);
          return;
        }
      }
    }

    setRole(null);
    setProfileName(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchRole(currentUser);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        profileName,
        loading,
        signOut: async () => { 
          await firebaseSignOut(auth); 
          sessionStorage.removeItem("healthbridge_submitted_case_ids");
        },
        refreshRole: async () => {
          await fetchRole(auth.currentUser);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
