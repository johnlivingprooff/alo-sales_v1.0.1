-- Add approval workflow to conversions table
CREATE TYPE public.conversion_status AS ENUM ('pending', 'recommended', 'approved', 'rejected');

-- Add workflow fields to conversions table
ALTER TABLE public.conversions 
ADD COLUMN IF NOT EXISTS status conversion_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recommended_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS recommended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS workflow_notes TEXT;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update conversion policies to include workflow permissions
DROP POLICY IF EXISTS "Managers can recommend conversions" ON public.conversions;
DROP POLICY IF EXISTS "Directors can approve conversions" ON public.conversions;

CREATE POLICY "Managers can recommend conversions" ON public.conversions
    FOR UPDATE USING (
        public.has_role(auth.uid(), 'manager') OR 
        public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Directors can approve conversions" ON public.conversions
    FOR UPDATE USING (
        public.has_role(auth.uid(), 'director') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversions_status ON public.conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_submitted_by ON public.conversions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_conversions_recommended_by ON public.conversions(recommended_by);
CREATE INDEX IF NOT EXISTS idx_conversions_approved_by ON public.conversions(approved_by);
