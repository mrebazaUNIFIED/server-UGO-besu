import { useState, useEffect } from "react";
import { Certificate } from "../components/pages/landing/Certificate";
import { Footer } from "../components/pages/landing/Footer";
import { Hero } from "../components/pages/landing/Hero";
import { Nav } from "../components/pages/landing/Nav";
import { Network } from "../components/pages/landing/Network";
import { Services } from "../components/pages/landing/Services";
import { Blockchain } from "../components/pages/landing/Blockchain";

export default function LandingPage() {
  const [navBg, setNavBg] = useState(false);
  const isHome = true;
  const changeNavBg = (e: any) => {
    window.scrollY >= 50 ? setNavBg(true) : setNavBg(false);
  };


  useEffect(() => {

    window.addEventListener("scroll", changeNavBg, false);
    return () => {
      window.addEventListener("scroll", changeNavBg, false);
    };
  }, []);


  return (
    <>
      <Nav />
      <section id="landing" className="section text-white" style={{ backgroundImage: `url(https://www.unifiedsoftware.us/wp-content/uploads/2023/02/global-social-media-devices-connectivity-big-data-mining-network-technology-SBV-347065107-HD.gif)`, backgroundSize: '100% 70%', backgroundRepeat: 'no-repeat' }}>
        <Hero />
      </section>

      <section id="blockchain" className='section'>
        <Blockchain />

      </section>


      <section id="fintech" className='section'><Services /></section>
      <section id="cNFT" className="section"><Certificate /></section>
      <section id="network" className="section"><Network /></section>




      <Footer />

    </>
  );
}