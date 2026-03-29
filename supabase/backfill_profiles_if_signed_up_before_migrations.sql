-- Run in SQL Editor AFTER 001 + 002 + 003 if users exist in auth.users but have no rows yet
-- in public.profiles / public.credits (e.g. you signed up before migrations were applied).

INSERT INTO public.profiles (id, email, name, avatar_url)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

INSERT INTO public.credits (user_id, total_credits, used_credits)
SELECT u.id, 2, 0
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.credits c WHERE c.user_id = u.id);

INSERT INTO public.credit_transactions (user_id, amount, type, description)
SELECT u.id, 2, 'free', 'Welcome credits (backfill)'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.credit_transactions t
  WHERE t.user_id = u.id AND t.type = 'free'
);
