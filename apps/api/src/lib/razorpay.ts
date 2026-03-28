import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
}

export const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

/**
 * Verifies the HMAC-SHA256 signature Razorpay sends after a successful payment.
 * See: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/#verify-payment-signature
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret!)
    .update(body)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(razorpaySignature, "hex")
  );
}
