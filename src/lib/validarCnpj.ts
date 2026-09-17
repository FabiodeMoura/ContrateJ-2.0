export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

// Validação oficial do dígito verificador do CNPJ (não é só checar 14 números)
export function cnpjValido(valorBruto: string): boolean {
  const cnpj = apenasDigitos(valorBruto)

  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false // 00000000000000, 11111111111111, etc.

  const calcularDigito = (base: string, pesos: number[]) => {
    const soma = base
      .split('')
      .reduce((acc, num, i) => acc + parseInt(num, 10) * pesos[i], 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const digito1 = calcularDigito(cnpj.slice(0, 12), pesos1)
  const digito2 = calcularDigito(cnpj.slice(0, 12) + digito1, pesos2)

  return cnpj === cnpj.slice(0, 12) + digito1.toString() + digito2.toString()
}

export function formatarCnpj(valorBruto: string): string {
  const d = apenasDigitos(valorBruto).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}
