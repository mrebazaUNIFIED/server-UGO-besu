import { SiBlockchaindotcom, SiHiveBlockchain, SiVimeo } from 'react-icons/si';
import { CgToolbox } from 'react-icons/cg';
import logo from "../../../assets/vault-logo.png";
import { DoRequest } from '../../../lib/axios';
import { useState, useEffect, useRef } from 'react';

function currencyFormat(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

const features = [
  {
    icon: <SiBlockchaindotcom className=" text-lg shrink-0" />,
    title: 'Private FCI Blockchain',
    desc: 'Our Private Blockchain has been created to support financial institutions with transparency and accountability.',
    video: '/videos/797053040',
    label: 'Watch Private FCI Blockchain Video',
  },
  {
    icon: <SiHiveBlockchain className=" text-lg shrink-0" />,
    title: 'Public FCI Blockchain',
    desc: 'Our Public Blockchain serves as a revolutionary bridge between financial institutions, other blockchains, and cryptocurrencies.',
    video: '/videos/797053022',
    label: 'Watch Public FCI Blockchain Video',
  },
  {
    icon: <CgToolbox className=" text-lg shrink-0" />,
    title: 'FCI IPFS Network',
    desc: 'Our IPFS Network of nodes allows you to share, encrypt and keep traceability of every financial document you share.',
    video: '/videos/797368067',
    label: 'Watch FCI IPFS Network Video',
  },
];

export const Hero = () => {
  const [balance, setBalance] = useState<number>(
    parseFloat(import.meta.env.VITE_APP_ORIGINALBALANCE ?? '0')
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const post = { query: `query { getSumOriginalBalance }` };
    DoRequest(post).then((resp: any) => {
      const val = resp?.data?.data?.getSumOriginalBalance;
      if (val != null) setBalance(parseFloat(val));
    });

    intervalRef.current = setInterval(() => {
      const precision = 100;
      const randomnum =
        Math.floor(Math.random() * (10 * precision - 1 * precision) + 1 * precision) /
        (1 * precision);
      const random = Math.floor(Math.random() * 10000) - 5000;
      setBalance((prev) => prev + random + randomnum);
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen text-white">

      {/* ── Top: GIF hero ── */}
      <div
        className="flex-1 flex items-center"
        style={{
          backgroundImage: `url(https://www.unifiedsoftware.us/wp-content/uploads/2023/02/global-social-media-devices-connectivity-big-data-mining-network-technology-SBV-347065107-HD.gif)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '50vh',
        }}
      >
        <div className="w-full max-w-screen-xl mx-auto px-8 pt-20 pb-10 flex flex-col gap-5 items-start">
          <img src={logo} alt="Logo" className="h-[175px] w-auto object-contain" />

          <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wider leading-tight max-w-2xl">
            Your Financial Technology
            <br />
            <span className="text-cyan-400">Multichain Ecosystem</span>
          </h1>

          <div className="flex flex-col gap-1">
            <span className="text-2xl md:text-3xl font-bold text-amber-300 tabular-nums tracking-tight">
              {currencyFormat(balance)}
            </span>
            <span className="text-sm text-white/60 max-w-md">
              Of assets collateralized on FCI Blockchain and serviced by US compliant financial institutions.
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom: cards left + GIF right ── */}
      <div className="bg-white border-t border-cyan-500/10 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row gap-12 items-center">

          {/* Left column */}
          <div className="flex flex-col gap-8 md:w-2/5">
            {features.map((f) => (
              <div key={f.title} className="flex flex-col gap-3">

                {/* Title */}
                <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                  {f.icon}
                  {f.title}
                </div>

                {/* Description */}
                <p className="text-gray-500 text-sm leading-relaxed">
                  {f.desc}
                </p>

                {/* Button */}
                <a
                  href={f.video}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-600 rounded-md py-2 text-sm hover:bg-gray-50 transition"
                >
                  <SiVimeo />
                  {f.label}
                </a>

              </div>
            ))}
          </div>

          {/* Right: Image */}
          <div className="md:w-3/5">
            <img
              src="https://fintech.devfci.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fvault.a5e821cf.gif&w=3840&q=75"
              alt="FCI Vault preview"
              className="w-full h-auto object-contain"
            />
          </div>

        </div>
      </div>

    </div >
  );
};