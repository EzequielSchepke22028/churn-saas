import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { getMapeo, updateMapeo, getFactorConversion, updateFactorConversion } from '../../services/configuracion'

export default function Configuracion() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  // Estado del mapeo de columnas
  const [mapeo, setMapeo] = useState([])
  // Estado del factor de conversión
  const [factor, setFactor] = useState(1.0)
  
  // Estados de carga y mensajes
  const [loading, setLoading] = useState(true)
  const [savingMapeo, setSavingMapeo] = useState(false)
  const [savingFactor, setSavingFactor] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Rol del usuario: owner, admin, colaborador
  const userRole = user?.role || 'colaborador'
  const isReadOnly = userRole === 'colaborador'

  // Columnas obligatorias del pipeline por defecto
  const COLUMNAS_OBLIGATORIAS = [
    'gender', 'SeniorCitizen', 'Partner', 'Dependents', 'tenure', 
    'PhoneService', 'MultipleLines', 'InternetService', 'OnlineSecurity', 
    'OnlineBackup', 'DeviceProtection', 'TechSupport', 'StreamingTV', 
    'StreamingMovies', 'Contract', 'PaperlessBilling', 'PaymentMethod', 
    'MonthlyCharges', 'TotalCharges'
  ]

  useEffect(() => {
    cargarConfiguracion()
  }, [])

  const cargarConfiguracion = async () => {
    setLoading(true)
    setError(null)
    try {
      const [mapeoData, factorData] = await Promise.all([
        getMapeo(),
        getFactorConversion()
      ])

      // Si el tenant no tiene mapeo configurado en la DB, lo inicializamos con las 19 columnas obligatorias
      let mapeoCompleto = [...mapeoData]
      if (mapeoCompleto.length === 0) {
        mapeoCompleto = COLUMNAS_OBLIGATORIAS.map(col => ({
          columna_pipeline: col,
          columna_origen: '',
          mapeo_valores: null
        }))
      } else {
        // Aseguramos que todas las columnas obligatorias estén presentes
        COLUMNAS_OBLIGATORIAS.forEach(col => {
          if (!mapeoCompleto.find(m => m.columna_pipeline === col)) {
            mapeoCompleto.push({
              columna_pipeline: col,
              columna_origen: '',
              mapeo_valores: null
            })
          }
        })
      }

      setMapeo(mapeoCompleto.sort((a, b) => a.columna_pipeline.localeCompare(b.columna_pipeline)))
      
      // Manejar respuesta del factor según el formato del objeto devuelto
      if (factorData && typeof factorData === 'object') {
        setFactor(factorData.factor_conversion ?? factorData.factor ?? 1.0)
      } else {
        setFactor(typeof factorData === 'number' ? factorData : 1.0)
      }

    } catch (err) {
      console.error('Error al cargar configuración:', err)
      setError(err.response?.data?.detail || 'No se pudo conectar con el servidor para obtener la configuración.')
    } finally {
      setLoading(false)
    }
  }

  // Modificar un valor en el array de mapeo local
  const handleMapeonChange = (columnaPipeline, campo, valor) => {
    setMapeo(prev => 
      prev.map(item => {
        if (item.columna_pipeline === columnaPipeline) {
          return { ...item, [campo]: valor }
        }
        return item
      })
    )
  }

  // Modificar el mapeo de valores JSON locales (por ejemplo, para categóricos)
  const handleMapeoValoresChange = (columnaPipeline, stringValor) => {
    setMapeo(prev => 
      prev.map(item => {
        if (item.columna_pipeline === columnaPipeline) {
          return { ...item, _raw_mapeo_valores: stringValor }
        }
        return item
      })
    )
  }

  // Guardar el mapeo de columnas completo en la DB
  const handleGuardarMapeo = async (e) => {
    e.preventDefault()
    if (isReadOnly) return
    setSavingMapeo(true)
    setError(null)
    setSuccessMsg(null)

    // Formatear mapeos y parsear JSONs temporales de mapeo_valores
    const mapeoPayload = []
    let jsonError = false

    for (const item of mapeo) {
      let mapeoValoresParsed = item.mapeo_valores

      // Si el usuario ingresó o modificó un string en el editor de JSON local
      if (item._raw_mapeo_valores !== undefined) {
        const trimmed = item._raw_mapeo_valores.trim()
        if (trimmed === '') {
          mapeoValoresParsed = null
        } else {
          try {
            mapeoValoresParsed = JSON.parse(trimmed)
          } catch (err) {
            setError(`Error de sintaxis JSON en la columna '${item.columna_pipeline}': Asegúrate de usar un formato válido como {"Si": "Yes", "No": "No"}`)
            jsonError = true
            break
          }
        }
      }

      mapeoPayload.push({
        columna_pipeline: item.columna_pipeline,
        columna_origen: item.columna_origen.trim(),
        mapeo_valores: mapeoValoresParsed
      })
    }

    if (jsonError) {
      setSavingMapeo(false)
      return
    }

    try {
      await updateMapeo(mapeoPayload)
      setSuccessMsg('Mapeo de columnas guardado de forma exitosa.')
      cargarConfiguracion() // Recargar para sincronizar estados locales
    } catch (err) {
      console.error('Error al guardar mapeo:', err)
      setError(err.response?.data?.detail || 'No se pudo guardar el mapeo de columnas. Verifica que los datos sean correctos.')
    } finally {
      setSavingMapeo(false)
    }
  }

  // Guardar el factor de conversión
  const handleGuardarFactor = async (e) => {
    e.preventDefault()
    if (isReadOnly) return
    setSavingFactor(true)
    setError(null)
    setSuccessMsg(null)

    if (isNaN(factor) || parseFloat(factor) <= 0) {
      setError('El factor de conversión debe ser un número decimal mayor a cero.')
      setSavingFactor(false)
      return
    }

    try {
      await updateFactorConversion(factor)
      setSuccessMsg('Factor de conversión monetario guardado de forma exitosa.')
      cargarConfiguracion()
    } catch (err) {
      console.error('Error al guardar factor:', err)
      setError(err.response?.data?.detail || 'No se pudo actualizar el factor de conversión en el backend.')
    } finally {
      setSavingFactor(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas p-8 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-ink-muted font-mono">Cargando configuración de producción...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas p-8 select-none animate-fade-in">
      {/* Header de la sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            Configuración del Workspace
          </h1>
          <p className="text-sm text-ink-muted">
            Administra el mapeo de columnas de tu CSV de clientes y el factor de escala monetaria.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isReadOnly ? (
            <span className="badge badge-neutral bg-zinc-200 text-zinc-700 py-1 px-3">
              Modo Sólo Lectura (Colaborador)
            </span>
          ) : (
            <span className="badge badge-success py-1 px-3">
              Editor de Configuración (Owner/Admin)
            </span>
          )}
          <button onClick={() => navigate('/dashboard')} className="btn-secondary py-1.5 px-3">
            Volver al Dashboard
          </button>
        </div>
      </div>

      {/* Alertas globales de error y éxito */}
      {error && (
        <div className="p-4 bg-danger/5 border border-danger/15 rounded-md mb-6 animate-slide-up">
          <p className="error-text m-0 text-sm font-medium">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-success/5 border border-success/15 rounded-md mb-6 animate-slide-up">
          <p className="text-success m-0 text-sm font-medium">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL IZQUIERDO: Factor de conversión monetario */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card bg-surface border border-border shadow-card p-6">
            <h2 className="text-lg font-medium text-ink mb-2">Escala Monetaria</h2>
            <p className="text-xs text-ink-muted mb-4">
              Configura el valor divisor para convertir los montos de tu moneda local (como Pesos Argentinos) a la escala de entrenamiento del pipeline del modelo (USD).
            </p>

            <form onSubmit={handleGuardarFactor} className="space-y-4">
              <div>
                <label className="label" htmlFor="factor-input">
                  Factor de Conversión
                </label>
                <input
                  id="factor-input"
                  type="number"
                  step="0.0001"
                  className="input font-mono tabular-nums"
                  placeholder="ej: 100.0"
                  value={factor}
                  onChange={(e) => setFactor(e.target.value)}
                  disabled={isReadOnly || savingFactor}
                  required
                />
                <p className="help-text">
                  Las variables <code className="text-accent font-semibold">MonthlyCharges</code> y <code className="text-accent font-semibold">TotalCharges</code> se dividirán automáticamente por este valor antes de ser analizadas por el pipeline.
                </p>
              </div>

              <div className="p-4 bg-accent-subtle/40 rounded-md border border-accent-border/40 text-xs text-ink-muted space-y-2">
                <span className="font-semibold text-accent-active block">💡 Lección de Datos</span>
                <p className="m-0 leading-relaxed">
                  Si tus cuotas mensuales promedian <span className="font-mono">$8,500 ARS</span> y usas un factor de <span className="font-mono">100</span>, el modelo recibirá <span className="font-mono">85.0</span>, previniendo saturaciones en el StandardScaler y métricas erróneas de 0.0000.
                </p>
              </div>

              {!isReadOnly && (
                <button
                  type="submit"
                  className="btn-accent w-full py-2 transition-shadow"
                  disabled={savingFactor}
                >
                  {savingFactor ? 'Guardando factor...' : 'Actualizar Factor'}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* PANEL DERECHO: Tabla de Mapeo de Columnas */}
        <div className="lg:col-span-8">
          <div className="card bg-surface border border-border shadow-card">
            <div className="card-header border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-ink">Mapeo de Atributos</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Establece la equivalencia exacta entre las columnas de tus CSVs y los inputs esperados por el pipeline.
                </p>
              </div>
              {!isReadOnly && (
                <button
                  onClick={handleGuardarMapeo}
                  className="btn-primary py-1.5 px-4"
                  disabled={savingMapeo}
                >
                  {savingMapeo ? 'Guardando mapeo...' : 'Guardar Mapeo'}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-canvas border-b border-border font-medium text-ink-muted text-xs uppercase tracking-wider">
                    <th className="px-6 py-3.5">Atributo del Modelo</th>
                    <th className="px-6 py-3.5">Columna en tu CSV</th>
                    <th className="px-6 py-3.5">Traducción de Categorías (Mapeo JSON)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {mapeo.map((item) => (
                    <tr key={item.columna_pipeline} className="hover:bg-canvas/40 transition-colors">
                      {/* Atributo del Modelo */}
                      <td className="px-6 py-4 font-mono font-medium text-accent">
                        {item.columna_pipeline}
                      </td>
                      {/* Columna en tu CSV (Editable) */}
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          className="input font-mono py-1 px-2 text-xs"
                          placeholder={`ej: ${item.columna_pipeline}`}
                          value={item.columna_origen}
                          onChange={(e) => handleMapeonChange(item.columna_pipeline, 'columna_origen', e.target.value)}
                          disabled={isReadOnly || savingMapeo}
                        />
                      </td>
                      {/* Traducción de Categorías */}
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          className="input font-mono py-1 px-2 text-xs text-ink-muted placeholder:text-ink-subtle"
                          placeholder='ej: {"M": "Male", "F": "Female"}'
                          value={
                            item._raw_mapeo_valores !== undefined 
                              ? item._raw_mapeo_valores 
                              : (item.mapeo_valores ? JSON.stringify(item.mapeo_valores) : '')
                          }
                          onChange={(e) => handleMapeoValoresChange(item.columna_pipeline, e.target.value)}
                          disabled={isReadOnly || savingMapeo}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card-body bg-canvas/30 border-t border-border flex items-center justify-between py-4">
              <span className="text-xs text-ink-muted font-mono">
                Total: 19 columnas obligatorias mapeadas de forma segura.
              </span>
              {!isReadOnly && (
                <button
                  onClick={handleGuardarMapeo}
                  className="btn-accent py-1.5 px-6"
                  disabled={savingMapeo}
                >
                  {savingMapeo ? 'Guardando todo...' : 'Aplicar Todos los Cambios'}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
