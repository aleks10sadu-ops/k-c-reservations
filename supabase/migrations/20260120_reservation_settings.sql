-- Migration: 20260120_reservation_settings.sql
CREATE TABLE IF NOT EXISTS public.reservation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access for settings" ON public.reservation_settings
    FOR SELECT USING (true);

-- Allow admin full access
CREATE POLICY "Allow admin full access for settings" ON public.reservation_settings
    FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.profiles WHERE role = 'admin'));
