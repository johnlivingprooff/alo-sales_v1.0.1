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

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'conversion_submitted', 'conversion_recommended', 'conversion_approved', 'conversion_rejected'
    related_id UUID, -- Reference to conversion, lead, etc.
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Create function to notify managers and directors of conversion submissions
CREATE OR REPLACE FUNCTION public.notify_conversion_submission(conversion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conversion_record public.conversions%ROWTYPE;
    lead_record public.leads%ROWTYPE;
    rep_name TEXT;
    manager_id UUID;
    director_id UUID;
    admin_id UUID;
BEGIN
    -- Get conversion and lead details
    SELECT * INTO conversion_record FROM public.conversions WHERE id = conversion_id;
    SELECT * INTO lead_record FROM public.leads WHERE id = conversion_record.lead_id;
    
    -- Get rep name
    SELECT full_name INTO rep_name FROM public.profiles WHERE id = conversion_record.rep_id;
    
    -- Notify managers
    FOR manager_id IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role = 'manager'
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            manager_id,
            'New Conversion Submitted for Recommendation',
            format('Rep %s has submitted a conversion for %s worth $%s for recommendation.',
                   COALESCE(rep_name, 'Unknown'),
                   COALESCE(lead_record.company_name, 'Unknown Company'),
                   COALESCE(conversion_record.revenue_amount::TEXT, '0')),
            'conversion_submitted',
            conversion_id
        );
    END LOOP;
    
    -- Notify directors
    FOR director_id IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role = 'director'
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            director_id,
            'New Conversion Submitted for Approval',
            format('Rep %s has submitted a conversion for %s worth $%s for approval.',
                   COALESCE(rep_name, 'Unknown'),
                   COALESCE(lead_record.company_name, 'Unknown Company'),
                   COALESCE(conversion_record.revenue_amount::TEXT, '0')),
            'conversion_submitted',
            conversion_id
        );
    END LOOP;
    
    -- Notify admins
    FOR admin_id IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role = 'admin'
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            admin_id,
            'New Conversion Submitted',
            format('Rep %s has submitted a conversion for %s worth $%s.',
                   COALESCE(rep_name, 'Unknown'),
                   COALESCE(lead_record.company_name, 'Unknown Company'),
                   COALESCE(conversion_record.revenue_amount::TEXT, '0')),
            'conversion_submitted',
            conversion_id
        );
    END LOOP;
END;
$$;

-- Create function to notify when conversion is recommended
CREATE OR REPLACE FUNCTION public.notify_conversion_recommendation(conversion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conversion_record public.conversions%ROWTYPE;
    lead_record public.leads%ROWTYPE;
    rep_name TEXT;
    manager_name TEXT;
    director_id UUID;
    admin_id UUID;
BEGIN
    -- Get conversion and lead details
    SELECT * INTO conversion_record FROM public.conversions WHERE id = conversion_id;
    SELECT * INTO lead_record FROM public.leads WHERE id = conversion_record.lead_id;
    
    -- Get rep and manager names
    SELECT full_name INTO rep_name FROM public.profiles WHERE id = conversion_record.rep_id;
    SELECT full_name INTO manager_name FROM public.profiles WHERE id = conversion_record.recommended_by;
    
    -- Notify the rep
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
        conversion_record.rep_id,
        'Conversion Recommended for Approval',
        format('Your conversion for %s worth $%s has been recommended for approval by %s.',
               COALESCE(lead_record.company_name, 'Unknown Company'),
               COALESCE(conversion_record.revenue_amount::TEXT, '0'),
               COALESCE(manager_name, 'Manager')),
        'conversion_recommended',
        conversion_id
    );
    
    -- Notify directors
    FOR director_id IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role = 'director'
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            director_id,
            'Conversion Recommended for Approval',
            format('A conversion for %s worth $%s has been recommended for approval by %s.',
                   COALESCE(lead_record.company_name, 'Unknown Company'),
                   COALESCE(conversion_record.revenue_amount::TEXT, '0'),
                   COALESCE(manager_name, 'Manager')),
            'conversion_recommended',
            conversion_id
        );
    END LOOP;
    
    -- Notify admins
    FOR admin_id IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role = 'admin'
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            admin_id,
            'Conversion Recommended for Approval',
            format('A conversion for %s worth $%s has been recommended for approval by %s.',
                   COALESCE(lead_record.company_name, 'Unknown Company'),
                   COALESCE(conversion_record.revenue_amount::TEXT, '0'),
                   COALESCE(manager_name, 'Manager')),
            'conversion_recommended',
            conversion_id
        );
    END LOOP;
END;
$$;

-- Create function to notify when conversion is approved or rejected
CREATE OR REPLACE FUNCTION public.notify_conversion_decision(conversion_id UUID, decision TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conversion_record public.conversions%ROWTYPE;
    lead_record public.leads%ROWTYPE;
    rep_name TEXT;
    approver_name TEXT;
    decision_title TEXT;
    decision_message TEXT;
BEGIN
    -- Get conversion and lead details
    SELECT * INTO conversion_record FROM public.conversions WHERE id = conversion_id;
    SELECT * INTO lead_record FROM public.leads WHERE id = conversion_record.lead_id;
    
    -- Get rep and approver names
    SELECT full_name INTO rep_name FROM public.profiles WHERE id = conversion_record.rep_id;
    SELECT full_name INTO approver_name FROM public.profiles WHERE id = conversion_record.approved_by;
    
    -- Set decision-specific content
    IF decision = 'approved' THEN
        decision_title := 'Conversion Approved';
        decision_message := format('Your conversion for %s worth $%s has been approved by %s.',
                                   COALESCE(lead_record.company_name, 'Unknown Company'),
                                   COALESCE(conversion_record.revenue_amount::TEXT, '0'),
                                   COALESCE(approver_name, 'Approver'));
    ELSE
        decision_title := 'Conversion Rejected';
        decision_message := format('Your conversion for %s worth $%s has been rejected by %s.',
                                   COALESCE(lead_record.company_name, 'Unknown Company'),
                                   COALESCE(conversion_record.revenue_amount::TEXT, '0'),
                                   COALESCE(approver_name, 'Approver'));
        IF conversion_record.rejection_reason IS NOT NULL THEN
            decision_message := decision_message || ' Reason: ' || conversion_record.rejection_reason;
        END IF;
    END IF;
    
    -- Notify the rep
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
        conversion_record.rep_id,
        decision_title,
        decision_message,
        'conversion_' || decision,
        conversion_id
    );
    
    -- Also notify the person who recommended it (if different from approver)
    IF conversion_record.recommended_by IS NOT NULL AND conversion_record.recommended_by != conversion_record.approved_by THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            conversion_record.recommended_by,
            decision_title,
            format('The conversion for %s worth $%s that you recommended has been %s by %s.',
                   COALESCE(lead_record.company_name, 'Unknown Company'),
                   COALESCE(conversion_record.revenue_amount::TEXT, '0'),
                   decision,
                   COALESCE(approver_name, 'Approver')),
            'conversion_' || decision,
            conversion_id
        );
    END IF;
END;
$$;

-- Update conversion policies to include workflow
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON public.conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_rep_id ON public.conversions(rep_id);
