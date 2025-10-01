export interface ZapriteOrderRequest {
  amount: number; // Amount in USD cents
  currency: string;
  externalUniqId: string; // Unique identifier for the order (our job ID)
  redirectUrl?: string; // Where to redirect after payment
  label?: string; // Order label
  metadata?: Record<string, any>; // Custom metadata
}

export interface ZapriteOrderResponse {
  id: string; // Zaprite order ID
  checkoutUrl: string; // URL to send customer to pay
  amount: number;
  currency: string;
  status: string;
  externalUniqId: string;
  createdAt: string;
}

export interface ZapriteWebhookPayload {
  event: 'order.paid' | 'order.expired' | 'order.created';
  data: {
    id: string;
    externalUniqId: string;
    status: string;
    amount: number;
    currency: string;
    paidAt?: string;
  };
}

export class ZapriteService {
  private apiKey: string;
  private baseUrl = 'https://api.zaprite.com';

  constructor() {
    this.apiKey = process.env.ZAPRITE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ZAPRITE_API_KEY not set - Zaprite payments will not work');
    }
  }

  /**
   * Create a Zaprite order for a print job
   */
  async createOrder(orderData: ZapriteOrderRequest): Promise<ZapriteOrderResponse> {
    // Development mode: return fake order for UI testing
    if (!this.apiKey && process.env.DEV_FAKE_PAYMENTS === 'true') {
      console.warn('⚠️  DEV MODE: Returning fake Zaprite order (DEV_FAKE_PAYMENTS=true)');
      return {
        id: `fake-order-${Date.now()}`,
        checkoutUrl: `${orderData.redirectUrl || '/customer/dashboard'}?dev_payment_test=true`,
        status: 'pending',
        amount: orderData.amount,
        currency: orderData.currency || 'USD',
        externalUniqId: orderData.externalUniqId,
        createdAt: new Date().toISOString(),
      };
    }

    if (!this.apiKey) {
      throw new Error('Zaprite API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/v1/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zaprite API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Get order status from Zaprite
   */
  async getOrderStatus(orderId: string): Promise<ZapriteOrderResponse> {
    if (!this.apiKey) {
      throw new Error('Zaprite API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/v1/order/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zaprite API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Verify webhook signature (Zaprite uses HMAC-SHA256 signature)
   * SECURITY: This must be implemented before production use
   * For development/testing, set ZAPRITE_WEBHOOK_SECRET_BYPASS=true
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = process.env.ZAPRITE_WEBHOOK_SECRET;
    const bypassEnabled = process.env.ZAPRITE_WEBHOOK_SECRET_BYPASS === 'true';

    // Fail closed if no secret and bypass not enabled
    if (!webhookSecret && !bypassEnabled) {
      console.error('CRITICAL: ZAPRITE_WEBHOOK_SECRET not set and bypass not enabled. Rejecting webhook.');
      return false;
    }

    // Allow bypass for development/testing only
    if (bypassEnabled) {
      console.warn('WARNING: Webhook signature verification bypassed - development mode only!');
      return true;
    }

    // TODO: Implement HMAC-SHA256 verification when Zaprite provides documentation
    // Example (if Zaprite uses HMAC-SHA256):
    // const crypto = require('crypto');
    // const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
    // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    
    console.error('Webhook signature verification not implemented. Set ZAPRITE_WEBHOOK_SECRET_BYPASS=true for testing.');
    return false;
  }

  /**
   * Process webhook payload
   */
  processWebhook(payload: ZapriteWebhookPayload): {
    event: string;
    jobId: string;
    status: string;
    zapriteOrderId: string;
  } {
    return {
      event: payload.event,
      jobId: payload.data.externalUniqId, // Our job ID
      status: payload.data.status,
      zapriteOrderId: payload.data.id,
    };
  }
}

export const zapriteService = new ZapriteService();
