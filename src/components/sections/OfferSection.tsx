import React from 'react';

const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK ?? '';

const OfferSection: React.FC = () => (
  <section id="offer" className="py-12 px-6 max-w-6xl mx-auto">
    <div className="rounded-3xl border border-yellow-700 bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8 md:p-10 shadow-2xl">
      <div className="max-w-4xl mx-auto text-center">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-yellow-400">
          Tricentric Decision Map
        </p>
        <h2 className="text-3xl md:text-5xl font-black text-white mb-5">
          ¿Tienes una decisión difícil?
        </h2>
        <p className="text-lg md:text-xl leading-relaxed text-gray-300 mb-8">
          Ordena lo que tu <strong className="text-blue-300">cabeza</strong> piensa,
          lo que tu <strong className="text-red-300">corazón</strong> quiere y lo que tu
          <strong className="text-green-300"> cuerpo</strong> puede sostener.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-8">
          <div className="rounded-2xl border border-blue-900 bg-blue-950/20 p-5">
            <p className="font-bold text-blue-300 mb-2">01 · MAP</p>
            <p className="text-sm text-gray-300">
              Diagnóstico guiado para identificar el centro que más está perdiendo margen.
            </p>
          </div>
          <div className="rounded-2xl border border-red-900 bg-red-950/20 p-5">
            <p className="font-bold text-red-300 mb-2">02 · UNDERSTAND</p>
            <p className="text-sm text-gray-300">
              Haz visible el sacrificio, la tensión y el coste de ignorar los otros centros.
            </p>
          </div>
          <div className="rounded-2xl border border-green-900 bg-green-950/20 p-5">
            <p className="font-bold text-green-300 mb-2">03 · ACT</p>
            <p className="text-sm text-gray-300">
              Cierra con una síntesis propia y una siguiente acción concreta para probar.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#exam"
            className="w-full sm:w-auto rounded-xl bg-yellow-500 px-8 py-4 text-center font-black text-black transition hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            COMENZAR EL MAPA
          </a>
          {STRIPE_PAYMENT_LINK ? (
            <a
              href={STRIPE_PAYMENT_LINK}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto rounded-xl border border-yellow-600 px-8 py-4 text-center font-black text-yellow-300 transition hover:bg-yellow-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
            >
              COMPRAR LA VERSIÓN DIGITAL
            </a>
          ) : null}
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Herramienta de reflexión y toma de decisiones. No es un diagnóstico médico o de salud mental.
        </p>
      </div>
    </div>
  </section>
);

export default OfferSection;
