-- Add face_descriptor column to profiles table for biometric verification
ALTER TABLE public.profiles ADD COLUMN face_descriptor text;
-- Add comment to document the purpose
COMMENT ON COLUMN public.profiles.face_descriptor IS 'JSON-stringified Float32Array of face descriptor for biometric matching';
