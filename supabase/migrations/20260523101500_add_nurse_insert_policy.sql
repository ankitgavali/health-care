-- Policy to allow users with the 'nurse' role to insert case papers
CREATE POLICY "Nurse insert case" ON public.case_papers
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'nurse')
  );
