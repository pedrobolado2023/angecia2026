import { join } from "node:path";
import PDFDocument from "pdfkit";
import type { CheckoutOrder } from "./checkout";
import { hotelCancellationPolicy } from "./cancellationPolicy";
import { supplierVoucherNotice, voucherBoard, voucherCategory, voucherComments } from "./hotelbedsVoucherData";

const CONTACT = "contato@hospedeclub.com.br";
const INK = "#182026";
const GOLD = "#82591F";
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function displayDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : date;
}

export function renderBookingVoucher(order: CheckoutOrder, example = false): Promise<Buffer> {
  const { booking, checkOut, paxes, method, voucherDetails: details } = order.payload;
  const pdf = new PDFDocument({ size: "A4", margin: 44, bufferPages: true,
    info: { Title: "Voucher de hospedagem | Hóspede Club", Author: "Hóspede Club" } });
  const chunks: Buffer[] = [];
  const output = new Promise<Buffer>((resolve, reject) => {
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });

  const left = 44;
  const width = pdf.page.width - 2 * left;
  const line = (value: string, bold = false) => {
    pdf.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(INK)
      .text(value, left, pdf.y, { width, lineGap: 3 });
  };
  const section = (title: string) => {
    if (pdf.y > pdf.page.height - 112) pdf.addPage();
    pdf.moveDown(0.9).font("Helvetica-Bold").fontSize(12).fillColor(GOLD)
      .text(title, left, pdf.y, { width });
    pdf.moveDown(0.25);
  };
  const horizontalRule = () => pdf.moveTo(left, pdf.y).lineTo(left + width, pdf.y)
    .strokeColor("#DED1BC").lineWidth(0.7).stroke();

  pdf.image(join(process.cwd(), "public", "voucher-logo.png"), left, 42, { width: 52, height: 52 });
  pdf.font("Times-Roman").fontSize(25).fillColor(INK).text("HÓSPEDE CLUB", left + 67, 44, { width: width - 67 });
  pdf.font("Helvetica").fontSize(10).fillColor(GOLD).text("Voucher de hospedagem", left + 67, 76);
  pdf.y = 108;
  horizontalRule();
  pdf.moveDown(0.7);
  if (example) line("DEMONSTRAÇÃO - DADOS FICTÍCIOS", true);
  line(`Reserva confirmada  |  Referência Hotelbeds: ${order.voucher}`, true);
  line(`Identificação do pedido: ${order.id}`);

  section("Hospedagem");
  line(booking.hotelName, true);
  line(details?.address || "Endereço não informado pelo fornecedor.");
  if (details?.destination || details?.category) line([details.destination, voucherCategory(details.category)].filter(Boolean).join(" | "));
  line(`Quarto: ${booking.roomName}${details?.board ? `  |  Regime: ${voucherBoard(details.board)}` : ""}`);
  line(`Entrada: ${displayDate(booking.checkInDate)}  |  Saída: ${displayDate(checkOut)}  |  Diárias: ${booking.nightsCount}`);

  section("Hóspedes");
  const cpfEnd = booking.primaryCpf?.replace(/\D/g, "").slice(-4);
  const guests = paxes?.length ? paxes : [{ name: booking.primaryFirstName, surname: booking.primaryLastName, age: undefined }];
  for (const [index, guest] of guests.entries()) {
    const tags = [index === 0 ? "Titular" : "", typeof guest.age === "number" ? `${guest.age} anos` : ""].filter(Boolean);
    line(`${guest.name || ""} ${guest.surname || ""}${tags.length ? ` (${tags.join(", ")})` : ""}`.trim());
  }
  if (cpfEnd) line(`CPF do titular com final ${cpfEnd}`);

  section("Pagamento");
  const installments = order.payment?.installments ?? booking.installments ?? 1;
  line(`Valor pago: ${BRL.format(order.amount_cents / 100)}`, true);
  line(method === "pix" ? "Pix à vista" : `Cartão de crédito em ${installments} ${installments === 1 ? "parcela" : "parcelas"}`);

  section("Política de cancelamento");
  const cancellationPolicy = details?.cancellationPolicy ?? hotelCancellationPolicy(details?.cancellationPolicies, details?.currency);
  if (cancellationPolicy) {
    line(cancellationPolicy.source === "hotel" ? "Condições da tarifa do hotel" : "Política do Hóspede Club", true);
    for (const rule of cancellationPolicy.lines) line(rule);
  } else {
    line("A política aplicável não consta no registro desta reserva. Consulte o atendimento antes de solicitar o cancelamento.");
  }

  section("Condições da hospedagem");
  if (details?.rateComments) line(voucherComments(details.rateComments));
  const supplierNotice = details?.supplier && order.voucher
    ? supplierVoucherNotice(details.supplier, order.voucher) : order.supplier_remarks;
  if (supplierNotice) {
    section("Informação legal do fornecedor");
    line(supplierNotice);
  } else {
    section("Informação do fornecedor pendente");
    line("A identificação fiscal do fornecedor ainda não está disponível neste registro. Solicite ao atendimento a versão atualizada do voucher.");
  }
  section("Atendimento");
  line("Apresente o voucher e um documento de identificação no check-in.");
  pdf.font("Helvetica").fontSize(10).fillColor(GOLD).text("Termos de uso do Hóspede Club", left, pdf.y,
    { width, link: "https://hospedeclub.com.br/termos", underline: true });
  pdf.text(CONTACT, left, pdf.y, { width, link: `mailto:${CONTACT}`, underline: true });
  if (details?.rateComments && voucherComments(details.rateComments) !== details.rateComments) {
    section("Observações originais do fornecedor");
    line(details.rateComments);
  }

  const pages = pdf.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index++) {
    pdf.switchToPage(index);
    const bottom = pdf.page.margins.bottom;
    pdf.page.margins.bottom = 0;
    pdf.font("Helvetica").fontSize(8).fillColor("#545C61").text(`Hóspede Club  |  ${CONTACT}  |  ${index + 1}/${pages.count}`,
      left, pdf.page.height - 31, { width, lineBreak: false, align: "center" });
    pdf.page.margins.bottom = bottom;
  }
  pdf.end();
  return output;
}
