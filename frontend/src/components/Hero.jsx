import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[100svh] sm:min-h-screen flex items-center overflow-hidden -mt-24">
      {/* Background image */}
      <div className="absolute inset-0 bg-gray-900">
        <img
          src="/hero.webp"
          srcSet="/hero-640w.webp 640w, /hero-1024w.webp 1024w, /hero-1600w.webp 1600w, /hero.webp 1807w"
          sizes="100vw"
          alt="Fresh food prep"
          className="w-full h-full object-cover object-[76%_center] sm:object-[66%_center] lg:object-center"
          width="1807"
          height="870"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-black/40 sm:bg-transparent sm:bg-linear-to-r sm:from-black/55 sm:via-black/30 sm:to-black/10" />
        <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-black/20 sm:hidden" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 pt-28 sm:pt-33 lg:pt-41 pb-24 w-full flex items-center">
        {/* Left — text */}
        <div className="w-full max-w-[22rem] sm:max-w-xl min-w-0">
          <h1 className="text-[2.65rem] min-[390px]:text-5xl lg:text-5xl xl:text-7xl font-bold text-white leading-[1.02] sm:leading-[1.05] mb-5 sm:mb-6 drop-shadow-[0_2px_5px_rgba(0,0,0,0.45)]">
            Cook Better,
            <br />
            <span className="text-[#f5a3b8]">Eat Happier,</span>
            <br />
            Every Day
            <br />
            <span className="text-[#f5a3b8]">At Home.</span>
          </h1>

          <p className="text-white/85 text-[0.95rem] sm:text-lg leading-relaxed mb-7 sm:mb-10 max-w-[20rem] sm:max-w-lg drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
            Discover easy recipes, quick kitchen wins, and smart meal planning
            ideas that fit your schedule without sacrificing flavor.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/collections"
              className="inline-flex w-full min-[390px]:w-auto items-center justify-center gap-2 bg-[#8e2c4d] hover:bg-[#7b2442] text-white font-bold px-6 sm:px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-black/30"
            >
              Explore Collections
              <ArrowRight size={17} />
            </Link>

          </div>
        </div>

      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none h-20">
        <svg
          className="absolute bottom-0 w-[200%] h-full animate-[wave_8s_linear_infinite]"
          viewBox="0 0 2880 80"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 C1680,80 1920,0 2160,40 C2400,80 2640,0 2880,40 L2880,80 L0,80 Z"
            fill="white"
            fillOpacity="0.4"
          />
        </svg>
        <svg
          className="absolute bottom-0 w-[200%] h-full animate-[wave_5s_linear_infinite]"
          viewBox="0 0 2880 80"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,55 C240,20 480,70 720,45 C960,20 1200,70 1440,45 C1680,20 1920,70 2160,45 C2400,20 2640,70 2880,45 L2880,80 L0,80 Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
