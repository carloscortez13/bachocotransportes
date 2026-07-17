import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { descargarCSV } from "./exportUtils";
import { CENTROS_COSTOS, TEMA } from "./constantes";
import { calcularIncidencias, contarIncidenciasUnicas } from "./incidenciasUtils";
import type { CargaEnriquecida } from "./incidenciasUtils";
import logoBachoco from "./assets/bachoco-logo.png";

type Props = {
  onVolver: () => void;
};

interface FilaUnidad {
  idVehiculo: string;
  cargas: number;
  ok: number;
  abajo: number;
  arriba: number;
  pctCumplimiento: number;
  dineroEnRiesgo: number;
  costoTotal: number;
  incidencias: number;
  sumaRecorrido: number;
  sumaLitros: number;
  sumaLitrosPorEstandar: number;
  filas: CargaEnriquecida[];
  conductores: Set<string>;
  centrosCostos: Set<string>;
  proveedores: Set<string>;
}

function Unidades({ onVolver }: Props) {
  const [datos, setDatos] = useState<CargaEnriquecida[]>([]);
  const [cargando, setCargando] = useState(false);

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = hoy.toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [filtroCeCo, setFiltroCeCo] = useState<string[]>([]);
  const [ceCoDropdownOpen, setCeCoDropdownOpen] = useState(false);
  const [busquedaCeCo, setBusquedaCeCo] = useState("");
  const [filtroEstados, setFiltroEstados] = useState<string[]>([]);
  const [estadoDropdownOpen, setEstadoDropdownOpen] = useState(false);
  const [filtroUnidad, setFiltroUnidad] = useState("");
  const [filtroConductor, setFiltroConductor] = useState("");
  const [orden, setOrden] = useState<"cumplimiento_desc" | "cumplimiento_asc" | "incidencias">("cumplimiento_desc");
  const [unidadExpandida, setUnidadExpandida] = useState<string | null>(null);
  const idPeticionActual = useRef(0);

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin, filtroCeCo, filtroEstados, filtroUnidad, filtroConductor]);

  const cargarDatos = async () => {
    const miId = ++idPeticionActual.current;
    setCargando(true);
    const PAGE_SIZE = 1000;
    let todasLasFilas: any[] = [];
    let desde = 0;

    while (true) {
      let query = supabase
        .from("vista_rendimiento")
        .select("id_vehiculo, conductor, centro_costos, proveedor, fecha, litros, recorrido, rendimiento_estandar, rendimiento_real, costo_litro, costo_total, cumplimiento, estado_transaccion");

      if (fechaInicio) query = query.gte("fecha", fechaInicio);
      if (fechaFin) query = query.lte("fecha", fechaFin);
      if (filtroCeCo.length > 0) query = query.in("centro_costos", filtroCeCo);
      if (filtroEstados.length > 0) query = query.in("estado_transaccion", filtroEstados);
      if (filtroUnidad.trim()) query = query.ilike("id_vehiculo", `%${filtroUnidad.trim()}%`);
      if (filtroConductor.trim()) query = query.ilike("conductor", `%${filtroConductor.trim()}%`);

      query = query.range(desde, desde + PAGE_SIZE - 1);

      const { data, error } = await query;
      if (miId !== idPeticionActual.current) return;
      if (error) {
        console.error(error);
        break;
      }
      if (!data || data.length === 0) break;

      todasLasFilas = todasLasFilas.concat(data);
      if (data.length < PAGE_SIZE) break;
      desde += PAGE_SIZE;
    }

    if (miId !== idPeticionActual.current) return;
    setDatos(calcularIncidencias(todasLasFilas));
    setCargando(false);
  };

  const estadosDisponibles = [...new Set(datos.map(r => r.estado_transaccion).filter(Boolean))];
  const toggleEstado = (estado: string) => setFiltroEstados(prev => prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]);
  const toggleCeCo = (centro: string) => setFiltroCeCo(prev => prev.includes(centro) ? prev.filter(c => c !== centro) : [...prev, centro]);
  const ceCoFiltradosBusqueda = CENTROS_COSTOS.filter(c => c.toLowerCase().includes(busquedaCeCo.toLowerCase()));

  const resumenPorUnidad: FilaUnidad[] = (() => {
    const mapa: Record<string, FilaUnidad> = {};

    for (const row of datos) {
      const idVehiculo = row.id_vehiculo || "Sin Unidad";
      if (!mapa[idVehiculo]) {
        mapa[idVehiculo] = {
          idVehiculo, cargas: 0, ok: 0, abajo: 0, arriba: 0, pctCumplimiento: 0,
          dineroEnRiesgo: 0, costoTotal: 0, incidencias: 0,
          sumaRecorrido: 0, sumaLitros: 0, sumaLitrosPorEstandar: 0, filas: [],
          conductores: new Set(), centrosCostos: new Set(), proveedores: new Set()
        };
      }
      const fila = mapa[idVehiculo];
      fila.cargas += 1;
      fila.filas.push(row);
      if (row.conductor) fila.conductores.add(row.conductor);
      if (row.centro_costos) fila.centrosCostos.add(row.centro_costos);
      if (row.proveedor) fila.proveedores.add(row.proveedor);

      const litros = parseFloat(row.litros) || 0;
      const recorrido = parseFloat(row.recorrido) || 0;
      const estandar = parseFloat(row.rendimiento_estandar) || 0;
      const costoLitro = parseFloat(row.costo_litro) || 0;
      fila.costoTotal += parseFloat(row.costo_total) || 0;
      fila.sumaRecorrido += recorrido;
      fila.sumaLitros += litros;
      if (estandar > 0) fila.sumaLitrosPorEstandar += litros * estandar;

      if (row.cumplimiento === "OK") fila.ok += 1;
      else if (row.cumplimiento === "POR ABAJO") {
        fila.abajo += 1;
        if (estandar > 0) {
          const litrosDeMas = litros - (recorrido / estandar);
          if (litrosDeMas > 0) fila.dineroEnRiesgo += litrosDeMas * costoLitro;
        }
      } else if (row.cumplimiento === "POR ARRIBA") fila.arriba += 1;
    }

    let filas = Object.values(mapa).map(f => ({
      ...f,
      pctCumplimiento: f.cargas > 0 ? (f.ok / f.cargas) * 100 : 0,
      incidencias: contarIncidenciasUnicas(f.filas)
    }));

    filas.sort((a, b) => {
      if (orden === "cumplimiento_desc") return b.pctCumplimiento - a.pctCumplimiento;
      if (orden === "cumplimiento_asc") return a.pctCumplimiento - b.pctCumplimiento;
      return b.incidencias - a.incidencias;
    });

    return filas;
  })();

  const unaSolaUnidad = resumenPorUnidad.length === 1 ? resumenPorUnidad[0] : null;

  const inputStyle = {
    backgroundColor: TEMA.fondoInput, border: `1px solid ${TEMA.borde}`, borderRadius: "8px",
    color: TEMA.textoPrincipal, padding: "8px 12px", fontSize: "14px", width: "100%"
  };
  const fmtDinero = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  const rendEstandarUnica = unaSolaUnidad && unaSolaUnidad.sumaLitros > 0 ? unaSolaUnidad.sumaLitrosPorEstandar / unaSolaUnidad.sumaLitros : 0;
  const rendRealUnica = unaSolaUnidad && unaSolaUnidad.sumaLitros > 0 ? unaSolaUnidad.sumaRecorrido / unaSolaUnidad.sumaLitros : 0;

  return (
    <div style={{ backgroundColor: TEMA.fondo, minHeight: "100vh", color: TEMA.textoPrincipal, fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#ffffff", padding: "16px 32px", display: "flex", alignItems: "center", gap: "12px", borderBottom: `3px solid ${TEMA.naranja}` }}>
        <button onClick={onVolver} style={{ background: "none", border: "none", color: TEMA.textoSecundario, cursor: "pointer", fontSize: "16px" }}>← Volver</button>
        <img src={logoBachoco} alt="Bachoco" style={{ height: "28px" }} />
        <h1 style={{ margin: 0, fontSize: "20px", color: TEMA.textoPrincipal }}>Unidades</h1>
      </div>

      <div style={{ padding: "24px 32px", backgroundColor: TEMA.fondoTarjeta, borderBottom: `1px solid ${TEMA.borde}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "12px", alignItems: "end" }}>
          <div>
            <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 4px" }}>Fecha Inicio</p>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 4px" }}>Fecha Fin</p>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ position: "relative" }}>
            <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 4px" }}>CeCo</p>
            <button onClick={() => setCeCoDropdownOpen(!ceCoDropdownOpen)} style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {filtroCeCo.length === 0 ? "Todos" : filtroCeCo.length === 1 ? filtroCeCo[0] : "Varios"}
              </span>
              <span style={{ fontSize: "10px", marginLeft: "8px" }}>▼</span>
            </button>
            {ceCoDropdownOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", backgroundColor: "#fff", border: `1px solid ${TEMA.borde}`, borderRadius: "8px", padding: "8px", zIndex: 10, maxHeight: "280px", overflowY: "auto", width: "300px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <input type="text" placeholder="Buscar CeCo..." value={busquedaCeCo} onChange={e => setBusquedaCeCo(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }} />
                {ceCoFiltradosBusqueda.map(c => (
                  <label key={c} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "13px" }}>
                    <input type="checkbox" checked={filtroCeCo.includes(c)} onChange={() => toggleCeCo(c)} />
                    {c}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 4px" }}>Estado Transacción</p>
            <button onClick={() => setEstadoDropdownOpen(!estadoDropdownOpen)} style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{filtroEstados.length === 0 ? "Todos" : filtroEstados.length === 1 ? filtroEstados[0] : "Varios"}</span>
              <span style={{ fontSize: "10px", marginLeft: "8px" }}>▼</span>
            </button>
            {estadoDropdownOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", backgroundColor: "#fff", border: `1px solid ${TEMA.borde}`, borderRadius: "8px", padding: "8px", zIndex: 10, maxHeight: "220px", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                {estadosDisponibles.length === 0 ? <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "4px" }}>Sin datos</p> :
                  estadosDisponibles.map(estado => (
                    <label key={estado} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "13px" }}>
                      <input type="checkbox" checked={filtroEstados.includes(estado)} onChange={() => toggleEstado(estado)} />
                      {estado}
                    </label>
                  ))}
              </div>
            )}
          </div>
          <div>
            <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 4px" }}>Unidad</p>
            <input type="text" placeholder="Ej. T17401..." value={filtroUnidad} onChange={e => setFiltroUnidad(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 4px" }}>Conductor</p>
            <input type="text" placeholder="Nombre..." value={filtroConductor} onChange={e => setFiltroConductor(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 4px" }}>Ordenar por</p>
            <select value={orden} onChange={e => setOrden(e.target.value as any)} style={inputStyle}>
              <option value="cumplimiento_desc">Cumplimiento: mayor a menor</option>
              <option value="cumplimiento_asc">Cumplimiento: menor a mayor</option>
              <option value="incidencias">Más incidencias</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {!unaSolaUnidad ? (
          <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "24px", border: `1px solid ${TEMA.borde}`, textAlign: "center" }}>
            <p style={{ color: TEMA.textoSecundario, margin: 0 }}>
              {resumenPorUnidad.length === 0
                ? "No hay unidades con estos filtros."
                : `Hay ${resumenPorUnidad.length} unidades en este resultado — usa el filtro de "Unidad" para elegir una sola y ver sus indicadores (así no se promedian cosas de unidades distintas).`}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "16px" }}>
            <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
              <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Rend. Estándar</p>
              <h2 style={{ color: TEMA.textoPrincipal, margin: "8px 0 0", fontSize: "24px" }}>{rendEstandarUnica.toFixed(2)} <span style={{ fontSize: "12px" }}>km/L</span></h2>
            </div>
            <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
              <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Rend. Real</p>
              <h2 style={{ color: TEMA.textoPrincipal, margin: "8px 0 0", fontSize: "24px" }}>{rendRealUnica.toFixed(2)} <span style={{ fontSize: "12px" }}>km/L</span></h2>
            </div>
            <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
              <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Cargas OK</p>
              <h2 style={{ color: TEMA.textoPrincipal, margin: "8px 0 0", fontSize: "24px" }}>{unaSolaUnidad.ok}</h2>
            </div>
            <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
              <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Cargas POR ABAJO</p>
              <h2 style={{ color: TEMA.rojo, margin: "8px 0 0", fontSize: "24px" }}>{unaSolaUnidad.abajo}</h2>
            </div>
            <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
              <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Cargas POR ARRIBA</p>
              <h2 style={{ color: TEMA.naranjaOscuro, margin: "8px 0 0", fontSize: "24px" }}>{unaSolaUnidad.arriba}</h2>
            </div>
            <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
              <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Costo Total</p>
              <h2 style={{ color: TEMA.textoPrincipal, margin: "8px 0 0", fontSize: "20px" }}>{fmtDinero(unaSolaUnidad.costoTotal)}</h2>
            </div>
            <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
              <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>$ en Riesgo</p>
              <h2 style={{ color: TEMA.rojo, margin: "8px 0 0", fontSize: "20px" }}>{fmtDinero(unaSolaUnidad.dineroEnRiesgo)}</h2>
            </div>
            <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
              <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Total Registros</p>
              <h2 style={{ color: TEMA.textoPrincipal, margin: "8px 0 0", fontSize: "24px" }}>{unaSolaUnidad.cargas}</h2>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "0 32px 32px" }}>
        {cargando ? <p style={{ color: TEMA.textoSecundario }}>Cargando datos...</p> : (
          <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "24px", border: `1px solid ${TEMA.borde}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: TEMA.textoPrincipal, marginTop: 0 }}>Resumen por Unidad ({resumenPorUnidad.length})</h3>
              <button onClick={() => descargarCSV(resumenPorUnidad.map(f => ({
                Unidad: f.idVehiculo,
                Rend_Estandar: (f.sumaLitros > 0 ? f.sumaLitrosPorEstandar / f.sumaLitros : 0).toFixed(2),
                Rend_Real: (f.sumaLitros > 0 ? f.sumaRecorrido / f.sumaLitros : 0).toFixed(2),
                Cargas: f.cargas, OK: f.ok, Por_Abajo: f.abajo, Por_Arriba: f.arriba,
                Pct_Cumplimiento: f.pctCumplimiento.toFixed(1) + "%", Incidencias: f.incidencias,
                Dinero_en_Riesgo: f.dineroEnRiesgo.toFixed(2), Costo_Total: f.costoTotal.toFixed(2)
              })), "unidades")} style={{ backgroundColor: TEMA.verde, border: "none", color: "white", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                📥 Descargar Excel
              </button>
            </div>
            <p style={{ color: TEMA.textoSecundario, fontSize: "13px", marginTop: "4px", marginBottom: "16px" }}>Da clic en una unidad para ver el detalle de cargas.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${TEMA.borde}` }}>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "12px", fontWeight: "normal" }}>Unidad</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Rend. Estándar</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Rend. Real</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Cargas</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>OK</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Abajo</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Arriba</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>% Cumpl.</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Incidencias</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>$ en Riesgo</th>
                    <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Costo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenPorUnidad.map((fila, i) => {
                    const expandida = unidadExpandida === fila.idVehiculo;
                    const rendEst = fila.sumaLitros > 0 ? fila.sumaLitrosPorEstandar / fila.sumaLitros : 0;
                    const rendReal = fila.sumaLitros > 0 ? fila.sumaRecorrido / fila.sumaLitros : 0;
                    return (
                      <>
                        <tr key={i} onClick={() => setUnidadExpandida(expandida ? null : fila.idVehiculo)} style={{ borderBottom: `1px solid ${TEMA.borde}`, cursor: "pointer" }}>
                          <td style={{ padding: "12px" }}>{expandida ? "▼" : "▶"} {fila.idVehiculo}</td>
                          <td style={{ padding: "12px", textAlign: "right", color: TEMA.textoSecundario }}>{rendEst.toFixed(2)} km/L</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{rendReal.toFixed(2)} km/L</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{fila.cargas}</td>
                          <td style={{ padding: "12px", color: "#16a34a", textAlign: "right" }}>{fila.ok}</td>
                          <td style={{ padding: "12px", color: TEMA.rojo, textAlign: "right" }}>{fila.abajo}</td>
                          <td style={{ padding: "12px", color: TEMA.naranjaOscuro, textAlign: "right" }}>{fila.arriba}</td>
                          <td style={{ padding: "12px", textAlign: "right", color: fila.pctCumplimiento >= 80 ? "#16a34a" : fila.pctCumplimiento >= 60 ? TEMA.naranjaOscuro : TEMA.rojo }}>{fila.pctCumplimiento.toFixed(1)}%</td>
                          <td style={{ padding: "12px", textAlign: "right", color: fila.incidencias > 0 ? TEMA.rojo : TEMA.textoSecundario }}>{fila.incidencias}</td>
                          <td style={{ padding: "12px", textAlign: "right", color: fila.dineroEnRiesgo > 0 ? TEMA.rojo : TEMA.textoSecundario }}>{fmtDinero(fila.dineroEnRiesgo)}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{fmtDinero(fila.costoTotal)}</td>
                        </tr>
                        {expandida && (
                          <tr>
                            <td colSpan={11} style={{ padding: "16px 24px", backgroundColor: "#ffffff" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "16px" }}>
                                <div>
                                  <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 8px", fontWeight: "bold" }}>Conductores ({fila.conductores.size})</p>
                                  {[...fila.conductores].map(c => <p key={c} style={{ fontSize: "13px", margin: "0 0 4px" }}>{c}</p>)}
                                </div>
                                <div>
                                  <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 8px", fontWeight: "bold" }}>CeCo(s) ({fila.centrosCostos.size})</p>
                                  {[...fila.centrosCostos].map(c => <p key={c} style={{ fontSize: "13px", margin: "0 0 4px" }}>{c}</p>)}
                                </div>
                                <div>
                                  <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 8px", fontWeight: "bold" }}>Gasolinera(s) ({fila.proveedores.size})</p>
                                  {[...fila.proveedores].map(p => <p key={p} style={{ fontSize: "13px", margin: "0 0 4px" }}>{p}</p>)}
                                </div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: 0, fontWeight: "bold" }}>Detalle de cargas ({fila.filas.length})</p>
                                <button onClick={() => descargarCSV(fila.filas.slice().sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")).map(c => ({
                                  Fecha: c.fecha, Conductor: c.conductor,
                                  Litros: parseFloat(c.litros || 0).toFixed(2), Recorrido_km: parseFloat(c.recorrido || 0).toFixed(0),
                                  Rend_Real: parseFloat(c.rendimiento_real || 0).toFixed(2), Rend_Estandar: parseFloat(c.rendimiento_estandar || 0).toFixed(2),
                                  Proveedor: c.proveedor, Pct_Cumplimiento_Acumulado: c._pctCumplAcumulado.toFixed(1) + "%",
                                  Incidencias_Acumuladas: c._incidenciasAcumuladas, Status: c.cumplimiento || "S/D"
                                })), `detalle_unidad_${fila.idVehiculo}`)} style={{ backgroundColor: TEMA.verde, border: "none", color: "white", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                                  📥 Descargar detalle
                                </button>
                              </div>
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
                                  <thead>
                                    <tr style={{ borderBottom: `1px solid ${TEMA.borde}` }}>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Fecha</th>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Conductor</th>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Litros</th>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Recorrido</th>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Rend. Real</th>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Rend. Estándar</th>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Proveedor</th>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>% Cumpl.</th>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Incidencias</th>
                                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "8px", fontWeight: "normal", fontSize: "12px" }}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {fila.filas.slice().sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")).map((c, j) => {
                                      const status = c.cumplimiento || "S/D";
                                      return (
                                        <tr key={j} style={{ borderBottom: `1px solid ${TEMA.borde}` }}>
                                          <td style={{ padding: "8px", fontSize: "13px", whiteSpace: "nowrap" }}>{c.fecha}</td>
                                          <td style={{ padding: "8px", fontSize: "13px" }}>{c.conductor}</td>
                                          <td style={{ padding: "8px", fontSize: "13px", textAlign: "right" }}>{parseFloat(c.litros || 0).toFixed(2)}</td>
                                          <td style={{ padding: "8px", fontSize: "13px", textAlign: "right" }}>{parseFloat(c.recorrido || 0).toFixed(0)} km</td>
                                          <td style={{ padding: "8px", fontSize: "13px", textAlign: "right" }}>{parseFloat(c.rendimiento_real || 0).toFixed(2)} km/L</td>
                                          <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", color: TEMA.textoSecundario }}>{parseFloat(c.rendimiento_estandar || 0).toFixed(2)} km/L</td>
                                          <td style={{ padding: "8px", fontSize: "13px", color: TEMA.textoSecundario }}>{c.proveedor}</td>
                                          <td style={{ padding: "8px", fontSize: "13px", textAlign: "right" }}>{c._pctCumplAcumulado.toFixed(1)}%</td>
                                          <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", color: c._incidenciasAcumuladas > 0 ? TEMA.rojo : TEMA.textoSecundario }}>{c._incidenciasAcumuladas}</td>
                                          <td style={{ padding: "8px" }}>
                                            <span style={{
                                              backgroundColor: status === "OK" ? "#dcfce7" : status === "POR ABAJO" ? "#fee2e2" : status === "POR ARRIBA" ? "#ffedd5" : "#f3f4f6",
                                              color: status === "OK" ? "#16a34a" : status === "POR ABAJO" ? TEMA.rojo : status === "POR ARRIBA" ? TEMA.naranjaOscuro : TEMA.textoSecundario,
                                              padding: "3px 10px", borderRadius: "20px", fontSize: "11px"
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

export default Unidades;