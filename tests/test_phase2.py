import os
import cv2
import numpy as np
import logging
from backend.app.models import JobSettings, StereoFormat, DepthMethod, ArtisticType
from backend.app.video_engine import VideoEngine
from backend.app.depth_engine import get_depth_provider
from backend.app.stereo_engine import StereoEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_phase_2():
    logger.info("--- Starting Phase 2 Advanced Depth & Preview Tests ---")

    # 1. Create synthetic frame
    h, w = 240, 320
    frame1 = np.zeros((h, w, 3), dtype=np.uint8)
    frame1[:, :] = [40, 40, 40]
    cv2.rectangle(frame1, (100, 50), (200, 180), (255, 250, 240), -1)

    frame2 = np.zeros((h, w, 3), dtype=np.uint8)
    frame2[:, :] = [40, 40, 40]
    cv2.rectangle(frame2, (110, 50), (210, 180), (255, 250, 240), -1)  # Shifted right by 10px

    # Test Traditional Depth Provider with Optical Flow & Multi-signal weights
    settings = JobSettings(
        depth_method=DepthMethod.AUTOMATIC,
        edge_weight=0.4,
        motion_weight=0.3,
        texture_weight=0.2,
        contrast_weight=0.1,
        temporal_stability=60.0,
        depth_curve=[[0.0, 0.0], [0.5, 0.2], [1.0, 1.0]],
        depth_in=70.0,
        depth_out=30.0
    )

    provider = get_depth_provider(settings.depth_method)
    depth1 = provider.generate_depth_map(frame1, settings=settings)
    assert depth1.shape == (h, w)
    assert 0.0 <= depth1.min() <= depth1.max() <= 1.0

    # Temporal stability test
    depth2 = provider.generate_depth_map(frame2, prev_frame=frame1, prev_depth=depth1, settings=settings)
    assert depth2.shape == (h, w)
    logger.info("Advanced Traditional Depth Estimation & Temporal Smoothing Passed.")

    # Test Artistic Depth Provider
    settings_art = JobSettings(depth_method=DepthMethod.ARTISTIC, artistic_type=ArtisticType.RADIAL_CENTER_OUT)
    art_provider = get_depth_provider(settings_art.depth_method)
    art_depth = art_provider.generate_depth_map(frame1, settings=settings_art)
    assert art_depth.shape == (h, w)
    # Center pixel should have higher depth than top-left corner
    assert art_depth[120, 160] > art_depth[0, 0]
    logger.info("Artistic Radial Depth Map Test Passed.")

    # Test Depth Controls & Depth Curve Transformation in StereoEngine
    processed_depth = StereoEngine.apply_depth_curve_and_controls(depth1, settings)
    assert processed_depth.shape == (h, w)
    logger.info("Depth Curve and Depth In/Out Transformation Passed.")

    logger.info("=== Phase 2 Verification Completed Successfully! ===")

if __name__ == "__main__":
    test_phase_2()
