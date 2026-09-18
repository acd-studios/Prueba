import cv2
import numpy as np
import logging
from backend.app.models import JobSettings, StereoFormat

logger = logging.getLogger(__name__)

class StereoEngine:
    """
    Handles pixel reprojection, displacement according to depth, eye separation,
    hole filling, and stereo format combination.
    """

    @staticmethod
    def apply_depth_curve_and_controls(depth_map: np.ndarray, settings: JobSettings) -> np.ndarray:
        """
        Applies depth curve, depth_in / depth_out offsets, invert depth, and intensity scaling.
        Result is a normalized map where values range around 0 (screen plane),
        negative values = pop-out (towards viewer), positive values = depth-in (into screen).
        """
        depth = depth_map.copy()

        if settings.invert_depth:
            depth = 1.0 - depth

        # Scale intensity
        depth = depth * (settings.intensity / 50.0)

        # Depth curve mapping if provided
        if settings.depth_curve and len(settings.depth_curve) >= 2:
            try:
                curve_pts = np.array(settings.depth_curve)
                x_pts = curve_pts[:, 0]
                y_pts = curve_pts[:, 1]
                depth = np.interp(depth, x_pts, y_pts).astype(np.float32)
            except Exception as e:
                logger.warning(f"Failed to apply custom depth curve: {e}")

        # Depth In / Depth Out adjustment
        d_out = settings.depth_out / 50.0  # Pop out factor
        d_in = settings.depth_in / 50.0    # Depth in factor

        # Map: 0.5 is screen plane
        screen_plane = 0.5
        out_mask = depth > screen_plane
        in_mask = depth <= screen_plane

        depth_processed = np.zeros_like(depth)
        depth_processed[out_mask] = (depth[out_mask] - screen_plane) * d_out
        depth_processed[in_mask] = (depth[in_mask] - screen_plane) * d_in

        return depth_processed

    @staticmethod
    def generate_stereo_pair(
        frame: np.ndarray,
        depth_map: np.ndarray,
        settings: JobSettings
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Reprojects 2D RGB frame into Left and Right eye perspectives.
        """
        h, w, c = frame.shape
        processed_depth = StereoEngine.apply_depth_curve_and_controls(depth_map, settings)

        # Calculate max pixel displacement based on eye separation & width
        max_displacement = (settings.eye_separation / 100.0) * (w * 0.05) * (settings.depth_strength / 50.0)
        h_shift = (settings.horizontal_shift / 100.0) * (w * 0.02)

        # Calculate pixel shifts for left and right eyes
        # Left eye shifts right for foreground, Right eye shifts left
        displacement = processed_depth * max_displacement

        left_img = np.zeros_like(frame)
        right_img = np.zeros_like(frame)
        left_mask = np.zeros((h, w), dtype=bool)
        right_mask = np.zeros((h, w), dtype=bool)

        x_grid = np.arange(w)

        for y in range(h):
            disp_row = displacement[y, :]

            # Left eye x positions
            x_left = np.round(x_grid + (disp_row / 2.0) + h_shift).astype(np.int32)
            valid_l = (x_left >= 0) & (x_left < w)
            left_img[y, x_left[valid_l]] = frame[y, valid_l]
            left_mask[y, x_left[valid_l]] = True

            # Right eye x positions
            x_right = np.round(x_grid - (disp_row / 2.0) - h_shift).astype(np.int32)
            valid_r = (x_right >= 0) & (x_right < w)
            right_img[y, x_right[valid_r]] = frame[y, valid_r]
            right_mask[y, x_right[valid_r]] = True

        # Fill holes created by pixel displacement
        left_img = StereoEngine.fill_holes(left_img, left_mask, settings.hole_filling)
        right_img = StereoEngine.fill_holes(right_img, right_mask, settings.hole_filling)

        if settings.invert_eyes:
            return right_img, left_img

        return left_img, right_img

    @staticmethod
    def fill_holes(img: np.ndarray, mask: np.ndarray, method: str = "nearest") -> np.ndarray:
        """Fills unmapped pixels (holes) in reprojected eye views."""
        if np.all(mask):
            return img

        filled = img.copy()
        h, w, c = img.shape
        missing_mask = ~mask

        if method in ["nearest", "horizontal_propagation"]:
            # Horizontal line propagation (fast and effective for stereo occlusions)
            for y in range(h):
                row_missing = missing_mask[y]
                if not np.any(row_missing):
                    continue

                # Forward fill
                last_valid = filled[y, 0]
                for x in range(w):
                    if row_missing[x]:
                        filled[y, x] = last_valid
                    else:
                        last_valid = filled[y, x]

                # Backward fill for remaining edge holes
                last_valid = filled[y, w - 1]
                for x in range(w - 1, -1, -1):
                    if row_missing[x]:
                        filled[y, x] = last_valid
                    else:
                        last_valid = filled[y, x]
        else:
            # OpenCV Inpainting fallback
            inpaint_mask = (missing_mask * 255).astype(np.uint8)
            filled = cv2.inpaint(img, inpaint_mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)

        return filled

    @staticmethod
    def combine_3d_format(
        left: np.ndarray,
        right: np.ndarray,
        stereo_format: StereoFormat
    ) -> np.ndarray:
        """
        Combines Left and Right eye views into target 3D output format.
        """
        h, w, c = left.shape

        if stereo_format == StereoFormat.ANAGLYPH_RED_CYAN:
            # Red channel from Left eye, Green & Blue from Right eye
            out = np.zeros_like(left)
            out[:, :, 0] = left[:, :, 0]   # Red
            out[:, :, 1] = right[:, :, 1]  # Green
            out[:, :, 2] = right[:, :, 2]  # Blue
            return out

        elif stereo_format == StereoFormat.ANAGLYPH_RED_GREEN:
            out = np.zeros_like(left)
            out[:, :, 0] = left[:, :, 0]   # Red
            out[:, :, 1] = right[:, :, 1]  # Green
            out[:, :, 2] = 0               # Blue empty
            return out

        elif stereo_format == StereoFormat.ANAGLYPH_RED_BLUE:
            out = np.zeros_like(left)
            out[:, :, 0] = left[:, :, 0]   # Red
            out[:, :, 1] = 0               # Green empty
            out[:, :, 2] = right[:, :, 2]  # Blue
            return out

        elif stereo_format == StereoFormat.SIDE_BY_SIDE_FULL:
            return np.hstack((left, right))

        elif stereo_format == StereoFormat.SIDE_BY_SIDE_HALF:
            left_half = cv2.resize(left, (w // 2, h), interpolation=cv2.INTER_AREA)
            right_half = cv2.resize(right, (w // 2, h), interpolation=cv2.INTER_AREA)
            return np.hstack((left_half, right_half))

        elif stereo_format == StereoFormat.TOP_BOTTOM:
            return np.vstack((left, right))

        elif stereo_format == StereoFormat.LEFT_EYE:
            return left

        elif stereo_format == StereoFormat.RIGHT_EYE:
            return right

        elif stereo_format == StereoFormat.LEFT_RIGHT_DUAL:
            # Side by side for dual visualization
            return np.hstack((left, right))

        return left
