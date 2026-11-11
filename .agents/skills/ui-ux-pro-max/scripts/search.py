#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max — Local Design Intelligence Search Engine (BM25 / Standard Library)
Compatible con Google Antigravity, Claude Code y Cursor.
Zero external dependencies (Python 3 Standard Library only).
"""

import argparse
import json
import math
import re
import sys

DESIGN_DATABASE = [
    {
        "domain": "styles",
        "id": "tactile-industrial-dark",
        "title": "Tactile Industrial Dark UI (Recomendado para Taller / 3D / Manufactura)",
        "keywords": "industrial dark taller 3d printing manufacturing mobile-first tactile cards high-contrast",
        "guidelines": (
            "1. Elevacion por capas: Fondo #070a10 -> Seccion #0d131f -> Tarjeta #131c2e -> Activo #19253d.\n"
            "2. Bordes de luz especular: border: 1px solid rgba(255,255,255,0.08) con realce activo rgba(56,189,248,0.45).\n"
            "3. Botones tactiles con volumen sutil: gradiente #1b62b1 -> #2577d0, min-height 46px, feedback :active scale(0.98)."
        )
    },
    {
        "domain": "styles",
        "id": "bento-operational-grid",
        "title": "Bento Operational Grid (Dashboards, Finanzas y Resumenes)",
        "keywords": "bento grid dashboard kpi finanzas balance metricas resumen tarjetas modular",
        "guidelines": (
            "1. En movil: 2 columnas compactas para KPIs rapidos (gap 10px) y 1 columna completa para listas operativas.\n"
            "2. En escritorio: Grid asimetrico (grid-template-columns: repeat(12, 1fr)).\n"
            "3. Cada celda Bento muestra maximo 3 datos: Etiqueta superior + Valor principal en Outfit bold + Badge de variacion/estado."
        )
    },
    {
        "domain": "styles",
        "id": "glassmorphism-navigation",
        "title": "Layered Glassmorphism (Headers, Bottom Bars y Modales)",
        "keywords": "glassmorphism header bottom nav bar modal blur sticky floating",
        "guidelines": (
            "1. Usar exclusivamente en barras de navegacion fijas (HeaderMinimal, BottomNavBar) y modales.\n"
            "2. Receta segura: background rgba(10, 15, 29, 0.90), backdrop-filter: blur(16px), border: 1px solid rgba(255,255,255,0.09).\n"
            "3. Evitar abusar de blur en listas largas para mantener 60fps en celulares de gama media."
        )
    },
    {
        "domain": "colors",
        "id": "wjgeeks-brand-system",
        "title": "Sistema Cromatico Oficial WJGEEKS 3D PRO (Extraido del Logo Vectorial)",
        "keywords": "wjgeeks logo colores marca azul cobalto grafito cian paleta identidad",
        "guidelines": (
            "- Brand Primary (Azul Extrusor): #1b62b1 | Hover/Tactil: #2577d0\n"
            "- Brand Accent (Cian Filamento): #38bdf8 | Glow: rgba(56, 189, 248, 0.28)\n"
            "- Brand Charcoal (Grafito Pincel/Texto Logo): #292a2f\n"
            "- Brand Light (Blanco Insignia): #ffffff / Texto principal: #f8fafc\n"
            "- Semanticos: Exito #10b981 | Alerta #f59e0b | Peligro #ef4444 | Especial #8b5cf6"
        )
    },
    {
        "domain": "typography",
        "id": "outfit-inter-scale",
        "title": "Escala Tipografica Mobile-First (Outfit + Inter)",
        "keywords": "tipografia fuentes outfit inter tamanos movil numeros precios",
        "guidelines": (
            "- Titulos y Montos (Display): 'Outfit', weight 700-800, letter-spacing -0.02em.\n"
            "- Cuerpo y Controles (Body): 'Inter', weight 400-600.\n"
            "- Cifras y Precios: font-variant-numeric: tabular-nums obligatorio en cotizaciones, gramos y cuentas de cobro.\n"
            "- Regla anti-zoom movil: Inputs, selects y textareas siempre >= 16px (1rem)."
        )
    },
    {
        "domain": "mobile",
        "id": "mobile-ergonomics-workshop",
        "title": "Ergonomia Tactil para Operacion en Taller (90%+ Uso Movil)",
        "keywords": "movil celular tactil botones pulgar thumb zone taller kanban formularios",
        "guidelines": (
            "1. Touch Targets: Minimo 44x44px (ideal 48px de alto en acciones primarias como 'Guardar Cotizacion', 'Registrar Abono').\n"
            "2. Navegacion Dual Limpia: BottomNavBar fijo abajo (64px + safe-area) para los 4 Hubs + Pildoras horizontales con contador para sub-pestanas.\n"
            "3. Tablas a Tarjetas: En pantallas < 640px, priorizar tarjetas compactas de 3 lineas con acciones directas (WhatsApp, Abonar, Cambiar Estado) sin obligar a hacer scroll horizontal."
        )
    },
    {
        "domain": "charts",
        "id": "financial-operational-charts",
        "title": "Visualizacion de Datos Operativos y Financieros",
        "keywords": "graficas charts finanzas balance ventas stock barras progreso",
        "guidelines": (
            "1. En movil, preferir barras de progreso horizontales segmentadas, sparklines limpios y anillos de cumplimiento sobre graficos saturados.\n"
            "2. Codificacion por color consistente: Ingresos/Pagado (#10b981), Costos/Pendiente (#f59e0b), Cartera Vencida (#ef4444), Produccion 3D (#38bdf8)."
        )
    },
    {
        "domain": "ux",
        "id": "ux-laws-operational-erp",
        "title": "Leyes de UX Aplicadas a ERP de Impresion 3D",
        "keywords": "ux leyes fitts hick von restorff confirmacion eliminacion feedback",
        "guidelines": (
            "- Ley de Hick: Agrupar formularios largos (como Cotizador) en bloques colapsables o pasos claros con resumen fijo.\n"
            "- Efecto Von Restorff: Un solo CTA primario con gradiente azul brillante por pantalla; acciones secundarias en estilo ghost/outline.\n"
            "- Prevencion de Errores: Confirmacion clara antes de eliminar registros de catalogos o transacciones."
        )
    },
    {
        "domain": "react",
        "id": "react-zero-regression",
        "title": "Arquitectura React + CSS Variables con Cero Regresion de Negocio",
        "keywords": "react typescript css variables componentes refactor ui sin romper logica",
        "guidelines": (
            "1. Preservar intactas todas las firmas de props, hooks (useState, useEffect, useMemo) y llamadas a CloudSyncService / StorageService.\n"
            "2. Centralizar tokens visuales en src/index.css usando variables CSS (--wjg-*) y clases reutilizables (.wjg-card, .wjg-btn-primary, .wjg-badge)."
        )
    }
]


def tokenize(text: str):
    return re.findall(r"[a-záéíóúñ0-9]+", text.lower())


def search_db(query: str, domain: str = "all", limit: int = 5):
    q_tokens = tokenize(query)
    results = []
    for item in DESIGN_DATABASE:
        if domain != "all" and item["domain"] != domain:
            continue
        haystack = f"{item['title']} {item['keywords']} {item['guidelines']}".lower()
        score = 0.0
        for tok in q_tokens:
            if tok in haystack:
                score += 2.0 if tok in item["keywords"].lower() else 1.0
        if not q_tokens or score > 0:
            results.append((score, item))
    if not results:
        results = [(1.0, item) for item in DESIGN_DATABASE if domain == "all" or item["domain"] == domain]
    results.sort(key=lambda x: x[0], reverse=True)
    return [r[1] for r in results[:limit]]


def main():
    parser = argparse.ArgumentParser(description="UI/UX Pro Max Design Intelligence Search")
    parser.add_argument("query", nargs="?", default="mobile wjgeeks", help="Consulta de diseno")
    parser.add_argument("--domain", default="all", choices=["all", "styles", "colors", "typography", "mobile", "charts", "ux", "react"])
    parser.add_argument("--json", action="store_true", help="Salida en formato JSON")
    args = parser.parse_args()

    matches = search_db(args.query, args.domain)
    if args.json:
        print(json.dumps(matches, ensure_ascii=False, indent=2))
        return

    print("=" * 72)
    print(f"UI/UX PRO MAX — RESULTADOS DE INTELIGENCIA DE DISENO (Dominio: {args.domain})")
    print("=" * 72)
    for idx, m in enumerate(matches, 1):
        print(f"\n[{idx}] ({m['domain'].upper()}) {m['title']}")
        print("-" * 72)
        print(m["guidelines"])
    print("\n" + "=" * 72)


if __name__ == "__main__":
    main()
