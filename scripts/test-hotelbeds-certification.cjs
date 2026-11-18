// Regressões locais: nenhum pedido ou pagamento é enviado aos fornecedores.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const localRequire = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "server-only") return {};
      if (id.startsWith("@/")) {
        const target = path.resolve(root, "src", id.slice(2));
        return load(fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`);
      }
      if (!id.startsWith(".")) return require(id);
      const target = path.resolve(path.dirname(filename), id);
      return load(fs.existsSync(target) ? target : fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`);
    };
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}

async function main() {
  process.env.CUSTOMER_SESSION_SECRET = "local-fixture-secret-".repeat(4);
  process.env.HOTELBEDS_ENVIRONMENT = "test";
  process.env.HOTELBEDS_API_KEY = "fixture";
  process.env.HOTELBEDS_SECRET = "fixture";
  global.fetch = async () => { throw new Error("Rede externa bloqueada neste teste"); };
  const load = loader({ "./hotelbedsCatalogStore": {
    catalogDatabase: async () => null, hotelbedsCatalogScope: () => "fixture", CATALOG_MAX_AGE_MS: 604800000,
  }});
  const ages = load("src/lib/guestAges.ts");
  assert(ages.validGuestAges(2, 2, [6, 17], [0, 5]));
  assert(!ages.validGuestAges(1, 0, [5], []));
  assert(!ages.validGuestAges(0, 1, [], [6]));
  assert(!ages.validGuestAges(1, 0));
  assert.deepEqual(ages.resizeGuestAges([12], 2), [12, -1]);
  const { normalizeHotelbedsContent } = load("src/lib/hotelbedsContent.ts");
  const content = normalizeHotelbedsContent({ code: 123, facilities: [
    { description: { content: "Garagem" }, indFee: true, indYesOrNo: true },
    { description: { content: "Internet indisponível" }, indYesOrNo: false },
    { description: { content: "Documento no check-in" }, voucher: true },
  ], issues: [{ description: { content: "Piscina fechada" }, dateFrom: "2030-01-01", dateTo: "2030-01-10" }] });
  assert.deepEqual(content.facilities, ["Garagem (cobrado à parte)", "Documento no check-in"]);
  assert(content.remarks.some((item) => item.text === "Documento no check-in"));
  const { resolveRoomCancellationPolicy } = load("src/lib/cancellationPolicy.ts");
  const policies = [{ from: "2020-01-01T12:30:00-03:00", amount: "25.50" },
    { from: "2030-01-01T18:00:00-03:00", amount: "75.00" }];
  const policy = resolveRoomCancellationPolicy({ rates: [{ supplierCancellationPolicies: policies, originalCurrency: "EUR" }] }, "2020-01-01");
  assert.equal(policy.policyType, "HOTELBEDS_OFFICIAL");
  assert(policy.details.includes("25.50 EUR") && policy.details.includes("75.00 EUR"));
  assert(policy.details.includes("12:30:00-03:00"));
  assert(!policy.details.includes("total"));
  assert.equal(resolveRoomCancellationPolicy(undefined, "2020-01-01").policyType, "IMMEDIATE_CHECKIN_NRF");
  const { calculateVellutoPricing } = load("src/lib/pricingEngine.ts");
  const normal = calculateVellutoPricing(100, 160);
  const mandatory = calculateVellutoPricing(100, 110, 0.15, 0, 0, 110);
  assert(normal.pix.pixPrice > 100);
  assert.equal(mandatory.pix.pixPrice, 110);
  assert(mandatory.creditCard.installments.every((item) => item.totalCharged === 110));
  assert.throws(() => calculateVellutoPricing(100, 90, 0.15, 0, 0, 90));

  let requests = [];
  const rawRate = { rateKey: "opaque-key-unchanged", rateType: "BOOKABLE", rateClass: "NOR", paymentType: "AT_WEB",
    boardCode: "RO", boardName: "Somente quarto", net: "100", rateCommentsId: "1|20|0", cancellationPolicies: policies,
    taxes: { taxes: [{ included: false, amount: "12", currency: "EUR", type: "CITY_TAX" }] } };
  const rawHotel = { code: 123, name: "Hotel de teste", currency: "EUR", minRate: "1", maxRate: "200",
    rooms: [{ code: "DBL", name: "DOUBLE STANDARD", rates: [rawRate,
      { ...rawRate, rateKey: "breakfast", boardCode: "BB", net: "120" },
      { ...rawRate, rateKey: "package", packaging: true, net: "1" },
      { ...rawRate, rateKey: "hotel-payment", paymentType: "AT_HOTEL" },
      { ...rawRate, rateKey: "invalid-mandatory", hotelMandatory: true, sellingRate: "90" }] }] };
  let commentsCalls = 0;
  let commentsFail = false;
  const inserts = [];
  const db = { query: async (sql, values) => {
    assert(sql.includes("INSERT INTO checkout_orders"));
    inserts.push(values);
    return { rows: [{ id: values[0], state: "quoted", amount_cents: values[3], payload: values[4] }] };
  }};
  const mocks = {
    "./hotelbedsContent": { fetchHotelbedsContent: async () => ({ 123: content }), getCachedHotelbedsContent: async () => ({ 123: content }) },
    "./currency": { fetchLiveExchangeRates: async () => ({ EUR: 6, BRL: 1 }) },
    "./hotelbedsBookingTransport": { hotelbedsBookingBaseUrl: () => "https://fixture.invalid",
      fetchHotelbedsBooking: async (url, options) => {
        requests.push({ url, payload: JSON.parse(options.body) });
        return new Response(JSON.stringify(url.endsWith("/checkrates") ? { hotel: {
          ...rawHotel, rooms: [{ code: "DBL", rates: [{ ...rawRate, rateComments: "Condições completas do CheckRate" }] }],
        } } : { hotels: { total: 1, hotels: [rawHotel] } }));
      } },
    "./postgres": { getPostgresPool: () => db, ensurePostgresTables: async () => true },
    "./hotelbedsRateComments": { resolveHotelbedsRateComments: async () => {
      commentsCalls++; if (commentsFail) throw new Error("quota"); return "Documento obrigatório no check-in";
    } },
  };
  const appLoad = loader(mocks);
  const hotelbeds = appLoad("src/lib/hotelbeds.ts");
  const occupancy = [{ rooms: 1, adults: 2, children: 2, paxes: [{ type: "CH", age: 15 }, { type: "CH", age: 3 }] }];
  const search = await hotelbeds.searchHotelbedsAvailability({ checkIn: "2030-01-01", checkOut: "2030-01-03", occupancies: occupancy });
  assert(search.ok);
  assert.deepEqual(requests[0].payload.occupancies, occupancy);
  assert.equal(search.hotels[0].rooms[0].rates.length, 2);
  assert.equal(search.hotels[0].minRate, 600);
  assert.equal(search.contentIncomplete, false);
  const offerRate = search.hotels[0].rooms[0].rates[0];
  assert.equal(offerRate.rateKey, rawRate.rateKey);
  assert(offerRate.additionalRemarks.some((line) => line.includes("12 EUR")));
  const { readHotelbedsOffer, signHotelbedsOffer } = appLoad("src/lib/hotelbedsOffer.ts");
  const offer = readHotelbedsOffer(offerRate.offerToken);
  assert.equal(offer.rate.rateCommentsId, "1|20|0");
  assert.deepEqual(offer.occupancies, occupancy);
  const { createCheckoutQuote } = appLoad("src/lib/checkout.ts");
  const customer = { id: "fixture-customer", email: "cliente@example.invalid" };
  const body = { checkInDate: "2030-01-01", checkOutDate: "2030-01-03", adults: 2, children: 1, infants: 1,
    hotelbedsCode: 123, roomCode: "DBL", rateKey: rawRate.rateKey, boardCode: "RO", rateClass: "NOR", offerToken: offerRate.offerToken,
    primaryFirstName: "Cliente", primaryLastName: "Teste", primaryCpf: "52998224725", primaryWhatsapp: "5561999999999",
    primaryBirthDate: "1980-01-01", primaryEmail: customer.email, primaryEmailConfirm: customer.email, acceptedTerms: true,
    secondGuestFirstName: "Adulto", secondGuestLastName: "Teste", paymentModality: "PIX", installments: 1,
    extraGuests: [{ name: "Crianca", surname: "Teste", age: 15 }, { name: "Infantil", surname: "Teste", age: 3 }] };
  const pix = await createCheckoutQuote(customer, body, "test");
  assert.equal(pix.payload.method, "pix");
  assert.equal(requests.length, 1, "BOOKABLE não deve repetir Availability nem CheckRate");
  assert.equal(commentsCalls, 1);
  assert(pix.payload.voucherDetails.rateComments.includes("Documento obrigatório"));
  assert(pix.payload.voucherDetails.cancellationPolicy.lines[0].includes("25.50 EUR"));
  const card = await createCheckoutQuote(customer, { ...body, paymentModality: "CARD", installments: 3 }, "test");
  assert.equal(card.payload.method, "card");
  assert(card.amount_cents > pix.amount_cents);
  const { expires, environment, ...unsigned } = offer;
  const recheckToken = signHotelbedsOffer({ ...unsigned, rate: { ...unsigned.rate, rateType: "RECHECK" } });
  const recheck = await createCheckoutQuote(customer, { ...body, offerToken: recheckToken }, "test");
  assert.equal(requests.filter((request) => request.url.endsWith("/checkrates")).length, 1);
  assert(recheck.payload.voucherDetails.rateComments.includes("Condições completas"));
  const mandatoryToken = signHotelbedsOffer({ ...unsigned, rate: { ...unsigned.rate, hotelMandatory: true, sellingRate: 660 } });
  const fixedCard = await createCheckoutQuote(customer, { ...body, offerToken: mandatoryToken,
    paymentModality: "CARD", installments: 12 }, "test");
  assert.equal(fixedCard.amount_cents, 66000);
  const beforeFailure = inserts.length;
  commentsFail = true;
  await assert.rejects(() => createCheckoutQuote(customer, body, "test"), (error) => error.status === 502);
  assert.equal(inserts.length, beforeFailure, "Falha nas condições deve impedir criar pedido pagável");
  const { parseRateCommentDetails } = load("src/lib/hotelbedsRateComments.ts");
  assert.equal(parseRateCommentDetails({ rateComments: [
    { dateStart: "2029-01-01", dateEnd: "2031-01-01", description: "Atual" },
    { dateEnd: "2020-01-01", description: "Vencida" },
  ] }, "2030-01-01"), "Atual");
  assert.throws(() => parseRateCommentDetails({ error: "quota" }, "2030-01-01"));
  let detailCalls = 0;
  let detailUrl;
  const detailLoad = loader({
    "./hotelbedsCatalogStore": { catalogDatabase: async () => null, hotelbedsCatalogScope: () => "fixture", CATALOG_MAX_AGE_MS: 604800000 },
    "./hotelbedsContent": { fetchContentPage: async (url) => {
      detailCalls++; detailUrl = new URL(url);
      return new Response(JSON.stringify({ rateComments: [{ description: { content: "Condição oficial" } }] }));
    } },
  });
  const { resolveHotelbedsRateComments } = detailLoad("src/lib/hotelbedsRateComments.ts");
  assert.deepEqual(await Promise.all([resolveHotelbedsRateComments("1|20|0", "2030-01-01"),
    resolveHotelbedsRateComments("1|20|0", "2030-01-01")]), ["Condição oficial", "Condição oficial"]);
  await resolveHotelbedsRateComments("1|20|0", "2030-01-01");
  assert.equal(detailCalls, 1, "Comentários usam cache e deduplicação");
  assert.equal(detailUrl.pathname, "/hotel-content-api/1.0/types/ratecommentdetails");
  assert.equal(detailUrl.searchParams.get("code"), "1|20|0");
  assert.equal(detailUrl.searchParams.get("date"), "2030-01-01");
  assert.equal(detailUrl.searchParams.get("language"), "POR");
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { HotelSearchFilters } = load("src/components/HotelSearchFilters.tsx");
  const markup = renderToStaticMarkup(React.createElement(HotelSearchFilters, {
    criteria: { query: "Rio", checkIn: "2030-01-01", checkOut: "2030-01-03", adults: 2, children: 1, infants: 1,
      childAges: [15], infantAges: [0] }, earliestDate: "2026-01-01", onSearch() {},
  }));
  assert(markup.includes('value="0" selected=""'));
  assert(markup.includes('value="15" selected=""'));
  assert(markup.includes("Idade de cada criança na data de entrada"));
  const { LegalTermsModal } = load("src/components/LegalTermsModal.tsx");
  const legal = renderToStaticMarkup(React.createElement(LegalTermsModal, { isOpen: true,
    initialTab: "cancelamento", cancellationText: policy.details, onClose() {} }));
  assert(legal.includes("25.50 EUR") && legal.includes("75.00 EUR"));
  assert(!legal.includes("Reservas de Última Hora"), "Condições específicas não devem receber regra genérica adicional");
  let routeSearches = [];
  const routeLoad = loader({
    "@/lib/hotelbeds": { findBrazilHotelbedsCodes: async () => [], searchHotelbedsAvailability: async (options) => {
      routeSearches.push(options); return { ok: true, hotels: [], total: 0, checkIn: options.checkIn, checkOut: options.checkOut };
    } },
    "@/lib/currency": { getSyncExchangeRateToBRL: () => 1 },
  });
  const { GET } = routeLoad("src/app/api/hotelbeds/availability/route.ts");
  const { NextRequest } = require("next/server");
  const query = "http://localhost/api/hotelbeds/availability?checkIn=2030-01-01&checkOut=2030-01-03&children=1&infants=1";
  assert.equal((await GET(new NextRequest(query))).status, 400);
  assert.equal(routeSearches.length, 0);
  assert.equal((await GET(new NextRequest(`${query}&childAges=15&infantAges=0`))).status, 200);
  assert.deepEqual(routeSearches[0].occupancies[0].paxes, [{ type: "CH", age: 15 }, { type: "CH", age: 0 }]);
  await GET(new NextRequest(`${query}&childAges=15&infantAges=0`));
  assert.equal(routeSearches.length, 1);
  await GET(new NextRequest(`${query}&childAges=16&infantAges=0`));
  assert.equal(routeSearches.length, 2, "Cache de disponibilidade deve separar idades diferentes");
  const { groupRoomOffers, priceRoomOffer } = load("src/lib/roomOffers.ts");
  const { translateHotelbedsRoomName } = load("src/lib/hotelbedsRoomName.ts");
  assert.equal(translateHotelbedsRoomName("Quarto TWIN LUXURY"), "Quarto Twin Luxo");
  assert.equal(translateHotelbedsRoomName("Luxo ACCESSIBILITY"), "Luxo Adaptado");
  assert(translateHotelbedsRoomName("DOUBLE STANDARD (BALCONY)").includes("(Varanda)"));
  const makeRoom = (id, code, key, board, net) => ({ id, hotelbedsRoomCode: code, name: "Quarto de teste",
    netRate: net / 3, barRate: net, mandatorySellingRate: undefined, omnibeesAvailableCount: 1,
    boardBasis: board, highlights: [], sizeM2: 0, bedConfig: "", viewLabel: "", minStay: 1,
    rates: [{ ...rawRate, rateKey: key, boardCode: board, net, sellingRate: undefined, supplierCancellationPolicies: policies }] });
  const bb = makeRoom("bb", "DBL", "bb-key", "BB", 893);
  const hb = makeRoom("hb", "DBL", "hb-key", "HB", 903.44);
  const other = makeRoom("other", "DBL", "another-contract", "BB", 900);
  const twin = makeRoom("twin", "TWN", "twin-key", "BB", 893);
  const grouped = groupRoomOffers([bb, hb, { ...bb, id: "duplicate" }, other, twin], 3);
  assert.equal(grouped.length, 2, "Duplo e Twin não podem ser unidos por nome/preço iguais");
  const double = grouped.find((group) => group.id === "DBL");
  assert.equal(double.meals.length, 2);
  assert.equal(double.meals.find((meal) => meal.code === "BB").offers.length, 2);
  assert.equal(double.meals.find((meal) => meal.code === "HB").offers[0], hb);
  assert.equal(priceRoomOffer(bb, 3).pix.pixPrice, calculateVellutoPricing(893).pix.pixPrice);
  assert.equal(priceRoomOffer(hb, 3).pix.pixPrice, calculateVellutoPricing(903.44).pix.pixPrice);
  const cheaperHb = { ...hb, id: "promotion", rates: [{ ...hb.rates[0], net: 850 }] };
  assert.equal(groupRoomOffers([bb, cheaperHb], 3)[0].meals[0].code, "HB", "Não inverter ou inflar preço do regime mais completo");
  const { RoomOffers } = load("src/components/RoomOffers.tsx");
  const offersMarkup = renderToStaticMarkup(React.createElement(RoomOffers, { rooms: [bb, hb, other], nights: 3,
    checkIn: "2030-01-01", onSelect() {}, onViewPolicy() {} }));
  assert.equal((offersMarkup.match(/<article /g) || []).length, 1);
  assert(offersMarkup.includes("Café da manhã incluído") && offersMarkup.includes("Meia pensão"));
  assert(offersMarkup.includes("Total de 3 noites") && offersMarkup.includes("Total no cartão"));
  assert(offersMarkup.includes("Ver outras 1 tarifa"));
  assert(!offersMarkup.includes("Tarifa Oficial"), "Não usar máximo de outras ofertas como referência de desconto do quarto");
  console.log("OK: idades, comodidades, cancelamento, preços obrigatórios, tarifas, oferta assinada, Pix/cartão, RECHECK e falha de condições.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
