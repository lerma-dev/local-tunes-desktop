#!/bin/bash
echo ""
echo "Ingresa la version (formato vX.Y.Z)"
read -p "> " INPUT_VERSION

if [[ ! "$INPUT_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: usa el formato vX.Y.Z (ej. v1.0.1)"
    exit 1
fi

echo ""
echo "Ingresa una Arquitecura (win-x64 o win-x86)"
read -p "> " INPUT_ARC

if [[ "$INPUT_ARC" != "win-x64" && "$INPUT_ARC" != "win-x86" ]]; then
  echo "Arquitectura inválida. Usa win-x64 o win-x86" >&2
  exit 1
fi

OUT="build/$INPUT_VERSION/$INPUT_ARC"

# Compilar el proyecto en modo Release para win-x64
dotnet publish windows/localtunes.csproj \
  -c Release \
  -r "$INPUT_ARC" \
  --self-contained true \
  -p:PublishSingleFile=true \
  -p:PublishReadyToRun=true \
  -p:PublishTrimmed=false \
  -o "$OUT"

# Eliminar archivos .pdb y .xml innecesarios de la compilación
rm -f "$OUT"/*.pdb "$OUT"/*.xml

echo ""
echo "Listo: $OUT"
echo "Abre: $OUT/localtunes.exe"
echo ""
echo "Si no usas el instalador, copia TODA la carpeta ($OUT)"
echo "a la carpeta donde guardes tus aplicaciones."
echo "No muevas solo el .exe."
echo ""
echo "Instalador: compila windows/setup.iss con Inno Setup"