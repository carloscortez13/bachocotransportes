export interface CargaEnriquecida {
  [key: string]: any;
  _pctCumplAcumulado: number;
  _incidenciasAcumuladas: number;
  _esIncidenciaDelMes: boolean;
  _mesAnio: string;
}

export function calcularIncidencias(datos: any[]): CargaEnriquecida[] {
  // 1. Agrupar por unidad
  const porUnidad: Record<string, any[]> = {};
  for (const row of datos) {
    const unidad = row.id_vehiculo || "Sin Unidad";
    if (!porUnidad[unidad]) porUnidad[unidad] = [];
    porUnidad[unidad].push(row);
  }

  const resultado: CargaEnriquecida[] = [];

  for (const unidad in porUnidad) {
    const filas = porUnidad[unidad].slice().sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

    const porMes: Record<string, any[]> = {};
    for (const row of filas) {
      const mes = (row.fecha || "").slice(0, 7);
      if (!porMes[mes]) porMes[mes] = [];
      porMes[mes].push(row);
    }

    const mesesOrdenados = Object.keys(porMes).sort();
    let incidenciasAcumuladas = 0;
    const esIncidenciaPorMes: Record<string, boolean> = {};

    for (const mes of mesesOrdenados) {
      const cargasDelMes = porMes[mes];
      const sumLitros = cargasDelMes.reduce((a, r) => a + (parseFloat(r.litros) || 0), 0);
      const sumRecorrido = cargasDelMes.reduce((a, r) => a + (parseFloat(r.recorrido) || 0), 0);
      const sumLitrosPorEstandar = cargasDelMes.reduce((a, r) => {
        const est = parseFloat(r.rendimiento_estandar) || 0;
        const lit = parseFloat(r.litros) || 0;
        return est > 0 ? a + est * lit : a;
      }, 0);

      const rendReal = sumLitros > 0 ? sumRecorrido / sumLitros : 0;
      const rendEstandar = sumLitros > 0 ? sumLitrosPorEstandar / sumLitros : 0;

      const esIncidencia = rendEstandar > 0 && (rendReal < rendEstandar * 0.85 || rendReal > rendEstandar * 1.15);
      esIncidenciaPorMes[mes] = esIncidencia;
      if (esIncidencia) incidenciasAcumuladas += 1;

      for (const row of cargasDelMes) {
        resultado.push({
          ...row,
          _pctCumplAcumulado: 0,
          _incidenciasAcumuladas: incidenciasAcumuladas,
          _esIncidenciaDelMes: esIncidencia,
          _mesAnio: mes
        });
      }
    }
  }

  const porUnidadOrdenado: Record<string, CargaEnriquecida[]> = {};
  for (const row of resultado) {
    const unidad = row.id_vehiculo || "Sin Unidad";
    if (!porUnidadOrdenado[unidad]) porUnidadOrdenado[unidad] = [];
    porUnidadOrdenado[unidad].push(row);
  }

  for (const unidad in porUnidadOrdenado) {
    const filas = porUnidadOrdenado[unidad].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
    let totalCargas = 0;
    let totalOK = 0;
    for (const row of filas) {
      totalCargas += 1;
      if (row.cumplimiento === "OK") totalOK += 1;
      row._pctCumplAcumulado = totalCargas > 0 ? (totalOK / totalCargas) * 100 : 0;
    }
  }

  return resultado;
}

export function contarIncidenciasUnicas(filasEnriquecidas: CargaEnriquecida[]): number {
  const combosVistos = new Set<string>();
  for (const row of filasEnriquecidas) {
    if (row._esIncidenciaDelMes) {
      combosVistos.add(`${row.id_vehiculo}__${row._mesAnio}`);
    }
  }
  return combosVistos.size;
}