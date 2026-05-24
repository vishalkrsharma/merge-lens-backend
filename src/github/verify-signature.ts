import crypto from 'crypto';

export function verifySignature(body: string, signature: string) {
  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
