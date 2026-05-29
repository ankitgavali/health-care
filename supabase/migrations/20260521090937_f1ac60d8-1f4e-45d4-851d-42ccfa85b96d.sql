
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('patient', 'nurse', 'doctor1', 'doctor2');

-- Case paper status enum
CREATE TYPE public.case_status AS ENUM ('submitted', 'sent_to_doctor', 'under_review', 'completed', 'returned_to_nurse', 'billed');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles selectable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own role" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Case papers
CREATE TABLE public.case_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  address TEXT NOT NULL,
  mobile TEXT NOT NULL,
  dob DATE NOT NULL,
  age INT NOT NULL,
  notes TEXT,
  status case_status NOT NULL DEFAULT 'submitted',
  assigned_doctor app_role,
  prescription TEXT,
  medical_notes TEXT,
  medicines TEXT,
  tests TEXT,
  consultation_charge NUMERIC DEFAULT 0,
  medicine_charge NUMERIC DEFAULT 0,
  test_charge NUMERIC DEFAULT 0,
  other_charge NUMERIC DEFAULT 0,
  total_bill NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_papers ENABLE ROW LEVEL SECURITY;

-- Patients see only their own
CREATE POLICY "Patient view own case" ON public.case_papers
  FOR SELECT TO authenticated USING (
    auth.uid() = patient_id
    OR public.has_role(auth.uid(), 'nurse')
    OR (public.has_role(auth.uid(), 'doctor1') AND assigned_doctor = 'doctor1' AND status IN ('sent_to_doctor','under_review','completed','returned_to_nurse','billed'))
    OR (public.has_role(auth.uid(), 'doctor2') AND assigned_doctor = 'doctor2' AND status IN ('sent_to_doctor','under_review','completed','returned_to_nurse','billed'))
  );

CREATE POLICY "Patient insert own case" ON public.case_papers
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = patient_id AND public.has_role(auth.uid(), 'patient')
  );

CREATE POLICY "Nurse update case" ON public.case_papers
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'nurse'));

CREATE POLICY "Doctor update assigned case" ON public.case_papers
  FOR UPDATE TO authenticated USING (
    (public.has_role(auth.uid(), 'doctor1') AND assigned_doctor = 'doctor1')
    OR (public.has_role(auth.uid(), 'doctor2') AND assigned_doctor = 'doctor2')
  );

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER case_papers_touch BEFORE UPDATE ON public.case_papers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER TABLE public.case_papers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_papers;
