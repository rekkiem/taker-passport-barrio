import axios from 'axios';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://evolution-api:8080';
const API_KEY = process.env.EVOLUTION_API_KEY || 'default';

export async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    await axios.post(`${EVOLUTION_URL}/message/sendText`, {
      number: phone.replace('+', ''),
      text: message,
  }, {
      headers: { 'apikey': API_KEY },
      timeout: 3000,
    });
  } catch (e) {
    console.error('Error enviando WhatsApp:', e);
  }
}

export async function notifyTaskAssigned(giverPhone: string, takerName: string, taskDesc: string) {
  await sendWhatsAppMessage(giverPhone, `✅ ¡${takerName} ha sido asignado a tu tarea: "${taskDesc}"!`);
}

export async function notifyNewApplicant(takerPhone: string, taskDesc: string) {
  await sendWhatsAppMessage(takerPhone, `🔔 Nueva postulación recibida para: "${taskDesc}"`);
}
