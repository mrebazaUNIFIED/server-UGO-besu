import { useState, useEffect } from "react";

const navLinks = [
  { label: "FCI REIT", href: "#landing" },
  { label: "Blockchain Services", href: "#blockchain" },
  { label: "Fintech Services", href: "#fintech" },
  { label: "Certificate of Authenticity", href: "#cNFT" },
  { label: "Network", href: "#network" },
  { label: "Vault", href: "/vault" },
  { label: "Shared Assets", href: "/share" },
  { label: "Blockchain Explorer", href: "/explorer" },
];

export const Nav = () => {
  const [scrolled, setScrolled] = useState(false);

  const isExternalPage = ["/videos/", "/vault", "/share", "/explorer"].some(
    (path) => window.location.pathname.startsWith(path)
  );
  const isHomePage = window.location.pathname === "/";
  const showBackground = scrolled || isExternalPage;

  const [activeSection, setActiveSection] = useState<string>(
    isHomePage ? "#landing" : ""
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY >= 50);

      const sections = navLinks
        .filter((link) => link.href.startsWith("#"))
        .map((link) => link.href.replace("#", ""))
        .map((id) => document.getElementById(id))
        .filter(Boolean) as HTMLElement[];

      let current = "#landing";

      for (const section of sections) {
        if (window.scrollY >= section.offsetTop - 100) {
          current = `#${section.id}`;
        }
      }

      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!href.startsWith("#")) return;

    e.preventDefault();

    if (!isHomePage) {
      window.location.href = `/${href}`;
      return;
    }

    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${showBackground
          ? "bg-[#050e1c]/90 backdrop-blur-lg border-b border-cyan-500/10 shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
          : "bg-transparent border-b border-transparent"
        }`}
    >
      <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-center h-14 overflow-x-auto">
        {navLinks.map((link) => {
          const isInternal = link.href.startsWith("#");
          const isActive = isInternal
            ? activeSection === link.href
            : window.location.pathname === link.href;

          return (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className={`relative flex items-center px-3 h-14 text-xs font-medium tracking-widest uppercase whitespace-nowrap transition-colors duration-200 group ${isActive ? "text-white" : "text-white/60 hover:text-white"
                }`}
            >
              {link.label}

              <span
                className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-transform duration-300 origin-center ${isActive
                    ? "scale-x-100 shadow-[0_0_8px_rgba(0,200,255,0.6)]"
                    : "scale-x-0 group-hover:scale-x-100"
                  }`}
              />
            </a>
          );
        })}
      </div>
    </nav>
  );
};