import {
  addDays,
  addMinutes,
  formatISO,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { randomUUID } from "crypto";
import { services } from "@/data/services";

const BUSINESS_DAYS = [1, 2, 3, 4, 5, 6]; // Monday - Saturday (0 = Sunday)
const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;
const SLOT_INTERVAL_MINUTES = 30;

export type Booking = {
  id: string;
  clientName: string;
  email: string;
  phone?: string;
  serviceId: string;
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  notes?: string;
};

const inMemoryBookings: Booking[] = [];

type Slot = {
  start: Date;
  end: Date;
};

const getService = (serviceId: string) =>
  services.find((service) => service.id === serviceId);

const isBusinessDay = (date: Date) =>
  BUSINESS_DAYS.includes(date.getDay());

const generateSlots = (daysAhead = 21): Slot[] => {
  const slots: Slot[] = [];

  for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset += 1) {
    const day = addDays(startOfDay(new Date()), dayOffset);

    if (!isBusinessDay(day)) {
      continue;
    }

    for (
      let minutesFromOpen = 0;
      minutesFromOpen <= (CLOSE_HOUR - OPEN_HOUR) * 60 - SLOT_INTERVAL_MINUTES;
      minutesFromOpen += SLOT_INTERVAL_MINUTES
    ) {
      const base = setMinutes(setHours(day, OPEN_HOUR), 0);
      const start = addMinutes(base, minutesFromOpen);
      const end = addMinutes(start, SLOT_INTERVAL_MINUTES);

      slots.push({ start, end });
    }
  }

  return slots;
};

const slotsOverlap = (slot: Slot, booking: Booking) => {
  const bookingStart = new Date(booking.startsAt);
  const bookingEnd = new Date(booking.endsAt);

  return slot.start < bookingEnd && bookingStart < slot.end;
};

const hasConflict = (candidateSlot: Slot) =>
  inMemoryBookings.some((booking) =>
    slotsOverlap(candidateSlot, booking),
  );

export const getNextAvailableSlots = (count = 6) =>
  generateSlots()
    .filter((slot) => !hasConflict(slot))
    .slice(0, count)
    .map((slot) => ({
      formatted: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(slot.start),
      startsAt: formatISO(slot.start),
    }));

export const listBookings = () => [...inMemoryBookings];

type ReservationPayload = {
  clientName: string;
  email: string;
  phone?: string;
  serviceId: string;
  startsAt: Date;
  notes?: string;
};

export const reserveBooking = (payload: ReservationPayload) => {
  const service = getService(payload.serviceId);

  if (!service) {
    return { ok: false, error: "Service not found." } as const;
  }

  const serviceEnd = addMinutes(payload.startsAt, service.durationMinutes);

  const openBoundary = setHours(setMinutes(payload.startsAt, 0), OPEN_HOUR);
  const closeBoundary = setHours(setMinutes(payload.startsAt, 0), CLOSE_HOUR);

  if (payload.startsAt < openBoundary) {
    return {
      ok: false,
      error: `Sasha starts at ${OPEN_HOUR}:00. Please choose a later time.`,
    } as const;
  }

  if (serviceEnd > closeBoundary) {
    return {
      ok: false,
      error: `This service finishes after ${CLOSE_HOUR}:00. Pick an earlier slot.`,
    } as const;
  }

  const candidateSlot: Slot = {
    start: payload.startsAt,
    end: serviceEnd,
  };

  if (hasConflict(candidateSlot)) {
    return {
      ok: false,
      error:
        "That slot just booked up. Let me know another time that works for you.",
    } as const;
  }

  const booking: Booking = {
    id: randomUUID(),
    clientName: payload.clientName,
    email: payload.email,
    phone: payload.phone,
    serviceId: service.id,
    startsAt: formatISO(payload.startsAt),
    endsAt: formatISO(serviceEnd),
    notes: payload.notes,
  };

  inMemoryBookings.push(booking);

  return { ok: true, booking } as const;
};
