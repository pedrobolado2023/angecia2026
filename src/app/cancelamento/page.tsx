import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, AlertCircle, CheckCircle2, RotateCcw, CalendarX, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Políticas de Cancelamento e Reembolso • Hóspede Club",
  description:
    "Políticas oficiais de cancelamento, alterações, prazos de reembolso e regras de no-show do Hóspede Club.",
};

export default function CancelamentoPage() {
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
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regras Oficiais de Cancelamento & Estorno</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl text-[#182026]">
              Políticas de Cancelamento e Reembolso
            </h1>
            <p className="text-xs text-[#5C646B] mt-2">
              Transparência e regras claras por modalidade de tarifa hoteleira contratada.
            </p>
          </div>

          <div className="prose prose-stone text-xs sm:text-sm text-[#465058] leading-relaxed space-y-6">
            <section className="space-y-3">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                1. Modalidades de Tarifas
              </h2>
              <p>
                No momento da escolha do quarto no Hóspede Club, cada acomodação apresenta expressamente sua categoria de tarifa:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* 1.1 Tarifa Flexível */}
                <div className="p-4 rounded-2xl bg-[#0F5257]/5 border border-[#0F5257]/20 space-y-2">
                  <div className="flex items-center gap-2 text-[#0F5257] font-semibold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tarifa com Cancelamento Grátis</span>
                  </div>
                  <p className="text-xs text-[#465058]">
                    Permite cancelamento gratuito com <strong>estorno integral de 100% do valor pago</strong>, desde que solicitado dentro do prazo limite estipulado na descrição do quarto (ex: até 48h ou 7 dias antes do check-in).
                  </p>
                </div>

                {/* 1.2 Tarifa Promocional Não Reembolsável */}
                <div className="p-4 rounded-2xl bg-[#B83B2B]/5 border border-[#B83B2B]/20 space-y-2">
                  <div className="flex items-center gap-2 text-[#B83B2B] font-semibold text-xs uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4" />
                    <span>Tarifa Não Reembolsável (NRF)</span>
                  </div>
                  <p className="text-xs text-[#465058]">
                    Tarifa super promocional com <strong>desconto agressivo exclusivo de membro</strong>. Em caso de cancelamento voluntário ou no-show, não há estorno financeiro, pois a tarifa tem bloqueio garantido de inventário com o hotel parceiro.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                2. Direito de Arrependimento (Art. 49 do CDC)
              </h2>
              <p>
                Para compras realizadas pela internet, o consumidor pode exercer seu direito de arrependimento no prazo de <strong>até 7 (sete) dias corridos</strong> a contar da confirmação da contratação, desde que a data do check-in não esteja compreendida dentro desse mesmo prazo, hipótese em que prevalecem as condições da tarifa selecionada para garantir o bloqueio das diárias junto ao hotel.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                3. Prazos e Forma de Reembolso
              </h2>
              <p>
                Quando o cancelamento for elegível a reembolso, o estorno será realizado no mesmo meio de pagamento utilizado na reserva:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Pagamentos via PIX:</strong> O reembolso é efetuado diretamente na mesma conta bancária de origem em até <strong>24 a 48 horas úteis</strong> após a validação da solicitação;</li>
                <li><strong>Pagamentos via Cartão de Crédito:</strong> O estorno é solicitado imediatamente junto ao Mercado Pago. O crédito na fatura dependerá da administradora do cartão do titular, ocorrendo geralmente na fatura atual ou na subsequente (conforme fechamento).</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                4. Procedimento para Solicitar Cancelamento
              </h2>
              <p>
                Para solicitar o cancelamento da sua reserva:
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Tenha em mãos o <strong>Código do Voucher</strong> (ex: `HSP-...` ou `HB-...`) e o CPF do titular;</li>
                <li>Envie uma mensagem pelo WhatsApp oficial de suporte ou pelo e-mail <strong>reservas@hospedeclub.com.br</strong>;</li>
                <li>Nossa equipe verificará a elegibilidade da tarifa contratada e enviará a confirmação formal com o protocolo em até 4 horas úteis.</li>
              </ol>
            </section>

            <section className="space-y-2">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5">
                5. Casos de Força Maior e Intercorrências
              </h2>
              <p>
                Em situações extraordinárias decorrentes de eventos climáticos severos, interdições sanitárias ou cancelamento comprovado de voos de acesso ao destino, o Hóspede Club atuará ativamente como intermediador junto ao hotel para pleitear carta de crédito ou reagendamento de datas sem ônus adicional ao membro.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-[#EAE3D5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C646B]">
            <span>Atendimento Humanizado de Suporte ao Membro</span>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#B8863B] hover:bg-[#9A6D28] text-white font-medium transition shadow-xs"
            >
              Voltar para as Acomodações
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
