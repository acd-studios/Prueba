import os
import cv2
import time
import logging
import imageio
import numpy as np
from typing import Callable, Optional
from backend.app.models import JobInfo, JobStatus, StereoFormat
from backend.app.video_engine import VideoEngine
from backend.app.depth_engine import get_depth_provider
from backend.app.stereo_engine import StereoEngine

logger = logging.getLogger(__name__)

class ExportEngine:
    """
    Orchestrates full video processing job execution frame-by-frame:
    - Extract frames
    - Estimate depth
    - Generate stereo pair
    - Format stereo output
    - Encode processed video
    - Mux original audio
    - Report progress & handle cancellation
    """

    @staticmethod
    def process_job(
        job: JobInfo,
        upload_dir: str,
        output_dir: str,
        temp_dir: str,
        progress_callback: Optional[Callable[[JobInfo], None]] = None
    ) -> bool:
        start_time = time.time()
        input_path = os.path.join(upload_dir, job.filename)

        if not os.path.exists(input_path):
            job.status = JobStatus.FAILED
            job.error = f"Input video file '{job.filename}' not found."
            logger.error(job.error)
            return False

        try:
            job.status = JobStatus.PROCESSING
            job.start_time = start_time

            # 1. Video Metadata
            meta = VideoEngine.get_metadata(input_path)
            job.video_metadata = meta
            total_frames = meta["total_frames"] or 1
            fps = meta["fps"] or 30.0
            width, height = meta["width"], meta["height"]

            job.total_frames = total_frames

            # Output Dimensions check based on stereo format
            s_format = job.settings.stereo_format
            out_width, out_height = width, height
            if s_format in [StereoFormat.SIDE_BY_SIDE_FULL, StereoFormat.LEFT_RIGHT_DUAL]:
                out_width = width * 2
            elif s_format == StereoFormat.TOP_BOTTOM:
                out_height = height * 2

            # Temp output video path
            os.makedirs(os.path.join(temp_dir, job.job_id), exist_ok=True)
            temp_video_path = os.path.join(temp_dir, job.job_id, "processed_no_audio.mp4")

            depth_provider = get_depth_provider(job.settings.depth_method)

            # Initialize Video Writer using imageio or cv2
            writer = imageio.get_writer(
                temp_video_path,
                fps=fps,
                codec='libx264',
                pixelformat='yuv420p',
                quality=8 if job.settings.quality == 'high' else (5 if job.settings.quality == 'medium' else 3)
            )

            prev_frame: Optional[np.ndarray] = None
            prev_depth: Optional[np.ndarray] = None
            processed_count = 0

            logger.info(f"Starting processing job {job.job_id}: {total_frames} frames @ {fps} fps ({width}x{height})")

            for frame_idx, frame_rgb in VideoEngine.read_frames(input_path):
                # Check cancellation
                if job.status == JobStatus.CANCELLED:
                    logger.info(f"Job {job.job_id} was cancelled by user.")
                    writer.close()
                    return False

                # Generate Depth
                depth_map = depth_provider.generate_depth_map(
                    frame_rgb, prev_frame=prev_frame, prev_depth=prev_depth, settings=job.settings
                )

                # Generate Stereo Pair
                left_eye, right_eye = StereoEngine.generate_stereo_pair(
                    frame_rgb, depth_map, job.settings
                )

                # Combine 3D format
                combined_frame = StereoEngine.combine_3d_format(
                    left_eye, right_eye, job.settings.stereo_format
                )

                writer.append_data(combined_frame)

                # Cache previous frame for motion/temporal smoothing
                prev_frame = frame_rgb
                prev_depth = depth_map

                processed_count += 1
                now = time.time()
                elapsed = now - start_time

                # Metrics update
                job.current_frame = processed_count
                job.progress = round((processed_count / total_frames) * 100.0, 2)

                if elapsed > 0:
                    job.processing_fps = round(processed_count / elapsed, 2)
                    remaining_frames = max(0, total_frames - processed_count)
                    job.estimated_remaining = round(remaining_frames / job.processing_fps, 1)

                if progress_callback:
                    progress_callback(job)

            writer.close()

            # Mux original Audio
            output_filename = f"3D_{job.job_id}.mp4"
            final_output_path = os.path.join(output_dir, output_filename)

            if job.settings.keep_audio:
                VideoEngine.mux_audio(input_path, temp_video_path, final_output_path)
            else:
                os.rename(temp_video_path, final_output_path)

            job.status = JobStatus.COMPLETED
            job.progress = 100.0
            job.output_filename = output_filename
            logger.info(f"Job {job.job_id} successfully completed! Saved to {final_output_path}")

            return True

        except Exception as e:
            logger.error(f"Error processing job {job.job_id}: {e}", exc_info=True)
            job.status = JobStatus.FAILED
            job.error = f"Processing error: {str(e)}"
            return False
