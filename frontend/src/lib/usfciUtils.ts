// src/lib/usfciUtils.ts

const DECIMALS = 18;

/**
 * Convierte de USFCI legible a unidades base (para enviar al contrato)
 * @param amount - Cantidad en USFCI (ejemplo: "1", "10.5", "100")
 * @returns String con la cantidad en unidades base
 * 
 * Ejemplos:
 * "1" -> "1000000000000000000"
 * "10.5" -> "10500000000000000000"
 * "100" -> "100000000000000000000"
 */
export const toBaseUnits = (amount: string | number): string => {
  try {
    const amountStr = amount.toString();
    const [whole = '0', fraction = ''] = amountStr.split('.');
    
    // Pad la parte fraccionaria con ceros hasta tener 18 decimales
    const paddedFraction = fraction.padEnd(DECIMALS, '0').slice(0, DECIMALS);
    
    // Combinar parte entera con parte fraccionaria
    const baseUnits = whole + paddedFraction;
    
    // Remover ceros a la izquierda (excepto si es "0")
    return baseUnits.replace(/^0+/, '') || '0';
  } catch (error) {
    console.error('Error converting to base units:', error);
    throw new Error('Invalid amount format');
  }
};

/**
 * Convierte de unidades base del contrato a USFCI legible
 * @param amount - Cantidad en unidades base (ejemplo: "1000000000000000000")
 * @returns String con la cantidad en USFCI
 * 
 * Ejemplos:
 * "1000000000000000000" -> "1"
 * "10500000000000000000" -> "10.5"
 * "100000000000000000000" -> "100"
 */
export const fromBaseUnits = (amount: string | number): string => {
  try {
    const amountStr = amount.toString();
    
    // Pad con ceros a la izquierda si es necesario
    const paddedAmount = amountStr.padStart(DECIMALS + 1, '0');
    
    // Separar parte entera y decimal
    const integerPart = paddedAmount.slice(0, -DECIMALS) || '0';
    const decimalPart = paddedAmount.slice(-DECIMALS);
    
    // Remover ceros trailing de la parte decimal
    const trimmedDecimal = decimalPart.replace(/0+$/, '');
    
    // Si no hay parte decimal, retornar solo la parte entera
    if (!trimmedDecimal) {
      return integerPart;
    }
    
    return `${integerPart}.${trimmedDecimal}`;
  } catch (error) {
    console.error('Error converting from base units:', error);
    return '0';
  }
};

/**
 * Formatea un número USFCI con separadores de miles
 * @param amount - Cantidad en USFCI (ya convertida de base units)
 * @param decimals - Número de decimales a mostrar (default: 2)
 * @returns String formateado con separadores
 * 
 * Ejemplos:
 * 1000.5 -> "1,000.50"
 * 1234567.89 -> "1,234,567.89"
 */
export const formatUSFCI = (
  amount: string | number,
  decimals: number = 2
): string => {
  try {
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numValue)) return '0.00';
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  } catch (error) {
    console.error('Error formatting USFCI:', error);
    return '0.00';
  }
};

/**
 * Formatea como moneda USD
 * @param amount - Cantidad en USFCI (ya convertida de base units)
 * @returns String formateado con símbolo $
 * 
 * Ejemplo: 1000.5 -> "$1,000.50"
 */
export const formatUSD = (amount: string | number): string => {
  try {
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numValue)) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  } catch (error) {
    console.error('Error formatting USD:', error);
    return '$0.00';
  }
};

/**
 * Convierte de base units a USFCI y formatea con separadores
 * @param baseUnits - Cantidad en unidades base del contrato
 * @param decimals - Número de decimales a mostrar
 * @returns String formateado
 * 
 * Ejemplo: "1000000000000000000000" -> "1,000.00"
 */
export const formatFromBaseUnits = (
  baseUnits: string | number,
  decimals: number = 2
): string => {
  const usfci = fromBaseUnits(baseUnits);
  return formatUSFCI(usfci, decimals);
};

/**
 * Valida que un monto sea válido
 * @param amount - Cantidad a validar
 * @returns true si es válido
 */
export const isValidAmount = (amount: string | number): boolean => {
  try {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(num) && num > 0 && isFinite(num);
  } catch {
    return false;
  }
};

/**
 * Trunca una dirección de wallet para mostrar
 * @param address - Dirección completa
 * @param startChars - Caracteres al inicio (default: 6)
 * @param endChars - Caracteres al final (default: 4)
 * @returns Dirección truncada
 * 
 * Ejemplo: "0x1234...5678"
 */
export const truncateAddress = (
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string => {
  if (!address || address.length < startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// ==================== EJEMPLOS DE USO ====================
/*
// Enviar transferencia (frontend -> backend)
const userInput = "100.50"; // Usuario ingresa 100.50 USFCI
const baseUnits = toBaseUnits(userInput); // "100500000000000000000"
await transfer(recipient, baseUnits, description);

// Mostrar balance (backend -> frontend)
const balanceFromBackend = "1000000000000000000"; // 1 USFCI en base units
const readable = fromBaseUnits(balanceFromBackend); // "1"
const formatted = formatUSFCI(readable); // "1.00"
const usd = formatUSD(readable); // "$1.00"

// O directamente:
const formatted2 = formatFromBaseUnits(balanceFromBackend); // "1.00"
*/