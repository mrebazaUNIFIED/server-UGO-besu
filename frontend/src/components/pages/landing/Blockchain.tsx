import React from "react";
import animation from "../../../assets/videos/animation.mp4";

export const Blockchain = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-center">

        <video
          className="w-full max-w-[1200px] object-contain rounded-lg"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={animation} type="video/mp4" />
        </video>

      </div>
    </section>
  );
};