import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import CentroCostos from "./CentroCostos";
import Unidades from "./Unidades";
import Conductores from "./Conductores";
import Login from "./Login";
import { descargarCSV } from "./exportUtils";
import { CENTROS_COSTOS, PROVEEDORES, TEMA } from "./constantes";
import { calcularIncidencias } from "./incidenciasUtils";
import type { CargaEnriquecida } from "./incidenciasUtils";
import logoBachoco from "./assets/bachoco-logo.png";

function App() {
  const [sesion, setSesion] = useState<any>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [modulo, setModulo] = useState<string | null>(null);
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
  const [filtroProveedores, setFiltroProveedores] = useState<string[]>([]);
  const [proveedorDropdownOpen, setProveedorDropdownOpen] = useState(false);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [filtroEstados, setFiltroEstados] = useState<string[]>([]);
  const [estadoDropdownOpen, setEstadoDropdownOpen] = useState(false);
  const [orden, setOrden] = useState<"cumplimiento_desc" | "cumplimiento_asc" | "incidencias">("cumplimiento_desc");
  const idPeticionActual = useRef(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargandoSesion(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSesion(nuevaSesion);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (modulo === "combustible") cargarDatos();
  }, [modulo, fechaInicio, fechaFin, filtroCeCo, filtroProveedores, filtroEstados]);

  const cargarDatos = async () => {
    const miId = ++idPeticionActual.current;
    setCargando(true);
    const PAGE_SIZE = 1000;
    let todasLasFilas: any[] = [];
    let desde = 0;

    while (true) {
      let query = supabase.from("vista_rendimiento").select("*");
      if (fechaInicio) query = query.gte("fecha", fechaInicio);
      if (fechaFin) query = query.lte("fecha", fechaFin);
      if (filtroCeCo.length > 0) query = query.in("centro_costos", filtroCeCo);
      if (filtroProveedores.length > 0) query = query.in("proveedor", filtroProveedores);
      if (filtroEstados.length > 0) query = query.in("estado_transaccion", filtroEstados);

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

  const limpiarFiltros = () => {
    setFechaInicio(primerDiaMes);
    setFechaFin(hoyStr);
    setFiltroCeCo([]);
    setFiltroProveedores([]);
    setFiltroEstados([]);
  };

  const estadosDisponibles = [...new Set(datos.map(r => r.estado_transaccion).filter(Boolean))];
  const toggleEstado = (estado: string) => setFiltroEstados(prev => prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]);
  const toggleCeCo = (centro: string) => setFiltroCeCo(prev => prev.includes(centro) ? prev.filter(c => c !== centro) : [...prev, centro]);
  const toggleProveedor = (proveedor: string) => setFiltroProveedores(prev => prev.includes(proveedor) ? prev.filter(p => p !== proveedor) : [...prev, proveedor]);
  const ceCoFiltradosBusqueda = CENTROS_COSTOS.filter(c => c.toLowerCase().includes(busquedaCeCo.toLowerCase()));
  const proveedoresFiltradosBusqueda = PROVEEDORES.filter(p => p.toLowerCase().includes(busquedaProveedor.toLowerCase()));

  const datosOrdenados = [...datos].sort((a, b) => {
    if (orden === "cumplimiento_desc") return b._pctCumplAcumulado - a._pctCumplAcumulado;
    if (orden === "cumplimiento_asc") return a._pctCumplAcumulado - b._pctCumplAcumulado;
    return b._incidenciasAcumuladas - a._incidenciasAcumuladas;
  });

  const totalOK = datos.filter(r => r.cumplimiento === "OK").length;
  const totalAbajo = datos.filter(r => r.cumplimiento === "POR ABAJO").length;
  const totalArriba = datos.filter(r => r.cumplimiento === "POR ARRIBA").length;
  const costoTotal = datos.reduce((a, r) => a + (parseFloat(r.costo_total) || 0), 0);
  const dineroEnRiesgo = datos.reduce((a, r) => {
    if (r.cumplimiento !== "POR ABAJO") return a;
    const litros = parseFloat(r.litros) || 0;
    const recorrido = parseFloat(r.recorrido) || 0;
    const estandar = parseFloat(r.rendimiento_estandar) || 0;
    const costoLitro = parseFloat(r.costo_litro) || 0;
    if (estandar <= 0) return a;
    const litrosDeMas = litros - (recorrido / estandar);
    return litrosDeMas > 0 ? a + litrosDeMas * costoLitro : a;
  }, 0);

  const inputStyle = {
    backgroundColor: TEMA.fondoInput, border: `1px solid ${TEMA.borde}`, borderRadius: "8px",
    color: TEMA.textoPrincipal, padding: "8px 12px", fontSize: "14px", width: "100%"
  };
  const fmtDinero = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

  if (cargandoSesion) {
    return (
      <div style={{ backgroundColor: TEMA.fondo, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: TEMA.textoSecundario, fontFamily: "Arial, sans-serif" }}>
        Cargando...
      </div>
    );
  }

  if (!sesion) {
    return <Login />;
  }

  if (modulo === "centro_costos") {
    return <CentroCostos onVolver={() => setModulo(null)} />;
  }

  if (modulo === "unidades") {
    return <Unidades onVolver={() => setModulo(null)} />;
  }

  if (modulo === "conductores") {
    return <Conductores onVolver={() => setModulo(null)} />;
  }

  if (modulo === "combustible") {
    return (
      <div style={{ backgroundColor: TEMA.fondo, minHeight: "100vh", color: TEMA.textoPrincipal, fontFamily: "Arial, sans-serif" }}>
        <div style={{ backgroundColor: "#ffffff", padding: "16px 32px", display: "flex", alignItems: "center", gap: "12px", borderBottom: `3px solid ${TEMA.naranja}` }}>
          <button onClick={() => setModulo(null)} style={{ background: "none", border: "none", color: TEMA.textoSecundario, cursor: "pointer", fontSize: "16px" }}>← Volver</button>
          <img src={logoBachoco} alt="Bachoco" style={{ height: "28px" }} />
          <h1 style={{ margin: 0, fontSize: "20px", color: TEMA.textoPrincipal }}>Eficiencia de Combustible</h1>
        </div>

        {/* Filtros */}
        <div style={{ padding: "24px 32px", backgroundColor: TEMA.fondoTarjeta, borderBottom: `1px solid ${TEMA.borde}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", alignItems: "end" }}>
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
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", backgroundColor: "#fff", border: `1px solid ${TEMA.borde}`, borderRadius: "8px", padding: "8px", zIndex: 10, maxHeight: "280px", overflowY: "auto", width: "320px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  <input type="text" placeholder="Buscar CeCo..." value={busquedaCeCo} onChange={e => setBusquedaCeCo(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }} />
                  {ceCoFiltradosBusqueda.map(centro => (
                    <label key={centro} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "13px" }}>
                      <input type="checkbox" checked={filtroCeCo.includes(centro)} onChange={() => toggleCeCo(centro)} />
                      {centro}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 4px" }}>Proveedor</p>
              <button onClick={() => setProveedorDropdownOpen(!proveedorDropdownOpen)} style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {filtroProveedores.length === 0 ? "Todos" : filtroProveedores.length === 1 ? filtroProveedores[0] : "Varios"}
                </span>
                <span style={{ fontSize: "10px", marginLeft: "8px" }}>▼</span>
              </button>
              {proveedorDropdownOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", backgroundColor: "#fff", border: `1px solid ${TEMA.borde}`, borderRadius: "8px", padding: "8px", zIndex: 10, maxHeight: "280px", overflowY: "auto", width: "320px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  <input type="text" placeholder="Buscar proveedor..." value={busquedaProveedor} onChange={e => setBusquedaProveedor(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }} />
                  {proveedoresFiltradosBusqueda.map(proveedor => (
                    <label key={proveedor} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "13px" }}>
                      <input type="checkbox" checked={filtroProveedores.includes(proveedor)} onChange={() => toggleProveedor(proveedor)} />
                      {proveedor}
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
              <p style={{ color: TEMA.textoSecundario, fontSize: "12px", margin: "0 0 4px" }}>Ordenar por</p>
              <select value={orden} onChange={e => setOrden(e.target.value as any)} style={inputStyle}>
                <option value="cumplimiento_desc">Cumplimiento: mayor a menor</option>
                <option value="cumplimiento_asc">Cumplimiento: menor a mayor</option>
                <option value="incidencias">Más incidencias</option>
              </select>
            </div>
          </div>
          <button onClick={limpiarFiltros} style={{ marginTop: "12px", backgroundColor: "#ffffff", border: `1px solid ${TEMA.borde}`, color: TEMA.textoSecundario, padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
            Limpiar filtros
          </button>
        </div>

        {/* KPIs */}
        <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "16px" }}>
          <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
            <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Cargas OK</p>
            <h2 style={{ color: TEMA.textoPrincipal, margin: "8px 0 0", fontSize: "30px" }}>{totalOK}</h2>
          </div>
          <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
            <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Cargas POR ABAJO</p>
            <h2 style={{ color: TEMA.rojo, margin: "8px 0 0", fontSize: "30px" }}>{totalAbajo}</h2>
          </div>
          <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
            <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Cargas POR ARRIBA</p>
            <h2 style={{ color: TEMA.naranjaOscuro, margin: "8px 0 0", fontSize: "30px" }}>{totalArriba}</h2>
          </div>
          <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
            <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Costo Total</p>
            <h2 style={{ color: TEMA.textoPrincipal, margin: "8px 0 0", fontSize: "26px" }}>{fmtDinero(costoTotal)}</h2>
          </div>
          <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
            <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>$ en Riesgo</p>
            <h2 style={{ color: TEMA.rojo, margin: "8px 0 0", fontSize: "26px" }}>{fmtDinero(dineroEnRiesgo)}</h2>
          </div>
          <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "20px", borderTop: `4px solid ${TEMA.naranja}` }}>
            <p style={{ color: TEMA.textoSecundario, margin: 0, fontSize: "14px" }}>Total Registros</p>
            <h2 style={{ color: TEMA.textoPrincipal, margin: "8px 0 0", fontSize: "30px" }}>{datos.length}</h2>
          </div>
        </div>

        {/* Detalle */}
        <div style={{ padding: "0 32px 32px" }}>
          {cargando ? (
            <p style={{ color: TEMA.textoSecundario }}>Cargando datos...</p>
          ) : (
            <div style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "24px", border: `1px solid ${TEMA.borde}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ color: TEMA.textoPrincipal, marginTop: 0 }}>Detalle de Cargas ({datos.length} registros)</h3>
                <button onClick={() => descargarCSV(
                  datosOrdenados.map(r => ({
                    Fecha: r.fecha, Conductor: r.conductor, Vehiculo: r.id_vehiculo,
                    Litros: parseFloat(r.litros || 0).toFixed(2), Recorrido_km: parseFloat(r.recorrido || 0).toFixed(0),
                    Rend_Real: parseFloat(r.rendimiento_real || 0).toFixed(2), Rend_Estandar: parseFloat(r.rendimiento_estandar || 0).toFixed(2),
                    Proveedor: r.proveedor, Region: r.region, Estado_Transaccion: r.estado_transaccion,
                    Pct_Cumplimiento_Acumulado: r._pctCumplAcumulado.toFixed(1) + "%", Incidencias_Acumuladas: r._incidenciasAcumuladas,
                    Status: r.cumplimiento || "S/D"
                  })), "eficiencia_combustible"
                )} style={{ backgroundColor: TEMA.verde, border: "none", color: "white", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                  📥 Descargar Excel
                </button>
              </div>
              <div style={{ overflowX: "auto", marginTop: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${TEMA.borde}` }}>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "12px", fontWeight: "normal" }}>Fecha</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "12px", fontWeight: "normal" }}>Conductor</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "12px", fontWeight: "normal" }}>Vehículo</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Litros</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Recorrido</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Rend. Real</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Rend. Estándar</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "12px", fontWeight: "normal" }}>Proveedor</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "12px", fontWeight: "normal" }}>Región</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "12px", fontWeight: "normal" }}>Estado</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>% Cumpl.</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "right", padding: "12px", fontWeight: "normal" }}>Incidencias</th>
                      <th style={{ color: TEMA.textoSecundario, textAlign: "left", padding: "12px", fontWeight: "normal" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosOrdenados.slice(0, 100).map((row, i) => {
                      const status = row.cumplimiento || "S/D";
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${TEMA.borde}` }}>
                          <td style={{ padding: "12px", color: TEMA.textoSecundario, whiteSpace: "nowrap" }}>{row.fecha}</td>
                          <td style={{ padding: "12px" }}>{row.conductor}</td>
                          <td style={{ padding: "12px" }}>{row.id_vehiculo}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{parseFloat(row.litros || 0).toFixed(2)}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{parseFloat(row.recorrido || 0).toFixed(0)} km</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{parseFloat(row.rendimiento_real || 0).toFixed(2)} km/L</td>
                          <td style={{ padding: "12px", textAlign: "right", color: TEMA.textoSecundario }}>{parseFloat(row.rendimiento_estandar || 0).toFixed(2)} km/L</td>
                          <td style={{ padding: "12px", color: TEMA.textoSecundario }}>{row.proveedor}</td>
                          <td style={{ padding: "12px", color: TEMA.textoSecundario }}>{row.region}</td>
                          <td style={{ padding: "12px", color: TEMA.textoSecundario }}>{row.estado_transaccion}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{row._pctCumplAcumulado.toFixed(1)}%</td>
                          <td style={{ padding: "12px", textAlign: "right", color: row._incidenciasAcumuladas > 0 ? TEMA.rojo : TEMA.textoSecundario }}>{row._incidenciasAcumuladas}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              backgroundColor: status === "OK" ? "#dcfce7" : status === "POR ABAJO" ? "#fee2e2" : status === "POR ARRIBA" ? "#ffedd5" : "#f3f4f6",
                              color: status === "OK" ? "#16a34a" : status === "POR ABAJO" ? TEMA.rojo : status === "POR ARRIBA" ? TEMA.naranjaOscuro : TEMA.textoSecundario,
                              padding: "4px 12px", borderRadius: "20px", fontSize: "12px"
                            }}>{status}</span>
                          </td>
                        </tr>
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

  return (
    <div style={{ backgroundColor: TEMA.fondo, minHeight: "100vh", color: TEMA.textoPrincipal, fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#ffffff", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderBottom: `3px solid ${TEMA.naranja}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src={logoBachoco} alt="Bachoco" style={{ height: "36px" }} />
          <h1 style={{ margin: 0, fontSize: "20px", color: TEMA.textoPrincipal }}>Control Transportes — Noroeste</h1>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ background: "none", border: `1px solid ${TEMA.borde}`, color: TEMA.textoSecundario, cursor: "pointer", fontSize: "13px", padding: "6px 14px", borderRadius: "8px" }}
        >
          Cerrar sesión
        </button>
      </div>
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${TEMA.naranja}, ${TEMA.verde})` }}></div>
      <div style={{ padding: "32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
        <div onClick={() => setModulo("combustible")} style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "24px", borderTop: `4px solid ${TEMA.naranja}`, cursor: "pointer", border: `1px solid ${TEMA.borde}` }}>
          <div style={{ fontSize: "32px" }}>⛽</div>
          <h2 style={{ color: TEMA.textoPrincipal, marginTop: "8px", fontSize: "17px" }}>Eficiencia de Combustible</h2>
          <p style={{ color: TEMA.textoSecundario, fontSize: "13px" }}>Análisis de rendimiento y desviaciones por conductor y unidad.</p>
        </div>
        <div onClick={() => setModulo("centro_costos")} style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "24px", borderTop: `4px solid ${TEMA.naranja}`, cursor: "pointer", border: `1px solid ${TEMA.borde}` }}>
          <div style={{ fontSize: "32px" }}>🏢</div>
          <h2 style={{ color: TEMA.textoPrincipal, marginTop: "8px", fontSize: "17px" }}>Centro de Costos</h2>
          <p style={{ color: TEMA.textoSecundario, fontSize: "13px" }}>Cumplimiento, $ en riesgo e incidencias por CeCo.</p>
        </div>
        <div onClick={() => setModulo("unidades")} style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "24px", borderTop: `4px solid ${TEMA.naranja}`, cursor: "pointer", border: `1px solid ${TEMA.borde}` }}>
          <div style={{ fontSize: "32px" }}>🚚</div>
          <h2 style={{ color: TEMA.textoPrincipal, marginTop: "8px", fontSize: "17px" }}>Unidades</h2>
          <p style={{ color: TEMA.textoSecundario, fontSize: "13px" }}>Desempeño e incidencias por vehículo.</p>
        </div>
        <div onClick={() => setModulo("conductores")} style={{ backgroundColor: TEMA.fondoTarjeta, borderRadius: "12px", padding: "24px", borderTop: `4px solid ${TEMA.naranja}`, cursor: "pointer", border: `1px solid ${TEMA.borde}` }}>
          <div style={{ fontSize: "32px" }}>👨‍✈️</div>
          <h2 style={{ color: TEMA.textoPrincipal, marginTop: "8px", fontSize: "17px" }}>Conductores</h2>
          <p style={{ color: TEMA.textoSecundario, fontSize: "13px" }}>Desempeño e incidencias por chofer.</p>
        </div>
      </div>
    </div>
  );
}

export default App;