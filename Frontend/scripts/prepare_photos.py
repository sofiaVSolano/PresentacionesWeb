"""
Prepara las fotos de hackathones y congresos para la web.

Las originales son PNG de 1–2 MB cada una y con proporciones muy distintas
(verticales de móvil, apaisadas, una casi panorámica). Aquí se llevan todas a
una misma ALTURA, conservando su proporción: así la galería puede ponerlas en
fila sin recortarlas, cada una con el ancho que le toque.

Uso (desde la carpeta Frontend):
    python scripts/prepare_photos.py

Requiere: pip install pillow
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "source-assets" / "hackatonsFotos"
OUT_DIR = ROOT / "public" / "assets" / "history"
DATA_FILE = ROOT / "src" / "data" / "historyPhotos.ts"

HEIGHT = 1000  # el doble de lo que mide la tarjeta en pantalla, para pantallas retina
MAX_WIDTH = 1500
QUALITY = 82


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(p for p in SOURCE_DIR.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"})
    if not sources:
        print(f"No hay fotos en {SOURCE_DIR}")
        return

    entries: list[tuple[str, int, int]] = []
    for path in sources:
        image = Image.open(path).convert("RGB")

        # Nunca se recorta: entre las fotos hay capturas y diplomas con texto, y un
        # recorte los vuelve ilegibles. Se encoge para caber en la caja, nada más.
        scale = min(MAX_WIDTH / image.width, HEIGHT / image.height, 1.0)
        size = (round(image.width * scale), round(image.height * scale))
        image = image.resize(size, Image.LANCZOS)

        out = OUT_DIR / f"{path.stem}.webp"
        image.save(out, "WEBP", quality=QUALITY, method=6)
        entries.append((path.stem, size[0], size[1]))
        print(f"{out.name}: {size[0]}×{size[1]} · {out.stat().st_size / 1024:.0f} KB")

    write_data(entries)


def write_data(entries: list[tuple[str, int, int]]) -> None:
    """Publica las medidas reales para que la galería reserve el sitio exacto."""
    lines = [
        "// GENERADO por scripts/prepare_photos.py — no editar a mano.",
        "// Las medidas se usan para dar a cada foto su proporción sin que salte el diseño.",
        "export const historyPhotos = {",
    ]
    for stem, width, height in entries:
        lines.append(
            f"  '{stem}': {{ src: '/assets/history/{stem}.webp', width: {width}, height: {height} }},"
        )
    lines += ["} as const", "", "export type HistoryPhoto = keyof typeof historyPhotos", ""]
    DATA_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"escrito: {DATA_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
