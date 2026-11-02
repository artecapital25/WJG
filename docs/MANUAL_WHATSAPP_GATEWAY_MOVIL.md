# Guía Maestra: WhatsApp Gateway Móvil (Termux & Multi-Dispositivo)
**WJGEEKS 3D PRO v3.1** — Canal Oficial WhatsApp (+57 320 2796115)

---

## 1. ¿Cómo funciona la conexión fuera de la red local (Wi-Fi)?

Para entender por qué se necesita una configuración especial al salir del taller, debemos diferenciar los dos tramos de la conexión:

```mermaid
flowchart TD
    subgraph Internet_Meta [Red Meta / WhatsApp]
        MetaServer["Servidores Meta WhatsApp<br/>(wss://web.whatsapp.com)"]
    end

    subgraph Celular_Servidor [Celular Servidor (Termux)]
        TermuxNode["Node.js + Baileys<br/>Puerto 3001"]
    end

    subgraph Clientes_WJG [Clientes WJGEEKS 3D]
        PC["PC Taller (Vite / Navegador)"]
        MovilWendy["Celular Wendy (En ruta / 4G)"]
        PortatilGerman["Laptop Germán (En casa)"]
    end

    TermuxNode <-->|"Internet Global (Wi-Fi o Datos 4G)"| MetaServer
    PC -->|"Misma Red Wi-Fi o USB ADB"| TermuxNode
    MovilWendy -.->|"Requiere Túnel HTTPS o Red Pública"| TermuxNode
    PortatilGerman -.->|"Requiere Túnel HTTPS o Red Pública"| TermuxNode
```

### El Tramo Celular <-> WhatsApp
- El celular con Termux **siempre funciona**, tenga Wi-Fi o datos móviles 4G, porque se conecta hacia los servidores mundiales de WhatsApp.

### El Tramo App Web (Navegador) <-> Celular
- **Si estás en el taller (Misma red Wi-Fi o cable USB):** La aplicación web se comunica directamente con la IP interna del celular (ej: `http://192.168.1.9:3001`) o vía USB (`http://localhost:3001`).
- **Si estás fuera del taller (Datos móviles, casa o cliente):** Tu navegador no puede ver la IP `192.168.1.9` porque las IPs que empiezan por `192.168.` son **privadas de cada router local**.

---

## 2. Opciones para Conectar desde Cualquier Red o Datos Móviles

### Opción A (Recomendada y 100% Gratuita): Túnel HTTPS con Cloudflare o Pinggy
Permite que el celular exponga su puerto 3001 a través de una URL segura HTTPS pública sin abrir puertos en el router.

1. En Termux en el celular servidor, ejecuta una sola vez:
   ```bash
   pkg install cloudflared -y
   ```
2. Inicia el túnel gratuito:
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```
3. Cloudflare te entregará una URL como:
   `https://tu-enlace-seguro.trycloudflare.com`
4. En **WJGEEKS 3D PRO**, abre el botón de **WhatsApp** > pestaña **Ajustes**, pega esa URL en **URL del Gateway de WhatsApp** y guarda.
5. ¡Listo! Cualquier miembro del equipo (Germán, Wendy, Juan) podrá enviar cotizaciones y abonos desde cualquier lugar del mundo.

### Opción B: Fallback Automático Asistido (Sin configuración)
Si el Gateway no está accesible porque estás en la calle con datos móviles, el sistema activa automáticamente el **Modo Asistido**:
- Abre WhatsApp con la plantilla redactada lista para enviar (`wa.me/+57...`), sin interrumpir la operación comercial ni perder clientes.

---

## 3. ¿Se puede tener el servidor activo en varios dispositivos?

### ¡Sí! Protocolo Multi-Device de WhatsApp
WhatsApp permite conectar hasta **4 dispositivos acompañantes simultáneos** a una misma cuenta (+57 320 2796115).

Esto permite tener una arquitectura de alta disponibilidad:
- **Dispositivo Principal (24/7):** Celular Samsung Galaxy A22 en el taller con cargador conectado y Termux activo.
- **Dispositivo de Respaldo 1:** La PC principal del taller ejecutando `npm run wa:gateway`.
- **Dispositivo de Respaldo 2:** Un celular secundario o de repuesto con Termux listo.

> [!NOTE]
> Cada dispositivo acompañante mantiene su propia sesión criptográfica en su carpeta local `auth_info_baileys/`. Puedes vincular ambos escaneando el código QR de cada uno desde el WhatsApp del celular oficial.

---

## 4. Manual Paso a Paso: Cómo Activar el Servidor en CUALQUIER Celular de Respaldo

Si el teléfono principal se apaga, se daña o se queda sin batería, puedes convertir cualquier celular Android en el servidor de WhatsApp en menos de 5 minutos:

### Paso 1: Instalar Termux
- Descarga e instala **Termux** desde [F-Droid](https://f-droid.org/packages/com.termux/) o [GitHub Oficial de Termux](https://github.com/termux/termux-app/releases).
- *(Evita descargarlo de Google Play Store, ya que esa versión está congelada).*

### Paso 2: Preparar Node.js
Abre Termux en el nuevo teléfono y ejecuta:
```bash
pkg update -y
pkg install nodejs -y
```

### Paso 3: Copiar el Servidor Autónomo al Celular

#### Método Automatizado (Por Cable USB con la PC):
1. Conecta el nuevo celular a la PC con cable USB y activa **Depuración por USB**.
2. En la terminal de la PC en la carpeta del proyecto, ejecuta:
   ```powershell
   npm run wa:phone
   ```
   *(El script detectará el nuevo celular, transferirá el motor Baileys autónomo y redireccionará el puerto 3001).*

#### Método Directo (Sin PC, descargando en el celular):
En Termux, ejecuta:
```bash
curl -L https://raw.githubusercontent.com/artecapital25/WJG/main/scripts/whatsapp_gateway_server.cjs -o server.cjs
npm install @whiskeysockets/baileys qrcode pino
```

### Paso 4: Evitar que Android Suspenda Termux
Para que el celular no mate el proceso al apagar la pantalla:
1. En Termux ejecuta:
   ```bash
   termux-wake-lock
   ```
2. En los ajustes de Android del teléfono:
   - Ve a **Ajustes > Aplicaciones > Termux > Batería**.
   - Selecciona **Sin restricciones** (desactiva el ahorro de energía para Termux).

### Paso 5: Iniciar el Servidor
```bash
node server.cjs
```
Verás en la pantalla del celular:
```text
======================================================
🚀 WJGEEKS 3D - WHATSAPP GATEWAY REAL INICIADO
======================================================
📱 Línea Oficial:    +57 320 2796115
🌐 Servidor REST:    http://localhost:3001
======================================================
```

### Paso 6: Obtener la IP y Conectar WJGEEKS
1. En Termux escribe:
   ```bash
   ifconfig
   ```
   Busca la dirección `inet` de la red Wi-Fi (ejemplo: `192.168.1.15`).
2. Entra a **WJGEEKS 3D PRO** desde la PC o celular:
   - Haz clic en el icono de **WhatsApp** en la cabecera.
   - Ve a la pestaña **Ajustes & Meta API**.
   - En **URL del Gateway de WhatsApp**, escribe: `http://192.168.1.15:3001` (usando la IP del nuevo celular).
   - Haz clic en **Guardar Configuración**.
3. Ve a la pestaña **Vincular Celular (QR)** y escanea el código desde el WhatsApp oficial.

---

## 5. Resumen de Comandos Rápidos para el Equipo

| Situación | Comando / Acción |
| :--- | :--- |
| **Encender en la PC local** | `npm run wa:gateway` |
| **Enlazar celular por USB** | `npm run wa:phone` |
| **Mantener Termux despierto** | `termux-wake-lock` en el celular |
| **Verificar estado en navegador** | `http://localhost:3001/status` |
| **Resetear sesión corrupta** | Botón *"Limpiar / Resetear Sesión"* en el modal de WhatsApp |
