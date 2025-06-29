-- Test the commission calculation RPC function
-- This function should already exist from the migration
SELECT calculate_commission_with_deductions(
    revenue_amount := 10000.00,
    commission_rate := 10.0,
    currency := 'USD',
    deduction_settings := '[
        {"label": "Administrative Fee", "percentage": 2.5},
        {"label": "Processing Fee", "percentage": 1.0}
    ]'::jsonb
);

-- Test basic conversion workflow status updates
-- This should work with the workflow fields we added
SELECT 
    id,
    status,
    submitted_by,
    submitted_at,
    recommended_by,
    recommended_at,
    approved_by,
    approved_at,
    workflow_notes,
    rejection_reason
FROM conversions 
WHERE status IN ('pending', 'recommended', 'approved', 'rejected')
LIMIT 5;
