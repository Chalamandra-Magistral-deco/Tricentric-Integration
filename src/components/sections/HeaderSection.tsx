import React from 'react';

interface HeaderSectionProps {
  isAuthenticated?: boolean;
}

const HeaderSection: React.FC<HeaderSectionProps> = ({ isAuthenticated = false }) => {
  return (
    <header className="text-center py-12 bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <h1 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-gray-400 via-red-400 to-gray-600 bg-clip-text text-transparent">
        SRAP · REALIDADES CRUDAS
      </h1>
      <p className="text-xl md:text-2xl mb-8 font-semibold text-gray-400 max-w-3xl mx-auto px-4">
        Ordena una decisión difícil escuchando lo que piensas, sientes y observas en tu cuerpo.
      </p>

      <nav aria-label="Atajos" className="flex items-center justify-center gap-3 flex-wrap px-4">
        <a href="#exam" className="btn-quick-access bg-red-700 hover:bg-red-800">
          Abrir mapa
        </a>
        {isAuthenticated && (
          <a href="#dashboard" className="btn-quick-access bg-yellow-600 hover:bg-yellow-700 text-black">
            Ver mi historial
          </a>
        )}
      </nav>
    </header>
  );
};

export default HeaderSection;
