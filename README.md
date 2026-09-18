# Plataforma Web de Conversión de Vídeo 2D a 3D Estereoscópico

Una plataforma web modular y profesional para convertir vídeos 2D a vídeo 3D estereoscópico en tiempo real con procesamiento frame-by-frame en el servidor.

---

## 🌟 Características Principales

1. **Pipeline Real de Procesamiento de Vídeo (Sin Demostraciones Falsas):**
   - Análisis y extracción de fotogramas mediante FFmpeg y OpenCV.
   - Cálculo de mapas de profundidad escalados de `0.0` (fondo lejano) a `1.0` (primer plano).
   - Generación de perspectivas independientes (*Left Eye* / *Right Eye*) mediante reproyección y desplazamiento horizontal dependiente de la profundidad estimada.
   - Algoritmo de relleno de oclusiones (*Hole Filling*) mediante propagación horizontal vecina e inpainting.
   - Reconstrucción de vídeo en contenedor MP4 conservando el audio y sincronización original.

2. **Depth Engine Modular (Sin Dependencia de APIs Externas):**
   - **Modo Automático Tradicional:** Fusional señales de visión por computador (Bordes Sobel, Densidad de Textura, Contraste de Luminancia, Flujo Óptico / Movimiento Farneback y Gradiente Vertical Prior).
   - **Modo Artístico Matemático:** Curvas de distancia radiales (*Center In / Out*), gradientes verticales/horizontales y profundidad uniforme.
   - **Estabilidad Temporal (Anti-Flicker):** Suavizado exponencial entre frames consecutivos ($\alpha$-blending) y filtrado de preservación de contornos.
   - **Arquitectura Preparada para IA:** Interfaz abstracta `DepthProvider` que permite conectar modelos de IA futuros (e.g., MiDaS, ZoeDepth, DepthPro) sin modificar los motores estéreo ni de exportación.

3. **Curva de Profundidad y Control Estereoscópico:**
   - Visualizador interactivo de curva de profundidad personalizada mediante `<canvas>`.
   - Ajustes de offset hacia dentro (*Depth In*) y hacia fuera (*Depth Out* - Pop Out effect).
   - Controles de separación interocular (*Eye Separation*), desplazamiento horizontal, inversión de ojos e inversión de mapa de profundidad.

4. **Variedad de Formatos de Salida 3D:**
   - **Anaglifos:** Rojo / Cian, Rojo / Verde, Rojo / Azul.
   - **Side-by-Side:** Full Side-by-Side (SBS Full), Half Side-by-Side (SBS Half para 3D TVs).
   - **Top / Bottom:** Formato Arriba / Abajo.
   - **Perspectivas Individuales:** Solo Ojo Izquierdo, Solo Ojo Derecho o Dual Side-by-Side.

5. **Interfaz de Usuario Web Profesional:**
   - Diseño moderno de 3 paneles (Origen, Previsualización, Configuración).
   - Modos de previsualización: *3D Result*, *Mapa de Profundidad*, *Split View Comparativo*, *Left/Right Dual View*.
   - Barra de control de tiempo (*Timestamp Picker*) para vistas previas instantáneas en cualquier segundo.
   - Responsive design adaptado a ordenadores y teléfonos móviles.

6. **Sistema de Trabajos (Job Queue & Progress):**
   - Procesamiento en segundo plano incremental para evitar consumo excesivo de memoria RAM.
   - Estimación de tiempo restante (ETA), fotogramas procesados y velocidad (FPS).
   - Cancelación de trabajos y limpieza automática de archivos temporales.

---

## 🛠️ Arquitectura del Sistema

```
                         +------------------------+
                         |     Frontend Web       |
                         | (HTML5 / CSS3 / ES6)   |
                         +-----------+------------+
                                     |
                                REST API
                                     v
                         +------------------------+
                         |      FastAPI App       |
                         +-----------+------------+
                                     |
       +-----------------------------+-----------------------------+
       |                             |                             |
       v                             v                             v
+--------------+             +---------------+             +---------------+
| VideoEngine  |             |  DepthEngine  |             | StereoEngine  |
|  (FFmpeg &   |             | (Traditional/ |             | (Reprojection |
|   OpenCV)    |             |  Artistic/AI) |             | & 3D Formats) |
+--------------+             +---------------+             +---------------+
       |                             |                             |
       +-----------------------------+-----------------------------+
                                     |
                                     v
                         +------------------------+
                         |      ExportEngine      |
                         |  (Encoding & Audio)    |
                         +------------------------+
```

---

## 🚀 Instalación y Despliegue

### Requisitos Previos

- Python 3.10+
- FFmpeg instalado en el sistema (`sudo apt-get install ffmpeg` / `brew install ffmpeg`)

### Instalación de Dependencias

```bash
pip install fastapi uvicorn pydantic python-multipart opencv-python imageio imageio-ffmpeg numpy pillow
```

### Iniciar el Servidor

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Acceda a la aplicación en su navegador web a través de `http://localhost:8000`.

---

## 🧪 Pruebas Automáticas

Para ejecutar la suite completa de pruebas unitarias y de integración:

```bash
PYTHONPATH=. python3 tests/test_phase1.py
PYTHONPATH=. python3 tests/test_phase2.py
PYTHONPATH=. python3 tests/test_phase3.py
PYTHONPATH=. python3 tests/test_phase4.py
```

---

## 🔒 Seguridad e Higiene de Almacenamiento

- **Validación de Archivos:** Limitación por extensión `.mp4, .mov, .avi, .mkv, .webm` y tamaño máximo.
- **Nombres Seguros:** Identificadores únicos UUID para prevenir ataques de *Path Traversal*.
- **Limpieza:** Borrado automático de directorios temporales tras completar o cancelar trabajos.
