"""
Límite de peticiones por clave (aquí, por IP) con ventana deslizante.

Vive en memoria a propósito: el sitio corre en un solo proceso y esto solo
tiene que frenar a quien intente usar el formulario como manguera de spam. Si
algún día se levantan varios workers, cada uno llevará su propia cuenta — y si
eso deja de bastar, el sitio para reemplazarlo es este, no la ruta.
"""

from collections import defaultdict, deque
from time import monotonic


class SlidingWindow:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        """True si la petición entra dentro del límite (y la anota)."""
        if self.limit <= 0:
            return True

        now = monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()

        if len(hits) >= self.limit:
            return False

        hits.append(now)
        return True

    def reset(self) -> None:
        """Olvida todo lo anotado. Lo usan los tests."""
        self._hits.clear()
