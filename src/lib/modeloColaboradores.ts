import { lerZip, gravarZip } from './zipSimples'
import { MODELO_COLABORADORES_BASE64 } from './modeloColaboradoresBase'

// Monta a planilha-modelo de colaboradores para a conta que está baixando.
// O modelo-base (logo, cores, larguras, listas de Função, aba "Como preencher") é fixo;
// aqui só trocamos a aba oculta "Empresas" pelas empresas da conta, que viram a lista
// de escolha da coluna Empresa.

const ABA_EMPRESAS = 'xl/worksheets/sheet3.xml' // aba oculta "Empresas" do modelo-base
const ABA_COLABORADORES = 'xl/worksheets/sheet1.xml'
const LISTA_ORIGINAL = 'Empresas!$A$2:$A$4'

function escaparXml(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // caracteres de controle quebram o XML
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

export function montarModeloColaboradores(nomesEmpresas: string[]): Buffer {
  const nomes = Array.from(new Set(nomesEmpresas.map((n) => n.trim()).filter(Boolean)))
  if (nomes.length === 0) nomes.push('Cadastre uma empresa no ContrateJá antes de importar')

  const linhas = ['Empresas', ...nomes]
    .map(
      (nome, i) =>
        `<row r="${i + 1}"><c r="A${i + 1}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(nome)}</t></is></c></row>`
    )
    .join('')
  const abaEmpresas =
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="A1:A${nomes.length + 1}"/>` +
    `<sheetData>${linhas}</sheetData>` +
    '</worksheet>'

  const arquivos = lerZip(Buffer.from(MODELO_COLABORADORES_BASE64, 'base64'))
  for (const arquivo of arquivos) {
    if (arquivo.nome === ABA_EMPRESAS) {
      arquivo.dados = Buffer.from(abaEmpresas, 'utf8')
    } else if (arquivo.nome === ABA_COLABORADORES) {
      const xml = arquivo.dados.toString('utf8')
      if (!xml.includes(LISTA_ORIGINAL)) throw new Error('Modelo-base sem a lista de empresas esperada')
      arquivo.dados = Buffer.from(xml.replace(LISTA_ORIGINAL, `Empresas!$A$2:$A$${nomes.length + 1}`), 'utf8')
    }
  }

  // [Content_Types].xml primeiro, como o Excel grava
  arquivos.sort((a, b) => (a.nome === '[Content_Types].xml' ? -1 : b.nome === '[Content_Types].xml' ? 1 : 0))
  return gravarZip(arquivos)
}
