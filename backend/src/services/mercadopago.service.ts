import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// El access token de prueba (TEST-...) permite operar en modo sandbox sin
// mover dinero real. En producción se reemplaza por el access token real de
// la cuenta de Mercado Pago del negocio (ver docs/DEPLOY_VULTR.md).
function getClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN no está configurado');
  }
  return new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
}

/**
 * Crea una preferencia de pago (Checkout Pro) para una tarea.
 * Devuelve la URL de checkout (init_point) a la que se redirige al Giver.
 */
export async function createPreference(params: {
  taskId: string;
  title: string;
  amount: number;
  returnUrl: string;
  notificationUrl: string;
}) {
  const client = getClient();
  const preference = await new Preference(client).create({
    body: {
      items: [
        {
          id: params.taskId,
          title: params.title.slice(0, 250),
          quantity: 1,
          currency_id: 'CLP',
          unit_price: params.amount,
        },
      ],
      back_urls: {
        success: params.returnUrl,
        pending: params.returnUrl,
        failure: params.returnUrl,
      },
      auto_return: 'approved',
      notification_url: params.notificationUrl,
      external_reference: params.taskId,
      statement_descriptor: 'TAKER PASSPORT',
    },
  });

  return {
    preferenceId: preference.id!,
    initPoint: preference.init_point!,
  };
}

/**
 * Consulta el estado real de un pago directamente contra la API de Mercado
 * Pago — nunca se confía en el cuerpo del webhook por sí solo, ya que
 * cualquiera puede simular una llamada a /webhook; esta consulta usa el
 * access token secreto del servidor y es la única fuente de verdad.
 */
export async function fetchPayment(paymentId: string) {
  const client = getClient();
  const payment = await new Payment(client).get({ id: paymentId });
  return payment;
}
