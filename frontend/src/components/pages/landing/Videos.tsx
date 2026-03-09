import React from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { useParams } from "react-router-dom";

export const Video: React.FC = () => {
  const { id } = useParams();

  return (
    <>
      <Nav />

      <section className="min-h-screen  flex flex-col items-center justify-center px-4 py-20">
        <div className="w-full max-w-7xl">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://player.vimeo.com/video/${id}?autoplay=1&app_id=122963`}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
              title="Video"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};