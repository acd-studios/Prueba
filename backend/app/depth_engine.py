import cv2
import numpy as np
import logging
from backend.app.depth_provider_base import DepthProvider
from backend.app.models import JobSettings, DepthMethod, ArtisticType

logger = logging.getLogger(__name__)

class TraditionalDepthProvider(DepthProvider):
    """
    Calculates depth estimation using classical computer vision signals:
    - Gradients / Edges (Sobel)
    - Texture Density (local variance)
    - Contrast (Luminance)
    - Optical Flow / Motion Estimation
    - Temporal Smoothing
    """

    def generate_depth_map(
        self,
        frame: np.ndarray,
        prev_frame: np.ndarray | None = None,
        prev_depth: np.ndarray | None = None,
        settings: JobSettings | None = None
    ) -> np.ndarray:
        if settings is None:
            settings = JobSettings()

        h, w, _ = frame.shape
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)

        # 1. Gradient / Edge Signal
        sobelx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        edge_map = cv2.magnitude(sobelx, sobely)
        edge_map = cv2.normalize(edge_map, None, 0.0, 1.0, cv2.NORM_MINMAX)

        # 2. Contrast Signal (Normalized Luminance + Contrast)
        contrast_map = gray.astype(np.float32) / 255.0

        # 3. Texture Signal (Local standard deviation)
        mean = cv2.blur(gray.astype(np.float32), (5, 5))
        sqr_mean = cv2.blur(gray.astype(np.float32)**2, (5, 5))
        texture_map = np.sqrt(np.maximum(0, sqr_mean - mean**2))
        texture_map = cv2.normalize(texture_map, None, 0.0, 1.0, cv2.NORM_MINMAX)

        # 4. Motion / Optical Flow Signal
        motion_map = np.zeros((h, w), dtype=np.float32)
        if prev_frame is not None and prev_frame.shape == frame.shape:
            prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_RGB2GRAY)
            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0
            )
            motion_mag = cv2.magnitude(flow[..., 0], flow[..., 1])
            motion_map = cv2.normalize(motion_mag, None, 0.0, 1.0, cv2.NORM_MINMAX)

        # 5. Perspective/Vertical Gradient Prior (objects lower in frame tend to be closer)
        y_coords = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
        vertical_prior = np.tile(y_coords, (1, w))

        # Weighted combination based on settings
        ew = settings.edge_weight
        mw = settings.motion_weight
        tw = settings.texture_weight
        cw = settings.contrast_weight
        vw = 0.2  # Perspective prior weight

        combined = (
            ew * edge_map +
            mw * motion_map +
            tw * texture_map +
            cw * contrast_map +
            vw * vertical_prior
        )

        total_weight = ew + mw + tw + cw + vw
        if total_weight > 0:
            combined /= total_weight

        # Normalize to strictly [0.0, 1.0]
        combined = cv2.normalize(combined, None, 0.0, 1.0, cv2.NORM_MINMAX)

        # Edge-aware smoothing (Bilateral filter or Gaussian blur depending on settings)
        blur_size = int(settings.smoothing / 10.0) * 2 + 1
        if blur_size > 1:
            combined = cv2.GaussianBlur(combined, (blur_size, blur_size), 0)

        # Temporal Smoothing
        if prev_depth is not None and prev_depth.shape == combined.shape:
            # alpha between 0.0 (no stability) and 0.9 (high stability)
            alpha = (settings.temporal_stability / 100.0) * 0.8
            combined = alpha * prev_depth + (1.0 - alpha) * combined

        return np.clip(combined, 0.0, 1.0).astype(np.float32)


class ArtisticDepthProvider(DepthProvider):
    """
    Generates depth based purely on mathematical distance geometry:
    - Radial Center In / Out
    - Uniform Depth
    - Horizontal / Vertical Gradient
    - Mathematical custom functions
    """

    def generate_depth_map(
        self,
        frame: np.ndarray,
        prev_frame: np.ndarray | None = None,
        prev_depth: np.ndarray | None = None,
        settings: JobSettings | None = None
    ) -> np.ndarray:
        if settings is None:
            settings = JobSettings()

        h, w, _ = frame.shape
        y, x = np.ogrid[:h, :w]
        center_y, center_x = h / 2.0, w / 2.0

        artistic_type = settings.artistic_type

        if artistic_type == ArtisticType.RADIAL_CENTER_OUT:
            # Center is 1.0 (near), edges are 0.0 (far)
            max_dist = np.sqrt(center_x**2 + center_y**2)
            dist = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            depth = 1.0 - (dist / max_dist)
        elif artistic_type == ArtisticType.RADIAL_CENTER_IN:
            # Center is 0.0 (far), edges are 1.0 (near)
            max_dist = np.sqrt(center_x**2 + center_y**2)
            dist = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            depth = dist / max_dist
        elif artistic_type == ArtisticType.GRADIENT_VERTICAL:
            # Top far (0.0), bottom near (1.0)
            depth = np.tile(np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None], (1, w))
        elif artistic_type == ArtisticType.GRADIENT_HORIZONTAL:
            # Left far (0.0), right near (1.0)
            depth = np.tile(np.linspace(0.0, 1.0, w, dtype=np.float32)[None, :], (h, 1))
        elif artistic_type == ArtisticType.UNIFORM:
            depth = np.full((h, w), settings.intensity / 100.0, dtype=np.float32)
        else:
            # Default radial
            max_dist = np.sqrt(center_x**2 + center_y**2)
            dist = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            depth = 1.0 - (dist / max_dist)

        return np.clip(depth, 0.0, 1.0).astype(np.float32)


def get_depth_provider(method: DepthMethod) -> DepthProvider:
    if method == DepthMethod.ARTISTIC:
        return ArtisticDepthProvider()
    return TraditionalDepthProvider()
