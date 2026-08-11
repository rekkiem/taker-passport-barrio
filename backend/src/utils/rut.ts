export function validateRut(rut: string): boolean {
  rut = rut.replace(/\./g, '').replace('-', '').toUpperCase();
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);

  if (!/^\d+$/.test(body) || body.length < 7) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let calculatedDv: string;

  if (remainder === 11) calculatedDv = '0';
  else if (remainder === 10) calculatedDv = 'K';
  else calculatedDv = remainder.toString();

  return calculatedDv === dv;
}

export function formatRut(rut: string): string {
  rut = rut.replace(/\./g, '').replace('-', '');
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}