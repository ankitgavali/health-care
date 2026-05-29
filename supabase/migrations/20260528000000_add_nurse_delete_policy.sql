-- Policy to allow users with the 'nurse' role to delete case papers
CREATE POLICY "Nurse delete case" ON public.case_papers
    FOR DELETE TO authenticated USING (
      public.has_role(auth.uid(), 'nurse')
    );
