
-- Add approval system to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add admin approval to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS admin_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Allow admins to update all companies
CREATE POLICY "Admins can update all companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete companies
CREATE POLICY "Admins can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete jobs
CREATE POLICY "Admins can delete all jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage user_roles (insert)
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all candidates (for company candidate lookup)
CREATE POLICY "Companies can view candidates for their job applicants"
ON public.candidates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN companies c ON j.company_id = c.id
    WHERE a.candidate_id = candidates.id AND c.user_id = auth.uid()
  )
);
