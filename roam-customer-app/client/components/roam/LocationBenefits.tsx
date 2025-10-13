export default function LocationBenefits() {
  return (
    <section className="container mx-auto py-16 lg:py-24">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">Perfect for Florida Living &amp; Vacation Life</h2>
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-xl font-semibold">🏖️ For Vacationers</h3>
          <p className="mt-2 text-sm text-foreground/70">Don't Let Vacation Stop Your Wellness</p>
          <p className="mt-3 text-sm text-foreground/80">
            Visiting Florida's beautiful beaches? Keep your wellness routine on track:
          </p>
          <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-foreground/80">
            <li>Beachfront massage at your rental</li>
            <li>Morning yoga on the sand</li>
            <li>Pre-event hair &amp; makeup</li>
            <li>Recovery massage after beach volleyball</li>
          </ul>
          <p className="mt-3 text-sm text-foreground/70">Available across Florida's top vacation destinations.</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-xl font-semibold">🏡 For Residents</h3>
          <p className="mt-2 text-sm text-foreground/70">Elevated Living, Every Day</p>
          <p className="mt-3 text-sm text-foreground/80">
            Florida living just got better:
          </p>
          <ul className="mt-3 text-sm list-disc pl-5 space-y-1 text-foreground/80">
            <li>Skip the salon commute - they come to you</li>
            <li>Maintain fitness goals at home</li>
            <li>Regular therapy without travel hassle</li>
            <li>Healthcare on your schedule</li>
          </ul>
          <p className="mt-3 text-sm text-foreground/70">Your home becomes your wellness sanctuary.</p>
        </div>
      </div>
    </section>
  );
}
