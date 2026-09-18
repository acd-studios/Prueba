import os
import cv2
import time
import numpy as np
import logging
from backend.app.models import JobSettings, JobStatus
from backend.app.job_manager import JobManager
from backend.app.export_engine import ExportEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_phase_4_jobs():
    logger.info("--- Starting Phase 4 Job Queue & Cancellation Test ---")

    test_dir = "temp/test_phase4"
    os.makedirs(test_dir, exist_ok=True)
    synth_video_path = os.path.join(test_dir, "long_synth_input.mp4")

    # Create a 3-second video @ 30fps (90 frames)
    w, h, fps = 320, 240, 30
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(synth_video_path, fourcc, fps, (w, h))

    for frame_i in range(90):
        img = np.zeros((h, w, 3), dtype=np.uint8)
        img[:, :] = [30, 30, 30]
        cv2.circle(img, (100 + frame_i, 120), 40, (200, 250, 50), -1)
        out.write(img)

    out.release()

    jm = JobManager(
        upload_dir=test_dir,
        job_dir=os.path.join(test_dir, "jobs"),
        output_dir=os.path.join(test_dir, "outputs"),
        temp_dir=os.path.join(test_dir, "temp")
    )

    settings = JobSettings()
    job = jm.create_job("long_synth_input.mp4", settings)

    progress_reports = []

    def progress_callback(j):
        progress_reports.append(j.progress)
        # Cancel job when progress reaches 30%
        if j.progress >= 30.0 and j.status == JobStatus.PROCESSING:
            jm.cancel_job(j.job_id)

    success = ExportEngine.process_job(
        job, jm.upload_dir, jm.output_dir, jm.temp_dir, progress_callback=progress_callback
    )

    assert success is False
    assert job.status == JobStatus.CANCELLED
    logger.info(f"Cancellation test passed! Job was cancelled at progress: {job.progress}%")

    logger.info("=== Phase 4 Verification Completed Successfully! ===")

if __name__ == "__main__":
    test_phase_4_jobs()
