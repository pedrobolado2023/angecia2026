import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos e Condições de Uso & Reserva • Hóspede Club",
  description:
    "Termos e Condições Gerais de Uso da Plataforma e Contratação de Hospedagem do Hóspede Club.",
};

export default function TermosPage() {
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B8863B]/10 border border-[#B8863B]/20 text-[#9A6D28] text-[11px] font-semibold uppercase tracking-wider mb-3">
              <FileText className="w-3.5 h-3.5" />
              <span>Contrato de Intermediação & Uso</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl text-[#182026]">
              Termos e Condições Gerais
            </h1>
            <p className="text-xs text-[#5C646B] mt-2">
              Última atualização: Novembro de 2026 • Em conformidade com o Código de Defesa do Consumidor (Lei nº 8.078/1990)
            </p>
          </div>

          <div className="prose prose-stone text-xs sm:text-sm text-[#465058] leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                1. Objeto e Natureza dos Serviços
              </h2>
              <p>
                O <strong>Hóspede Club</strong> opera como clube privado de curadoria e intermediação de reservas de hospedagem, conectando seus membros a hotéis, resorts e propriedades selecionadas através de canais diretos e distribuidores globais autorizados (incluindo Hotelbeds APItude e Omnibees).
              </p>
              <p>
                Ao realizar um cadastro ou confirmar uma reserva através do site, o hóspede declara ciência e concordância integral com as condições comerciais aqui estipuladas.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                2. Tarifas, Preços e Impostos Inclusos
              </h2>
              <p>
                <strong>Transparência Total:</strong> Todos os preços finais exibidos no Hóspede Club incluem integralmente:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Imposto Sobre Serviços (ISS) incidente sobre a hospedagem;</li>
                <li>Taxas municipais de turismo e serviços obrigatórios dos hotéis;</li>
                <li>Regime de alimentação conforme expressamente indicado (ex: Café da Manhã Incluso / Bed & Breakfast);</li>
                <li>Desconto exclusivo de membro aplicado sobre a Tarifa Pública Oficial (BAR).</li>
              </ul>
              <p className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9C8] text-[#0F5257] font-medium text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Garantia de Preço Final: O hóspede não terá cobranças de taxas surpresa no check-out do hotel referentes à diária contratada.</span>
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                3. Confirmação da Reserva e Emissão de Voucher
              </h2>
              <p>
                A reserva é considerada válida e confirmada imediatamente após a aprovação do pagamento pelo gateway oficial (Mercado Pago).
              </p>
              <p>
                Um <strong>Voucher Oficial com Localizador Alfanumérico Único</strong> é gerado e disponibilizado para download em PDF, além de enviado instantaneamente para o WhatsApp e e-mail cadastrados pelo titular.
              </p>
              <p>
                O voucher deve ser apresentado no balcão de recepção do hotel no momento do check-in, acompanhado de documento oficial com foto e CPF de todos os hóspedes.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                4. Regras de Check-in, Check-out e No-Show
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Horário de Check-in:</strong> Geralmente a partir das 14h00 ou 15h00 (conforme regulamento interno do hotel).</li>
                <li><strong>Horário de Check-out:</strong> Geralmente até às 11h00 ou 12h00.</li>
                <li><strong>Não Comparecimento (No-Show):</strong> Caso os hóspedes não compareçam na data de entrada sem aviso prévio nos prazos da política de cancelamento, o hotel manterá o quarto reservado até as 12h00 do dia seguinte, após o qual a acomodação poderá ser liberada sem direito a reembolso da diária.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                5. Formas de Pagamento e Segurança
              </h2>
              <p>
                Os pagamentos são processados com criptografia bancária de ponta a ponta através do <strong>Mercado Pago</strong>, nas seguintes modalidades:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>PIX à Vista:</strong> Com compensação imediata em segundos e garantia de melhor tarifa do clube;</li>
                <li><strong>Cartão de Crédito em até 12x:</strong> Parcelamento inteligente com suporte às principais bandeiras (Visa, Mastercard, Elo, American Express, Hipercard).</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                6. Modificações e Cancelamentos
              </h2>
              <p>
                As condições de alteração ou cancelamento variam conforme a tarifa selecionada (Tarifas Promocionais Não Reembolsáveis vs. Tarifas com Cancelamento Grátis). Consulte a seção específica de <Link href="/cancelamento" className="text-[#9A6D28] underline font-medium">Políticas de Cancelamento</Link> para detalhes completos.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                7. Foro e Legislação Aplicável
              </h2>
              <p>
                Este contrato é regido pelas leis da República Federativa do Brasil. Para dirimir quaisquer controvérsias decorrentes destes termos, elege-se o foro da comarca de domicílio do consumidor.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-[#EAE3D5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C646B]">
            <span>Hóspede Club Intermediações de Viagens &bull; CNPJ Ativo</span>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium transition shadow-xs"
            >
              Entendido &bull; Ir para as Acomodações
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
