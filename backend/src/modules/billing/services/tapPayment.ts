import crypto from 'node:crypto';

const TAP_BASE_URL = 'https://api.tap.company/v2';

function getTapApiKey(): string {
  return process.env['TAP_API_KEY'] || '';
}

function getTapHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${getTapApiKey()}`,
    'Content-Type': 'application/json',
  };
}

export async function createTapCharge(
  amount: number,
  currency: string,
  metadata: Record<string, string>,
): Promise<Record<string, unknown>> {
  const apiKey = getTapApiKey();
  if (!apiKey) {
    return {
      status: 'MOCK_CREATED',
      id: `mock_charge_${Date.now()}`,
      amount,
      currency,
      metadata,
    };
  }

  const body = {
    amount: Math.round(amount * 100),
    currency,
    threeDSecure: true,
    save_card: false,
    description: metadata.description || 'HMS Payment',
    metadata: {
      hospitalId: metadata.hospitalId || '',
      patientId: metadata.patientId || '',
      invoiceId: metadata.invoiceId || '',
    },
    receipt: {
      email: false,
      sms: false,
    },
  };

  const response = await fetch(`${TAP_BASE_URL}/charges`, {
    method: 'POST',
    headers: getTapHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json() as Record<string, unknown>;
    throw new Error(`Tap charge failed: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function createTapRefund(
  chargeId: string,
  amount: number,
): Promise<Record<string, unknown>> {
  const apiKey = getTapApiKey();
  if (!apiKey) {
    return {
      status: 'MOCK_REFUNDED',
      id: `mock_refund_${Date.now()}`,
      chargeId,
      amount,
    };
  }

  const body = {
    amount: Math.round(amount * 100),
  };

  const response = await fetch(`${TAP_BASE_URL}/charges/${chargeId}/refunds`, {
    method: 'POST',
    headers: getTapHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json() as Record<string, unknown>;
    throw new Error(`Tap refund failed: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function createTapCheckoutSession(
  amount: number,
  currency: string,
  customer: { name: string; email: string; phone?: string },
  metadata: Record<string, string>,
  redirectUrl: string,
): Promise<Record<string, unknown>> {
  const apiKey = getTapApiKey();
  if (!apiKey) {
    return {
      id: `mock_checkout_${Date.now()}`,
      url: `${redirectUrl}?mock=true&invoiceId=${metadata.invoiceId || ''}`,
      status: 'MOCK_CREATED',
      amount,
      currency,
    };
  }

  const phoneParts = customer.phone ? customer.phone.replace(/[^0-9]/g, '').split(/^(\d{1,4})(.*)$/) : [];
  const countryCode = phoneParts?.[1] || '966';
  const phoneNumber = phoneParts?.[2] || customer.phone || '';

  const body = {
    amount: Math.round(amount * 100),
    currency,
    customer_initiated: true,
    visitor_id: metadata.patientId || `visitor_${Date.now()}`,
    customer: {
      first_name: customer.name.split(' ')[0] || customer.name,
      last_name: customer.name.split(' ').slice(1).join(' ') || '.',
      email: customer.email,
      phone: {
        country_code: countryCode,
        number: phoneNumber,
      },
    },
    source: { id: 'src_all' },
    metadata: {
      hospitalId: metadata.hospitalId || '',
      patientId: metadata.patientId || '',
      invoiceId: metadata.invoiceId || '',
    },
    redirect: { url: redirectUrl },
  };

  const response = await fetch(`${TAP_BASE_URL}/checkout_sessions`, {
    method: 'POST',
    headers: getTapHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json() as Record<string, unknown>;
    throw new Error(`Tap checkout session failed: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export function verifyTapWebhook(
  payload: Record<string, unknown>,
  signature: string,
): boolean {
  const webhookSecret = process.env['TAP_WEBHOOK_SECRET'];
  if (!webhookSecret) return true;

  const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadString)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}
