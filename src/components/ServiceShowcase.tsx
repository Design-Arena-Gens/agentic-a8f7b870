"use client";

import Link from "next/link";
import { services } from "@/data/services";
import styles from "./ServiceShowcase.module.css";

type Props = {
  className?: string;
};

const publications = ["Vogue", "Harper's Bazaar", "The Knot"];

export const ServiceShowcase = ({ className }: Props) => {
  const triggerIntent = (prompt: string) => {
    window.dispatchEvent(
      new CustomEvent("chat-intent", {
        detail: prompt,
      }),
    );
  };

  return (
    <div className={className ? `${styles.wrapper} ${className}` : styles.wrapper}>
      <h2>Signature services</h2>
      <div className={styles.list}>
        {services.map((service) => (
          <article key={service.id}>
            <header>
              <h3>{service.name}</h3>
              <span>${service.price}</span>
            </header>
            <p>{service.description}</p>
            <footer>
              <span>{service.durationMinutes} min session</span>
              <button
                type="button"
                onClick={() =>
                  triggerIntent(
                    `I'd like to book ${service.name.toLowerCase()} soon. What do you have available?`,
                  )
                }
              >
                Ask to book
              </button>
            </footer>
          </article>
        ))}
      </div>
      <div className={styles.presence}>
        <span>Seen in</span>
        <div>
          {publications.map((title) => (
            <span key={title}>{title}</span>
          ))}
        </div>
      </div>
      <p className={styles.contact}>
        Prefer a human touch? Email {" "}
        <Link href="mailto:hello@sashakmakeup.com">hello@sashakmakeup.com</Link> or
        text <Link href="tel:+19175551234">917-555-1234</Link>.
      </p>
    </div>
  );
};
