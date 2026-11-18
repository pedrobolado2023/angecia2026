import "server-only";
import { randomUUID } from "node:crypto";
import { calculateVellutoPricing } from "./pricingEngine";
import { checkHotelbedsRate, createHotelbedsBooking, getHotelbedsBookingDetail, searchHotelbedsAvailability, type HotelbedsPax } from "./hotelbeds";
import { readVoucherSupplier, supplierVoucherNotice, type VoucherSupplier } from "./hotelbedsVoucherData";
import { readHotelbedsOffer } from "./hotelbedsOffer";
import { translateHotelbedsRoomName } from "./hotelbedsRoomName";
import { ensurePostgresTables, getPostgresPool, saveBookingToPostgres, saveHotelbedsReservationStatus, type SaveBookingRecordInput } from "./postgres";
import { type CustomerCRMRecord } from "./customerStore";
import { type CheckoutMode, type MercadoPagoPayment } from "./mercadopago";
import { isValidCPF } from "./cpfValidator";
import { hotelCancellationPolicy, resolveRoomCancellationPolicy, type BookingCancellationPolicy } from "./cancellationPolicy";

export type CheckoutState = "quoted" | "paying" | "pending" | "rejected" | "confirming" | "confirmed" | "review";

type CheckoutPayload = {
  booking: Omit<SaveBookingRecordInput, "bookingCode" | "voucherCode" | "paymentStatus">;
  rateKey: string;
  paxes: HotelbedsPax[];
  method: "pix" | "card";
  checkOut: string;
  mode: CheckoutMode;
  voucherDetails?: VoucherDetails;
};

type VoucherDetails = {
  address?: string;
  category?: string;
  destination?: string;
  board?: string;
  rateComments?: string;
  currency?: string;
  cancellationPolicies?: { amount: string; from: string }[];
  cancellationPolicy?: BookingCancellationPolicy;
  supplier?: VoucherSupplier;
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
  created_at: Date | string;
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

function supplierPolicies(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const policies = value.flatMap((item) => typeof item?.from === "string" && item.from.trim() !== "" &&
    (typeof item.amount === "string" || typeof item.amount === "number") && String(item.amount) !== ""
    ? [{ amount: String(item.amount), from: item.from }] : []);
  return policies.length ? policies : undefined;
}

export async function createCheckoutQuote(customer: CustomerCRMRecord, body: Record<string, unknown>, mode: CheckoutMode) {
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
  const offer = readHotelbedsOffer(body.offerToken);
  const occupancy = offer?.occupancies.length === 1 ? offer.occupancies[0] : undefined;
  if (!offer || offer.checkIn !== checkIn || offer.checkOut !== checkOut || occupancy?.rooms !== 1 ||
      occupancy.adults !== Number(adults) || (occupancy.children || 0) !== childPaxes.length) {
    throw new CheckoutError("A busca expirou ou os hóspedes e datas foram alterados. Faça uma nova busca.", 409);
  }
  let hotel = Number(offer.hotel.code) === hotelCode ? offer.hotel : undefined;
  let room = offer.room.code === roomCode ? offer.room : undefined;
  let rate = offer.rate.rateKey === requestedRateKey && !offer.rate.packaging &&
    offer.rate.boardCode === body.boardCode && offer.rate.rateClass === body.rateClass && offer.rate.paymentType === "AT_WEB" ? offer.rate : undefined;
  const ages = (occupancy.paxes || []).map((pax) => pax.age).sort((a, b) => a - b);
  const actualAges = childPaxes.map((pax) => pax.age).sort((a, b) => a - b);
  if (hotel && room && rate && JSON.stringify(ages) !== JSON.stringify(actualAges)) {
    // A composição foi corrigida no formulário. Cotar com as idades reais antes de CheckRate e pagamento.
    const updated = await searchHotelbedsAvailability({ checkIn, checkOut, hotelCodes: [hotelCode], includeContent: false,
      occupancies: [{ rooms: 1, adults: Number(adults), children: childPaxes.length, paxes: childPaxes }] });
    const updatedHotel = updated.ok ? updated.hotels.find((item) => Number(item.code) === hotelCode) : undefined;
    const updatedRoom = updatedHotel?.rooms.find((item) => item.code === roomCode);
    const rates = updatedRoom?.rates.filter((item) => !item.packaging && item.paymentType === "AT_WEB" &&
      item.boardCode === body.boardCode && item.rateClass === body.rateClass);
    hotel = updatedHotel;
    room = updatedRoom;
    rate = rates?.length === 1 ? rates[0] : undefined;
  }
  if (!hotel || !room || !rate || !["BRL", "EUR", "USD", "GBP"].includes(hotel.originalCurrency || "")) {
    throw new CheckoutError("A tarifa selecionada não está mais disponível. Faça uma nova busca.", 409);
  }
  let net = rate.net;
  let selling = rate.sellingRate;
  let mandatory = rate.hotelMandatory;
  let rateKey = rate.rateKey;
  let rateClass = rate.rateClass;
  const voucherDetails: VoucherDetails = {
    address: hotel.address, category: hotel.categoryName, destination: hotel.destinationName,
    board: rate.boardName || rate.boardCode, rateComments: text(rate.rateComments, 12000), currency: hotel.originalCurrency,
    cancellationPolicies: supplierPolicies(rate.supplierCancellationPolicies),
  };
  if (rate.rateType === "RECHECK") {
    const checked = await checkHotelbedsRate(rateKey);
    const checkedHotel = checked.ok ? checked.rate : null;
    const checkedRoom = checkedHotel?.rooms?.find((item: any) => item.code === roomCode);
    const checkedRates = checkedRoom?.rates?.filter((item: any) => item.boardCode === rate.boardCode && item.rateClass === rate.rateClass);
    const finalRate = checkedRates?.length === 1 ? checkedRates[0] : null;
    if (checkedHotel?.isSimulation || Number(checkedHotel?.code) !== hotelCode || !finalRate?.rateKey ||
        finalRate.rateType !== "BOOKABLE" || finalRate.packaging === true ||
        (checkedHotel.currency && checkedHotel.currency !== hotel.originalCurrency)) {
      throw new CheckoutError("Não foi possível confirmar a tarifa. Faça uma nova busca.", 409);
    }
    net = Math.round(Number(finalRate.net) * (rate.fxRate || 1) * 100) / 100;
    selling = finalRate.sellingRate ? Math.round(Number(finalRate.sellingRate) * (rate.fxRate || 1) * 100) / 100 : undefined;
    mandatory = finalRate.hotelMandatory;
    rateKey = finalRate.rateKey;
    rateClass = finalRate.rateClass;
    voucherDetails.cancellationPolicies = supplierPolicies(finalRate.cancellationPolicies) ?? voucherDetails.cancellationPolicies;
    voucherDetails.rateComments = text(finalRate.rateComments, 12000) || voucherDetails.rateComments;
  } else if (rate.rateType !== "BOOKABLE") {
    throw new CheckoutError("A tarifa não está disponível para reserva.", 409);
  }
  voucherDetails.cancellationPolicy = hotelCancellationPolicy(voucherDetails.cancellationPolicies, voucherDetails.currency, rateClass) ?? {
    source: "hospede-club", lines: [resolveRoomCancellationPolicy(undefined, checkIn).details],
  };

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
    mode,
    method, rateKey, paxes, checkOut, voucherDetails,
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
    conditions: order.state === "quoted" ? {
      cancellationPolicy: order.payload.voucherDetails?.cancellationPolicy,
      rateComments: order.payload.voucherDetails?.rateComments,
    } : undefined,
    supplierRemarks: order.state === "confirmed" ? order.supplier_remarks : undefined,
    stay: {
      hotelName: order.payload.booking.hotelName, roomName: translateHotelbedsRoomName(order.payload.booking.roomName),
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
    payment.method === order.payload.method && payment.mode === order.payload.mode &&
    (payment.installments === undefined || payment.installments === order.payload.booking.installments);
  const next = !verified || payment.status === "review" ? "review" : payment.status === "approved" ? "confirming" :
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
  const confirmedHotel = supplier.rawBooking?.hotel;
  const confirmedRoom = confirmedHotel?.rooms?.[0];
  const confirmedRate = confirmedRoom?.rates?.[0];
  const details = claimed.payload.voucherDetails;
  const confirmedPolicies = supplierPolicies(confirmedRate?.cancellationPolicies);
  const confirmedCurrency = text(confirmedHotel?.currency, 3) || details?.currency;
  const voucherDetails: VoucherDetails = {
    ...details,
    address: text(confirmedHotel?.address?.content ?? confirmedHotel?.address, 500) || details?.address,
    category: text(confirmedHotel?.categoryName) || details?.category,
    destination: text(confirmedHotel?.destinationName) || details?.destination,
    board: text(confirmedRate?.boardName) || details?.board || text(confirmedRate?.boardCode),
    currency: confirmedPolicies ? confirmedCurrency : details?.currency,
    rateComments: text(confirmedRate?.rateComments, 12000) || details?.rateComments,
    cancellationPolicies: confirmedPolicies ?? details?.cancellationPolicies,
    cancellationPolicy: hotelCancellationPolicy(confirmedPolicies, confirmedCurrency) ??
      hotelCancellationPolicy(details?.cancellationPolicies, details?.currency, confirmedRate?.rateClass) ??
      details?.cancellationPolicy,
    supplier: readVoucherSupplier(supplier.rawBooking),
  };
  const saved = voucher ? await saveBookingToPostgres({
    ...booking, bookingCode: claimed.id, voucherCode: voucher, hotelbedsReference: voucher,
    paymentStatus: "APPROVED", mpPaymentId: payment.id, mpStatus: payment.status,
  }) : null;
  const { rows: [complete] } = await db.query<CheckoutOrder>(
    `UPDATE checkout_orders SET state = $2, voucher = $3, supplier_remarks = $4,
      payload = payload || jsonb_build_object('voucherDetails', $5::jsonb), updated_at = NOW()
      WHERE id = $1 AND state = 'confirming' RETURNING *`,
    [claimed.id, saved?.success ? "confirmed" : "review", voucher || null, supplier.supplierRemarks || null, voucherDetails]
  );
  return complete;
}

export async function refreshVoucherDetails(order: CheckoutOrder): Promise<CheckoutOrder> {
  if (order.state !== "confirmed" || !order.voucher || order.payload.mode !== process.env.CHECKOUT_MODE ||
      order.payload.voucherDetails?.supplier) return order;
  const db = await checkoutDb();
  const claim = await db.query(
    `UPDATE checkout_orders SET payload = payload || jsonb_build_object('voucherRefreshedAt', NOW())
      WHERE id = $1 AND state = 'confirmed'
      AND (payload->>'voucherRefreshedAt' IS NULL OR (payload->>'voucherRefreshedAt')::timestamptz < NOW() - INTERVAL '15 minutes')
      RETURNING id`, [order.id]);
  if (!claim.rowCount) return (await getCheckoutOrder(order.id)) || order;
  const result = await getHotelbedsBookingDetail(order.voucher);
  if (!result.ok || result.isSimulation || result.booking?.reference !== order.voucher) return order;
  await saveHotelbedsReservationStatus(order.voucher, result.booking.status);
  const supplier = readVoucherSupplier(result.booking);
  if (!supplier) return order;
  const rate = result.booking.hotel?.rooms?.[0]?.rates?.[0];
  const details = { supplier,
    ...(typeof rate?.rateComments === "string" ? { rateComments: rate.rateComments.slice(0, 12000) } : {}),
  };
  const { rows: [updated] } = await db.query<CheckoutOrder>(
    `UPDATE checkout_orders SET supplier_remarks = $2,
      payload = jsonb_set(payload, '{voucherDetails}', COALESCE(payload->'voucherDetails', '{}'::jsonb) || $3::jsonb)
      WHERE id = $1 AND state = 'confirmed' RETURNING *`,
    [order.id, supplierVoucherNotice(supplier, order.voucher), details]);
  return updated || order;
}
