-- Add face_match_score column to registrations table for tracking biometric verification results
ALTER TABLE public.registrations ADD COLUMN face_match_score integer;
-- Add comment to document the purpose
COMMENT ON COLUMN public.registrations.face_match_score IS 'Biometric face match score (0-100) from face verification during registration';
