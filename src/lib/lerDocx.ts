import { inflateRawSync } from 'zlib'

// Lê o texto de um arquivo Word (.docx). O .docx é um zip; o texto fica em word/document.xml.
export function lerDocx(arquivo: Buffer): string {
  // 1) fim do zip (EOCD)
  let eocd = -1
  for (let i = arquivo.length - 22; i >= Math.max(0, arquivo.length - 66000); i--) {
    if (arquivo.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Arquivo Word inválido')

  const totalEntradas = arquivo.readUInt16LE(eocd + 10)
  let pos = arquivo.readUInt32LE(eocd + 16) // início do diretório central

  // 2) procura word/document.xml no diretório central
  for (let n = 0; n < totalEntradas; n++) {
    if (arquivo.readUInt32LE(pos) !== 0x02014b50) break
    const metodo = arquivo.readUInt16LE(pos + 10)
    const tamanhoComprimido = arquivo.readUInt32LE(pos + 20)
    const tamNome = arquivo.readUInt16LE(pos + 28)
    const tamExtra = arquivo.readUInt16LE(pos + 30)
    const tamComentario = arquivo.readUInt16LE(pos + 32)
    const inicioLocal = arquivo.readUInt32LE(pos + 42)
    const nome = arquivo.toString('utf8', pos + 46, pos + 46 + tamNome)

    if (nome === 'word/document.xml') {
      const nomeLocal = arquivo.readUInt16LE(inicioLocal + 26)
      const extraLocal = arquivo.readUInt16LE(inicioLocal + 28)
      const inicioDados = inicioLocal + 30 + nomeLocal + extraLocal
      const dados = arquivo.subarray(inicioDados, inicioDados + tamanhoComprimido)
      const xml = (metodo === 0 ? dados : inflateRawSync(dados)).toString('utf8')
      return xmlParaTexto(xml)
    }
    pos += 46 + tamNome + tamExtra + tamComentario
  }
  throw new Error('Não encontrei o texto no arquivo Word')
}

function xmlParaTexto(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
