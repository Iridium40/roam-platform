import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const items = [
    {
      q: "How do I know providers are qualified?",
      a: `Every provider undergoes comprehensive background checks, license verification, and insurance confirmation before joining ROAM. We only accept the top professionals in each field.`,
    },
    {
      q: "What if I need to cancel or reschedule?",
      a: `Our straightforward cancellation policy is easy to understand. Cancellations made more than 24 hours in advance receive a 100% refund of service fees (platform fees are not refunded). Cancellations within 24 hours receive no refund.`,
    },
    {
      q: "How does pricing work?",
      a: `Pricing includes a service fee and a platform fee of 20%. That is it.`,
    },
    {
      q: "Is my payment information secure?",
      a: `Absolutely. All payments are processed through Stripe, the industry leader in secure payment processing. We never store your full card details on our servers.`,
    },
    {
      q: "Can I communicate with my provider?",
      a: `Yes! Once booked, you can message your provider directly through our secure in-app chat. No need to share phone numbers or personal contact information.`,
    },
    {
      q: "What areas does ROAM serve?",
      a: `ROAM currently serves all major Florida markets with plans to expand nationwide. Check availability in your area during the search process.`,
    },
    {
      q: "What if I'm not satisfied with a service?",
      a: `Customer satisfaction is our priority. If you're unhappy with a service, contact our support team within 24 hours. We'll work to resolve the issue and ensure you have a great experience.`,
    },
    {
      q: "Can I book the same provider regularly?",
      a: `Absolutely! Save your favorite providers and rebook with them easily. Many customers develop ongoing relationships with their preferred professionals.`,
    },
  ];
  return (
    <section className="container mx-auto py-16 lg:py-24">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">
        Common Questions About ROAM
      </h2>
      <div className="mx-auto mt-8 max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {items.map((it, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left">{it.q}</AccordionTrigger>
              <AccordionContent>{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
