-- Soporte para múltiples proveedores de pago (WebPay ya existía; se agrega
-- Mercado Pago). Los pagos existentes se marcan como 'webpay' por defecto.

ALTER TABLE payments
  ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'webpay'
    CHECK (provider IN ('webpay', 'mercadopago')),
  ADD COLUMN mp_preference_id VARCHAR(100),
  ADD COLUMN mp_payment_id VARCHAR(100),
  ADD COLUMN mp_response JSONB;

CREATE INDEX idx_payments_mp_preference ON payments(mp_preference_id);
CREATE INDEX idx_payments_mp_payment ON payments(mp_payment_id);
