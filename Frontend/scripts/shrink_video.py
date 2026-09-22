"""
Reduce un video a un ancho objetivo y le quita el audio.

Se usa para las animaciones de reacción del control de sonido: se ven en un
recuadro pequeño y van mudas (el sonido es la música del sitio), así que servir
el original en alta resolución sería tirar megas a la basura.

Uso (desde la carpeta Frontend):
    python scripts/shrink_video.py <entrada.mp4> <salida.mp4> [ancho]

Requiere: pip install opencv-python
"""

import sys
from pathlib import Path

import cv2

DEFAULT_WIDTH = 420


def shrink(source: Path, target: Path, width: int) -> None:
    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        raise SystemExit(f"No se pudo abrir {source}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 24
    src_w = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    # alto par: algunos codificadores rechazan dimensiones impares
    height = int(round(src_h * width / src_w)) // 2 * 2

    target.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(target), cv2.VideoWriter_fourcc(*"avc1"), fps, (width, height))
    if not writer.isOpened():
        raise SystemExit("El codificador H.264 no está disponible en este OpenCV")

    frames = 0
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        writer.write(cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA))
        frames += 1

    capture.release()
    writer.release()

    before = source.stat().st_size / 1024
    after = target.stat().st_size / 1024
    print(
        f"{target.name}: {width}x{height} · {frames} fotogramas · "
        f"{before:.0f} KB -> {after:.0f} KB"
    )


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit("uso: python scripts/shrink_video.py <entrada> <salida> [ancho]")
    shrink(Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_WIDTH)
