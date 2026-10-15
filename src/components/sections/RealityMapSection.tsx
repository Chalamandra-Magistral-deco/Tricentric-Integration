import React from 'react';

const RealityMapSection: React.FC = () => (
  <section className="py-12 px-6 max-w-6xl mx-auto">
    <div className="bg-gray-800 rounded-2xl p-8 border border-yellow-700">
      <h2 className="text-2xl font-bold text-amber-200 mb-2">🗺️ Perspectivas del mapa</h2>
      <p className="mb-6 text-sm leading-relaxed text-gray-300">
        Son preguntas para ordenar una decisión, no reglas universales ni instrucciones clínicas.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-blue-900 bg-blue-950/20 p-5">
          <h3 className="mb-2 font-bold text-blue-200">🧠 Cabeza · comprender</h3>
          <p className="text-sm leading-relaxed text-gray-200">
            ¿Qué hechos conoces, qué supones y qué evidencia o alternativa falta revisar?
          </p>
        </article>
        <article className="rounded-xl border border-rose-900 bg-rose-950/20 p-5">
          <h3 className="mb-2 font-bold text-rose-200">💛 Corazón · reconocer</h3>
          <p className="text-sm leading-relaxed text-gray-200">
            ¿Qué emociones, necesidades y valores tuyos están presentes o en conflicto?
          </p>
        </article>
        <article className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-5">
          <h3 className="mb-2 font-bold text-emerald-200">🌿 Cuerpo · observar</h3>
          <p className="text-sm leading-relaxed text-gray-200">
            ¿Qué sensaciones notas, si deseas registrarlas, y en qué contexto aparecen?
          </p>
        </article>
      </div>
    </div>
  </section>
);

export default RealityMapSection;
