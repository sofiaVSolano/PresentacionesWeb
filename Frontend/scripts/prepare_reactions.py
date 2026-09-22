"""
Prepara las animaciones con las que la muñequita reacciona al control de sonido.

Se ven en un recuadro pequeño, así que en vez de servir el MP4 entero (varios
megas) se parten en fotogramas WebP recortados al tramo que de verdad cuenta:
el gesto de ponerse o quitarse los audífonos. El resto del clip sobra.

Uso (desde la carpeta Frontend):
    python scripts/prepare_reactions.py

Requiere: pip install opencv-python pillow
"""

from pathlib import Path

import cv2
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
VIDEO_DIR = ROOT / "source-assets" / "video"
OUT_DIR = ROOT / "public" / "assets" / "reactions"
DATA_FILE = ROOT / "src" / "data" / "reactionFrames.ts"

# nombre -> (archivo, inicio, fin) en fracción del video.
# Los tramos se eligieron mirando el video: fuera la introducción y la cola.
CLIPS = {
    "on": ("AnimacionMusica.mp4", 0.10, 0.86),
    "off": ("AnimacionSinMusica.mp4", 0.25, 1.0),
}

STEP = 2  # 1 de cada 2 fotogramas: la mitad de peso y sigue fluido
WIDTH = 340  # el doble de lo que mide en pantalla
QUALITY = 74
FPS = 18  # ritmo de reproducción: algo más vivo que el original


def main() -> None:
    entries: list[tuple[str, int]] = []

    for name, (filename, start, end) in CLIPS.items():
        capture = cv2.VideoCapture(str(VIDEO_DIR / filename))
        if not capture.isOpened():
            raise SystemExit(f"No se pudo abrir {filename}")

        total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        first, last = int(total * start), int(total * end)

        folder = OUT_DIR / name
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob("*.webp"):
            old.unlink()

        capture.set(cv2.CAP_PROP_POS_FRAMES, first)
        index, kept, size = first, 0, 0
        while index < last:
            ok, frame = capture.read()
            if not ok:
                break
            if (index - first) % STEP == 0:
                image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                image.thumbnail((WIDTH, WIDTH), Image.LANCZOS)
                kept += 1
                out = folder / f"frame-{kept:03d}.webp"
                image.save(out, "WEBP", quality=QUALITY, method=5)
                size += out.stat().st_size
            index += 1
        capture.release()

        entries.append((name, kept))
        print(f"{name}: {kept} fotogramas · {size / 1024:.0f} KB")

    lines = [
        "// GENERADO por scripts/prepare_reactions.py — no editar a mano.",
        "export const reactionFrames = {",
    ]
    for name, count in entries:
        lines.append(f"  {name}: {{ count: {count}, basePath: '/assets/reactions/{name}', fps: {FPS} }},")
    lines += ["} as const", "", "export type ReactionName = keyof typeof reactionFrames", ""]
    DATA_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"escrito: {DATA_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
