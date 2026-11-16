import "server-only";
import { randomUUID } from "node:crypto";
import { calculateVellutoPricing } from "./pricingEngine";
import { checkHotelbedsRate, createHotelbedsBooking, searchHotelbedsAvailability, type HotelbedsPax } from "./hotelbeds";
import { ensurePostgresTables, getPostgresPool, saveBookingToPostgres, type SaveBookingRecordInput } from "./postgres";
import { type CustomerCRMRecord } from "./customerStore";
import { type MercadoPagoPayment } from "./mercadopago";
import { isValidCPF } from "./cpfValidator";

export type CheckoutState = "quoted" | "paying" | "pending" | "rejected" | "confirming" | "confirmed" | "review";

type CheckoutPayload = {
  booking: Omit<SaveBookingRecordInput, "bookingCode" | "voucherCode" | "paymentStatus">;
  rateKey: string;
  paxes: HotelbedsPax[];
  method: "pix" | "card";
  checkOut: string;
};

export type CheckoutOrder = {
  id: string;
  customer_id: string;
  customer_email: string;
  state: CheckoutState;
  amount_cents: number;
  payload: CheckoutPayload;
  payment_id: string | null;
  payment: MercadoPagoPayment | null;
  voucher: string | null;
  supplier_remarks: string | null;
  expires_at: Date | string;
  updated_at: Date | string;
};

export class CheckoutError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function checkoutDb() {
  const db = getPostgresPool();
  if (!db || !(await ensurePostgresTables())) throw new CheckoutError("Checkout temporariamente indisponível.", 503);
  return db;
}

export function isOrderId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function text(value: unknown, limit = 100) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function date(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? parsed.getTime() : NaN;
}

function hotelbedsRatePlan(key: string) {
  const parts = key.split("|");
  if (parts.length < 9 || !/^\d{8}$/.test(parts[0]) || !/^\d{8}$/.test(parts[1])) return null;
  return parts.slice(0, 9).join("|");
}

export async function createCheckoutQuote(customer: CustomerCRMRecord, body: Record<string, unknown>) {
  const db = await checkoutDb();
  const { checkInDate, checkOutDate, adults, children, infants } = body;
  const nights = (date(checkOutDate) - date(checkInDate)) / 86400000;
  const checkIn = String(checkInDate);
  const checkOut = String(checkOutDate);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!Number.isInteger(nights) || nights < 1 || nights > 30 || checkIn < today ||
      ![adults, children, infants].every(Number.isSafeInteger) ||
      Number(adults) < 1 || Number(adults) > 8 || Number(children) < 0 || Number(children) > 4 ||
      Number(infants) < 0 || Number(infants) > 4) {
    throw new CheckoutError("Confira datas e quantidade de hóspedes.");
  }
  const email = customer.email.toLowerCase();
  const cpf = text(body.primaryCpf).replace(/\D/g, "");
  const first = text(body.primaryFirstName);
  const last = text(body.primaryLastName);
  const whatsapp = text(body.primaryWhatsapp, 40).replace(/\D/g, "");
  const birth = text(body.primaryBirthDate, 10);
  if (!first || !last || !isValidCPF(cpf) || whatsapp.length < 10 || whatsapp.length > 15 || !Number.isFinite(date(birth)) ||
      birth >= today || text(body.primaryEmail, 254).toLowerCase() !== email ||
      text(body.primaryEmailConfirm, 254).toLowerCase() !== email || body.acceptedTerms !== true) {
    throw new CheckoutError("Confira os dados do titular, use o e-mail da conta e aceite os termos.");
  }
  const paxes: HotelbedsPax[] = [{ type: "AD", name: first, surname: last }];
  const secondFirst = text(body.secondGuestFirstName);
  const secondLast = text(body.secondGuestLastName);
  if (Number(adults) > 1) {
    if (!secondFirst || !secondLast) throw new CheckoutError("Informe o nome completo do segundo adulto.");
    paxes.push({ type: "AD", name: secondFirst, surname: secondLast });
  }
  const extras = body.extraGuests;
  const expectedExtras = Math.max(0, Number(adults) - 2) + Number(children) + Number(infants);
  if (!Array.isArray(extras) || extras.length !== expectedExtras) {
    throw new CheckoutError("Preencha os dados de todos os hóspedes.");
  }
  const childPaxes: { type: "CH"; age: number }[] = [];
  for (const [i, guest] of extras.entries()) {
    const name = text(guest?.name);
    const surname = text(guest?.surname);
    if (!name || !surname) throw new CheckoutError("Informe o nome completo de todos os hóspedes.");
    const age = guest?.age;
    const isAdult = i < Math.max(0, Number(adults) - 2);
    if (isAdult) {
      paxes.push({ type: "AD", name, surname });
      continue;
    }
    const isChild = i < Math.max(0, Number(adults) - 2) + Number(children);
    if (!Number.isInteger(age) || (isChild ? age < 6 || age > 17 : age < 0 || age > 5)) {
      throw new CheckoutError("Informe a idade de cada criança no dia da entrada.");
    }
    childPaxes.push({ type: "CH", age });
    paxes.push({ type: "CH", age, name, surname });
  }

  const hotelCode = Number(body.hotelbedsCode);
  const roomCode = text(body.roomCode);
  const requestedRateKey = text(body.rateKey, 4096);
  if (!Number.isSafeInteger(hotelCode) || hotelCode < 1 || !roomCode || !requestedRateKey) {
    throw new CheckoutError("Escolha uma tarifa disponível em uma nova busca.", 409);
  }
  const result = await searchHotelbedsAvailability({
    checkIn, checkOut, hotelCodes: [hotelCode], includeContent: false,
    occupancies: [{ rooms: 1, adults: Number(adults), children: childPaxes.length,
      ...(childPaxes.length ? { paxes: childPaxes } : {}) }],
  });
  const hotel = result.ok && !result.isSimulation && result.hotels.find((item) => Number(item.code) === hotelCode);
  const room = hotel && hotel.rooms.find((item) => item.code === roomCode);
  const candidates = room && room.rates.filter((item) =>
    item.boardCode === body.boardCode && item.rateClass === body.rateClass && item.paymentType === "AT_WEB");
  const requestedPlan = hotelbedsRatePlan(requestedRateKey);
  const samePlan = candidates && requestedPlan ? candidates.filter((item) => hotelbedsRatePlan(item.rateKey) === requestedPlan) : [];
  const rate = candidates && (candidates.find((item) => item.rateKey === requestedRateKey) ||
    (samePlan.length === 1 ? samePlan[0] : undefined));
  if (!hotel || !room || !rate || !["BRL", "EUR", "USD", "GBP"].includes(hotel.originalCurrency || "")) {
    throw new CheckoutError("A tarifa selecionada não está mais disponível. Faça uma nova busca.", 409);
  }
  let net = rate.net;
  let selling = rate.sellingRate;
  let mandatory = rate.hotelMandatory;
  let rateKey = rate.rateKey;
  if (rate.rateType === "RECHECK") {
    const checked = await checkHotelbedsRate(rateKey);
    const checkedHotel = checked.ok ? checked.rate : null;
    const checkedRoom = checkedHotel?.rooms?.find((item: any) => item.code === roomCode);
    const checkedRates = checkedRoom?.rates?.filter((item: any) => item.boardCode === rate.boardCode && item.rateClass === rate.rateClass);
    const finalRate = checkedRates?.length === 1 ? checkedRates[0] : null;
    if (checkedHotel?.isSimulation || Number(checkedHotel?.code) !== hotelCode || !finalRate?.rateKey ||
        finalRate.rateType !== "BOOKABLE" || (checkedHotel.currency && checkedHotel.currency !== hotel.originalCurrency)) {
      throw new CheckoutError("Não foi possível confirmar a tarifa. Faça uma nova busca.", 409);
    }
    net = Math.round(Number(finalRate.net) * (rate.fxRate || 1) * 100) / 100;
    selling = finalRate.sellingRate ? Math.round(Number(finalRate.sellingRate) * (rate.fxRate || 1) * 100) / 100 : undefined;
    mandatory = finalRate.hotelMandatory;
    rateKey = finalRate.rateKey;
  } else if (rate.rateType !== "BOOKABLE") {
    throw new CheckoutError("A tarifa não está disponível para reserva.", 409);
  }

  if (!Number.isFinite(net) || net <= 0 || (mandatory && (!selling || selling < net))) {
    throw new CheckoutError("Não foi possível validar o valor da estadia.", 409);
  }
  if (body.paymentModality !== "CARD" && body.paymentModality !== "PIX") {
    throw new CheckoutError("Selecione a forma de pagamento.");
  }
  const method = body.paymentModality === "CARD" ? "card" : "pix";
  const installments = method === "pix" ? 1 : Number(body.installments);
  if (!Number.isSafeInteger(installments) || installments < 1 || installments > 12) {
    throw new CheckoutError("Selecione o parcelamento.");
  }
  const pricing = calculateVellutoPricing(net, selling);
  const amount = mandatory ? selling! : method === "pix" ? pricing.pix.pixPrice :
    pricing.creditCard.installments[installments - 1].totalCharged;
  const amountCents = Math.round(amount * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 2147483647) {
    throw new CheckoutError("Não foi possível validar o valor da estadia.", 409);
  }
  const id = randomUUID();
  const payload: CheckoutPayload = {
    method, rateKey, paxes, checkOut,
    booking: {
      ownerMemberCode: customer.id, hotelId: `hotelbeds-${hotelCode}`, hotelName: hotel.name,
      roomId: room.code, roomName: room.name, checkInDate: checkIn, nightsCount: nights,
      guestsCount: paxes.length, totalAmountBRL: amountCents / 100,
      primaryFirstName: first, primaryLastName: last, primaryEmail: email, primaryCpf: cpf, primaryWhatsapp: whatsapp,
      primaryBirthDate: birth, primaryCountry: text(body.primaryCountry, 60) || "Brasil",
      secondGuestFirstName: Number(adults) > 1 ? secondFirst : undefined,
      secondGuestLastName: Number(adults) > 1 ? secondLast : undefined,
      paymentMethod: method === "pix" ? "PIX" : "CREDIT_CARD", installments,
    },
  };
  const { rows: [order] } = await db.query<CheckoutOrder>(
    `INSERT INTO checkout_orders (id, customer_id, customer_email, state, amount_cents, payload, expires_at)
      VALUES ($1, $2, $3, 'quoted', $4, $5, NOW() + INTERVAL '15 minutes') RETURNING *`,
    [id, customer.id, email, amountCents, payload]
  );
  return order;
}

export async function getCheckoutOrder(id: string, customer?: CustomerCRMRecord) {
  const db = await checkoutDb();
  const { rows: [order] } = await db.query<CheckoutOrder>(
    `SELECT * FROM checkout_orders WHERE id = $1${customer ? " AND customer_id = $2 AND customer_email = $3" : ""}`,
    customer ? [id, customer.id, customer.email.toLowerCase()] : [id]
  );
  return order ?? null;
}

export function checkoutResponse(order: CheckoutOrder) {
  const isStalled = ["confirming", "paying"].includes(order.state) &&
    Date.now() - new Date(order.updated_at).getTime() > 120000;
  return {
    orderId: order.id, state: isStalled ? "review" : order.state,
    amount: order.amount_cents / 100, expiresAt: order.expires_at, method: order.payload.method,
    voucherCode: order.state === "confirmed" ? order.voucher : undefined,
    supplierRemarks: order.state === "confirmed" ? order.supplier_remarks : undefined,
    stay: {
      hotelName: order.payload.booking.hotelName, roomName: order.payload.booking.roomName,
      checkIn: order.payload.booking.checkInDate, checkOut: order.payload.checkOut,
      holder: `${order.payload.booking.primaryFirstName} ${order.payload.booking.primaryLastName}`,
    },
    mercadoPago: order.payment ? { status: order.payment.status, pix: order.state === "pending" ? order.payment.pix : undefined } : undefined,
  };
}

export async function reconcileCheckoutPayment(payment: MercadoPagoPayment) {
  if (!isOrderId(payment.externalReference)) return null;
  const order = await getCheckoutOrder(payment.externalReference);
  if (!order || order.state === "quoted") return null;
  if (order.payment_id && order.payment_id !== payment.id) return null;
  if (["confirming", "confirmed", "review", "rejected"].includes(order.state)) return order;
  const db = await checkoutDb();
  const verified = payment.amountCents === order.amount_cents && payment.currency === "BRL" &&
    Boolean(payment.method) && (order.payload.method === "pix" ? payment.method === "pix" : payment.method !== "pix");
  const next = !verified ? "review" : payment.status === "approved" ? "confirming" :
    ["pending", "in_process", "authorized"].includes(payment.status) ? "pending" : "rejected";
  const { rows: [claimed] } = await db.query<CheckoutOrder>(
    `UPDATE checkout_orders SET state = $2, payment_id = $3, payment = $4, updated_at = NOW()
      WHERE id = $1 AND state IN ('paying','pending') AND (payment_id IS NULL OR payment_id = $3) RETURNING *`,
    [order.id, next, payment.id, payment]
  );
  if (!claimed || next !== "confirming") return claimed || getCheckoutOrder(order.id);
  const booking = claimed.payload.booking;
  const supplier = await createHotelbedsBooking({
    rateKey: claimed.payload.rateKey, clientReference: claimed.id.replace(/-/g, "").slice(0, 20),
    holder: { name: booking.primaryFirstName, surname: booking.primaryLastName },
    paxes: claimed.payload.paxes,
  });
  const voucher = supplier.ok && !supplier.isSimulation && supplier.status === "CONFIRMED" ? supplier.bookingReference : undefined;
  const saved = voucher ? await saveBookingToPostgres({
    ...booking, bookingCode: claimed.id, voucherCode: voucher, hotelbedsReference: voucher,
    paymentStatus: "APPROVED", mpPaymentId: payment.id, mpStatus: payment.status,
  }) : null;
  const { rows: [complete] } = await db.query<CheckoutOrder>(
    `UPDATE checkout_orders SET state = $2, voucher = $3, supplier_remarks = $4, updated_at = NOW()
      WHERE id = $1 AND state = 'confirming' RETURNING *`,
    [claimed.id, saved?.success ? "confirmed" : "review", voucher || null, supplier.supplierRemarks || null]
  );
  return complete;
}
