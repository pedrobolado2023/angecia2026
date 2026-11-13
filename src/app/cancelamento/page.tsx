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
            <section className="space-y-4">
              <h2 className="font-editorial text-xl text-[#182026] font-normal border-b border-[#EAE3D5] pb-1.5 flex items-center justify-between">
                <span>1. Política Oficial de Cancelamento e Alteração de Data</span>
              </h2>

              {/* Alerta de Reservas Imediatas */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>Regra para Reservas no Mesmo Dia ou Dia Seguinte</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-900">
                  <strong>Atenção:</strong> Reservas efetuadas para o <strong>mesmo dia (D-0)</strong> ou para o <strong>dia seguinte (D-1)</strong> configuram-se <strong>automaticamente como Não Reembolsáveis</strong>. Em caso de desistência, cancelamento, alteração ou não comparecimento (no-show), será retida multa rescisória de 100% do valor total pago.
                </p>
              </div>

              {/* Cláusulas 1 a 6 Oficiais */}
              <div className="space-y-3 pt-2">
                {/* 1º Cancelamento */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] space-y-2">
                  <h3 className="font-semibold text-xs sm:text-sm text-[#182026]">
                    1º) Cancelamento:
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#465058]">
                    <li>
                      <strong>a) Gratuito:</strong> Se o cancelamento for realizado em até <strong>14 dias antes</strong> da data de check-in, com reembolso integral de 100% do valor pago.
                    </li>
                    <li>
                      <strong>b) 50% do valor total da reserva:</strong> Se o cancelamento ocorrer em até <strong>01 dia antes</strong> da data de check-in (retenção de 50% e estorno dos 50% restantes).
                    </li>
                    <li>
                      <strong>c) 100% do valor total da reserva:</strong> Se o cancelamento for solicitado no <strong>mesmo dia do check-in</strong> (retenção integral de 100%).
                    </li>
                  </ul>
                </div>

                {/* 2º No-show */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] space-y-1">
                  <h3 className="font-semibold text-xs sm:text-sm text-[#182026]">
                    2º) No-show (Não Comparecimento):
                  </h3>
                  <p className="text-xs text-[#465058] leading-relaxed">
                    Em caso de não comparecimento do hóspede para check-in na data e horário contratados, sem aviso prévio nos canais formais de atendimento, será cobrada multa de <strong>100% do valor pago</strong>, liberando a acomodação para o hotel parceiro.
                  </p>
                </div>

                {/* 3º Saída Antecipada */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] space-y-1">
                  <h3 className="font-semibold text-xs sm:text-sm text-[#182026]">
                    3º) Saída Antecipada:
                  </h3>
                  <p className="text-xs text-[#465058] leading-relaxed">
                    Caso o hóspede decida antecipar seu check-out ou não usufruir de todas as diárias originalmente contratadas, <strong>o valor pago não será reembolsado</strong> (retenção total dos dias restantes não utilizados).
                  </p>
                </div>

                {/* 4º Pré-pagamento */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] space-y-1">
                  <h3 className="font-semibold text-xs sm:text-sm text-[#182026]">
                    4º) Pré-pagamento e Confirmação da Reserva:
                  </h3>
                  <p className="text-xs text-[#465058] leading-relaxed">
                    O pagamento total da reserva deverá ser efetuado no momento da confirmação (via PIX instantâneo ou Cartão de Crédito). A reserva será considerada <strong>garantida e bloqueada junto ao hotel somente após a confirmação do pagamento integral</strong> e emissão do voucher de membro.
                  </p>
                </div>

                {/* 5º Alteração de Data */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] space-y-1.5">
                  <h3 className="font-semibold text-xs sm:text-sm text-[#182026]">
                    5º) Alteração de Data:
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[#465058]">
                    <li>
                      <strong>a)</strong> Havendo qualquer alteração voluntária de datas pelo membro, <strong>a política de cancelamento da reserva será alterada automaticamente para Não Reembolsável</strong>.
                    </li>
                    <li>
                      <strong>b)</strong> O valor da reserva será ajustado conforme o tarifário vigente do hotel parceiro para o novo período desejado, devendo o hóspede arcar com eventual diferença tarifária positiva.
                    </li>
                  </ul>
                </div>

                {/* 6º Tarifa Não Reembolsável em Períodos Especiais */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] space-y-1">
                  <h3 className="font-semibold text-xs sm:text-sm text-[#182026]">
                    6º) Tarifa Não Reembolsável (Períodos Festivos e Feriados):
                  </h3>
                  <p className="text-xs text-[#465058] leading-relaxed">
                    Para reservas efetuadas durante períodos especiais — como <strong>Réveillon, Natal, Carnaval e Feriados Nacionais</strong> prolongados —, a tarifa é estritamente <strong>Não Reembolsável</strong>. Em caso de cancelamento voluntário, alteração ou não comparecimento, não haverá reembolso do valor pago.
                  </p>
                </div>
              </div>

              {/* Prevalência das Políticas Fornecidas pela Hotelbeds */}
              <div className="p-4 rounded-2xl bg-[#0F5257]/5 border border-[#0F5257]/20 space-y-2">
                <div className="flex items-center gap-2 text-[#0F5257] font-semibold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Prevalência da Política Oficial da Hotelbeds</span>
                </div>
                <p className="text-xs text-[#465058] leading-relaxed">
                  Quando a integradora <strong>Hotelbeds disponibilizar a política oficial de cancelamento daquele hotel e quarto específico</strong> (com datas limites e penalidades fornecidas pelo estabelecimento parceiro), <strong>prevalecerá a política da Hotelbeds</strong> exibida no cartão do quarto e no voucher de reserva. Caso a Hotelbeds não disponibilize ou omita a política para aquela tarifa, vigorará integralmente a <strong>Política Oficial Padrão do Hóspede Club</strong> descrita nas cláusulas 1ª a 6ª acima.
                </p>
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

