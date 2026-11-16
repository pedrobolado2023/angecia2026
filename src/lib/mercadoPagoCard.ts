type MercadoPagoBrowser = {
  createCardToken(details: Record<string, string>): Promise<{ id?: string }>;
  getPaymentMethods(payment: { bin: string }): Promise<{ results: { id: string; payment_type_id: string; issuer?: { id?: string | number } }[] }>;
};

let sdkLoad: Promise<void> | undefined;

async function loadMercadoPago() {
  const browser = window as Window & { MercadoPago?: new (key: string, options: { locale: string }) => MercadoPagoBrowser };
  if (!browser.MercadoPago) {
    sdkLoad ||= new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        sdkLoad = undefined;
        reject(new Error("Não foi possível carregar o pagamento por cartão."));
      };
      document.head.appendChild(script);
    });
    await sdkLoad;
  }
  if (!browser.MercadoPago) throw new Error("Pagamento por cartão temporariamente indisponível.");
  return browser.MercadoPago;
}

export async function tokenizeCard(input: { publicKey: string; number: string; holder: string; expiry: string; cvv: string; cpf: string }) {
  try {
    const MercadoPago = await loadMercadoPago();
    const mp = new MercadoPago(input.publicKey, { locale: "pt-BR" });
    const number = input.number.replace(/\D/g, "");
    const expiry = input.expiry.replace(/\D/g, "");
    const { results } = await mp.getPaymentMethods({ bin: number.slice(0, 8) });
    const method = results.find((item) => item.payment_type_id === "credit_card");
    if (!method) throw new Error();
    const token = await mp.createCardToken({
      cardNumber: number, cardholderName: input.holder,
      cardExpirationMonth: expiry.slice(0, 2), cardExpirationYear: `20${expiry.slice(2, 4)}`,
      securityCode: input.cvv, identificationType: "CPF", identificationNumber: input.cpf.replace(/\D/g, ""),
    });
    if (!token.id) throw new Error();
    return { token: token.id, methodId: method.id, issuerId: method.issuer?.id == null ? undefined : String(method.issuer.id) };
  } catch {
    throw new Error("Não foi possível validar o cartão. Confira os dados ou escolha Pix.");
  }
}
