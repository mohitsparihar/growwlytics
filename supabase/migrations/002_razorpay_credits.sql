-- =============================================================================
-- 002 — Switch to Razorpay, adjust free credit grant, harden spend_credit
-- =============================================================================

-- ---------------------------------------------------------------------------
-- credit_transactions: rename Stripe column → Razorpay columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.credit_transactions
  RENAME COLUMN stripe_payment_intent_id TO razorpay_payment_id;

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS razorpay_order_id text;

-- Index so we can look up a transaction by order_id during verification
CREATE INDEX IF NOT EXISTS idx_credit_transactions_razorpay_order_id
  ON public.credit_transactions(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- Unique constraint prevents crediting the same payment twice
CREATE UNIQUE INDEX IF NOT EXISTS uidx_credit_transactions_razorpay_payment_id
  ON public.credit_transactions(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- handle_new_user: 2 free credits (was 3)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.credits (user_id, total_credits, used_credits)
  VALUES (NEW.id, 2, 0);   -- 2 free plans for every new user

  -- Record the free grant in the ledger
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 2, 'free', 'Welcome credits');

  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- spend_credit: make plan_id nullable (use endpoint may not have one yet)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_credit(
  p_user_id uuid,
  p_plan_id uuid    DEFAULT NULL,
  p_desc    text    DEFAULT 'Content plan generation'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.credits
  SET used_credits = used_credits + 1
  WHERE user_id = p_user_id
    AND total_credits - used_credits >= 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_transactions
    (user_id, amount, type, plan_id, description)
  VALUES
    (p_user_id, -1, 'use', p_plan_id, p_desc);
END;
$$;


-- ---------------------------------------------------------------------------
-- add_credits: updated for Razorpay columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id            uuid,
  p_amount             integer,
  p_type               credit_transaction_type DEFAULT 'purchase',
  p_razorpay_order_id  text    DEFAULT NULL,
  p_razorpay_payment_id text   DEFAULT NULL,
  p_desc               text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.credits
  SET total_credits = total_credits + p_amount
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions
    (user_id, amount, type, razorpay_order_id, razorpay_payment_id, description)
  VALUES
    (p_user_id, p_amount, p_type, p_razorpay_order_id, p_razorpay_payment_id, p_desc);
END;
$$;
