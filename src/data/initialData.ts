// Datos maestros extraídos directamente del libro de producción WJGEEKS.xlsx
// Contiene 31 clientes, 10 tipos de resina, 31 insumos de taller y máquinas oficiales.

export interface Resina {
  id: string;
  tipo: string;
  marca: string;
  color: string;
  volumen_l: number;
  densidad_g_cm3: number;
  peso_g: number;
  precio_compra: number;
  costo_gramo: number;
  velocidad_impresion_mm_h: number;
  resumen: string;
}

export interface Insumo {
  id: string;
  codigo: number;
  nombre: string;
  marca: string;
  categoria: string;
  presentacion: number;
  costo_total: number;
  costo_unitario: number;
  enlace_compra?: string;
  descripcion?: string;
}

export interface Maquina {
  id: string;
  nombre: string;
  tipo: string;
  consumo_kwh: number;
  costo_minuto: number;
  estado: string;
}

export interface Personal {
  id: string;
  rol: string;
  costo_hora: number;
  costo_minuto: number;
}

export interface Cliente {
  id: string;
  codigo: number;
  nombre: string;
  nit_cc: string;
  telefono: string;
  correo: string;
}

export interface ConfiguracionTaller {
  tarifa_kwh: number;
  margen_merma_resina: number;
  telefono_contacto: string;
  telefono_contacto2: string;
  instagram: string;
  nequi: string;
  daviplata: string;
  bancolombia: string;
  titular_cuenta: string;
}

export const RESINAS_INICIALES: Resina[] = [
  {
    "id": "res-1",
    "tipo": "Resina Standar",
    "marca": "Anycubic",
    "color": "Negro",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.13,
    "peso_g": 1130.0,
    "precio_compra": 89000.0,
    "costo_gramo": 78.76106195,
    "velocidad_impresion_mm_h": 20.0,
    "resumen": "Resina Standar \nColor Negro"
  },
  {
    "id": "res-2",
    "tipo": "Resina High speed",
    "marca": "Anycubic",
    "color": "Negro",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.14,
    "peso_g": 1140.0,
    "precio_compra": 153000.0,
    "costo_gramo": 135.3982301,
    "velocidad_impresion_mm_h": 50.0,
    "resumen": "Resina High speed \nColor Negro"
  },
  {
    "id": "res-3",
    "tipo": "Resina Standar",
    "marca": "Anycubic",
    "color": "traslucida",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.13,
    "peso_g": 1130.0,
    "precio_compra": 90000.0,
    "costo_gramo": 79.6460177,
    "velocidad_impresion_mm_h": 20.0,
    "resumen": "Resina Standar \nColor traslucida"
  },
  {
    "id": "res-4",
    "tipo": "Resina Standar",
    "marca": "Anycubic",
    "color": "Gris",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.13,
    "peso_g": 1130.0,
    "precio_compra": 90000.0,
    "costo_gramo": 79.6460177,
    "velocidad_impresion_mm_h": 20.0,
    "resumen": "Resina Standar \nColor Gris"
  },
  {
    "id": "res-5",
    "tipo": "Resina Standar",
    "marca": "Anycubic",
    "color": "Blanca",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.13,
    "peso_g": 1130.0,
    "precio_compra": 45000.0,
    "costo_gramo": 39.82300885,
    "velocidad_impresion_mm_h": 20.0,
    "resumen": "Resina Standar \nColor Blanca"
  },
  {
    "id": "res-6",
    "tipo": "Resina Standar +",
    "marca": "Anycubic",
    "color": "Blanca",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.13,
    "peso_g": 1000.0,
    "precio_compra": 76130.0,
    "costo_gramo": 67.37168142,
    "velocidad_impresion_mm_h": 20.0,
    "resumen": "Resina Standar + \nColor Blanca"
  },
  {
    "id": "res-7",
    "tipo": "Resina Standar HD",
    "marca": "Anycubic",
    "color": "Gris",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.13,
    "peso_g": 1000.0,
    "precio_compra": 56085.0,
    "costo_gramo": 49.63274336,
    "velocidad_impresion_mm_h": 20.0,
    "resumen": "Resina Standar HD \nColor Gris"
  },
  {
    "id": "res-8",
    "tipo": "Resina Standar +",
    "marca": "Anycubic",
    "color": "Negro",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.13,
    "peso_g": 1000.0,
    "precio_compra": 64103.0,
    "costo_gramo": 56.72831858,
    "velocidad_impresion_mm_h": 20.0,
    "resumen": "Resina Standar + \nColor Negro"
  },
  {
    "id": "res-9",
    "tipo": "Resina Standar ABS",
    "marca": "Anycubic",
    "color": "Gris",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.13,
    "peso_g": 1130.0,
    "precio_compra": 86000.0,
    "costo_gramo": 76.10619469,
    "velocidad_impresion_mm_h": 30.0,
    "resumen": "Resina Standar ABS  \nColor Gris"
  },
  {
    "id": "res-10",
    "tipo": "Resina Standar ABS",
    "marca": "Anycubic",
    "color": "Negra",
    "volumen_l": 1.0,
    "densidad_g_cm3": 1.13,
    "peso_g": 1130.0,
    "precio_compra": 86000.0,
    "costo_gramo": 76.10619469,
    "velocidad_impresion_mm_h": 30.0,
    "resumen": "Resina Standar ABS  \nColor Negra"
  }
];

export const INSUMOS_INICIALES: Insumo[] = [
  {
    "id": "ins-1",
    "codigo": 1,
    "nombre": "Pintura acrilica Azul",
    "marca": "Play Art",
    "categoria": "Pintura",
    "presentacion": 60.0,
    "costo_total": 6000.0,
    "costo_unitario": 100.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-2",
    "codigo": 2,
    "nombre": "Argolla Ø 26mm",
    "marca": "Generico",
    "categoria": "Bisuteria",
    "presentacion": 1.0,
    "costo_total": 900.0,
    "costo_unitario": 900.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-3",
    "codigo": 3,
    "nombre": "Pintura acrilica cafe",
    "marca": "Play Art",
    "categoria": "Pintura",
    "presentacion": 60.0,
    "costo_total": 6000.0,
    "costo_unitario": 100.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-4",
    "codigo": 4,
    "nombre": "Alcohol isopropilico",
    "marca": "Generico",
    "categoria": "Quimicos",
    "presentacion": 4000.0,
    "costo_total": 42000.0,
    "costo_unitario": 10.5,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-5",
    "codigo": 5,
    "nombre": "Etanol 96%",
    "marca": "Generico",
    "categoria": "Quimicos",
    "presentacion": 3700.0,
    "costo_total": 38000.0,
    "costo_unitario": 10.27027027,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-6",
    "codigo": 6,
    "nombre": "Primer",
    "marca": "Generico",
    "categoria": "Pintura",
    "presentacion": 250.0,
    "costo_total": 16500.0,
    "costo_unitario": 66.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-7",
    "codigo": 7,
    "nombre": "Caja 10cm x 80cm x 80cm",
    "marca": "Generico",
    "categoria": "Empaque",
    "presentacion": 10.0,
    "costo_total": 18000.0,
    "costo_unitario": 1800.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-8",
    "codigo": 8,
    "nombre": "Caja 9cm x 6cm x 6cm",
    "marca": "Generico",
    "categoria": "Empaque",
    "presentacion": 1.0,
    "costo_total": 2000.0,
    "costo_unitario": 2000.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-9",
    "codigo": 9,
    "nombre": "Tuercas autoblocantes m3 para plastico",
    "marca": "Generico",
    "categoria": "Ferreteria",
    "presentacion": 1.0,
    "costo_total": 350.0,
    "costo_unitario": 350.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-10",
    "codigo": 10,
    "nombre": "Tornillo M3",
    "marca": "Generico",
    "categoria": "Ferreteria",
    "presentacion": 1.0,
    "costo_total": 350.0,
    "costo_unitario": 350.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-11",
    "codigo": 11,
    "nombre": "Iman neodinio 4.064mm diametro x 0.9906mm de espesor",
    "marca": "Generico",
    "categoria": "Ferreteria",
    "presentacion": 200.0,
    "costo_total": 28162.0,
    "costo_unitario": 140.81,
    "enlace_compra": "https://www.amazon.com/peque%C3%B1os-tierras-pulgadas-redondos-manualidades/dp/B0BW971948/ref=sr_1_1_sspa?__mk_es_US=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=14ZS884NKD6O4&dib=eyJ2IjoiMSJ9.ASIH-r0W7SX2KsrSmAOBGQjM3veb3dWoxlIq1DbPBjwZp5N4oE0EoIO3rqsRP6TvqOOv7ruuFJRJWYQZ_UEjCe-hyuGdUwfwSzbfhi3Ao3Z2W_XXb9mmQDx1z5roVxjMC-iXLhwzXMXWBtp1vO9UaNndKz87LcqjsF6HJO0JVNPaJLCnDBPpWi1zcPmhtmb6qznqPXfUGDIppqr8z6ot-opW91ScExiKw_fbiqvxMXQ.rywKy9zaf3KPqEy1QHrSuycVuOtdO0BUXyvZIVNHBZ4&dib_tag=se&keywords=imanes%2Bpara%2Bimpresi%C3%B3n%2B3d&qid=1752186026&sprefix=imanes%2Bpara%2Bimpresion%2B3d%2Caps%2C165&sr=8-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&th=1",
    "descripcion": ""
  },
  {
    "id": "ins-12",
    "codigo": 12,
    "nombre": "Argolla Ø4mm roscada",
    "marca": "Generico",
    "categoria": "Bisuteria",
    "presentacion": 1.0,
    "costo_total": 500.0,
    "costo_unitario": 500.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-13",
    "codigo": 13,
    "nombre": "Velcro redondo",
    "marca": "Generico",
    "categoria": "Ferreteria",
    "presentacion": 1.0,
    "costo_total": 1500.0,
    "costo_unitario": 1500.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-14",
    "codigo": 14,
    "nombre": "Vase adhesiva casco curva",
    "marca": "Generico",
    "categoria": "Ferreteria",
    "presentacion": 1.0,
    "costo_total": 7900.0,
    "costo_unitario": 7900.0,
    "enlace_compra": "https://articulo.mercadolibre.com.co/MCO-451558533-base-adhesiva-3m-gopro-curva-casco-moto-gopro--_JM#origin%3Dshare%26sid%3Dshare",
    "descripcion": ""
  },
  {
    "id": "ins-15",
    "codigo": 15,
    "nombre": "J hook go pro",
    "marca": "Generico",
    "categoria": "Ferreteria",
    "presentacion": 1.0,
    "costo_total": 10000.0,
    "costo_unitario": 10000.0,
    "enlace_compra": "https://articulo.mercadolibre.com.co/MCO-550225906-hebilla-extension-j-hook-gopro-8-_JM#origin%3Dshare%26sid%3Dshare",
    "descripcion": ""
  },
  {
    "id": "ins-16",
    "codigo": 16,
    "nombre": "Tira de velcro 2\" x 4\"",
    "marca": "Generico",
    "categoria": "Ferreteria",
    "presentacion": 1.0,
    "costo_total": 5000.0,
    "costo_unitario": 5000.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-17",
    "codigo": 17,
    "nombre": "Barniz acrilico SPRAY",
    "marca": "PRO SPRAY IT LIKE A PRO",
    "categoria": "Pintura",
    "presentacion": 400.0,
    "costo_total": 46000.0,
    "costo_unitario": 115.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-18",
    "codigo": 18,
    "nombre": "Alfiler Bisuteria",
    "marca": "Generico",
    "categoria": "Bisuteria",
    "presentacion": 100.0,
    "costo_total": 9000.0,
    "costo_unitario": 90.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-19",
    "codigo": 19,
    "nombre": "Pescador Bisuteria",
    "marca": "Generico",
    "categoria": "Bisuteria",
    "presentacion": 200.0,
    "costo_total": 34000.0,
    "costo_unitario": 170.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-20",
    "codigo": 20,
    "nombre": "Cartones Arete Bisuteria",
    "marca": "Generico",
    "categoria": "Bisuteria",
    "presentacion": 40.0,
    "costo_total": 8000.0,
    "costo_unitario": 200.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-21",
    "codigo": 21,
    "nombre": "Bolsa polipropileno 8x12",
    "marca": "Generico",
    "categoria": "Empaque",
    "presentacion": 50.0,
    "costo_total": 4500.0,
    "costo_unitario": 90.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-22",
    "codigo": 22,
    "nombre": "Sticker WJG",
    "marca": "Generico",
    "categoria": "Empaque",
    "presentacion": 200.0,
    "costo_total": 40000.0,
    "costo_unitario": 200.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-23",
    "codigo": 23,
    "nombre": "Pin y Broche",
    "marca": "Generico",
    "categoria": "Bisuteria",
    "presentacion": 100.0,
    "costo_total": 26000.0,
    "costo_unitario": 260.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-24",
    "codigo": 24,
    "nombre": "Primer acrilico Aero create",
    "marca": "Aero create",
    "categoria": "Pintura",
    "presentacion": 30.0,
    "costo_total": 12000.0,
    "costo_unitario": 400.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-25",
    "codigo": 25,
    "nombre": "Barniz acrilico mate",
    "marca": "Generico",
    "categoria": "Pintura",
    "presentacion": 80.0,
    "costo_total": 8500.0,
    "costo_unitario": 106.25,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-26",
    "codigo": 26,
    "nombre": "Tarjetas WJGEEKS",
    "marca": "Generico",
    "categoria": "Empaque",
    "presentacion": 1000.0,
    "costo_total": 83000.0,
    "costo_unitario": 83.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-27",
    "codigo": 27,
    "nombre": "tarjeta Controladora ESP32",
    "marca": "Generico",
    "categoria": "Electronico",
    "presentacion": 1.0,
    "costo_total": 40000.0,
    "costo_unitario": 40000.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-28",
    "codigo": 28,
    "nombre": "Motor paso a paso con Driver",
    "marca": "Generico",
    "categoria": "Electronico",
    "presentacion": 1.0,
    "costo_total": 25000.0,
    "costo_unitario": 25000.0,
    "enlace_compra": "",
    "descripcion": ""
  },
  {
    "id": "ins-29",
    "codigo": 29,
    "nombre": "Lampara para figuras",
    "marca": "Generico",
    "categoria": "Electronico",
    "presentacion": 1.0,
    "costo_total": 13000.0,
    "costo_unitario": 13000.0,
    "enlace_compra": "Kit De Lámpara Led Diy, Luz Brillante Y Eficiente | Cuotas sin interés",
    "descripcion": ""
  },
  {
    "id": "ins-30",
    "codigo": 30,
    "nombre": "Botes de pintura",
    "marca": "Generico",
    "categoria": "Pintura",
    "presentacion": 1.0,
    "costo_total": 130.0,
    "costo_unitario": 130.0,
    "enlace_compra": "100 Tiras De Pintura, 300 Botes Vacíos, 2 Ml, 0.07 Oz | Cuotas sin interés",
    "descripcion": "contiene 300 unidades valor total 39000"
  },
  {
    "id": "ins-31",
    "codigo": 31,
    "nombre": "pinceles",
    "marca": "Generico",
    "categoria": "Pintura",
    "presentacion": 1.0,
    "costo_total": 500.0,
    "costo_unitario": 500.0,
    "enlace_compra": "Set De 30 Pinceles Planos Y Redondos Para Pintura Artística | Cuotas sin interés",
    "descripcion": "SET DE PINCELES PLANOS Y EN PUNTA DE 30 UNIDADES A 15000 EL COMBO COMPLETO"
  }
];

export const MAQUINAS_INICIALES: Maquina[] = [
  {
    "id": "maq-1",
    "nombre": "Anycubic MONO 4",
    "tipo": "Impresora 3D Resina",
    "consumo_kwh": 0.45,
    "costo_minuto": 6.255,
    "estado": "Disponible"
  },
  {
    "id": "maq-2",
    "nombre": "Anycubic Wash y cure 3",
    "tipo": "Estación de Curado",
    "consumo_kwh": 0.36,
    "costo_minuto": 5.004,
    "estado": "Disponible"
  },
  {
    "id": "maq-3",
    "nombre": "Compresor Paasche S220R",
    "tipo": "Aerógrafo / Pintura",
    "consumo_kwh": 0.36,
    "costo_minuto": 5.004,
    "estado": "Disponible"
  }
];

export const PERSONAL_INICIAL: Personal[] = [
  {
    "id": "per-1",
    "rol": "Desarrollador",
    "costo_hora": 10000,
    "costo_minuto": 166.67
  },
  {
    "id": "per-2",
    "rol": "Comercial",
    "costo_hora": 10000,
    "costo_minuto": 166.67
  },
  {
    "id": "per-3",
    "rol": "Pintor",
    "costo_hora": 10000,
    "costo_minuto": 166.67
  }
];

export const CLIENTES_INICIALES: Cliente[] = [
  {
    "id": "cli-1",
    "codigo": 1,
    "nombre": "Juan David Guzman Orjuela",
    "nit_cc": "1.032473891E9",
    "telefono": "3217273025",
    "correo": "davidguz0812@gmail.com"
  },
  {
    "id": "cli-2",
    "codigo": 2,
    "nombre": "German Eduardo Reyes Vasquez",
    "nit_cc": "1.018480904E9",
    "telefono": "3503443140",
    "correo": "german.951026@gmail.com"
  },
  {
    "id": "cli-3",
    "codigo": 3,
    "nombre": "Wendy Samanta Castro Salgado",
    "nit_cc": "1.033796709E9",
    "telefono": "3204814702",
    "correo": "Wendysami97gmail.com"
  },
  {
    "id": "cli-4",
    "codigo": 4,
    "nombre": "Fernando Gutierrez",
    "nit_cc": "",
    "telefono": "3014136522",
    "correo": ""
  },
  {
    "id": "cli-5",
    "codigo": 5,
    "nombre": "Harold Ibarra",
    "nit_cc": "1.077033878E9",
    "telefono": "3054600613",
    "correo": "haroldib70@gmail.com"
  },
  {
    "id": "cli-6",
    "codigo": 6,
    "nombre": "Nicolas Suarez Valbuena",
    "nit_cc": "1.03246471E9",
    "telefono": "3105704614",
    "correo": "nicolasbcd2@gmail.com"
  },
  {
    "id": "cli-7",
    "codigo": 7,
    "nombre": "Sebastián Rey",
    "nit_cc": "1.02236618E9",
    "telefono": "3166249515",
    "correo": "Tkfdron@gmail.com"
  },
  {
    "id": "cli-8",
    "codigo": 8,
    "nombre": "Andres Molano",
    "nit_cc": "1.070921033E9",
    "telefono": "3208433860",
    "correo": "afmolano.psy@gmail.com"
  },
  {
    "id": "cli-9",
    "codigo": 9,
    "nombre": "Vanesa Amaya",
    "nit_cc": "1.014240456E9",
    "telefono": "3138624998",
    "correo": "vaneamaya93@gmail.com"
  },
  {
    "id": "cli-10",
    "codigo": 10,
    "nombre": "Juan Pablo Alvira",
    "nit_cc": "1.083880877E9",
    "telefono": "3114925363",
    "correo": "elmichudeyuno@gmail.com"
  },
  {
    "id": "cli-11",
    "codigo": 11,
    "nombre": "Snehider Bejarano",
    "nit_cc": "1.0136018E7",
    "telefono": "3046474970",
    "correo": "snehider1214@gmail.com"
  },
  {
    "id": "cli-12",
    "codigo": 12,
    "nombre": "Felipe Tamayo Beltrán",
    "nit_cc": "1.019418383E9",
    "telefono": "3057152903",
    "correo": "felipetamayo031@gmail.com"
  },
  {
    "id": "cli-13",
    "codigo": 13,
    "nombre": "lizeth viviana castro salgado",
    "nit_cc": "1.033740166E9",
    "telefono": "304 2113751",
    "correo": "lizth1291@gmail.com"
  },
  {
    "id": "cli-14",
    "codigo": 14,
    "nombre": "Sebastian Torres",
    "nit_cc": "",
    "telefono": "3208569175",
    "correo": "sebastianpkforlige@gmail.com"
  },
  {
    "id": "cli-15",
    "codigo": 15,
    "nombre": "Alejandro",
    "nit_cc": "",
    "telefono": "3157354626",
    "correo": ""
  },
  {
    "id": "cli-16",
    "codigo": 16,
    "nombre": "María Paula Mejia",
    "nit_cc": "1.014198116E9",
    "telefono": "3002885090",
    "correo": "mariapmejia.b@gmail.com"
  },
  {
    "id": "cli-17",
    "codigo": 17,
    "nombre": "Olga ledesma",
    "nit_cc": "",
    "telefono": "3125319667",
    "correo": ""
  },
  {
    "id": "cli-18",
    "codigo": 18,
    "nombre": "brayan Camacho",
    "nit_cc": "",
    "telefono": "",
    "correo": ""
  },
  {
    "id": "cli-19",
    "codigo": 19,
    "nombre": "Cristian Telles",
    "nit_cc": "",
    "telefono": "3023427084",
    "correo": ""
  },
  {
    "id": "cli-20",
    "codigo": 20,
    "nombre": "Joseph Rubiano",
    "nit_cc": "1.075320322E9",
    "telefono": "3023542051",
    "correo": "toterubiano@gmail.com"
  },
  {
    "id": "cli-21",
    "codigo": 21,
    "nombre": "Glori",
    "nit_cc": "",
    "telefono": "",
    "correo": ""
  },
  {
    "id": "cli-22",
    "codigo": 22,
    "nombre": "Willmer Castro",
    "nit_cc": "",
    "telefono": "",
    "correo": ""
  },
  {
    "id": "cli-23",
    "codigo": 23,
    "nombre": "Anderson",
    "nit_cc": "",
    "telefono": "3008886288",
    "correo": ""
  },
  {
    "id": "cli-24",
    "codigo": 24,
    "nombre": "Karen Gómez",
    "nit_cc": "",
    "telefono": "",
    "correo": ""
  },
  {
    "id": "cli-25",
    "codigo": 25,
    "nombre": "Jarol (Incolmat)",
    "nit_cc": "",
    "telefono": "3108561350",
    "correo": ""
  },
  {
    "id": "cli-26",
    "codigo": 26,
    "nombre": "Maria Teresa Garcia",
    "nit_cc": "5.2701382E7",
    "telefono": "3102022141",
    "correo": "gammatere@yahoo.com"
  },
  {
    "id": "cli-27",
    "codigo": 27,
    "nombre": "Cristina Sierra",
    "nit_cc": "",
    "telefono": "3212483144",
    "correo": "cristina.sierra@electroequipos.com"
  },
  {
    "id": "cli-28",
    "codigo": 28,
    "nombre": "Dayerly Perez",
    "nit_cc": "",
    "telefono": "3123747745",
    "correo": ""
  },
  {
    "id": "cli-29",
    "codigo": 29,
    "nombre": "Sebastian Aran",
    "nit_cc": "",
    "telefono": "",
    "correo": ""
  },
  {
    "id": "cli-30",
    "codigo": 30,
    "nombre": "J.B Trader institucional",
    "nit_cc": "",
    "telefono": "",
    "correo": ""
  },
  {
    "id": "cli-31",
    "codigo": 31,
    "nombre": "angela bernal",
    "nit_cc": "",
    "telefono": "",
    "correo": ""
  }
];

export const CONFIGURACION_INICIAL: ConfiguracionTaller = {
  "tarifa_kwh": 834.0,
  "margen_merma_resina": 1.4,
  "telefono_contacto": "3217273025",
  "telefono_contacto2": "3202796115",
  "instagram": "@WJGEEKS3D",
  "nequi": "3217273025",
  "daviplata": "3217273025",
  "bancolombia": "Ahorros 245-000123-98",
  "titular_cuenta": "WJGEEKS 3D"
};
