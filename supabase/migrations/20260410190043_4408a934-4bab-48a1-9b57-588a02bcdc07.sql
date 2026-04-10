
-- Enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.user_type AS ENUM ('candidate', 'company');
CREATE TYPE public.job_status AS ENUM ('draft', 'grace_period', 'open', 'closed', 'frozen');
CREATE TYPE public.application_status AS ENUM ('applied', 'shortlisted', 'interview_scheduled', 'interviewed', 'hired', 'rejected');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  user_type user_type NOT NULL DEFAULT 'candidate',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'candidate')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  city TEXT,
  industry TEXT,
  logo_url TEXT,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  frozen_reason TEXT,
  jobs_posted INTEGER NOT NULL DEFAULT 0,
  views_without_shortlist INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view own data" ON public.companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Companies can update own data" ON public.companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Companies can insert own data" ON public.companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all companies" ON public.companies FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view companies for jobs" ON public.companies FOR SELECT USING (true);

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create company on signup if user_type is company
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_type = 'company' THEN
    INSERT INTO public.companies (user_id, name)
    VALUES (NEW.user_id, COALESCE(
      (SELECT raw_user_meta_data->>'company_name' FROM auth.users WHERE id = NEW.user_id),
      NEW.full_name
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_company AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- Candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  city TEXT,
  cv_url TEXT,
  cv_parsed_data JSONB,
  ai_summary TEXT,
  title TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view own data" ON public.candidates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Candidates can update own data" ON public.candidates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Candidates can insert own data" ON public.candidates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all candidates" ON public.candidates FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create candidate on signup if user_type is candidate
CREATE OR REPLACE FUNCTION public.handle_new_candidate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_type = 'candidate' THEN
    INSERT INTO public.candidates (user_id)
    VALUES (NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_candidate AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_candidate();

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  min_experience INTEGER DEFAULT 0,
  city TEXT,
  status job_status NOT NULL DEFAULT 'draft',
  grace_period_ends_at TIMESTAMPTZ,
  compliance_notes TEXT,
  is_compliant BOOLEAN DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  applications_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Companies can manage their own jobs
CREATE POLICY "Companies can view own jobs" ON public.jobs FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Companies can insert jobs" ON public.jobs FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Companies can update own jobs" ON public.jobs FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Companies can delete draft jobs" ON public.jobs FOR DELETE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()) AND status = 'draft');
-- Candidates can view open jobs
CREATE POLICY "Anyone can view open jobs" ON public.jobs FOR SELECT USING (status = 'open');
-- Admins can view all
CREATE POLICY "Admins can view all jobs" ON public.jobs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all jobs" ON public.jobs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'applied',
  match_score NUMERIC(5,2),
  match_breakdown JSONB,
  cover_letter TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Candidates can view/create own applications
CREATE POLICY "Candidates can view own applications" ON public.applications FOR SELECT
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));
CREATE POLICY "Candidates can apply" ON public.applications FOR INSERT
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));
-- Companies can view applications for their jobs
CREATE POLICY "Companies can view job applications" ON public.applications FOR SELECT
  USING (job_id IN (SELECT id FROM public.jobs WHERE company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())));
CREATE POLICY "Companies can update application status" ON public.applications FOR UPDATE
  USING (job_id IN (SELECT id FROM public.jobs WHERE company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())));
-- Admins
CREATE POLICY "Admins can view all applications" ON public.applications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Evaluations table
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES auth.users(id),
  technical_score INTEGER CHECK (technical_score >= 1 AND technical_score <= 5),
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  problem_solving_score INTEGER CHECK (problem_solving_score >= 1 AND problem_solving_score <= 5),
  values_alignment_score INTEGER CHECK (values_alignment_score >= 1 AND values_alignment_score <= 5),
  overall_score NUMERIC(3,1),
  notes TEXT,
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Companies can manage evaluations for their job applications
CREATE POLICY "Companies can view evaluations" ON public.evaluations FOR SELECT
  USING (application_id IN (
    SELECT a.id FROM public.applications a
    JOIN public.jobs j ON a.job_id = j.id
    JOIN public.companies c ON j.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));
CREATE POLICY "Companies can create evaluations" ON public.evaluations FOR INSERT
  WITH CHECK (evaluator_id = auth.uid());
CREATE POLICY "Companies can update evaluations" ON public.evaluations FOR UPDATE
  USING (evaluator_id = auth.uid());
CREATE POLICY "Admins can view all evaluations" ON public.evaluations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit logs (immutable)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs, no one can delete
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Audit log function
CREATE OR REPLACE FUNCTION public.log_audit(
  _event_type TEXT,
  _actor_id UUID,
  _actor_type TEXT DEFAULT NULL,
  _target_type TEXT DEFAULT NULL,
  _target_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (event_type, actor_id, actor_type, target_type, target_id, metadata)
  VALUES (_event_type, _actor_id, _actor_type, _target_type, _target_id, _metadata)
  RETURNING id INTO _log_id;
  RETURN _log_id;
END;
$$;

-- Storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false);

CREATE POLICY "Users can upload own CV" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own CV" ON storage.objects FOR SELECT
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own CV" ON storage.objects FOR UPDATE
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own CV" ON storage.objects FOR DELETE
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Companies can upload logos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Companies can update logos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes for performance
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_city ON public.jobs(city);
CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX idx_applications_job ON public.applications(job_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_candidates_city ON public.candidates(city);
CREATE INDEX idx_candidates_skills ON public.candidates USING GIN(skills);
CREATE INDEX idx_audit_logs_event ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);
