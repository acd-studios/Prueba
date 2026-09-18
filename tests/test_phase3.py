import os
import cv2
import numpy as np
import logging
from backend.app.models import JobSettings, StereoFormat
from backend.app.stereo_engine import StereoEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_phase_3_formats():
    logger.info("--- Starting Phase 3 Stereo Formats Test ---")

    h, w = 100, 100
    left = np.zeros((h, w, 3), dtype=np.uint8)
    left[:, :] = [255, 0, 0] # Red

    right = np.zeros((h, w, 3), dtype=np.uint8)
    right[:, :] = [0, 255, 255] # Cyan

    formats = [
        (StereoFormat.ANAGLYPH_RED_CYAN, (100, 100, 3)),
        (StereoFormat.ANAGLYPH_RED_GREEN, (100, 100, 3)),
        (StereoFormat.ANAGLYPH_RED_BLUE, (100, 100, 3)),
        (StereoFormat.SIDE_BY_SIDE_FULL, (100, 200, 3)),
        (StereoFormat.SIDE_BY_SIDE_HALF, (100, 100, 3)),
        (StereoFormat.TOP_BOTTOM, (200, 100, 3)),
        (StereoFormat.LEFT_EYE, (100, 100, 3)),
        (StereoFormat.RIGHT_EYE, (100, 100, 3)),
        (StereoFormat.LEFT_RIGHT_DUAL, (100, 200, 3)),
    ]

    for fmt, expected_shape in formats:
        res = StereoEngine.combine_3d_format(left, right, fmt)
        assert res.shape == expected_shape, f"Format {fmt} expected shape {expected_shape}, got {res.shape}"
        logger.info(f"Format {fmt.value} verified with shape {res.shape}")

    logger.info("=== Phase 3 Verification Completed Successfully! ===")

if __name__ == "__main__":
    test_phase_3_formats()
