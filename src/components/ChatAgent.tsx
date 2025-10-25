"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { services } from "@/data/services";
import styles from "./ChatAgent.module.css";

type UiMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: number;
};

type BookingSummary = {
  serviceName: string;
  clientName: string;
  email: string;
  startsAtFormatted: string;
};

const initialAgentMessage =
  "Hi there! I'm Sasha K's AI assistant. Ask me about services, availability, or let me know what you'd like to book and I'll handle the rest.";

const quickIntents = [
  "What are your prices?",
  "Do you have openings this weekend?",
  "I'd like to book an Event Glam on Friday evening.",
  "Where is the studio located?",
];

let messageCount = 0;

const buildMessagesPayload = (messages: UiMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

const formatBooking = (payload: {
  serviceName: string;
  startsAt: string;
  clientName: string;
  email: string;
}): BookingSummary => {
  const startDate = new Date(payload.startsAt);

  return {
    serviceName: payload.serviceName,
    clientName: payload.clientName,
    email: payload.email,
    startsAtFormatted: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(startDate),
  };
};

const ServiceChips = ({ onSelect }: { onSelect: (prompt: string) => void }) => (
  <div className={styles.serviceChips}>
    {services.map((service) => (
      <button
        key={service.id}
        type="button"
        onClick={() =>
          onSelect(`I'd love to book the ${service.name}. Can I take ${service.durationMinutes} minutes on ${service.name.includes("Bridal") ? "Saturday morning" : "this week"}?`)
        }
      >
        {service.name}
      </button>
    ))}
  </div>
);

const QuickReplies = ({ onSelect }: { onSelect: (prompt: string) => void }) => (
  <div className={styles.quickReplies}>
    {quickIntents.map((text) => (
      <button key={text} type="button" onClick={() => onSelect(text)}>
        {text}
      </button>
    ))}
  </div>
);

export const ChatAgent = () => {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: `msg-${messageCount++}`,
      role: "assistant",
      content: initialAgentMessage,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<UiMessage[]>([]);
  messagesRef.current = messages;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(
    async (content: string) => {
      const text = content.trim();

      if (!text) {
        return;
      }

      setError(null);
      setInput("");
      setSubmitting(true);

      const conversation = buildMessagesPayload(messagesRef.current);
      const userMessage: UiMessage = {
        id: `msg-${messageCount++}`,
        role: "user",
        content: text,
        createdAt: Date.now(),
      };

      setMessages((current) => {
        const next = [...current, userMessage];
        messagesRef.current = next;
        return next;
      });

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...conversation, { role: "user", content: text }],
          }),
        });

        if (!response.ok) {
          throw new Error("Something went wrong, please try again.");
        }

        const payload = (await response.json()) as {
          reply: string;
          booking?: {
            serviceId: string;
            clientName: string;
            email: string;
            startsAt: string;
          };
        };

        const assistantMessage: UiMessage = {
          id: `msg-${messageCount++}`,
          role: "assistant",
          content: payload.reply,
          createdAt: Date.now(),
        };

        setMessages((current) => {
          const next = [...current, assistantMessage];
          messagesRef.current = next;
          return next;
        });

        if (payload.booking) {
          const service = services.find(
            (item) => item.id === payload.booking?.serviceId,
          );

          if (service) {
            setBooking(
              formatBooking({
                serviceName: service.name,
                startsAt: payload.booking.startsAt,
                clientName: payload.booking.clientName,
                email: payload.booking.email,
              }),
            );
          }
        }
      } catch (exception) {
        setError(
          exception instanceof Error
            ? exception.message
            : "Something went wrong. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<string>;

      if (typeof custom.detail === "string") {
        void handleSend(custom.detail);
      }
    };

    window.addEventListener("chat-intent", handler as EventListener);

    return () => {
      window.removeEventListener("chat-intent", handler as EventListener);
    };
  }, [handleSend]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend(input);
  };

  return (
    <div className={styles.chatCard} id="chat">
      <div className={styles.header}>
        <div className={styles.avatar}>SK</div>
        <div>
          <h2>Sasha&apos;s Booking Concierge</h2>
          <p>AI-powered replies within seconds</p>
        </div>
      </div>
      <ServiceChips onSelect={(prompt) => void handleSend(prompt)} />
      <div className={styles.chatViewport} ref={viewportRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.bubble} ${
              message.role === "assistant" ? styles.bubbleAssistant : styles.bubbleUser
            }`}
            aria-live="polite"
          >
            {message.content.split("\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ))}
        {submitting ? (
          <div
            className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.typing}`}
          >
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <form className={styles.composer} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={submitting}
          aria-label="Message Sasha's assistant"
        />
        <button type="submit" disabled={submitting || !input.trim()}>
          Send
        </button>
      </form>
      <QuickReplies onSelect={(prompt) => void handleSend(prompt)} />
      {booking ? (
        <div className={styles.bookingSummary}>
          <h3>Reserved for you</h3>
          <p>
            <strong>{booking.serviceName}</strong>
            <br />
            {booking.startsAtFormatted}
          </p>
          <p>
            {booking.clientName} | {booking.email}
          </p>
        </div>
      ) : null}
    </div>
  );
};
