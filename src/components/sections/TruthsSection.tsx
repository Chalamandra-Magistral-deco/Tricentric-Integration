import React from 'react';

const TruthsSection: React.FC = () => {
  return (
    <section className="py-12 px-6 max-w-6xl mx-auto">
      <div className="hard-truth rounded-2xl p-8 mb-12">
        <h2 className="text-3xl font-bold text-amber-200 mb-6">Tres perspectivas para explorar</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="reality-card body-card rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🦶</div>
              <h3 className="text-xl font-bold text-green-300">Cuerpo · observar</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Registra las sensaciones que notes y el contexto en que aparecen. No necesitas
              interpretarlas ni convertirlas en una conclusión sobre tu salud.
            </p>
            <div className="mt-4 p-3 bg-green-900 bg-opacity-20 rounded-lg">
              <p className="text-green-300 text-xs italic">
                Una observación puede quedarse simplemente como observación.
              </p>
            </div>
          </div>

          <div className="reality-card heart-card rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">💔</div>
              <h3 className="text-xl font-bold text-rose-300">Corazón · reconocer</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              Nombra emociones, necesidades o valores con tus propias palabras. Puedes considerar:
            </p>
            <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
              <li>Qué te importa en esta situación.</li>
              <li>Qué necesidades entran en tensión.</li>
              <li>Qué interpretación quieres revisar.</li>
            </ul>
          </div>

          <div className="reality-card head-card rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🧊</div>
              <h3 className="text-xl font-bold text-blue-300">Cabeza · contrastar</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Separa los hechos de las hipótesis, explora alternativas y anota qué consecuencias
              o supuestos conviene comprobar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TruthsSection;
