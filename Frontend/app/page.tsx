import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Marquee } from "@/components/site/Marquee";
import { Features } from "@/components/site/Features";
import { TrustBadges } from "@/components/site/TrustBadges";
import { IntegrateTabs } from "@/components/site/IntegrateTabs";
import { FAQ } from "@/components/site/FAQ";
import { FooterCTA } from "@/components/site/FooterCTA";
import { Footer } from "@/components/site/Footer";

export default function Home() {
  return (
    <div id="top">
      <AnnouncementBar />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <TrustBadges />
        <IntegrateTabs />
        <FAQ />
        <FooterCTA />
      </main>
      <Footer />
    </div>
  );
}
