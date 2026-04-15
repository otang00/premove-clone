drop index if exists public.uq_reservations_ims_reservation_id;
create unique index if not exists uq_reservations_ims_reservation_id
  on public.reservations (ims_reservation_id);
