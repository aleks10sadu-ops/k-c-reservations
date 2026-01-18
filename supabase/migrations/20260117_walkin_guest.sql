-- Create a system guest for walk-ins if it doesn't exist
INSERT INTO public.guests (id, first_name, last_name, phone, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Гость', '(Без брони)', '0000000000', 'regular')
ON CONFLICT (id) DO NOTHING;
