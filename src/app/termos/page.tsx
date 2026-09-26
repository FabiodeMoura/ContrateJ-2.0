import type { Metadata } from 'next'
import PaginaLegal from '@/components/PaginaLegal'

export const metadata: Metadata = { title: 'Termos de Uso · ContrateJá' }

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de Uso" atualizado="26 de setembro de 2026">
      <p>
        Estes Termos regulam o uso do ContrateJá (contrateja.app.br). Ao criar uma conta, você declara que leu e
        concorda com eles e com a <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O ContrateJá é uma plataforma on-line para empresas do setor de alimentação gerarem links de avaliação
        comportamental para candidatos, acompanharem o resultado de aderência ao perfil de cada função, marcarem
        entrevistas por vídeo e gerenciarem colaboradores, desligamentos e relatórios de turnover.
      </p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>A conta deve ser criada por pessoa maior de 18 anos, com dados verdadeiros.</li>
        <li>Quem cria a conta é o administrador: compra planos, cadastra empresas e usuários, e responde pelo uso feito por sua equipe.</li>
        <li>Guarde sua senha com cuidado. Avise o suporte se suspeitar de uso indevido.</li>
      </ul>

      <h2>3. Planos, créditos e pagamento</h2>
      <ul>
        <li>O plano Gratuito oferece 20 links de avaliação e 1 empresa. Os planos pagos são assinaturas mensais com os limites informados na página de planos.</li>
        <li>Cada link de avaliação gerado consome 1 crédito. Links avulsos podem ser comprados por quem tem plano pago.</li>
        <li>Os pagamentos são processados pela Hotmart, que segue os próprios termos. O plano é liberado para a conta com o mesmo e-mail usado na compra.</li>
        <li>A assinatura pode ser cancelada a qualquer momento. Após o cancelamento, o acesso ao plano continua até o fim do período já pago.</li>
        <li>Pedidos de reembolso seguem o Código de Defesa do Consumidor e as regras da Hotmart.</li>
      </ul>

      <h2>4. Uso adequado</h2>
      <p>Ao usar o ContrateJá, você se compromete a:</p>
      <ul>
        <li>Usar a avaliação como apoio à decisão, junto com entrevista e outros critérios, e não como único fator de contratação.</li>
        <li>Não usar a plataforma para discriminar candidatos por origem, raça, sexo, idade, religião, deficiência ou qualquer outra característica protegida por lei.</li>
        <li>Cadastrar dados de candidatos e colaboradores apenas com base legal adequada e informar a eles sobre o tratamento, como controlador desses dados.</li>
        <li>Não tentar acessar dados de outras empresas, copiar o sistema ou prejudicar seu funcionamento.</li>
      </ul>

      <h2>5. Responsabilidades</h2>
      <p>
        Trabalhamos para manter o serviço disponível e seguro, mas podem ocorrer interrupções para manutenção ou por
        falhas de fornecedores. O ContrateJá não garante resultados de contratação específicos, e as decisões de
        contratar ou desligar são sempre da empresa cliente. Na extensão permitida pela lei, nossa responsabilidade se
        limita ao valor pago pelo cliente nos últimos 12 meses.
      </p>

      <h2>6. Propriedade</h2>
      <p>
        A marca, o sistema, os perfis e questionários pertencem ao ContrateJá. Os dados inseridos pela empresa cliente
        continuam sendo dela, e ela pode exportá-los ou excluí-los.
      </p>

      <h2>7. Encerramento</h2>
      <p>
        Você pode encerrar a conta quando quiser, pelo suporte. Podemos suspender contas que violem estes Termos, com
        aviso sempre que possível.
      </p>

      <h2>8. Alterações e contato</h2>
      <p>
        Estes Termos podem ser atualizados, com a nova data no topo desta página. Dúvidas:{' '}
        <a href="mailto:suporte@contrateja.app.br">suporte@contrateja.app.br</a>.
      </p>
    </PaginaLegal>
  )
}
