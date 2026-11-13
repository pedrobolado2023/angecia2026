import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, CheckCircle2, UserCheck, Eye, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Proteção de Dados & Privacidade (LGPD) • Hóspede Club",
  description:
    "Política de Privacidade, Tratamento e Proteção de Dados Pessoais do Hóspede Club em total conformidade com a LGPD (Lei nº 13.709/2018).",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#182026] flex flex-col">
      {/* Topo Institucional */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E5DEC9] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#9A6D28] hover:text-[#182026] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Hóspede Club</span>
          </Link>
          <span className="font-editorial text-lg tracking-[0.16em] text-[#182026]">
            HÓSPEDE CLUB
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        <div className="bg-white border border-[#E5DEC9] rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F5257]/10 border border-[#0F5257]/20 text-[#0F5257] text-[11px] font-semibold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conformidade com a Lei Federal nº 13.709/2018 (LGPD)</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl text-[#182026]">
              Política de Privacidade e Proteção de Dados
            </h1>
            <p className="text-xs text-[#5C646B] mt-2">
              Privacidade, segurança bancária e controle soberano dos seus dados pessoais em cada etapa da sua hospedagem.
            </p>
          </div>

          <div className="prose prose-stone text-xs sm:text-sm text-[#465058] leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#B8863B]" />
                <span>1. Nosso Compromisso com sua Privacidade</span>
              </h2>
              <p>
                O <strong>Hóspede Club</strong> preza pela segurança, confidencialidade e integridade dos dados de seus membros. Coletamos e tratamos exclusivamente as informações estritamente necessárias para a prestação dos serviços de intermediação hoteleira, emissão fiscal e cumprimento de deveres legais regulatórios do turismo nacional.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                2. Quais Dados Pessoais Coletamos
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Identificação do Titular:</strong> Nome completo, CPF e data de nascimento (exigidos pelo Ministério do Turismo e pela recepção dos hotéis para a ficha de hospedagem FNpH);</li>
                <li><strong>Canais de Contato:</strong> WhatsApp e e-mail (usados para envio de códigos de segurança VIP, vouchers em tempo real e comprovantes de confirmação);</li>
                <li><strong>Endereço de Faturamento:</strong> CEP, logradouro, número, bairro, cidade e estado (necessários para emissão de nota fiscal e antifraude de cartões);</li>
                <li><strong>Segundo Hóspede / Dependentes:</strong> Nome e CPF informados para inclusão no voucher da acomodação;</li>
                <li><strong>Dados de Pagamento:</strong> Processados de forma tokenizada e criptografada pelo Mercado Pago. O Hóspede Club não armazena dados de cartões de crédito em servidores próprios.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                3. Finalidade e Base Legal do Tratamento
              </h2>
              <p>Os dados coletados são tratados com fundamento nas seguintes bases legais da LGPD:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Execução de Contrato (Art. 7º, V):</strong> Efetivação da reserva hoteleira, transmissão ao sistema do hotel reservado e emissão do voucher de entrada;</li>
                <li><strong>Cumprimento de Obrigação Legal (Art. 7º, II):</strong> Emissão de documentos fiscais e atendimento à regulamentação da Embratur/Cadastur;</li>
                <li><strong>Legítimo Interesse & Comunicações (Art. 7º, IX):</strong> Envio de alertas de ofertas do clube e novidades com opção explícita de descadastramento (opt-out).</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                4. Compartilhamento Seguro com Parceiros
              </h2>
              <p>
                Os dados são compartilhados apenas com os parceiros operacionais indispensáveis à sua viagem:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Hotel Selecionado & Distribuidor (Hotelbeds / Omnibees):</strong> Para que seu nome conste na lista oficial de hóspedes do estabelecimento;</li>
                <li><strong>Gateway Bancário (Mercado Pago):</strong> Para validação antifraude e liquidação segura de PIX e cartões;</li>
                <li><strong>Canal de Mensageria (WhatsApp Corporativo):</strong> Para envio do código de 6 dígitos e voucher da sua estadia.</li>
              </ul>
              <p className="font-medium text-[#182026]">
                O Hóspede Club não comercializa, não aluga e não cede bancos de dados a terceiros para fins publicitários externos.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                5. Seus Direitos como Titular de Dados (Art. 18 da LGPD)
              </h2>
              <p>Você possui total controle sobre seus dados e pode solicitar a qualquer momento:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8]">
                  <strong className="text-xs text-[#182026] block mb-1">Acesso e Confirmação</strong>
                  <span className="text-[11px] text-[#5C646B]">Confirmar a existência de tratamento e consultar quais dados temos registrados.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8]">
                  <strong className="text-xs text-[#182026] block mb-1">Correção e Atualização</strong>
                  <span className="text-[11px] text-[#5C646B]">Corrigir dados incompletos, inexatos ou desatualizados no seu perfil.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8]">
                  <strong className="text-xs text-[#182026] block mb-1">Exclusão Soberana</strong>
                  <span className="text-[11px] text-[#5C646B]">Excluir seu cadastro com um único clique no botão 'Excluir Conta' do perfil.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8]">
                  <strong className="text-xs text-[#182026] block mb-1">Revogação do Consentimento</strong>
                  <span className="text-[11px] text-[#5C646B]">Cancelar a qualquer momento o recebimento de mensagens e comunicações VIP.</span>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                6. Canal do Encarregado de Dados (DPO)
              </h2>
              <p>
                Para exercer seus direitos ou tirar dúvidas sobre o tratamento de seus dados pessoais, entre em contato diretamente com nossa equipe de governança através do e-mail: <strong className="text-[#9A6D28]">privacidade@hospedeclub.com.br</strong> ou pelo suporte oficial de WhatsApp do clube.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-[#EAE3D5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C646B]">
            <span>Criptografia SSL 256-bit &bull; Banco de Dados Segregado PostgreSQL</span>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#0F5257] hover:bg-[#146B72] text-white font-medium transition shadow-xs"
            >
              Compreendido &bull; Continuar Navegando
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
