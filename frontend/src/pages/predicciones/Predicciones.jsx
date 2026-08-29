import { useState, useCallback } from 'react'
import { subirCSVPredicciones } from '../../services/predicciones'

const UMBRAL_RIESGO_ALTO = 0.8

function formatearProbabilidad(valor) {
  return valor.toFixed(4)
}

function nivelRiesgo(valor) {
  if (valor > UMBRAL_RIESGO_ALTO) return 'alto'
  if (valor > 0.4) return 'medio'
  return 'bajo'
}

const ESTILOS_BADGE = {
  alto: 'badge-danger',
  medio: 'badge-warning',
  bajo: 'badge-success',
}

const ETIQUETAS_RIESGO = {
  alto: 'Riesgo alto',
  medio: 'Riesgo medio',
  bajo: 'Riesgo bajo',
}

export default function Predicciones() {
  const [archivo, setArchivo] = useState(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  const seleccionarArchivo = (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('El archivo debe ser un .csv')
      return
    }
    setError(null)
    setResultado(null)
    setArchivo(file)
  }

  const handleDrop = useCallback((event) => {
    event.preventDefault()
    setArrastrando(false)
    const file = event.dataTransfer.files?.[0]
    seleccionarArchivo(file)
  }, [])

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    setArrastrando(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setArrastrando(false)
  }, [])

  const handleInputChange = (event) => {
    seleccionarArchivo(event.target.files?.[0])
  }

  const handleAnalizar = async () => {
    if (!archivo) return

    setCargando(true)
    setError(null)

    try {
      const data = await subirCSVPredicciones(archivo)
      setResultado(data)
    } catch (err) {
      const detalle = err.response?.data?.detail
      const mensaje =
        typeof detalle === 'string'
          ? detalle
          : Array.isArray(detalle)
            ? detalle.map((d) => d.msg).join(', ')
            : 'No se pudo procesar el archivo. Verifica el formato de las columnas.'
      setError(mensaje)
    } finally {
      setCargando(false)
    }
  }

  const limpiar = () => {
    setArchivo(null)
    setResultado(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-canvas p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          Analizar clientes
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Subí un CSV con los datos de tus clientes para calcular su probabilidad de abandono.
        </p>

        {/* Zona de drag & drop */}
        {!resultado && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`mt-8 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors duration-150 ${
              arrastrando
                ? 'border-accent bg-accent-subtle'
                : 'border-border hover:border-border-strong'
            }`}
          >
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              onChange={handleInputChange}
              className="hidden"
              disabled={cargando}
            />

            {archivo ? (
              <div className="animate-fade-in">
                <p className="text-sm font-medium text-ink">{archivo.name}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {(archivo.size / 1024).toFixed(1)} KB
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={handleAnalizar}
                    disabled={cargando}
                    className="btn-accent"
                  >
                    {cargando ? 'Analizando…' : 'Analizar clientes'}
                  </button>
                  <button
                    onClick={limpiar}
                    disabled={cargando}
                    className="btn-ghost"
                  >
                    Cambiar archivo
                  </button>
                </div>

                {cargando && (
                  <div className="mt-5 mx-auto max-w-xs h-1 rounded-full bg-border overflow-hidden">
                    <div className="h-full w-1/3 bg-accent rounded-full animate-[slide_1.2s_ease-in-out_infinite]" />
                  </div>
                )}
              </div>
            ) : (
              <label htmlFor="csv-input" className="cursor-pointer block">
                <p className="text-sm font-medium text-ink">
                  Arrastrá tu archivo CSV acá
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  o hacé clic para seleccionarlo
                </p>
              </label>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-danger-border bg-danger-subtle px-3 py-2.5 text-sm text-danger animate-slide-up"
          >
            {error}
          </div>
        )}

        {/* Tabla de resultados */}
        {resultado && (
          <div className="mt-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">
                {resultado.total_filas} cliente{resultado.total_filas !== 1 ? 's' : ''} analizado
                {resultado.total_filas !== 1 ? 's' : ''}
              </p>
              <button onClick={limpiar} className="btn-secondary">
                Analizar otro archivo
              </button>
            </div>

            <div className="card mt-4 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-canvas">
                    <th className="px-5 py-2.5 text-left font-medium text-ink-muted">Fila</th>
                    <th className="px-5 py-2.5 text-left font-medium text-ink-muted">Cliente</th>
                    <th className="px-5 py-2.5 text-left font-medium text-ink-muted">Probabilidad</th>
                    <th className="px-5 py-2.5 text-left font-medium text-ink-muted">Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.predicciones.map((fila) => {
                    const riesgo = nivelRiesgo(fila.churn_probability)
                    return (
                      <tr
                        key={fila.fila_indice}
                        className={`border-b border-border last:border-0 ${
                          riesgo === 'alto' ? 'border-l-2 border-l-danger' : ''
                        }`}
                      >
                        <td className="px-5 py-3 font-mono tabular-nums text-ink-muted">
                          {fila.fila_indice}
                        </td>
                        <td className="px-5 py-3 font-mono tabular-nums text-ink">
                          {fila.cliente_identificador ?? '—'}
                        </td>
                        <td className="px-5 py-3 font-mono tabular-nums text-ink font-medium">
                          {formatearProbabilidad(fila.churn_probability)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={ESTILOS_BADGE[riesgo]}>
                            {ETIQUETAS_RIESGO[riesgo]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}