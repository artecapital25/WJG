/**
 * Script de Respaldo Automatizado WJGEEKS 3D PRO -> Google Drive / Local
 * Ejecutar con: npm run backup
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Leer variables de entorno desde .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      env[key.trim()] = vals.join('=').trim();
    }
  });
  return env;
}

async function runBackup() {
  console.log('\n======================================================');
  console.log('🚀 WJGEEKS 3D PRO - GENERADOR DE COPIA DE SEGURIDAD');
  console.log('======================================================\n');

  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://brjzpbqxjakihpsbkqfh.supabase.co';
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  const backupData = {
    version: '2.0',
    empresa: 'WJGEEKS 3D PRO',
    timestamp: new Date().toISOString(),
    fecha_legible: new Date().toLocaleString('es-CO'),
    tablas: {}
  };

  const tablas = [
    'ordenes_trabajo',
    'abonos_pagos',
    'ventas_express',
    'cotizaciones',
    'cotizacion_items',
    'piezas_cotizacion',
    'productos_stock',
    'clientes',
    'usuarios_taller',
    'tareas_equipo',
    'solicitudes_insumos',
    'tarifas_tamanos',
    'resinas',
    'maquinas',
    'insumos',
    'configuracion_taller'
  ];

  if (supabaseUrl && supabaseKey) {
    console.log(`📡 Conectando a Supabase PostgreSQL (${supabaseUrl})...`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    for (const tabla of tablas) {
      try {
        const { data, error } = await supabase.from(tabla).select('*');
        if (error) {
          console.log(`  ⚠️  Tabla '${tabla}': ${error.message} (omitida o no inicializada)`);
          backupData.tablas[tabla] = [];
        } else {
          console.log(`  ✓ Tabla '${tabla}': ${data.length} registros extraídos.`);
          backupData.tablas[tabla] = data;
        }
      } catch (err) {
        console.log(`  ⚠️  Error leyendo tabla '${tabla}':`, err.message);
        backupData.tablas[tabla] = [];
      }
    }
  } else {
    console.log('⚠️ No se encontraron credenciales de Supabase en .env.');
  }

  // Guardar archivo en carpeta /backups
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
  const filename = `WJGEEKS_Backup_${dateStr}_${timeStr}.json`;
  const targetPath = path.join(backupsDir, filename);

  fs.writeFileSync(targetPath, JSON.stringify(backupData, null, 2), 'utf-8');
  const stats = fs.statSync(targetPath);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log('\n------------------------------------------------------');
  console.log(`✅ ¡Copia de seguridad generada con éxito!`);
  console.log(`📁 Archivo: ${targetPath}`);
  console.log(`📦 Tamaño: ${sizeKb} KB`);
  console.log('------------------------------------------------------\n');
  console.log('💡 CÓMO SINCRONIZAR AUTOMÁTICAMENTE CON GOOGLE DRIVE:');
  console.log('1. Si tienes instalado "Google Drive para computadoras",');
  console.log('   puedes copiar este archivo o crear un acceso directo');
  console.log('   de la carpeta "backups" hacia tu Google Drive:');
  console.log('   (Ej: G:\\Mi unidad\\WJGEEKS_Backups\\)');
  console.log('2. O arrastrar el archivo directamente a drive.google.com.');
  console.log('======================================================\n');
}

runBackup().catch(err => {
  console.error('❌ Error fatal generando backup:', err);
  process.exit(1);
});
