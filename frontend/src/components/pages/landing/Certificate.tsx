import React from "react";
import cNFTGif from "../../../assets/cNFT.gif";
import markCertificate from "../../../assets/HCertificate.png";

export const Certificate = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">

        {/* Certificate Frame */}
        <div
          className="relative flex items-center justify-center min-h-[700px] md:min-h-[850px]"
          style={{
            backgroundImage: `url(${markCertificate})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
          }}
        >

          {/* Content */}
          <div className="w-full px-8 md:px-20 py-20">

            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-10">

              {/* Text (7 cols like Bootstrap) */}
              <div className="md:col-span-7 text-gray-500 text-base md:text-lg leading-relaxed text-justify font-semibold space-y-5">
                <p>
                  The FCI Certificate of Authenticity, or Non Public Declaration
                  of Collateralized Asset is a unique digital document inscribed
                  on the FCI Blockchain that represents ownership of real-world
                  financial instruments that contain real estate property in the
                  US as collateral.
                </p>

                <p>
                  Our FCI Certificates of Authenticity currently hold over
                  $20 Billion US in real estate property and accrue daily gains
                  from interest payments. The Certificate of Authenticity can be
                  shared from one owner to another. Payments can be collected in
                  fiat or crypto and all transactions are directly recorded and
                  transferred to the blockchain by compliant financial
                  institutions. Further, all traceability for the Certificate of
                  Authenticity is registered, transparent and accessible with
                  the correct credentials in our Blockchain Explorer.
                </p>
              </div>

              {/* GIF (5 cols like Bootstrap) */}
              <div className="md:col-span-5 flex justify-center items-center">
                <img
                  src={cNFTGif}
                  alt="FCI cNFT GIF"
                  className="  md:-ml-10"
                  style={{ height: '25vh', marginLeft: '-4vw' }}
                />
              </div>

            </div>

          </div>
        </div>
      </div>
    </section>
  );
};