import { NextResponse } from "next/server";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { services } from "@/data/services";
import {
  getNextAvailableSlots,
  reserveBooking,
  type Booking,
} from "@/lib/schedule";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AgentResponse = {
  reply: string;
  booking?: Booking;
  metadata?: Record<string, unknown>;
};

const lowercaseConversation = (messages: ChatMessage[]) =>
  messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.toLowerCase())
    .join(" ");

const extractEmail = (conversation: string) =>
  conversation.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0];

const extractPhone = (conversation: string) =>
  conversation.match(/\+?\d[\d\s().-]{7,}\d/)?.[0]?.replace(/\s+/g, " ").trim();

const extractName = (messages: ChatMessage[]) => {
  const patterns = [
    /my name is ([a-z\s'-]+)/i,
    /this is ([a-z\s'-]+)/i,
    /i am ([a-z\s'-]+)/i,
    /i'm ([a-z\s'-]+)/i,
  ];

  for (const message of messages.filter((item) => item.role === "user").reverse()) {
    for (const pattern of patterns) {
      const match = message.content.match(pattern);

      if (match) {
        return match[1]
          .split(" ")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
          .trim();
      }
    }
  }

  return undefined;
};

const determineService = (conversation: string) => {
  const scored = services
    .map((service) => ({
      service,
      score: service.keywords.reduce(
        (accumulator, keyword) =>
          conversation.includes(keyword.toLowerCase()) ? accumulator + 1 : accumulator,
        0,
      ),
    }))
    .sort((left, right) => right.score - left.score);

  const [top] = scored;

  return top?.score ? top.service : undefined;
};

const roundToNearestSlot = (date: Date) => {
  const minutes = date.getMinutes();
  const remainder = minutes % 30;

  if (remainder === 0) {
    date.setSeconds(0, 0);
    return date;
  }

  if (remainder < 15) {
    date.setMinutes(minutes - remainder, 0, 0);
  } else {
    date.setMinutes(minutes + (30 - remainder), 0, 0);
  }

  date.setSeconds(0, 0);

  return date;
};

const parseDesiredDate = (message: string) => {
  const parsedDate = chrono.parseDate(message, new Date(), {
    forwardDate: true,
  });

  if (!parsedDate) {
    return undefined;
  }

  return roundToNearestSlot(parsedDate);
};

const describeServices = () =>
  services
    .map(
      (service) =>
        `- ${service.name}: $${service.price} | ${service.durationMinutes} mins | ${service.description}`,
    )
    .join("\n");

const successReply = (booking: Booking) => {
  const service = services.find((item) => item.id === booking.serviceId)!;
  const start = format(new Date(booking.startsAt), "EEEE, MMMM d 'at' h:mm a");
  const end = format(new Date(booking.endsAt), "h:mm a");

  return `Beautiful! I've booked you for ${service.name} on ${start}, wrapping at ${end}. You'll get a confirmation at ${booking.email}. Let me know if you need to tweak anything or add notes for Sasha.`;
};

const fallbackReply = () =>
  "I'm Sasha K's beauty booking assistant. I can help with availability, pricing, and locking in sessions. Let me know what you'd like to do!";

const bioReply = () =>
  "Sasha K is a NYC-based makeup artist specializing in modern, luminous glam for red carpet, brides, and editorial. With over 8 years of experience, Sasha's kit is cruelty-free and curated with luxury and clean beauty staples.";

const locationReply =
  "Sasha works from her private studio in SoHo, Manhattan, and travels within the tri-state area for on-location bookings. Travel fees apply outside Manhattan.";

const policyReply =
  "Bookings require a 25% retainer (applied to your total) and 48 hours' notice for reschedules. Travel, assistants, or early-call fees are quoted case-by-case.";

const buildAvailabilityReply = () => {
  const availabilities = getNextAvailableSlots(5);

  if (!availabilities.length) {
    return "I'm fully committed over the next three weeks. Want me to waitlist you or suggest the next opening?";
  }

  const bullets = availabilities.map((slot) => `- ${slot.formatted}`).join("\n");

  return `Here are the next open studio slots with Sasha:\n${bullets}\nLet me know which one you'd like to claim or if you need a different time.`;
};

const needsContact = (email?: string) => !email;

const needsName = (name?: string) => !name;

const contextualBookingReply = ({
  name,
  email,
  service,
  desiredStart,
  phone,
}: {
  name?: string;
  email?: string;
  service?: (typeof services)[number];
  desiredStart?: Date;
  phone?: string;
}) => {
  const needs: string[] = [];

  if (!service) {
    needs.push("which service you'd like");
  }
  if (!desiredStart) {
    needs.push("the date and time that work");
  }
  if (needsName(name)) {
    needs.push("your name");
  }
  if (needsContact(email)) {
    needs.push("an email for confirmation");
  }

  if (!needs.length) {
    const confirmationPrompt = `Great! I have you down for ${service!.name}. Just confirming you want ${format(
      desiredStart!,
      "EEEE, MMMM d 'at' h:mm a",
    )}. Should I lock it in?`;

    if (!phone) {
      return `${confirmationPrompt} (Optional: drop a phone number if you'd like a text reminder.)`;
    }

    return confirmationPrompt;
  }

  const needed = needs.join(", ").replace(/, ([^,]*)$/, ", and $1");

  return `I'd love to schedule that; could you share ${needed}?`;
};

const handleBookingIntent = ({
  name,
  email,
  phone,
  service,
  desiredStart,
}: {
  name?: string;
  email?: string;
  phone?: string;
  service?: (typeof services)[number];
  desiredStart?: Date;
}): AgentResponse => {
  if (!service || !desiredStart || !name || !email) {
    return { reply: contextualBookingReply({ name, email, service, desiredStart, phone }) };
  }

  const result = reserveBooking({
    clientName: name,
    email,
    phone,
    serviceId: service.id,
    startsAt: desiredStart,
  });

  if (!result.ok) {
    const availability = buildAvailabilityReply();
    return {
      reply: `${result.error}\n\n${availability}`,
    };
  }

  return {
    reply: successReply(result.booking),
    booking: result.booking,
    metadata: { intent: "booking.confirmed" },
  };
};

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages?: ChatMessage[] };

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json(
      { reply: fallbackReply(), metadata: { reason: "invalid_payload" } },
      { status: 200 },
    );
  }

  const latestMessage = messages.filter((message) => message.role === "user").pop();

  if (!latestMessage) {
    return NextResponse.json(
      { reply: fallbackReply(), metadata: { reason: "empty_conversation" } },
      { status: 200 },
    );
  }

  const fullConversation = lowercaseConversation(messages);
  const name = extractName(messages);
  const email = extractEmail(fullConversation);
  const phone = extractPhone(fullConversation);
  const service = determineService(fullConversation);
  const desiredStart = parseDesiredDate(latestMessage.content);

  if (latestMessage.content.toLowerCase().includes("availability")) {
    return NextResponse.json({ reply: buildAvailabilityReply() });
  }

  if (latestMessage.content.toLowerCase().includes("price")) {
    return NextResponse.json({
      reply: `Here's Sasha's current menu:\n${describeServices()}\n\nLet me know what you'd like to book or if you need a custom quote.`,
    });
  }

  if (latestMessage.content.toLowerCase().includes("bio")) {
    return NextResponse.json({ reply: bioReply() });
  }

  if (
    latestMessage.content.toLowerCase().includes("where") ||
    latestMessage.content.toLowerCase().includes("studio") ||
    latestMessage.content.toLowerCase().includes("location")
  ) {
    return NextResponse.json({ reply: locationReply });
  }

  if (latestMessage.content.toLowerCase().includes("policy")) {
    return NextResponse.json({ reply: policyReply });
  }

  const bookingKeywords = ["book", "schedule", "reserve", "appointment"];

  const wantsBooking =
    bookingKeywords.some((keyword) => fullConversation.includes(keyword)) ||
    Boolean(service && desiredStart);

  if (wantsBooking) {
    const response = handleBookingIntent({
      name,
      email,
      phone,
      service,
      desiredStart,
    });

    return NextResponse.json(response);
  }

  if (latestMessage.content.toLowerCase().includes("services")) {
    return NextResponse.json({
      reply: `Sasha currently offers:\n${describeServices()}`,
    });
  }

  if (
    latestMessage.content.toLowerCase().includes("thanks") ||
    latestMessage.content.toLowerCase().includes("thank you")
  ) {
    return NextResponse.json({
      reply: "You're so welcome! Let me know if you need anything else.",
    });
  }

  if (latestMessage.content.toLowerCase().includes("hello") || latestMessage.content.toLowerCase().includes("hi")) {
    return NextResponse.json({
      reply:
        "Hi! I'm Sasha K's booking assistant. I can guide you through services, pricing, and availability, and I can book you in when you're ready.",
    });
  }

  return NextResponse.json({ reply: fallbackReply() });
}
