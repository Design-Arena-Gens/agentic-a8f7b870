import { ChatAgent } from "@/components/ChatAgent";
import { ServiceShowcase } from "@/components/ServiceShowcase";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const studioHighlights = [
  { label: "NYC & Tri-State", detail: "Studio + on-location" },
  { label: "Cruelty-Free Kit", detail: "Pat McGrath, Westman, Kosas" },
  { label: "8+ Years Pro", detail: "Red carpet, brides, editorial" },
];

export default function Home() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.badge}>Sasha K - Editorial Makeup Artist</span>
          <h1>
            Luminous glam, on demand. Let Sasha&apos;s AI concierge lock in your next
            makeup session in seconds.
          </h1>
          <p>
            Sasha&apos;s assistant offers instant answers on services, pricing, and
            availability, then secures your booking without the back-and-forth.
            Ideal for wedding mornings, red carpet moments, and luxe lessons.
          </p>
          <div className={styles.highlights}>
            {studioHighlights.map((item) => (
              <div key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
        </section>
        <section className={styles.content}>
          <ServiceShowcase className={styles.services} />
          <div className={styles.chat}>
            <ChatAgent />
          </div>
        </section>
      </main>
    </div>
  );
}
