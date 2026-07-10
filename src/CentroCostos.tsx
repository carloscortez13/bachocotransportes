import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { descargarCSV } from "./exportUtils";

// Reutiliza el mismo catálogo fijo de Centros de Costos que ya tienes en App.tsx.
// Si quieres, luego lo movemos a un archivo compartido (ej. constantes.ts) para no
// tenerlo duplicado en dos archivos.
type Props = {
  onVolver: () => void;
};

interface FilaCentro {
  centro: string;
  cargas: number;
  ok: number;
  abajo: number;
  arriba: number;
  pctCumplimiento: number;
  dineroEnRiesgo: number;
  costoTotal: number;
  sumaRecorrido: number;
  sumaLitros: number;
  sumaLitrosPorEstandar: number;
}

function CentroCostos({ onVolver }: Props) {
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = hoy.toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [filtroProducto, setFiltroProducto] = useState(""); // DIESEL / MAGNA / "" (todos)
  const [filtroEstados, setFiltroEstados] = useState<string[]>([]);
  const [estadoDropdownOpen, setEstadoDropdownOpen] = useState(false);
  const [orden, setOrden] = useState<"riesgo" | "cumplimiento">("riesgo");

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin, filtroProducto, filtroEstados]);

  const cargarDatos = async () => {
    setCargando(true);
    const PAGE_SIZE = 1000;
    let todasLasFilas: any[] = [];
    let desde = 0;

    while (true) {
      let query = supabase
        .from("vista_rendimiento")
        .select("centro_costos, producto, litros, recorrido, rendimiento_estandar, costo_litro, costo_total, cumplimiento, estado_transaccion");

      if (fechaInicio) query = query.gte("fecha", fechaInicio);
      if (fechaFin) query = query.lte("fecha", fechaFin);
      if (filtroProducto) query = query.eq("producto", filtroProducto);
      if (filtroEstados.length > 0) query = query.in("estado_transaccion", filtroEstados);

      query = query.range(desde, desde + PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) {
        console.error(error);
        break;
      }
      if (!data || data.length === 0) break;

      todasLasFilas = todasLasFilas.concat(data);
      if (data.length < PAGE_SIZE) break;
      desde += PAGE_SIZE;
    }

    setDatos(todasLasFilas);
    setCargando(false);
  };

  const estadosDisponibles = [...new Set(datos.map(r => r.estado_transaccion).filter(Boolean))];

  const toggleEstado = (estado: string) => {
    setFiltroEstados(prev =>
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    );
  };

  // --- Agregación por Centro de Costos ---
  const resumenPorCentro: FilaCentro[] = (() => {
    const mapa: Record<string, FilaCentro> = {};

    for (const row of datos) {
      const centro = row.centro_costos || "Sin Centro";
      if (!mapa[centro]) {
        mapa[centro] = {
          centro,
          cargas: 0,
          ok: 0,
          abajo: 0,
          arriba: 0,
          pctCumplimiento: 0,
          dineroEnRiesgo: 0,
          costoTotal: 0,
          sumaRecorrido: 0,
          sumaLitros: 0,
          sumaLitrosPorEstandar: 0
        };
      }

      const fila = mapa[centro];
      fila.cargas += 1;

      const litros = parseFloat(row.litros) || 0;
      const recorrido = parseFloat(row.recorrido) || 0;
      const estandar = parseFloat(row.rendimiento_estandar) || 0;
      const costoLitro = parseFloat(row.costo_litro) || 0;
      const costoTotalFila = parseFloat(row.costo_total) || 0;

      fila.costoTotal += costoTotalFila;
      fila.sumaRecorrido += recorrido;
      fila.sumaLitros += litros;
      if (estandar > 0) fila.sumaLitrosPorEstandar += litros * estandar;

      if (row.cumplimiento === "OK") {
        fila.ok += 1;
      } else if (row.cumplimiento === "POR ABAJO") {
        fila.abajo += 1;
        // $ en riesgo por bajo rendimiento (SOLO para POR ABAJO)
        if (estandar > 0) {
          const litrosQueDebioUsar = recorrido / estandar;
          const litrosDeMas = litros - litrosQueDebioUsar;
          if (litrosDeMas > 0) {
            fila.dineroEnRiesgo += litrosDeMas * costoLitro;
          }
        }
      } else if (row.cumplimiento === "POR ARRIBA") {
        fila.arriba += 1;
      }
    }

    const filas = Object.values(mapa).map(f => ({
      ...f,
      pctCumplimiento: f.cargas > 0 ? (f.ok / f.cargas) * 100 : 0
    }));

    filas.sort((a, b) =>
      orden === "riesgo"
        ? b.dineroEnRiesgo - a.dineroEnRiesgo
        : a.pctCumplimiento - b.pctCumplimiento
    );

    return filas;
  })();

  const totalCargas = datos.length;
  const totalRiesgo = resumenPorCentro.reduce((a, f) => a + f.dineroEnRiesgo, 0);
  const costoTotalGlobal = resumenPorCentro.reduce((a, f) => a + f.costoTotal, 0);
  const pctGlobalCumplimiento = totalCargas > 0
    ? (datos.filter(r => r.cumplimiento === "OK").length / totalCargas) * 100
    : 0;

  const inputStyle = {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "white",
    padding: "8px 12px",
    fontSize: "14px",
    width: "100%"
  };

  const fmtDinero = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#1e293b", padding: "16px 32px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "2px solid #c0392b" }}>
        <button onClick={onVolver} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}>← Volver</button>
        <span style={{ fontSize: "20px" }}>🏢</span>
        <h1 style={{ margin: 0, fontSize: "20px", color: "#f1f5f9" }}>Centro de Costos</h1>
      </div>

      {/* Filtros */}
      <div style={{ padding: "24px 32px", backgroundColor: "#1e293b", borderBottom: "1px solid #334155" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", alignItems: "end" }}>
          <div>
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Fecha Inicio</p>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Fecha Fin</p>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Producto</p>
            <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              <option value="DIESEL">DIESEL</option>
              <option value="MAGNA">MAGNA</option>
            </select>
          </div>
          <div style={{ position: "relative" }}>
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Estado Transacción</p>
            <button
              onClick={() => setEstadoDropdownOpen(!estadoDropdownOpen)}
              style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {filtroEstados.length === 0 ? "Todos" : filtroEstados.length === 1 ? filtroEstados[0] : "Varios"}
              </span>
              <span style={{ fontSize: "10px", marginLeft: "8px" }}>▼</span>
            </button>
            {estadoDropdownOpen && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px",
                backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px",
                padding: "8px", zIndex: 10, maxHeight: "220px", overflowY: "auto"
              }}>
                {estadosDisponibles.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "12px", margin: "4px" }}>Sin datos cargados</p>
                ) : (
                  estadosDisponibles.map(estado => (
                    <label key={estado} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "13px", color: "#f1f5f9" }}>
                      <input type="checkbox" checked={filtroEstados.includes(estado)} onChange={() => toggleEstado(estado)} />
                      {estado}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <div>
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Ordenar por</p>
            <select value={orden} onChange={e => setOrden(e.target.value as "riesgo" | "cumplimiento")} style={inputStyle}>
              <option value="riesgo">Mayor $ en riesgo</option>
              <option value="cumplimiento">Menor % cumplimiento</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPIs globales */}
      <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #10b981" }}>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>% Cumplimiento Global</p>
          <h2 style={{ color: "#10b981", margin: "8px 0 0", fontSize: "32px" }}>{pctGlobalCumplimiento.toFixed(1)}%</h2>
        </div>
        <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #c0392b" }}>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>$ Total en Riesgo</p>
          <h2 style={{ color: "#c0392b", margin: "8px 0 0", fontSize: "28px" }}>{fmtDinero(totalRiesgo)}</h2>
        </div>
        <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #f59e0b" }}>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Costo Total</p>
          <h2 style={{ color: "#f59e0b", margin: "8px 0 0", fontSize: "28px" }}>{fmtDinero(costoTotalGlobal)}</h2>
        </div>
        <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #8b5cf6" }}>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Total Registros</p>
          <h2 style={{ color: "#8b5cf6", margin: "8px 0 0", fontSize: "32px" }}>{totalCargas}</h2>
        </div>
      </div>

      {/* Tabla resumen por centro */}
      <div style={{ padding: "0 32px 32px" }}>
        {cargando ? (
          <p style={{ color: "#94a3b8" }}>Cargando datos...</p>
        ) : (
          <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "#f1f5f9", marginTop: 0 }}>Resumen por Centro de Costos ({resumenPorCentro.length} centros)</h3>
              <button
                onClick={() => descargarCSV(
                  resumenPorCentro.map(f => ({
                    Centro_de_Costos: f.centro,
                    Rend_Estandar_Prom: (f.sumaLitros > 0 ? f.sumaLitrosPorEstandar / f.sumaLitros : 0).toFixed(2),
                    Rend_Real_Prom: (f.sumaLitros > 0 ? f.sumaRecorrido / f.sumaLitros : 0).toFixed(2),
                    Cargas: f.cargas,
                    OK: f.ok,
                    Por_Abajo: f.abajo,
                    Por_Arriba: f.arriba,
                    Pct_Cumplimiento: f.pctCumplimiento.toFixed(1) + "%",
                    Dinero_en_Riesgo: f.dineroEnRiesgo.toFixed(2),
                    Costo_Total: f.costoTotal.toFixed(2)
                  })),
                  "centro_de_costos"
                )}
                style={{ backgroundColor: "#10b981", border: "none", color: "white", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
              >
                📥 Descargar Excel
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Centro de Costos</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Rend. Estándar Prom.</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Rend. Real Prom.</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Cargas</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>OK</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Por Abajo</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Por Arriba</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>% Cumplimiento</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>$ en Riesgo</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Costo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenPorCentro.map((fila, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                      <td style={{ padding: "12px", color: "#f1f5f9" }}>{fila.centro}</td>
                      <td style={{ padding: "12px", color: "#94a3b8", textAlign: "right" }}>
                        {(fila.sumaLitros > 0 ? fila.sumaLitrosPorEstandar / fila.sumaLitros : 0).toFixed(2)} km/L
                      </td>
                      <td style={{ padding: "12px", color: "#f1f5f9", textAlign: "right" }}>
                        {(fila.sumaLitros > 0 ? fila.sumaRecorrido / fila.sumaLitros : 0).toFixed(2)} km/L
                      </td>
                      <td style={{ padding: "12px", color: "#f1f5f9", textAlign: "right" }}>{fila.cargas}</td>
                      <td style={{ padding: "12px", color: "#10b981", textAlign: "right" }}>{fila.ok}</td>
                      <td style={{ padding: "12px", color: "#c0392b", textAlign: "right" }}>{fila.abajo}</td>
                      <td style={{ padding: "12px", color: "#f59e0b", textAlign: "right" }}>{fila.arriba}</td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <span style={{
                          color: fila.pctCumplimiento >= 80 ? "#10b981" : fila.pctCumplimiento >= 60 ? "#f59e0b" : "#c0392b"
                        }}>
                          {fila.pctCumplimiento.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: "12px", color: fila.dineroEnRiesgo > 0 ? "#c0392b" : "#94a3b8", textAlign: "right" }}>
                        {fmtDinero(fila.dineroEnRiesgo)}
                      </td>
                      <td style={{ padding: "12px", color: "#f1f5f9", textAlign: "right" }}>{fmtDinero(fila.costoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CentroCostos;
