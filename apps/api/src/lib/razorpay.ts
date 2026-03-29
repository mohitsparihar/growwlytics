import Razorpay from "razorpay";
import crypto from "crypto";

function razorpayKeys(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
  }
  return { keyId, keySecret };
}

let razorpayClient: Razorpay | null = null;

/** Lazily created so the API can boot without Razorpay keys until a payment route runs. */
export function getRazorpay(): Razorpay {
  if (!razorpayClient) {
    const { keyId, keySecret } = razorpayKeys();
    razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpayClient;
}

/**
 * Verifies the HMAC-SHA256 signature Razorpay sends after a successful payment.
 * See: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/#verify-payment-signature
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const { keySecret } = razorpayKeys();
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(razorpaySignature, "hex")
  );
}
