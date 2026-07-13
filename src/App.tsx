import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import CentroCostos from "./CentroCostos";
import Unidades from "./Unidades";
import Conductores from "./Conductores";
import Login from "./Login";
import { descargarCSV } from "./exportUtils";

const CENTROS_COSTOS = [
  "Postura Comercial Mexicali", "Ctos F Ind Post Rep Pesada", "Mntto",
  "Cto Fijo Ind Pollo de Engorda", "Recoleccion Huevo Comercial", "Posturas Comerciales Ind.",
  "Superintendencia Obregon", "Trafico Pta Alimentos", "TRAFICO POLLO VIVO-",
  "Bodega Tepic Rutas pp", "Limp.", "Ctos F Ind Cza Rep Pesada",
  "CV Hermosillo Vtas Rutas PP", "Recoleccion Pollinaza Noroeste", "Jefe Relac Industriales Mochis",
  "Mantenimiento Post Rep Pesada", "Ctos Fijos Ind Post Com Mochis", "CRIANZA COMERCIAL MOCHIS",
  "Trafico Planta de Alimentos", "Ensenada Rutas", "Gerencia de Ventas Sinaloa",
  "Bodega Guasave Ventas", "Costos F Indirectos Post Progenitoras", "CV Mochis Vtas Rutas PP",
  "Sup Cadena Sumin UN Noro Norte", "Bodega Mazatlan Ventas", "Bodega Mochis Ventas",
  "Bodega Culiacan-Pollo Ventas", "Admon Vehiculos Obregon", "Bodega Tijuana",
  "CV Tijuana Vtas Rutas PP", "Recolecc en Granjas Pollo Vivo", "Bodega Obregon",
  "CV Mazatlan Vtas Rutas PP", "Gtos de Entrega Pollito 1 Dia", "Bodega Mexicali",
  "Superv Post Reproduct Pesada", "CV Obregon Vtas Rutas PP", "Flotilla de Rep. Pesadas",
  "Gerencia Operacion Obregon", "Planeac Operativa CEDIS Gve PP", "Tijuan la Jolla Ruta",
  "CV Culiacan Vtas Rutas PP", "LOS CABOS DISTRIBUIDOR HV RUTAS", "CV Guasave Vtas Rutas PP",
  "Planeac Operativa CEDIS Hll PP", "CV Tijuana Vtas Rutas Hvo", "CV Culiacan Vtas Rutas Huevo",
  "Extraccion de Gallinaza", "NOGALES RUTAS", "Ensenada Ventas", "CV Tepic Vtas",
  "CV Mexicali  Vtas Rutas PP", "Mtto Incub Progenitoras", "CV Mexicali Vtas Rutas Hvo",
  "Tijuan la Jolla PLAO", "Mantenimiento Staff Obregon", "Mantenimiento Cza Rep Pesada",
  "CDH MOCHIS 2", "Planeac Operativa CEDIS Cul PP", "Recoleccion de Huevo Comercial",
  "C.V.  ABASTOS VENTAS", "Jefe Relacs Industri Mxli", "Centros Distrib. Mexicali",
  "Bodega Hermosillo", "NOGALES PP PLAO", "Planta Alimentos", "JEFE DE VIGILANCIA MXLI",
  "Trafico Alimento", "Mantenimiento Post Rep Ligera", "Gcia Vtas Unidad de Negocio NE",
  "Staff Mantenimiento Mochis", "Recoleccion Gallina Obregon", "Supervision Incub Progenitoras",
  "Bodega Culiacan Huevo Ventas", "Hermosillo Mayoreo", "Mantenimiento Post. Com.",
  "Flotilla de Pollita Comercial", "Centro Distribuidor", "PLANEACION MAESTRA",
  "Subproductos Culiacan", "Relaciones Indust", "NOGALES HV RUTA",
  "Planeac Oper Cedis Tijuana PP", "Gcia Planta Procesadora Aves", "Superintendente de Transportes",
  "Jefe de Relacs Industri Obr", "Serv. Generales.", "Personal Embarques",
  "SUPERINTENDENTE CADENA SUMINISTRO SONORA", "Costos F Indirectos Cza Progenitoras",
  "Flotilla de Progenitoras", "COSTOS F.INDIRECTOS INCUB. PROGENITORAS",
  "LA PAZ DISTRIBUIDOR HV RUTAS", "Sup Cadena Sumin UN Noro Sur", "Administracion Taller",
  "JEFE DE REL. INDUSTRIALES", "TGV Noroeste", "Ventas Subproductos Obregon",
  "Cto Fijo Ind Czas Cciales Mxl", "Ctos F Ind post Rep Ligera",
  "PLANEACION OPERATIVA CEDIS CD OBREG PP", "ALMACEN GENERAL HERMOSILLO",
  "TALLER DE VEHICULOS OBREGON", "Planeacion Operativa Cedis Mexicali PP",
  "RECLUTAMIENTO Y SELECCION AREA VENTA", "Transportes Tijuana", "Superv. Postura Comercial",
  "SEG Y ECOL POLLO ENG", "Planeac Operativa Cedis Mzt", "Gte Cadena Suministro UN Noro",
  "SEGURIDAD E HIG. INDUSTRIAL", "Gerencia Operacion Mexicali", "Planta de Alimentos Mexicali",
  "Tijuan la Jolla Vtas", "VIGILANCIA SONORA"
];

const PROVEEDORES = [
  "BP LA TERCERA 0M958", "RENDICHICAS TETABIATE 5653", "EXPRESS LOS BECOS 3675",
  "REDPETROIL HEROICO 7852", "REPSOL UNISON", "RENDICHICAS VILLAS 12842",
  "SER EXPRES DE BACHIGUALATO4364", "REDPETROIL EL DIEZ 5083", "GPO. OCTANO SAN CAYETANO 11147",
  "SERVICIO CHULAVISTA", "HORIZON COSTA RICA 6834", "COMBUSTIBLES PERISUR 3461",
  "REDPETROIL PERICOS 2777", "LA PILARICA GAXIOLA 8204", "RENDICHICAS CASCADA 5755",
  "ENERSER FUNDICION 1262", "SERVICIO LOS MATACHINES", "SEVAFUSA 1738",
  "SERV. ABASTOS DE OBREGON 6116", "ENERSER EL DORADO 10577", "RENDICHICAS NAINARI 5330",
  "SERVICIOS PENINSULA 6567", "SERVICIO BUSTRI 7343", "BAGALEZA MEGASERVICIOS 11609",
  "FARMING MULTISERVICIOS 12293", "GASOLINERA RIO SINALOA 3886", "PROVEEDORA DEL YAQUI 1252",
  "SEVAFUSA 1733", "ENERSER DIAZ ORDAZ LIMON 2703", "FARMING MULTISERVICIOS 11476",
  "SERV ESCOSERRA COSTERITA 12623", "RAMSA DEL YAQUI 7552", "ENERSER SANTA FE 13161",
  "ENERSER VIA RAPIDA OTE 9270", "SERVICIOS VILLA JUAREZ 2144", "GASOLINERA COSTA RICA 11478",
  "SERVICIO RIO MAYO 7301", "SERVICIOS LA CRUZ 6162", "GASOLINERA VENADILLO 1766",
  "GASOLINERA ALVER 9400", "GASOLINERA ESCOSERRA 7542", "AUTO SERVICIO OSMAR 8322",
  "PEREZ ALVAREZ 1258", "RENDICHICAS TERAN 12917", "GASOLINERA SAN BARTOLO 11494",
  "RENDICHICAS COAHUILA 6423", "SERVICIOS SINALOENSES 4120", "SUPER GAS DE LA FRONTERA 6757",
  "SMARTGAS SAN ISIDRO", "SERVIAEROPUERTO OBREGON 3539", "REDPETROIL REVOLUCION 9052",
  "ENERSER LA VILLA 9090", "ENERSER PACIFICO 9793", "AUTOSERVICIO BALMACEDA 10813",
  "ENERSER LA GLORIA 2407", "PETRO 7 BLVD. INSURGENTE 5366", "FAJA DE ORO ABASTOS 5098",
  "AKRON FLORIDO", "SERVICIOS GASBO 1251", "ENERSER EL REBELDE 4573", "QUICKGAS TREBOL",
  "GPO. OCTANO COLOSIO 9044", "ESTACION KABORK 9157", "GPO. OCTANO BONATERRA 12819",
  "ASVA 7210", "ENERSER ESTACION MADERO 1863", "GASOLINERA DEL VALLE 8590",
  "SERVICIO AEROPUERTO 5082", "BP CENTRA OBREGON Y 16 0M563", "RENDICHICAS CETYS 12153",
  "RENDICHICAS MISIONES 10655", "SERVICENTRO MICHOACAN 1866", "ESTACION DE SERV. IRVILU 5579",
  "ENERSER ROSARITO NORTE 7977", "AUTO SERVICIO MAS 4143", "BP CENTRA CALZ 1810 0M557",
  "GASOLINERA MAFER 13410", "SERVICIO AGUILA IX 1315", "GASUR 9583", "ENERSER TOYOTA 11584",
  "REDPETROIL AEROPUERTO 9561", "GPO OCTANO TECNOLOGICO 5795", "GRUPO ECO CARRANZA 12558",
  "BP CENTRA ISLAS AGRARIAS 0M600", "ENERSER ESMERALDA 9765", "SERVI GAS LA ESPIGA 5231",
  "ESTACION LA PLATANERA", "DIAMOND GAS 10488", "RENDICHICAS MICHOACAN 9445",
  "BP CENTRA PLAYAS 0M609", "HORIZON LA CONQUISTA 10161", "BP CENTRA BENITO 0M804",
  "SERVICIO ALAMEDA 2136", "JAG 5 DE JUNIO 11907", "EL REY ANAHUAC 10999",
  "COMBUSTIBLES SIETE H 12833", "RENDICHICAS SAN AGUSTIN 8385", "EST. DE SERVS. LA LAGUNA 10629",
  "GASOLINERA EL CARRIZO 8025", "ABYL 9084", "SERVICIO SAN GERMAN 11898",
  "GASERVICIO PUEBLITOS 1193", "EL REY HERMOSILLO QUIROGA10463", "SERVICIO 5 DE MAYO 10422",
  "GASOLINERAS PABA 9961", "PABA SENDERO 22598", "BP ESPERANZA", "RIO ELOTA 1777",
  "RAMSA DEL YAQUI 7587", "SERVICOM CULIACAN 4006", "SERVI ENERGETICOS II 5995",
  "BP CENTRA KM 43 0M562", "RENDICHICAS BLVD 2000 10624", "GASOLINERA EL CARRIZO 2931",
  "REDPETROIL ALHUEY II", "AUTO SERVICIO GUTIERREZ 2134", "EL VALIENTE 3531",
  "EST.DE SERVICIO LOS PINOS 5299", "GRUPO ECO CALLE 10 2425", "IXPALIA PACIFICO 3977",
  "GASOLINERAS PABA 11221", "RENDICHICAS LA 200 5869", "SERVICIO MARVAL 5641",
  "REDPETROIL PLAYAS DEL CAMARON", "ARCOLOMAS 5864", "SERVICIO MODELO 2312",
  "INDIAN NAINARI", "SERVICIO SAHUARIPA 8075", "AKRON SANTA FE", "CENTRA QUIROGA E15099",
  "ENERSER INSURGENTES 8228", "SERVICIOS Y COMB.VINEDOS 11795", "QUICKGAS TERRANOVA",
  "GRUPO ECO PERIFERICO 11403", "RALSI SAN RAFAEL 10791", "JAG EL RANCHITO 7114",
  "GASOLINERA RINDEMAS 11913", "SEVAFUSA 4536", "SERVICIOS HAV 9688",
  "GASOLINERA EL LIENZO 1737", "ENERSER LA UNION 1803", "GRUPO ECO TEZAL 50072",
  "REPSOL PAZJOTA E11949", "GRUPO ECO AGUAJITOS 16029", "BP SN ANT DE LOS BUENOS 0M558",
  "SANTA LUCIA 9493", "RENDICHICAS VILLA 9756", "SEVAFUSA JUAREZ 4226",
  "GASOLINERA RINDEMAS 14676", "ENERSER INDEPENDENCIA 2712", "SERVICIOS JOHEMA 11646",
  "RENDICHICAS EL TIGRE 5378", "EL REY GRANADA 9630", "GASOLINERA LA JOYA 2137",
  "GASOLINERA RIVERA 1255", "LA PILARICA NITROIL TABACHINES", "LA PILARICA TOPOLOBAMEX 9466",
  "EL REY HERM.AEROPUERTO 5134", "ESTACION DE SERVICIO REAL DEL", "LUBRICANTES Y GASOLINAS 1819",
  "ASVA 3824", "SERVICIOS DE LOS RIOS 9219", "RENDICHICAS CAMINO 9950",
  "ENERSER ALVAREZ EL RUBI 2679", "GPO. OCTANO GUAYABITOS 11184", "APO. OCTANO MIRADOR 8008",
  "SAN RAMON 12423", "AKRON SAN AGUSTIN", "GASOLINERA PLAZA AGUAMILPA",
  "SERV. ESCOSERRA OLIVOS 12260", "COMBU EXPRESS AGUAMILPA 11326", "BP CENTRA CONSTITUCION 0M589",
  "GASOLINERA ALVER 11483", "ENERSER OTAY TECNOLOGICO 9329", "REDPETROIL PATRIA 7379",
  "ECO ENERMAR 3750", "REDPETROIL BELLAVISTA 5156", "ENERSER EL COYOTE 9201",
  "EL TREBOL 13010", "SEVAFUSA ROSALES II 7819", "SERV Y COMBUSTIBLES ASL 11955",
  "ENERSER TECATE INDUSTRIAL 9562", "HIDROSINA 984 12069", "SUPER SERV.DEL VALLE VICAM4779",
  "GASOLINERA LA CUCHILLA 5658", "ENERSER MANEADERO 2613", "ARCOPARQUE INDUSTRIAL 3719",
  "HORIZON 5316", "JAG LA CENTRAL 2138", "SERVICIO LOS TOLTECAS 3560",
  "GASOLINERA PILA EL DIEZ", "ENERSER GOMEZ MORIN 10927", "SEVAFUSA ROSALES I 6705",
  "GASOLINERA SANTA LUCIA 5855", "BP CENTRA ANAHUAC 0M607", "GPO OCTANO DIF 13510",
  "SMARTGAS 1736", "BP DIAZ ORDAZ 0M020", "ENERSER NUEVO MEXICALI 8383",
  "ENERSER ZARAGOZA 1843", "HORIZON OLACHEA 7416", "PANTANO GRANDE 12639",
  "RENDICHICAS LA V 8661", "RENDICHICAS ATLAS 2408", "GASOLINERA LOS ARRIEROS 03521",
  "SERVICIO LAS MERCEDES 4561", "ENERSER JIBARITO 15002", "GRUPO ECO PLANTA PROGRESO 1804",
  "AGUILA 21", "GRUPO ECO OMEGA VIA RAPIDA9135", "SERVICIO GMV 1744",
  "SUPER SERVICIO ABY 1331", "HORIZON NOVOLATO NORTE 12721", "JAG AVIACION 7797",
  "BP CENTRA PLAYITAS 0M561", "DAKA COMBUSTIBLES SA DE CV 132", "AVANTIX 9692",
  "GASOLINERA HUMAYA 1327", "GRUPO ECO LAS GARZAS 2 50080", "GRUPO ECO BRISAS 2 50069",
  "ENERSER LA ARIZONA 6305", "DAGAL 1945", "RENDICHICAS CUARTELES 20884",
  "GASOLINERA EL GANADERO 6560", "BP CENTRA CUAUHTEMOC 0M558", "EL REY GAS PALO VERDE 3273",
  "GRUPO ECO XOCHIMILCO 11658", "SERVICIOS MESASECA 11738", "SERVICIO GF44 6787",
  "SERVICIOS LAS SALVIAS 12087", "REDPETORIL MADERO 8536", "BP CENTRA TERAN 0M602",
  "SERVICIO EL FARO 2543", "MEIGAS SERVICIO ESPINEIRO 5905", "ENERSER RANCHO CASIAN 21883",
  "GPO. OCTANO NARAYABASTOS 4111", "ESTACION DE SERVICIO JALISCO", "J. RUMSA 3637",
  "SERVICIO ESCOSERRA DE CULIACAN", "ENERSER SANTA ANA 6922", "SEVAFUSA CANERO 7890",
  "HORIZONCHEVRON LA COSTERITA", "RENDICHICAS SOLER 8777", "ORO NEGRO 3449",
  "REDPETROIL PLANTA HERMOSILLO", "ENERSER TECOLOTE 13176", "SUPER COMBUS.MEXICALI 7402",
  "EL REY QUINTAS DEL REY 10984", "RENDICHICAS REFUGIO 1 7478", "BP CENTRA MONTE CARLO 0M586",
  "GASOLINERA LA JOYA 10693", "HORIZONCHEVRON TABALA", "G500 GASOLINERA OPTIMOS N91",
  "GRUPO ECO INTERNACIONAL 50091", "AKRON BENTON", "CENTRA ESTACION LA ROCA 7871",
  "SERVICIO MAZA DE JUAREZ 3785", "SERVICIO SAHUARIPA 10989", "GASOLINERA EL CRUCERO 2540",
  "SERVICIOS LAS SALVIAS 13456", "SERVICIO GARAL 5927", "SEVAFUSA PEDRO ANAYA 11810",
  "GRUPO ECO EL SAUZAL 2619", "GASERVICIO MORELOS 8004", "SERVICIOS Y LUB.DE NOGALES2150",
  "GRUPO ECO EL CAPITAN 2609", "REPSOL LEY", "OCRAMVI 7111", "PETRO 7 EL REALITO 10748",
  "SEVAFUSA BIENESTAR II 5875", "REDPETROIL CARDONES", "ENERSER LAS AGUAS 12015",
  "SERVICENTRO PITIC 1784", "GASMAZ 1767", "GRUPO ECO CETYS 7293", "ESTACION SAN LUIS 1940",
  "ENERSER SERVICIO AZTECA 2689", "GRUPO ECO CANELO 8171", "SERVICIO GOLDEN GAS 4477",
  "SERVICIO RIO MAYO", "HORIZON MUSALA 8776", "RENDICHICAS SANTA FE 10064",
  "ENERSER EL TRIANGULO 10520", "REDPETROIL MUNICH 9990", "FARMING MULTISERVICIOS 6208",
  "GRUPO HISPANICA 13236", "PETRO 7 T1 4102", "RENDICHICAS 8070",
  "ECO ENERMAR ROCAFUERTE 10208", "ENERSER BENITO JUAREZ 2590", "SERVICIO EL CHINO 10014",
  "ENERSER CANON DEL SAINZ 10586", "PETRO 7 ENSENADA E4 7612", "GRUPO ECO INSURGENTES 5343",
  "PETRO 7 CARRETERA MEXICALITEC", "ENERSER LOMA DORADA 10979", "SERVICIOS Z3 9748",
  "SEVAFUSA 5094", "GRUPO ECO LA PRESA 7576", "HORIZON EL DORADO 4340",
  "BP CENTRA NUEVO LEON Y 9 0M578", "GASOLINERA ENCINOS 3837", "GASOLINERA EL RODEO 10265",
  "ENTRONQUE SANTA CLARA 10790", "CENTURY 7749", "GASOLINERA BICENTENARIO 10889",
  "GASERVICIO 5810", "GRUPO ECO MALL 7148", "ENERSER PRADO 2682",
  "GPO. OCTANO CARRETERO 4055", "ENERSER EL LAGO 13162", "EL REY CALLE ONCE 11695",
  "ENERSER CLINICA 27 11644", "QUICKGAS VALLE ALTO", "SERVICIO HAV 12256",
  "GRUPO ECO EJIDO SINALOA 1814", "GASOLINERA RINDEMAS 4310", "SERVICOM DE LA COSTA 7246",
  "GASOLINERA LIBRAMIENTO 10417", "GRUPO ECO ESTACION OMEGA 8384", "PETRO 7 M8",
  "ENERSER REFORMA Y NOVENA 12075", "GRUPO ECO SIMON BOLIVAR 10937", "ENERSER IMURIS 2319",
  "LA CRUZ CEUTA 9810", "ARCOGASTON MADRID 8368", "ENERSER OBRERA 9129",
  "PEMEX SAN RAFAEL E14432", "REDPETROIL GUASAVE 6476", "ASVA 5915",
  "GRUPO BENCENO DE COMBUSTIBLES", "GRUPO ECO REFORMA 5982", "GASERVICIO SANTA CLARA 10450",
  "LA PILARICABATIZ 12254", "GASERV EL LLANITO QUIROGA 4435", "PETROSERVICIOS D GUASAVE 12873",
  "ASVA ABAST. DE SERV DEL VALLE", "ENERSER EL FLORIDO 12786", "HORIZON LOLA BELTRAN 6555",
  "SERVICIOS LA PRIMAVERA 10983", "BP CENTRA JOKER 0M576", "EL REY AEROPUERTO MXL 10204",
  "REDPETROIL ALHUEY I 4618", "ENERSER CANAVERAL", "ENERSER CUCAPAH 2 7161",
  "GASERVICIO ENCINAS 8460", "BP CENTRA AMERICAS 0M604", "REDPETROIL COLOSIO 11828",
  "SERVICIO CAMINO REAL 8760", "GPO. OCTANO LAS VIBORAS 6748", "RENDICHICAS FLOR 6611",
  "HORIZON AGRICULTORES 7308", "GPO. OCTANO JUAREZ 2367", "ENERSER LIBERTAD AEROPUE 10018",
  "RENDICHICAS CENTRAL 6236", "GRUPO ECO RIO COLORADO 12557", "RENDICHICAS 6193",
  "LAS QUINTAS", "ENERSER ELMEXICANO 20164", "GRUPO ECO PROGRESO 9645",
  "MULTISERV.LA PILARICA 8422", "REDPETROIL LA CURVA 4599", "GRUPO ECO RUMOROSA 7133",
  "GASOLINERA RINDEMAS 11321", "HORIZON ESTADIO 9772", "GRUPO ECO ZAIED 3234",
  "FARMING MULTISERVICIOS 11160", "CENTRA SAN JUDAS 13231", "SERVICIO EL GALLO 1648",
  "BP CENTRA ENCINO 0M553", "GPO. OCTANO ZINAP 2SUR 9603", "SEVAFUSA POSEIDON 11980",
  "REDPETROIL MALECON 4533", "GPO OCTANO ZINAPECU 1 NTE 9843", "G500 EST SERV LA AUTOPISTA NG5",
  "ENERSER BELLAS ARTES 10619", "GASOLINERA MAZATLAN 5200", "ENERSER CALLE 9NA TIJUANA 2685",
  "SALIDA GUAYMAS 7834", "OXXO GAS LA BARCA II 7318", "RENDICHICAS 20 DE NOV 2640",
  "BP CENTRA VISTA HERMOSA 0M585", "SRLITRO GASOLINERAS 8449", "ENERSER CALLE 11 1822",
  "SERVICIOS PENINSULA II 4800", "GRUPO IDEA 12932", "BP CENTRA SAN QUINTIN NORTE",
  "GUICKGAS ACAYA", "CHEVRON MILLAN", "AGROCOMBUSTIBLES EL CHAMIZAL 1",
  "BP CENTRA CANTAMAR 0M587", "ENERSER VILLA DEL PRADO 9203", "GRUPO ECO SONOYTA 1820",
  "ENERSER CUAUHTEMOC 2665", "CHEVRON LAS PALMAS", "SERVICIO CR SATELITE 10284",
  "REPSOL PESQUEIRA", "RENDICHICAS LIBRAM 6280", "SUPER SERVICIO SALCIDO 1821",
  "ENERSER VIA RAPIDA PTE 7252", "GRUPO ECO REFORMA 3887", "CENTRA PUMA E15100",
  "LUGASA 1851", "CARGAS 12053", "PETRO 7 BLVD CLOUTHIER 11863",
  "ENERSER LADERAS DE MONTERREY", "GRUPO OCTANO PINOS 4767", "REPSOL CANGREJOS E06579",
  "GAS. LA PERLA DEL PACIFICO6665", "BP CENTRA CENTRO CIVICO 0M596", "ORSAN TRANSPENINSULAR II 8577",
  "CENTRA EL KENO E15101", "RENDICHICAS MACLOVIO 4625", "SEVAFUSA BIENESTAR I 4251",
  "PETROMART 12424", "HORIZON CANAN 15082", "REDPETROIL OSCAR PEREZ E.12001",
  "BP CENTRA LA CUESTA 0M615", "BP CENTRA JUSTO SIERRA 0M577", "BP CENTRA COSTERO 0M556",
  "ENERSER HACIENDA STAMARIA10337", "RENDICHICAS SERIS 8317", "BP GOMEZ MORIN 0M596",
  "COMB.Y SERV.JARDIN JUAREZ 1644", "SANTA LUCIA 12810", "GRUPO ECO LAS ABEJAS 8261",
  "RENDICHICAS AERO 7709", "ECO ENERMAR 8292", "ENERSER HIPODROMO 2641",
  "GASERVICIO MATAMOROS 7082", "ORSAN PENINSULARES", "RENDICHICAS REFUGIO 2 6570",
  "ENERSER AEROPUERTO 13059", "RENDICHICAS PEDREGAL 8035", "ENERSER VALLE REDONDO 4764",
  "SERVICIO RUDAMETKIN 2604", "ENERSER LIBRAMIENTO 4123", "SERVICIO SAN RAFAEL 10066",
  "RENDICHICAS ANABEL 6214", "GRUPO ECO MAESTROS 11829", "GASERVICIO HERMOSUR 12078",
  "ECO ENERMAR DELICIAS 1632", "SERVICIO FARI 4154", "PETRO 7 SILZA TIJUANA 7355",
  "CENTRA NOGALES E14826", "ENERSER MARINERO 4622", "RENDICHICAS TRANSPENIN 7120",
  "ENERSER AEROPUERTO MXL 8042", "ENERSER CERRO DLAS ABEJAS10782", "CENTRA ESTACION GASHER 1850",
  "ESTACION ARROYO HONDO 12026", "MAX GAS 5267", "DAGAL 1946", "GASOMAX 6525"
];

function App() {
  const [sesion, setSesion] = useState<any>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [modulo, setModulo] = useState<string | null>(null);
  const [datos, setDatos] = useState<any[]>([]);
  const [datosFiltrados, setDatosFiltrados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyStr = hoy.toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [filtroConductor, setFiltroConductor] = useState("");
  const [filtroRegion, setFiltroRegion] = useState("");
  const [filtroCentros, setFiltroCentros] = useState<string[]>([]);
  const [centroDropdownOpen, setCentroDropdownOpen] = useState(false);
  const [busquedaCentro, setBusquedaCentro] = useState("");
  const [filtroProveedores, setFiltroProveedores] = useState<string[]>([]);
  const [proveedorDropdownOpen, setProveedorDropdownOpen] = useState(false);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [filtroEstados, setFiltroEstados] = useState<string[]>([]);
  const [estadoDropdownOpen, setEstadoDropdownOpen] = useState(false);

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

  const idPeticionActual = useRef(0);

  useEffect(() => {
    if (modulo === "combustible") cargarDatos();
  }, [modulo, fechaInicio, fechaFin, filtroConductor, filtroRegion, filtroCentros, filtroProveedores, filtroEstados]);

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
      if (filtroConductor) query = query.ilike("conductor", `%${filtroConductor}%`);
      if (filtroRegion) query = query.eq("region", filtroRegion);
      if (filtroCentros.length > 0) query = query.in("centro_costos", filtroCentros);
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
    setDatos(todasLasFilas);
    setDatosFiltrados(todasLasFilas);
    setCargando(false);
  };

  const limpiarFiltros = () => {
    setFechaInicio(primerDiaMes);
    setFechaFin(hoyStr);
    setFiltroConductor("");
    setFiltroRegion("");
    setFiltroCentros([]);
    setFiltroProveedores([]);
    setFiltroEstados([]);
  };

  const regiones = [...new Set(datos.map(r => r.region).filter(Boolean))];
  const estadosDisponibles = [...new Set(datos.map(r => r.estado_transaccion).filter(Boolean))];

  const toggleEstado = (estado: string) => {
    setFiltroEstados(prev =>
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    );
  };

  const toggleCentro = (centro: string) => {
    setFiltroCentros(prev =>
      prev.includes(centro) ? prev.filter(c => c !== centro) : [...prev, centro]
    );
  };

  const toggleProveedor = (proveedor: string) => {
    setFiltroProveedores(prev =>
      prev.includes(proveedor) ? prev.filter(p => p !== proveedor) : [...prev, proveedor]
    );
  };

  const centrosFiltradosBusqueda = CENTROS_COSTOS.filter(c =>
    c.toLowerCase().includes(busquedaCentro.toLowerCase())
  );

  const proveedoresFiltradosBusqueda = PROVEEDORES.filter(p =>
    p.toLowerCase().includes(busquedaProveedor.toLowerCase())
  );

  const datosConRend = datosFiltrados.map(r => ({
    ...r,
    rendReal: parseFloat(r.rendimiento_real) || 0
  }));

  const totalOK = datosFiltrados.filter(r => r.cumplimiento === "OK").length;
  const totalAbajo = datosFiltrados.filter(r => r.cumplimiento === "POR ABAJO").length;
  const totalArriba = datosFiltrados.filter(r => r.cumplimiento === "POR ARRIBA").length;
  const sumaRecorridoTotal = datosConRend.reduce((a, r) => a + (parseFloat(r.recorrido) || 0), 0);
  const sumaLitrosTotal = datosConRend.reduce((a, r) => a + (parseFloat(r.litros) || 0), 0);
  const sumaLitrosPorEstandarTotal = datosConRend.reduce((a, r) => {
    const est = parseFloat(r.rendimiento_estandar) || 0;
    const lit = parseFloat(r.litros) || 0;
    return est > 0 ? a + est * lit : a;
  }, 0);
  const promEstandar = sumaLitrosTotal > 0
    ? (sumaLitrosPorEstandarTotal / sumaLitrosTotal).toFixed(2)
    : 0;
  const promReal = sumaLitrosTotal > 0
    ? (sumaRecorridoTotal / sumaLitrosTotal).toFixed(2)
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

  if (cargandoSesion) {
    return (
      <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "Arial, sans-serif" }}>
        Cargando...
      </div>
    );
  }

  if (!sesion) {
    return <Login />;
  }

  if (modulo === "combustible") {
    return (
      <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", fontFamily: "Arial, sans-serif" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "16px 32px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "2px solid #c0392b" }}>
          <button onClick={() => setModulo(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}>← Volver</button>
          <span style={{ fontSize: "20px" }}>⛽</span>
          <h1 style={{ margin: 0, fontSize: "20px", color: "#f1f5f9" }}>Eficiencia de Combustible</h1>
        </div>

        <div style={{ padding: "24px 32px", backgroundColor: "#1e293b", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "12px", alignItems: "end" }}>
            <div>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Fecha Inicio</p>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Fecha Fin</p>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Conductor</p>
              <input type="text" placeholder="Buscar conductor..." value={filtroConductor} onChange={e => setFiltroConductor(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Región</p>
              <select value={filtroRegion} onChange={e => setFiltroRegion(e.target.value)} style={inputStyle}>
                <option value="">Todas</option>
                {regiones.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ position: "relative" }}>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Centro de Costos</p>
              <button
                onClick={() => setCentroDropdownOpen(!centroDropdownOpen)}
                style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {filtroCentros.length === 0 ? "Todos" : filtroCentros.length === 1 ? filtroCentros[0] : "Varios"}
                </span>
                <span style={{ fontSize: "10px", marginLeft: "8px" }}>▼</span>
              </button>
              {centroDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "8px",
                  zIndex: 10,
                  maxHeight: "280px",
                  overflowY: "auto",
                  width: "320px"
                }}>
                  <input
                    type="text"
                    placeholder="Buscar centro..."
                    value={busquedaCentro}
                    onChange={e => setBusquedaCentro(e.target.value)}
                    style={{ ...inputStyle, marginBottom: "8px" }}
                  />
                  {centrosFiltradosBusqueda.map(centro => (
                    <label key={centro} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "13px", color: "#f1f5f9" }}>
                      <input
                        type="checkbox"
                        checked={filtroCentros.includes(centro)}
                        onChange={() => toggleCentro(centro)}
                      />
                      {centro}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 4px" }}>Proveedor</p>
              <button
                onClick={() => setProveedorDropdownOpen(!proveedorDropdownOpen)}
                style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {filtroProveedores.length === 0 ? "Todos" : filtroProveedores.length === 1 ? filtroProveedores[0] : "Varios"}
                </span>
                <span style={{ fontSize: "10px", marginLeft: "8px" }}>▼</span>
              </button>
              {proveedorDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "8px",
                  zIndex: 10,
                  maxHeight: "280px",
                  overflowY: "auto",
                  width: "320px"
                }}>
                  <input
                    type="text"
                    placeholder="Buscar proveedor..."
                    value={busquedaProveedor}
                    onChange={e => setBusquedaProveedor(e.target.value)}
                    style={{ ...inputStyle, marginBottom: "8px" }}
                  />
                  {proveedoresFiltradosBusqueda.map(proveedor => (
                    <label key={proveedor} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "13px", color: "#f1f5f9" }}>
                      <input
                        type="checkbox"
                        checked={filtroProveedores.includes(proveedor)}
                        onChange={() => toggleProveedor(proveedor)}
                      />
                      {proveedor}
                    </label>
                  ))}
                </div>
              )}
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
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "8px",
                  zIndex: 10,
                  maxHeight: "220px",
                  overflowY: "auto"
                }}>
                  {estadosDisponibles.length === 0 ? (
                    <p style={{ color: "#64748b", fontSize: "12px", margin: "4px" }}>Sin datos cargados</p>
                  ) : (
                    estadosDisponibles.map(estado => (
                      <label key={estado} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "13px", color: "#f1f5f9" }}>
                        <input
                          type="checkbox"
                          checked={filtroEstados.includes(estado)}
                          onChange={() => toggleEstado(estado)}
                        />
                        {estado}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <button onClick={limpiarFiltros} style={{ marginTop: "12px", backgroundColor: "#334155", border: "none", color: "#94a3b8", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
            Limpiar filtros
          </button>
        </div>

        <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "16px" }}>
          <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #10b981" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Cargas OK</p>
            <h2 style={{ color: "#10b981", margin: "8px 0 0", fontSize: "32px" }}>{totalOK}</h2>
          </div>
          <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #c0392b" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Cargas POR ABAJO</p>
            <h2 style={{ color: "#c0392b", margin: "8px 0 0", fontSize: "32px" }}>{totalAbajo}</h2>
          </div>
          <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #f59e0b" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Cargas POR ARRIBA</p>
            <h2 style={{ color: "#f59e0b", margin: "8px 0 0", fontSize: "32px" }}>{totalArriba}</h2>
          </div>
          <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #94a3b8" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Rend. Estándar Prom.</p>
            <h2 style={{ color: "#f1f5f9", margin: "8px 0 0", fontSize: "28px" }}>{promEstandar} <span style={{ fontSize: "14px" }}>km/L</span></h2>
          </div>
          <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #3b82f6" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Rend. Promedio Real</p>
            <h2 style={{ color: "#3b82f6", margin: "8px 0 0", fontSize: "28px" }}>{promReal} <span style={{ fontSize: "14px" }}>km/L</span></h2>
          </div>
          <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", borderTop: "4px solid #8b5cf6" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Total Registros</p>
            <h2 style={{ color: "#8b5cf6", margin: "8px 0 0", fontSize: "32px" }}>{datosFiltrados.length}</h2>
          </div>
        </div>

        <div style={{ padding: "0 32px 32px" }}>
          {cargando ? (
            <p style={{ color: "#94a3b8" }}>Cargando datos...</p>
          ) : (
            <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ color: "#f1f5f9", marginTop: 0 }}>Detalle de Cargas ({datosFiltrados.length} registros)</h3>
                <button
                  onClick={() => descargarCSV(
                    datosConRend.map(r => ({
                      Fecha: r.fecha,
                      Conductor: r.conductor,
                      Vehiculo: r.id_vehiculo,
                      Litros: parseFloat(r.litros || 0).toFixed(2),
                      Recorrido_km: parseFloat(r.recorrido || 0).toFixed(0),
                      Rend_Real: r.rendReal.toFixed(2),
                      Rend_Estandar: parseFloat(r.rendimiento_estandar || 0).toFixed(2),
                      Proveedor: r.proveedor,
                      Region: r.region,
                      Estado_Transaccion: r.estado_transaccion,
                      Status: r.cumplimiento || "S/D"
                    })),
                    "eficiencia_combustible"
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
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Fecha</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Conductor</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Vehículo</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Litros</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Recorrido</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Rend. Real</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Rend. Estándar</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Proveedor</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Región</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Estado</th>
                      <th style={{ color: "#94a3b8", textAlign: "left", padding: "12px", fontWeight: "normal" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosConRend.slice(0, 100).map((row, i) => {
                      const status = row.cumplimiento || "S/D";
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                          <td style={{ padding: "12px", color: "#94a3b8", whiteSpace: "nowrap" }}>{row.fecha}</td>
                          <td style={{ padding: "12px", color: "#f1f5f9" }}>{row.conductor}</td>
                          <td style={{ padding: "12px", color: "#f1f5f9" }}>{row.id_vehiculo}</td>
                          <td style={{ padding: "12px", color: "#f1f5f9" }}>{parseFloat(row.litros || 0).toFixed(2)}</td>
                          <td style={{ padding: "12px", color: "#f1f5f9" }}>{parseFloat(row.recorrido || 0).toFixed(0)} km</td>
                          <td style={{ padding: "12px", color: "#f1f5f9" }}>{row.rendReal.toFixed(2)} km/L</td>
                          <td style={{ padding: "12px", color: "#94a3b8" }}>{parseFloat(row.rendimiento_estandar || 0).toFixed(2)} km/L</td>
                          <td style={{ padding: "12px", color: "#94a3b8" }}>{row.proveedor}</td>
                          <td style={{ padding: "12px", color: "#94a3b8" }}>{row.region}</td>
                          <td style={{ padding: "12px", color: "#94a3b8" }}>{row.estado_transaccion}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              backgroundColor: status === "OK" ? "#10b98122" : status === "POR ABAJO" ? "#c0392b22" : status === "POR ARRIBA" ? "#f59e0b22" : "#33415522",
                              color: status === "OK" ? "#10b981" : status === "POR ABAJO" ? "#c0392b" : status === "POR ARRIBA" ? "#f59e0b" : "#64748b",
                              padding: "4px 12px",
                              borderRadius: "20px",
                              fontSize: "12px"
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

  if (modulo === "centro_costos") {
    return <CentroCostos onVolver={() => setModulo(null)} />;
  }

  if (modulo === "unidades") {
    return <Unidades onVolver={() => setModulo(null)} />;
  }

  if (modulo === "conductores") {
    return <Conductores onVolver={() => setModulo(null)} />;
  }

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#1e293b", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderBottom: "2px solid #c0392b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🚛</span>
          <h1 style={{ margin: 0, fontSize: "20px", color: "#f1f5f9" }}>Control Transportes — Bachoco Noroeste</h1>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ background: "none", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer", fontSize: "13px", padding: "6px 14px", borderRadius: "8px" }}
        >
          Cerrar sesión
        </button>
      </div>
      <div style={{ padding: "32px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        <div onClick={() => setModulo("combustible")} style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px", borderLeft: "4px solid #c0392b", cursor: "pointer" }}>
          <div style={{ fontSize: "32px" }}>⛽</div>
          <h2 style={{ color: "#f1f5f9", marginTop: "8px" }}>Eficiencia de Combustible</h2>
          <p style={{ color: "#94a3b8" }}>Análisis de rendimiento y desviaciones por conductor y unidad.</p>
        </div>
        <div onClick={() => setModulo("centro_costos")} style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px", borderLeft: "4px solid #10b981", cursor: "pointer" }}>
          <div style={{ fontSize: "32px" }}>🏢</div>
          <h2 style={{ color: "#f1f5f9", marginTop: "8px" }}>Centro de Costos</h2>
          <p style={{ color: "#94a3b8" }}>Cumplimiento, $ en riesgo y casos a revisar por área.</p>
        </div>
        <div onClick={() => setModulo("unidades")} style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px", borderLeft: "4px solid #06b6d4", cursor: "pointer" }}>
          <div style={{ fontSize: "32px" }}>🚚</div>
          <h2 style={{ color: "#f1f5f9", marginTop: "8px" }}>Unidades</h2>
          <p style={{ color: "#94a3b8" }}>Desempeño, choferes y centros de costos por vehículo.</p>
        </div>
        <div onClick={() => setModulo("conductores")} style={{ backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px", borderLeft: "4px solid #3b82f6", cursor: "pointer" }}>
          <div style={{ fontSize: "32px" }}>👨‍✈️</div>
          <h2 style={{ color: "#f1f5f9", marginTop: "8px" }}>Conductores</h2>
          <p style={{ color: "#94a3b8" }}>Desempeño, unidades manejadas y desviación por chofer.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
