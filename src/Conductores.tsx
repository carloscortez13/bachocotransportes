import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { descargarCSV } from "./exportUtils";

type Props = {
  onVolver: () => void;
};

interface FilaConductor {
  conductor: string;
  cargas: number;
  ok: number;
  abajo: number;
  arriba: number;
  pctCumplimiento: number;
  dineroEnRiesgo: number;
  costoTotal: number;
  recorridoTotal: number;
  litrosTotal: number;
  sumaLitrosPorEstandar: number;
  unidades: Set<string>;
  centrosCostos: Set<string>;
  proveedores: Set<string>;
  productos: Set<string>;
  cargasDetalle: any[];
}

function Conductores({ onVolver }: Props) {
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = hoy.toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [busquedaConductor, setBusquedaConductor] = useState("");
  const [filtroProducto, setFiltroProducto] = useState("");
  const [filtroEstados, setFiltroEstados] = useState<string[]>([]);
  const [estadoDropdownOpen, setEstadoDropdownOpen] = useState(false);
  const [orden, setOrden] = useState<"riesgo" | "cumplimiento" | "cargas">("riesgo");
  const [conductorExpandido, setConductorExpandido] = useState<string | null>(null);

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
        .select("conductor, id_vehiculo, centro_costos, producto, proveedor, fecha, litros, recorrido, rendimiento_estandar, rendimiento_real, costo_litro, costo_total, cumplimiento, estado_transaccion");

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

  // --- Agregación por Conductor ---
  const resumenPorConductor: FilaConductor[] = (() => {
    const mapa: Record<string, FilaConductor> = {};

    for (const row of datos) {
      const conductor = row.conductor || "Sin Conductor";
      if (!mapa[conductor]) {
        mapa[conductor] = {
          conductor,
          cargas: 0,
          ok: 0,
          abajo: 0,
          arriba: 0,
          pctCumplimiento: 0,
          dineroEnRiesgo: 0,
          costoTotal: 0,
          recorridoTotal: 0,
          litrosTotal: 0,
          sumaLitrosPorEstandar: 0,
          unidades: new Set(),
          centrosCostos: new Set(),
          proveedores: new Set(),
          productos: new Set(),
          cargasDetalle: []
        };
      }

      const fila = mapa[conductor];
      fila.cargas += 1;
      fila.cargasDetalle.push(row);

      const litros = parseFloat(row.litros) || 0;
      const recorrido = parseFloat(row.recorrido) || 0;
      const estandar = parseFloat(row.rendimiento_estandar) || 0;
      const costoLitro = parseFloat(row.costo_litro) || 0;
      const costoTotalFila = parseFloat(row.costo_total) || 0;

      fila.costoTotal += costoTotalFila;
      fila.recorridoTotal += recorrido;
      fila.litrosTotal += litros;
      if (estandar > 0) fila.sumaLitrosPorEstandar += litros * estandar;

      if (row.id_vehiculo) fila.unidades.add(row.id_vehiculo);
      if (row.centro_costos) fila.centrosCostos.add(row.centro_costos);
      if (row.proveedor) fila.proveedores.add(row.proveedor);
      if (row.producto) fila.productos.add(row.producto);

      if (row.cumplimiento === "OK") {
        fila.ok += 1;
      } else if (row.cumplimiento === "POR ABAJO") {
        fila.abajo += 1;
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

    let filas = Object.values(mapa).map(f => ({
      ...f,
      pctCumplimiento: f.cargas > 0 ? (f.ok / f.cargas) * 100 : 0
    }));

    if (busquedaConductor.trim()) {
      const termino = busquedaConductor.toLowerCase();
      filas = filas.filter(f => f.conductor.toLowerCase().includes(termino));
    }

    filas.sort((a, b) => {
      if (orden === "riesgo") return b.dineroEnRiesgo - a.dineroEnRiesgo;
      if (orden === "cumplimiento") return a.pctCumplimiento - b.pctCumplimiento;
      return b.cargas - a.cargas;
    });

    return filas;
  })();

  const totalCargas = datos.length;
  const totalRiesgo = resumenPorConductor.reduce((a, f) => a + f.dineroEnRiesgo, 0);
  const costoTotalGlobal = resumenPorConductor.reduce((a, f) => a + f.costoTotal, 0);
  const totalConductores = resumenPorConductor.length;
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
        <span style={{ fontSize: "20px" }}>👨‍✈️</span>
        <h1 style={{ margin: 0, fontSize: "20px", color: "#f1f5f9" }}>Conductores</h1>
      </div>

      <div style={{ padding: "24px 32px", backgroundColor: "#1e293b", borderBottom: "1px solid #334155" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", alignItems: "end" }}>
          <div>
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Fecha Inicio</p>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Fecha Fin</p>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Buscar Conductor</p>
            <input type="text" placeholder="Nombre..." value={busquedaConductor} onChange={e => setBusquedaConductor(e.target.value)} style={inputStyle} />
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
            <select value={orden} onChange={e => setOrden(e.target.value as "riesgo" | "cumplimiento" | "cargas")} style={inputStyle}>
              <option value="riesgo">Mayor $ en riesgo</option>
              <option value="cumplimiento">Menor % cumplimiento</option>
              <option value="cargas">Más cargas</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
        <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #3b82f6" }}>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Total Conductores</p>
          <h2 style={{ color: "#3b82f6", margin: "8px 0 0", fontSize: "32px" }}>{totalConductores}</h2>
        </div>
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

      <div style={{ padding: "0 32px 32px" }}>
        {cargando ? (
          <p style={{ color: "#94a3b8" }}>Cargando datos...</p>
        ) : (
          <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "#f1f5f9", marginTop: 0 }}>Resumen por Conductor ({resumenPorConductor.length} conductores)</h3>
              <button
                onClick={() => descargarCSV(
                  resumenPorConductor.map(f => ({
                    Conductor: f.conductor,
                    Rend_Estandar_Prom: (f.litrosTotal > 0 ? f.sumaLitrosPorEstandar / f.litrosTotal : 0).toFixed(2),
                    Rend_Real_Prom: (f.litrosTotal > 0 ? f.recorridoTotal / f.litrosTotal : 0).toFixed(2),
                    Cargas: f.cargas,
                    OK: f.ok,
                    Por_Abajo: f.abajo,
                    Por_Arriba: f.arriba,
                    Pct_Cumplimiento: f.pctCumplimiento.toFixed(1) + "%",
                    Dinero_en_Riesgo: f.dineroEnRiesgo.toFixed(2),
                    Costo_Total: f.costoTotal.toFixed(2),
                    Recorrido_Total_km: f.recorridoTotal.toFixed(0),
                    Unidades: [...f.unidades].join(" | "),
                    Centros_de_Costos: [...f.centrosCostos].join(" | ")
                  })),
                  "conductores"
                )}
                style={{ backgroundColor: "#10b981", border: "none", color: "white", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
              >
                📥 Descargar Excel
              </button>
            </div>
            <p style={{ color: "#64748b", fontSize: "13px", marginTop: "8px", marginBottom: "16px" }}>
              Da clic en un conductor para ver detalle de unidades, centros de costos y cargas en el periodo seleccionado.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Conductor</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Rend. Estándar Prom.</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Rend. Real Prom.</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Cargas</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>OK</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Abajo</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Arriba</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>% Cumpl.</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>$ en Riesgo</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Costo Total</th>
                    <th style={{ color: "#94a3b8", textAlign: "right", padding: "12px", fontWeight: "normal" }}>Recorrido Total</th>
                    <th style={{ color: "#94a3b8", textAlign: "center", padding: "12px", fontWeight: "normal" }}># Unidades</th>
                    <th style={{ color: "#94a3b8", textAlign: "center", padding: "12px", fontWeight: "normal" }}># Centros</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenPorConductor.map((fila, i) => {
                    const expandido = conductorExpandido === fila.conductor;
                    return (
                      <>
                        <tr
                          key={i}
                          onClick={() => setConductorExpandido(expandido ? null : fila.conductor)}
                          style={{ borderBottom: "1px solid #0f172a", cursor: "pointer" }}
                        >
                          <td style={{ padding: "12px", color: "#f1f5f9" }}>
                            {expandido ? "▼" : "▶"} {fila.conductor}
                          </td>
                          <td style={{ padding: "12px", color: "#94a3b8", textAlign: "right" }}>
                            {(fila.litrosTotal > 0 ? fila.sumaLitrosPorEstandar / fila.litrosTotal : 0).toFixed(2)} km/L
                          </td>
                          <td style={{ padding: "12px", color: "#f1f5f9", textAlign: "right" }}>
                            {(fila.litrosTotal > 0 ? fila.recorridoTotal / fila.litrosTotal : 0).toFixed(2)} km/L
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
                          <td style={{ padding: "12px", color: "#94a3b8", textAlign: "right" }}>{fila.recorridoTotal.toFixed(0)} km</td>
                          <td style={{ padding: "12px", color: "#06b6d4", textAlign: "center" }}>{fila.unidades.size}</td>
                          <td style={{ padding: "12px", color: "#8b5cf6", textAlign: "center" }}>{fila.centrosCostos.size}</td>
                        </tr>
                        {expandido && (
                          <tr style={{ backgroundColor: "#0f172a" }}>
                            <td colSpan={11} style={{ padding: "16px 24px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "24px" }}>
                                <div>
                                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 8px", fontWeight: "bold" }}>
                                    Unidades manejadas ({fila.unidades.size})
                                  </p>
                                  {[...fila.unidades].map(u => (
                                    <p key={u} style={{ color: "#f1f5f9", fontSize: "13px", margin: "0 0 4px" }}>{u}</p>
                                  ))}
                                </div>
                                <div>
                                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 8px", fontWeight: "bold" }}>
                                    Centro(s) de Costos ({fila.centrosCostos.size})
                                  </p>
                                  {[...fila.centrosCostos].map(c => (
                                    <p key={c} style={{ color: "#f1f5f9", fontSize: "13px", margin: "0 0 4px" }}>{c}</p>
                                  ))}
                                </div>
                                <div>
                                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 8px", fontWeight: "bold" }}>
                                    Producto(s) usado(s)
                                  </p>
                                  {[...fila.productos].map(p => (
                                    <p key={p} style={{ color: "#f1f5f9", fontSize: "13px", margin: "0 0 4px" }}>{p}</p>
                                  ))}
                                </div>
                                <div>
                                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 8px", fontWeight: "bold" }}>
                                    Gasolinera(s) ({fila.proveedores.size})
                                  </p>
                                  {[...fila.proveedores].map(p => (
                                    <p key={p} style={{ color: "#f1f5f9", fontSize: "13px", margin: "0 0 4px" }}>{p}</p>
                                  ))}
                                </div>
                              </div>

                              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "20px 0 8px", fontWeight: "bold" }}>
                                Detalle de cargas ({fila.cargasDetalle.length})
                              </p>
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                                  <thead>
                                    <tr style={{ borderBottom: "1px solid #334155" }}>
                                      <th style={{ color: "#64748b", textAlign: "left", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Fecha</th>
                                      <th style={{ color: "#64748b", textAlign: "left", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Unidad</th>
                                      <th style={{ color: "#64748b", textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Litros</th>
                                      <th style={{ color: "#64748b", textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Recorrido</th>
                                      <th style={{ color: "#64748b", textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Rend. Real</th>
                                      <th style={{ color: "#64748b", textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Rend. Estándar</th>
                                      <th style={{ color: "#64748b", textAlign: "left", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Proveedor</th>
                                      <th style={{ color: "#64748b", textAlign: "left", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {fila.cargasDetalle
                                      .slice()
                                      .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
                                      .map((carga, j) => {
                                        const status = carga.cumplimiento || "S/D";
                                        const rendReal = parseFloat(carga.rendimiento_real) || 0;
                                        return (
                                          <tr key={j} style={{ borderBottom: "1px solid #0f172a" }}>
                                            <td style={{ padding: "8px", color: "#94a3b8", fontSize: "13px", whiteSpace: "nowrap" }}>{carga.fecha}</td>
                                            <td style={{ padding: "8px", color: "#f1f5f9", fontSize: "13px" }}>{carga.id_vehiculo}</td>
                                            <td style={{ padding: "8px", color: "#f1f5f9", fontSize: "13px", textAlign: "right" }}>{parseFloat(carga.litros || 0).toFixed(2)}</td>
                                            <td style={{ padding: "8px", color: "#f1f5f9", fontSize: "13px", textAlign: "right" }}>{parseFloat(carga.recorrido || 0).toFixed(0)} km</td>
                                            <td style={{ padding: "8px", color: "#f1f5f9", fontSize: "13px", textAlign: "right" }}>{rendReal.toFixed(2)} km/L</td>
                                            <td style={{ padding: "8px", color: "#94a3b8", fontSize: "13px", textAlign: "right" }}>{parseFloat(carga.rendimiento_estandar || 0).toFixed(2)} km/L</td>
                                            <td style={{ padding: "8px", color: "#94a3b8", fontSize: "13px" }}>{carga.proveedor}</td>
                                            <td style={{ padding: "8px" }}>
                                              <span style={{
                                                backgroundColor: status === "OK" ? "#10b98122" : status === "POR ABAJO" ? "#c0392b22" : status === "POR ARRIBA" ? "#f59e0b22" : "#33415522",
                                                color: status === "OK" ? "#10b981" : status === "POR ABAJO" ? "#c0392b" : status === "POR ARRIBA" ? "#f59e0b" : "#64748b",
                                                padding: "3px 10px",
                                                borderRadius: "20px",
                                                fontSize: "11px"
                                              }}>{status}</span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Conductores;
