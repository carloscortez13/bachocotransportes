export function descargarCSV(filas: Record<string, any>[], nombreArchivo: string) {
    if (!filas || filas.length === 0) {
      alert("No hay datos para descargar con los filtros actuales.");
      return;
    }
  
    const encabezados = Object.keys(filas[0]);
  
    const escapar = (valor: any) => {
      const str = valor === null || valor === undefined ? "" : String(valor);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
  
    const filasCSV = filas.map(fila => encabezados.map(campo => escapar(fila[campo])).join(","));
    const contenido = [encabezados.join(","), ...filasCSV].join("\n");
  
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
  
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo.endsWith(".csv") ? nombreArchivo : `${nombreArchivo}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  }