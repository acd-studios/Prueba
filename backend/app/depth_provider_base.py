from abc import ABC, abstractmethod
import numpy as np
from backend.app.models import JobSettings

class DepthProvider(ABC):
    """
    Abstract Base Class / Interface for Depth Providers.
    Allows seamlessly swapping traditional CV estimation with future AI Depth Models (e.g., MiDaS, ZoeDepth).
    """

    @abstractmethod
    def generate_depth_map(
        self,
        frame: np.ndarray,
        prev_frame: np.ndarray | None = None,
        prev_depth: np.ndarray | None = None,
        settings: JobSettings | None = None
    ) -> np.ndarray:
        """
        Given a current frame (RGB uint8 numpy array, HxWx3),
        returns a 2D float32 numpy array (HxW) normalized between 0.0 (far background) and 1.0 (foreground).
        """
        pass
