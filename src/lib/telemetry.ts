interface TricentricTelemetryPayload {
  event: 'ACT_SCORE_CALCULATED' | 'EVALUATION_COMPLETED';
  actScore: number;
  intensities: {
    head: number;
    heart: number;
    body: number;
  };
  timestamp: string;
}

export function dispatchMatrixTelemetry(payload: Omit<TricentricTelemetryPayload, 'timestamp'>) {
  const fullPayload: TricentricTelemetryPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  // 1. Enviar evento a la ventana padre si está embebido en la Matriz
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: 'CHALAMANDRA_TELEMETRY', data: fullPayload }, 'https://chalamandramagistral.com');
    } catch (e) {
      console.warn('No se pudo despachar telemetría a la ventana padre:', e);
    }
  }

  // 2. Persistir localmente en sessionStorage para sincronización de sesión cruzada
  try {
    sessionStorage.setItem('tricentric_last_telemetry', JSON.stringify(fullPayload));
  } catch (e) {
    // Fallback silencioso si sessionStorage está restringido
  }
}
