import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ServicesShowcase() {
  return (
    <section className="container mx-auto py-16 lg:py-24">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">Premium Services for Every Wellness Need</h2>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Beauty &amp; Wellness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium">Transform Your Look, Anywhere</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hair Styling &amp; Coloring</li>
              <li>Professional Makeup</li>
              <li>Nail Services &amp; Spa Treatments</li>
              <li>Skincare &amp; Facials</li>
              <li>Waxing &amp; Body Treatments</li>
            </ul>
            <Button variant="link" className="px-0">Explore Beauty Services →</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fitness &amp; Training</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium">Your Personal Fitness Journey</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Personal Training Sessions</li>
              <li>Yoga &amp; Pilates Instruction</li>
              <li>Nutrition Coaching</li>
              <li>Beach Bootcamps</li>
              <li>Wellness Consulting</li>
            </ul>
            <Button variant="link" className="px-0">Find Your Trainer →</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Therapy &amp; Bodywork</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium">Healing Touch, Expert Care</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Therapeutic Massage</li>
              <li>Sports Injury Treatment</li>
              <li>Deep Tissue Therapy</li>
              <li>Prenatal Massage</li>
              <li>Relaxation &amp; Stress Relief</li>
            </ul>
            <Button variant="link" className="px-0">Book Therapy Session →</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Healthcare Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <p className="font-medium">Professional Medical Care</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Home Health Consultations</li>
              <li>Physical Therapy</li>
              <li>Wellness Assessments</li>
              <li>Preventive Care</li>
              <li>Recovery Support</li>
            </ul>
            <Button variant="link" className="px-0">Schedule Healthcare →</Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
