import React from "react";

export const Services = () => {
  return (
    <section className="bg-[#f2f2f2] py-16">
      <div className="max-w-6xl mx-auto px-6">

        {/* Title */}
        <h2 className="text-center text-3xl md:text-4xl font-bold mb-10">
          FCI - FINTECH SERVICES
        </h2>

        <div className="font-mono">

          {/* Intro */}
          <div className="text-center mb-12">
            <p className="font-bold text-3xl md:text-4xl mb-3">
              Let's start a Conversation
            </p>
            <p className="text-gray-600">
              Let's work together to reach your goals. Reach out to us, and we will be happy to help.
            </p>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-3xl mx-auto">

            {/* Headquarters */}
            <div>
              <p className="font-bold mb-2">HEADQUARTERS</p>
              <p className="text-gray-700">
                Orange County, California United States
              </p>
            </div>

            {/* Emails */}
            <div>
              <p className="font-bold mb-2">Email us at:</p>
              <ul className="list-disc list-inside text-gray-700">
                <li>
                  Help at{" "}
                  <a
                    href="mailto:Help@fci.io"
                    className="text-blue-600 hover:underline"
                  >
                    Help@fci.io
                  </a>
                </li>
                <li>
                  Tim at{" "}
                  <a
                    href="mailto:Tim@fci.io"
                    className="text-blue-600 hover:underline"
                  >
                    Tim@fci.io
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};