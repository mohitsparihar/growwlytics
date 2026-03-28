import { Router, type Request, type Response } from "express";
import type { Orders } from "razorpay/dist/types/orders.js";
import { supabase } from "../lib/supabase.js";
import { razorpay, verifyPaymentSignature } from "../lib/razorpay.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { CREDIT_PACKS, getPackById } from "../config/creditPacks.js";

const router = Router();

// All credit routes require authentication.
router.use(requireAuth);

// ---------------------------------------------------------------------------
// GET /api/credits
// Returns the authenticated user's credit balance.
// ---------------------------------------------------------------------------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  const { data, error } = await supabase
    .from("credits")
    .select("total_credits, used_credits")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    res.status(500).json({ error: "Failed to fetch credits" });
    return;
  }

  const available = data.total_credits - data.used_credits;

  res.json({
    data: {
      total_credits: data.total_credits,
      used_credits: data.used_credits,
      available_credits: available,
      packs: CREDIT_PACKS,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/credits/purchase
// Creates a Razorpay order for the chosen credit pack.
// Body: { pack_id: "pack_1" | "pack_5" | "pack_10" | "pack_20" }
// Response: { order_id, amount, currency, key_id, pack }
// ---------------------------------------------------------------------------
router.post("/purchase", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { pack_id } = req.body as { pack_id?: string };

  if (!pack_id) {
    res.status(400).json({ error: "pack_id is required" });
    return;
  }

  const pack = getPackById(pack_id);
  if (!pack) {
    res.status(400).json({
      error: `Invalid pack_id. Valid options: ${CREDIT_PACKS.map((p) => p.id).join(", ")}`,
    });
    return;
  }

  let order: Orders.RazorpayOrder;
  try {
    order = (await razorpay.orders.create({
      amount: pack.amountPaise,
      currency: "INR",
      receipt: `grwl_${userId.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: userId,
        pack_id: pack.id,
        credits: String(pack.credits),
      },
    })) as Orders.RazorpayOrder;
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    res.status(502).json({ error: "Payment gateway error. Please try again." });
    return;
  }

  res.json({
    data: {
      order_id: order.id,
      amount: order.amount,       // paise
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      pack: {
        id: pack.id,
        label: pack.label,
        credits: pack.credits,
        display_price: pack.displayPrice,
      },
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/credits/verify
// Verifies the Razorpay signature and, if valid, credits the user.
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, pack_id }
// ---------------------------------------------------------------------------
router.post("/verify", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    pack_id,
  } = req.body as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    pack_id?: string;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !pack_id) {
    res.status(400).json({
      error: "razorpay_order_id, razorpay_payment_id, razorpay_signature, and pack_id are required",
    });
    return;
  }

  // 1. Verify the HMAC signature.
  let signatureValid: boolean;
  try {
    signatureValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
  } catch {
    // timingSafeEqual throws if buffer lengths differ — treat as invalid.
    signatureValid = false;
  }

  if (!signatureValid) {
    res.status(400).json({ error: "Payment verification failed: invalid signature" });
    return;
  }

  // 2. Confirm the pack is real.
  const pack = getPackById(pack_id);
  if (!pack) {
    res.status(400).json({ error: "Invalid pack_id" });
    return;
  }

  // 3. Idempotency — make sure this payment_id hasn't been credited before.
  const { data: existing } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("razorpay_payment_id", razorpay_payment_id)
    .maybeSingle();

  if (existing) {
    // Already processed — return the current balance without error.
    const { data: credits } = await supabase
      .from("credits")
      .select("total_credits, used_credits")
      .eq("user_id", userId)
      .single();

    res.json({
      data: {
        already_credited: true,
        available_credits: credits
          ? credits.total_credits - credits.used_credits
          : null,
      },
    });
    return;
  }

  // 4. Add credits atomically via the DB function (handles ledger + balance update).
  const { error: rpcError } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_amount: pack.credits,
    p_type: "purchase",
    p_razorpay_order_id: razorpay_order_id,
    p_razorpay_payment_id: razorpay_payment_id,
    p_desc: `Purchased ${pack.label} pack (${pack.credits} credit${pack.credits > 1 ? "s" : ""})`,
  });

  if (rpcError) {
    console.error("add_credits RPC failed:", rpcError);
    res.status(500).json({ error: "Failed to apply credits. Please contact support." });
    return;
  }

  // 5. Return the updated balance.
  const { data: credits } = await supabase
    .from("credits")
    .select("total_credits, used_credits")
    .eq("user_id", userId)
    .single();

  res.json({
    data: {
      credited: pack.credits,
      available_credits: credits
        ? credits.total_credits - credits.used_credits
        : null,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/credits/use
// Deducts 1 credit. Called just before generating a content plan.
// Body: { plan_id?: string }  — optional, links the deduction to a brief
// Response: { available_credits: number }
// ---------------------------------------------------------------------------
router.post("/use", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { plan_id } = req.body as { plan_id?: string };

  const { error: rpcError } = await supabase.rpc("spend_credit", {
    p_user_id: userId,
    p_plan_id: plan_id ?? null,
  });

  if (rpcError) {
    if (rpcError.message.includes("insufficient_credits")) {
      res.status(402).json({ error: "Insufficient credits" });
      return;
    }
    console.error("spend_credit RPC failed:", rpcError);
    res.status(500).json({ error: "Failed to deduct credit" });
    return;
  }

  const { data: credits } = await supabase
    .from("credits")
    .select("total_credits, used_credits")
    .eq("user_id", userId)
    .single();

  res.json({
    data: {
      available_credits: credits
        ? credits.total_credits - credits.used_credits
        : null,
    },
  });
});

export default router;
