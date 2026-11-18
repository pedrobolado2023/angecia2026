"use client";

import { useEffect, useState } from "react";

type CustomerBooking = {
  id: string;
  reference?: string;
  status: string;
  hotelName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  canDownload: boolean;
};

const statuses: Record<string, string> = {
  confirmed: "Confirmada", cancelled: "Cancelada", paying: "Pagamento em processamento",
  pending: "Aguardando pagamento", confirming: "Confirmando hospedagem",
  review: "Em verificação", rejected: "Pagamento não concluído",
};

function date(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join("/") : value;
}

export function CustomerBookings() {
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/bookings/history?page=${page}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha ao carregar as reservas.");
        setBookings(data.bookings);
        setHasMore(data.hasMore);
      })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);

  async function refresh(booking: CustomerBooking) {
    setRefreshing(booking.id);
    setError("");
    try {
      const response = await fetch(`/api/hotelbeds/bookings/${encodeURIComponent(booking.reference!)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error("Não foi possível atualizar o status agora. Tente mais tarde.");
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Falha ao atualizar reserva.");
    } finally {
      setRefreshing("");
    }
  }

  return <section aria-labelledby="customer-bookings-title" className="my-5 border-y border-[#DFD5C5] py-5">
    <h4 id="customer-bookings-title" className="font-editorial text-2xl">Minhas reservas</h4>
    {loading && <p role="status" className="my-3 text-sm">Carregando suas reservas...</p>}
    {error && <div role="alert" className="my-3 text-sm text-[#A33224]">
      <p>{error}</p>
      <button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-2 underline">Tentar novamente</button>
    </div>}
    {!loading && !error && !bookings.length && <p className="my-3 text-sm text-[#5C646B]">Você ainda não tem reservas nesta conta.</p>}
    {!loading && bookings.map((booking) => <article key={booking.id} className="mt-3 rounded-xl border border-[#E2D9C8] p-4 text-sm">
      <span className={`font-semibold ${booking.status === "cancelled" ? "text-[#A33224]" : "text-[#0F5257]"}`}>
        {statuses[booking.status] || "Status em verificação"}
      </span>
      <h5 className="mt-2 font-semibold">{booking.hotelName}</h5>
      <p>{booking.roomName}</p>
      <p className="mt-1">{date(booking.checkIn)} a {date(booking.checkOut)}</p>
      <p>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(booking.amount)}</p>
      {booking.reference && <p className="mt-1">Referência da hospedagem {booking.reference}</p>}
      <p className="mt-1 break-all text-xs text-[#5C646B]">Pedido {booking.id}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {booking.canDownload && <a className="rounded-lg bg-[#B8863B] px-3 py-2 text-white"
          href={`/api/bookings/voucher?orderId=${encodeURIComponent(booking.id)}`}>Baixar voucher PDF</a>}
        {booking.reference && <button type="button" disabled={!!refreshing}
          className="rounded-lg border border-[#E2D9C8] px-3 py-2 disabled:opacity-50" onClick={() => refresh(booking)}>
          {refreshing === booking.id ? "Atualizando..." : "Atualizar status"}
        </button>}
        <a href={`mailto:contato@hospedeclub.com.br?subject=${encodeURIComponent(`Reserva ${booking.reference || booking.id}`)}`} className="self-center underline">Atendimento</a>
      </div>
    </article>)}
    {!loading && (page > 1 || hasMore) && <div className="mt-4 flex items-center justify-between text-sm">
      <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="disabled:opacity-40">Anterior</button>
      <span>Página {page}</span>
      <button type="button" disabled={!hasMore} onClick={() => setPage((value) => value + 1)} className="disabled:opacity-40">Próxima</button>
    </div>}
  </section>;
}
