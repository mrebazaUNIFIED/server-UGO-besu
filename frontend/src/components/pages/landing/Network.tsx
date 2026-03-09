import React from "react";
import markCertificate from "../../../assets/CenturionBlockchain.png";

export const Network = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 text-center">

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          FCI NETWORK OF BLOCKCHAIN
        </h2>

        {/* Subtitle */}
        <p className="text-gray-500 text-lg md:text-xl max-w-3xl mx-auto mb-12">
          How all the FCI applications and blockchains interconnect to create
          an advanced and unique financial environment full of opportunities
          to FCI’s users.
        </p>

        {/* Image */}
        <div className="flex justify-center">
          <img
            src={markCertificate}
            alt="FCI Network"
            className="w-full max-w-[800px] object-contain"
          />
        </div>

      </div>
    </section>
  );
};