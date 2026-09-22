"""
Parte los videos del sitio en fotogramas WebP para reproducirlos con el scroll.

Uso (desde la carpeta Frontend):
    python scripts/extract_frames.py

Requiere: pip install opencv-python
Si reemplazas un video en source-assets/video/, vuelve a correr este script:
regenera los fotogramas y src/data/videoFrames.ts.
"""

from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
VIDEO_DIR = ROOT / "source-assets" / "video"
ASSETS_DIR = ROOT / "public" / "assets"
DATA_FILE = ROOT / "src" / "data" / "videoFrames.ts"

# nombre en el código -> (archivo de video, limpiar fondo blanco)
# "limpiar" lleva los casi-blancos a blanco puro: quita las manchas de compresión del fondo,
# que en el sitio se funde con el crema.
VIDEOS = {
    "transformation": ("AnimacionTransformacion.mp4", False),
    "curtain": ("AnimacionTelon.mp4", True),
}

STEP = 2  # 1 de cada 2 fotogramas: fluido al hacer scroll y la mitad de peso
# ancho y calidad WebP de cada set. 1280 = resolución original: no se reescala hacia arriba.
SIZES = {"lg": (1280, 90), "sm": (960, 86)}
SHARPEN = 0.35  # máscara de enfoque suave: compensa el reescalado del navegador en pantallas grandes


def sharpen(frame):
    blurred = cv2.GaussianBlur(frame, (0, 0), 1.1)
    return cv2.addWeighted(frame, 1 + SHARPEN, blurred, -SHARPEN, 0)


def whiten(frame):
    """Transición suave: píxeles cuyo canal más oscuro supera ~215 se acercan a blanco puro."""
    darkest = frame.min(axis=2, keepdims=True).astype(np.float32)
    weight = np.clip((darkest - 212) / 28, 0, 1)
    return (frame.astype(np.float32) * (1 - weight) + 255 * weight).astype(np.uint8)


def extract(name: str, filename: str, clean: bool) -> dict:
    video = VIDEO_DIR / filename
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"No se pudo abrir el video: {video}")

    src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out_dir = ASSETS_DIR / name

    for size in SIZES:
        target = out_dir / size
        target.mkdir(parents=True, exist_ok=True)
        for old in target.glob("frame-*.webp"):
            old.unlink()

    index = 0
    written = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if index % STEP == 0:
            written += 1
            if clean:
                frame = whiten(frame)
            for size, (width, quality) in SIZES.items():
                width = min(width, src_w)
                height = round(src_h * width / src_w)
                resized = frame if width == src_w else cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
                path = out_dir / size / f"frame-{written:03d}.webp"
                cv2.imwrite(str(path), sharpen(resized), [cv2.IMWRITE_WEBP_QUALITY, quality])
        index += 1
    cap.release()

    sizes = {size: (min(w, src_w), round(src_h * min(w, src_w) / src_w)) for size, (w, _) in SIZES.items()}
    print(f"{name}: {written} fotogramas por set en {out_dir}")
    return {"count": written, "basePath": f"/assets/{name}", "sizes": sizes}


def main() -> None:
    entries = []
    for name, (filename, clean) in VIDEOS.items():
        info = extract(name, filename, clean)
        sizes_ts = ", ".join(f"{s}: {{ width: {w}, height: {h} }}" for s, (w, h) in info["sizes"].items())
        entries.append(
            f"  {name}: {{\n"
            f"    count: {info['count']},\n"
            f"    basePath: '{info['basePath']}',\n"
            f"    sizes: {{ {sizes_ts} }},\n"
            f"  }},"
        )
    DATA_FILE.write_text(
        "// Generado por scripts/extract_frames.py — no editar a mano.\n"
        "export const videoFrames = {\n" + "\n".join(entries) + "\n} as const\n\n"
        "export type VideoName = keyof typeof videoFrames\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
