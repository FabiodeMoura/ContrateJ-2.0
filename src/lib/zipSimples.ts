import { deflateRawSync, inflateRawSync } from 'zlib'

// Leitor/gravador de ZIP mínimo (só o necessário para editar um .xlsx no servidor, sem dependências).
// Um .xlsx é um ZIP de arquivos XML: lemos todos, trocamos os que precisamos e gravamos de novo.

export interface ArquivoZip {
  nome: string
  dados: Buffer
}

const TABELA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function lerZip(zip: Buffer): ArquivoZip[] {
  // Fim do diretório central: assinatura 0x06054b50, procurada de trás para frente
  let fim = -1
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      fim = i
      break
    }
  }
  if (fim < 0) throw new Error('Arquivo ZIP inválido')

  const total = zip.readUInt16LE(fim + 10)
  let pos = zip.readUInt32LE(fim + 16)
  const arquivos: ArquivoZip[] = []

  for (let n = 0; n < total; n++) {
    if (zip.readUInt32LE(pos) !== 0x02014b50) throw new Error('Diretório do ZIP inválido')
    const metodo = zip.readUInt16LE(pos + 10)
    const tamCompactado = zip.readUInt32LE(pos + 20)
    const tamNome = zip.readUInt16LE(pos + 28)
    const tamExtra = zip.readUInt16LE(pos + 30)
    const tamComentario = zip.readUInt16LE(pos + 32)
    const inicioLocal = zip.readUInt32LE(pos + 42)
    const nome = zip.toString('utf8', pos + 46, pos + 46 + tamNome)

    const nomeLocal = zip.readUInt16LE(inicioLocal + 26)
    const extraLocal = zip.readUInt16LE(inicioLocal + 28)
    const inicioDados = inicioLocal + 30 + nomeLocal + extraLocal
    const bruto = zip.subarray(inicioDados, inicioDados + tamCompactado)
    const dados = metodo === 8 ? inflateRawSync(bruto) : Buffer.from(bruto)

    arquivos.push({ nome, dados })
    pos += 46 + tamNome + tamExtra + tamComentario
  }
  return arquivos
}

export function gravarZip(arquivos: ArquivoZip[]): Buffer {
  const locais: Buffer[] = []
  const central: Buffer[] = []
  let deslocamento = 0

  for (const { nome, dados } of arquivos) {
    const nomeBuf = Buffer.from(nome, 'utf8')
    const compactado = deflateRawSync(dados, { level: 9 })
    const crc = crc32(dados)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // versão necessária
    local.writeUInt16LE(0x0800, 6) // nomes em UTF-8
    local.writeUInt16LE(8, 8) // deflate
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0x21, 12) // data fixa (1980-01-01)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compactado.length, 18)
    local.writeUInt32LE(dados.length, 22)
    local.writeUInt16LE(nomeBuf.length, 26)
    local.writeUInt16LE(0, 28)
    locais.push(local, nomeBuf, compactado)

    const cab = Buffer.alloc(46)
    cab.writeUInt32LE(0x02014b50, 0)
    cab.writeUInt16LE(20, 4)
    cab.writeUInt16LE(20, 6)
    cab.writeUInt16LE(0x0800, 8)
    cab.writeUInt16LE(8, 10)
    cab.writeUInt16LE(0, 12)
    cab.writeUInt16LE(0x21, 14)
    cab.writeUInt32LE(crc, 16)
    cab.writeUInt32LE(compactado.length, 20)
    cab.writeUInt32LE(dados.length, 24)
    cab.writeUInt16LE(nomeBuf.length, 28)
    cab.writeUInt32LE(deslocamento, 42)
    central.push(cab, nomeBuf)

    deslocamento += 30 + nomeBuf.length + compactado.length
  }

  const diretorio = Buffer.concat(central)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(arquivos.length, 8)
  fim.writeUInt16LE(arquivos.length, 10)
  fim.writeUInt32LE(diretorio.length, 12)
  fim.writeUInt32LE(deslocamento, 16)

  return Buffer.concat([...locais, diretorio, fim])
}
