import crypto from 'crypto';

// Mock de WebPay Plus para MVP (modo testing TBK)
export async function createTransaction(amount: number, orderId: string, returnUrl: string) {
  const token = crypto.randomBytes(20).toString('hex');
  return {
    token,
    url: `https://webpay3gint.transbank.cl/webpayserver/initTransaction`,
    mockUrl: `${returnUrl}?token_ws=${token}&TBK_ORDEN_COMPRA=${orderId}`,
    amount,
    status: 'INITIALIZED'
  };
}

export async function confirmTransaction(token: string) {
  // En producción: llamar a API real de Transbank
  return {
    vci: 'TSY',
    amount: 0,
    status: 'AUTHORIZED',
    buy_order: '',
    session_id: '',
    card_detail: { card_number: '6623' },
    accounting_date: '',
    transaction_date: new Date().toISOString(),
    authorization_code: '1213',
    payment_type_code: 'VN',
    response_code: 0,
    installments_number: 0
  };
}