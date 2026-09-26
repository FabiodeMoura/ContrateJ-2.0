import type { Metadata } from 'next'
import PaginaLegal from '@/components/PaginaLegal'

export const metadata: Metadata = { title: 'Política de Privacidade · ContrateJá' }

export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de Privacidade" atualizado="26 de setembro de 2026">
      <p>
        Esta política explica como o ContrateJá (contrateja.app.br) coleta, usa e protege dados pessoais, em
        conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
      </p>

      <h2>1. Quem somos e quem decide sobre os dados</h2>
      <p>
        O ContrateJá é uma plataforma de avaliação comportamental e gestão de contratação para empresas do setor de
        alimentação. Para os dados da conta da empresa cliente, o ContrateJá é o <b>controlador</b>. Para os dados de
        candidatos e colaboradores cadastrados por uma empresa, essa empresa é a <b>controladora</b> e o ContrateJá atua
        como <b>operador</b>, tratando os dados em nome dela e conforme suas instruções.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li><b>Conta da empresa:</b> nome do responsável, e-mail, senha (guardada de forma criptografada), nome da empresa, segmento, CNPJ e logo.</li>
        <li><b>Usuários da equipe:</b> e-mail e empresa à qual estão vinculados.</li>
        <li><b>Candidatos:</b> nome, e-mail, WhatsApp, cidade, formação, experiência, dados de currículo enviado pela empresa e as respostas ao questionário comportamental, com o resultado de aderência.</li>
        <li><b>Colaboradores:</b> nome, e-mail, WhatsApp, CPF (opcional), função, empresa, situação e, no desligamento, o tipo de saída e as respostas da pesquisa de saída.</li>
        <li><b>Pagamentos:</b> as compras são feitas pela Hotmart. Recebemos apenas o e-mail do comprador, o plano ou pacote e a situação da compra. <b>Não recebemos nem guardamos dados de cartão.</b></li>
        <li><b>Navegação:</b> nas páginas públicas (página inicial, login, obrigado, termos e privacidade), usamos o Pixel da Meta para medir visitas e cadastros vindos de anúncios. Ele não é usado nas telas internas do sistema nem nas páginas do candidato.</li>
      </ul>

      <h2>3. Para que usamos os dados</h2>
      <ul>
        <li>Prestar o serviço: gerar links de avaliação, calcular a aderência ao perfil da função, organizar candidatos, colaboradores e relatórios.</li>
        <li>Liberar e controlar planos e créditos comprados.</li>
        <li>Dar suporte e enviar comunicações sobre a conta.</li>
        <li>Medir e melhorar nossos anúncios e a página de vendas.</li>
        <li>Cumprir obrigações legais e proteger a segurança da plataforma.</li>
      </ul>
      <p>
        As bases legais são a execução de contrato, o legítimo interesse, o cumprimento de obrigação legal e, quando
        necessário, o consentimento.
      </p>

      <h2>4. Sobre a avaliação comportamental</h2>
      <p>
        O resultado da avaliação (percentual de aderência e recomendação) é uma ferramenta de apoio à decisão e não
        substitui a entrevista. As empresas clientes se comprometem a não usar o ContrateJá para práticas
        discriminatórias. O candidato pode pedir à empresa que o avaliou informações sobre o uso dos seus dados.
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <ul>
        <li><b>Supabase</b> (banco de dados e autenticação) e <b>Render</b> (hospedagem do site).</li>
        <li><b>Hotmart</b>, para processar pagamentos e assinaturas.</li>
        <li><b>Anthropic</b>, apenas quando a empresa usa a leitura automática de currículo: o arquivo é enviado para extrair os dados e não é usado para outros fins.</li>
        <li><b>Meta</b> (Facebook/Instagram), por meio do Pixel, nas páginas públicas.</li>
        <li>Autoridades, quando exigido por lei.</li>
      </ul>
      <p>Não vendemos dados pessoais. Alguns desses fornecedores podem armazenar dados fora do Brasil, com garantias adequadas de proteção.</p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa ou pelo tempo necessário para cumprir obrigações legais.
        A empresa cliente pode excluir candidatos e colaboradores a qualquer momento, e pode pedir a exclusão da conta
        pelo suporte.
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        Você pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade, exclusão, informações
        sobre compartilhamento e revogação do consentimento. Se você é candidato ou colaborador de uma empresa cliente,
        fale primeiro com essa empresa; se preferir, escreva para nós e encaminharemos o pedido. Contato:{' '}
        <a href="mailto:suporte@contrateja.app.br">suporte@contrateja.app.br</a>.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), senhas protegidas e regras de acesso que garantem que cada empresa veja
        somente os próprios dados. Nenhum sistema é 100% imune a incidentes; se algo acontecer, avisaremos os
        envolvidos e a autoridade competente conforme a lei.
      </p>

      <h2>9. Cookies e Pixel da Meta</h2>
      <p>
        As páginas públicas usam cookies do Pixel da Meta para medir visitas e cadastros. Você pode bloquear cookies de
        terceiros no seu navegador e ajustar suas preferências de anúncios nas configurações do Facebook e do Instagram.
      </p>

      <h2>10. Alterações</h2>
      <p>Esta política pode ser atualizada. A data da última atualização fica sempre no topo desta página.</p>
    </PaginaLegal>
  )
}
