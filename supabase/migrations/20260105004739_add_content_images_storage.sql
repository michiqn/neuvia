-- Create storage bucket for content images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-images',
  'content-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload their own content images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own content images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own content images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- All images are publicly readable (since bucket is public)
CREATE POLICY "Content images are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'content-images');

