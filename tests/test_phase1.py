import os
import cv2
import numpy as np
import logging
from backend.app.models import JobSettings, StereoFormat, JobStatus
from backend.app.video_engine import VideoEngine
from backend.app.depth_engine import get_depth_provider
from backend.app.stereo_engine import StereoEngine
from backend.app.export_engine import ExportEngine
from backend.app.job_manager import JobManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_phase_1_pipeline():
    logger.info("--- Starting Phase 1 Core Pipeline Test ---")

    # 1. Create a synthetic test video (2 seconds, 30 fps = 60 frames, 320x240)
    test_dir = "temp/test_mvp"
    os.makedirs(test_dir, exist_ok=True)
    synth_video_path = os.path.join(test_dir, "synth_input.mp4")

    w, h, fps = 320, 240, 30
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(synth_video_path, fourcc, fps, (w, h))

    for frame_i in range(60):
        # Draw a moving square on a background
        img = np.zeros((h, w, 3), dtype=np.uint8)
        img[:, :] = [50, 50, 50]  # dark grey background

        # Moving foreground rectangle
        x_pos = int(50 + (frame_i * 3) % (w - 100))
        cv2.rectangle(img, (x_pos, 80), (x_pos + 60, 160), (255, 200, 100), -1)
        out.write(img)

    out.release()
    logger.info(f"Synthetic test video created at {synth_video_path}")

    # 2. Test Video Engine Metadata Extraction
    meta = VideoEngine.get_metadata(synth_video_path)
    logger.info(f"Metadata extracted: {meta}")
    assert meta["width"] == 320
    assert meta["height"] == 240
    assert meta["total_frames"] >= 59

    # 3. Test Depth Engine Generation
    single_frame = VideoEngine.extract_single_frame(synth_video_path, timestamp_sec=0.5)
    settings = JobSettings(stereo_format=StereoFormat.ANAGLYPH_RED_CYAN)

    depth_provider = get_depth_provider(settings.depth_method)
    depth_map = depth_provider.generate_depth_map(single_frame, settings=settings)

    assert depth_map.shape == (240, 320)
    assert 0.0 <= depth_map.min() <= depth_map.max() <= 1.0
    logger.info(f"Depth map successfully generated. Min: {depth_map.min():.2f}, Max: {depth_map.max():.2f}")

    # 4. Test Stereo Pair Generation
    left_eye, right_eye = StereoEngine.generate_stereo_pair(single_frame, depth_map, settings)
    assert left_eye.shape == (240, 320, 3)
    assert right_eye.shape == (240, 320, 3)

    # Confirm perspectives are slightly different (due to displacement in foreground)
    diff = np.abs(left_eye.astype(np.int32) - right_eye.astype(np.int32))
    logger.info(f"Mean pixel displacement diff between Left & Right eye: {diff.mean():.2f}")
    assert diff.mean() > 0.0  # Must be different!

    # 5. Test Anaglyph Stereo Combination
    anaglyph = StereoEngine.combine_3d_format(left_eye, right_eye, settings.stereo_format)
    assert anaglyph.shape == (240, 320, 3)

    # 6. Test Full Job Execution via Export Engine
    jm = JobManager(
        upload_dir=test_dir,
        job_dir=os.path.join(test_dir, "jobs"),
        output_dir=os.path.join(test_dir, "outputs"),
        temp_dir=os.path.join(test_dir, "temp")
    )

    job = jm.create_job("synth_input.mp4", settings)
    success = ExportEngine.process_job(job, jm.upload_dir, jm.output_dir, jm.temp_dir)

    assert success is True
    assert job.status == JobStatus.COMPLETED
    assert job.output_filename is not None
    output_full = os.path.join(jm.output_dir, job.output_filename)
    assert os.path.exists(output_full)
    logger.info(f"Full Export Engine test passed. Output video size: {os.path.getsize(output_full)} bytes")

    logger.info("=== Phase 1 Pipeline Verification Completed Successfully! ===")

if __name__ == "__main__":
    test_phase_1_pipeline()
