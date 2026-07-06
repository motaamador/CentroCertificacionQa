#!/bin/bash

PORT=3000

echo "=========================================="
echo "🔄 Verificando servicios en el puerto $PORT..."
echo "=========================================="

# Buscar procesos de Next.js en ejecución
echo "🛑 Deteniendo procesos de Next.js si existen..."
pkill -f "next-server" || true
pkill -f "next dev" || true

# Por si acaso, liberar el puerto
PID=$(lsof -t -i:$PORT || true)
if [ -n "$PID" ]; then
    echo "⚠️ Liberando puerto $PORT (PID: $PID)..."
    kill -9 $PID || true
fi

echo "✅ Procesos limpiados."

sleep 1

echo ""
echo "=========================================="
echo "🚀 Iniciando qa-cert-dashboard (Next.js)..."
echo "=========================================="

# Ejecutar el comando de desarrollo
npm run dev
