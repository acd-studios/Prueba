import os
import shutil
import subprocess
import json
import logging
import cv2
import numpy as np
from typing import Dict, Any, Generator, Tuple

logger = logging.getLogger(__name__)

class VideoEngine:
    """
    Handles video reading, metadata extraction, frame iterator, and FFmpeg audio muxing.
    """

    @staticmethod
    def get_metadata(video_path: str) -> Dict[str, Any]:
        """Extracts detailed metadata using ffprobe or cv2 fallback."""
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "stream=width,height,r_frame_rate,codec_name,codec_type,duration,nb_frames",
            "-show_entries", "format=duration,size,format_name",
            "-of", "json",
            video_path
        ]

        metadata = {
            "duration": 0.0,
            "width": 0,
            "height": 0,
            "fps": 30.0,
            "total_frames": 0,
            "codec": "unknown",
            "has_audio": False,
            "size_bytes": os.path.getsize(video_path)
        }

        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0:
                data = json.loads(res.stdout)
                streams = data.get("streams", [])
                for stream in streams:
                    if stream.get("codec_type") == "video":
                        metadata["width"] = int(stream.get("width", 0))
                        metadata["height"] = int(stream.get("height", 0))
                        metadata["codec"] = stream.get("codec_name", "unknown")

                        r_fps = stream.get("r_frame_rate", "30/1")
                        if "/" in r_fps:
                            num, den = map(float, r_fps.split("/"))
                            metadata["fps"] = num / den if den > 0 else 30.0
                        else:
                            metadata["fps"] = float(r_fps)

                        if "nb_frames" in stream and stream["nb_frames"].isdigit():
                            metadata["total_frames"] = int(stream["nb_frames"])

                    elif stream.get("codec_type") == "audio":
                        metadata["has_audio"] = True

                fmt = data.get("format", {})
                if "duration" in fmt:
                    metadata["duration"] = float(fmt["duration"])
        except Exception as e:
            logger.warning(f"ffprobe failed or not available, falling back to cv2: {e}")

        # Fallback with cv2 if fields missing
        if metadata["width"] == 0 or metadata["height"] == 0:
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                metadata["width"] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                metadata["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                metadata["fps"] = cap.get(cv2.CAP_PROP_FPS) or 30.0
                metadata["total_frames"] = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                if metadata["duration"] == 0 and metadata["fps"] > 0:
                    metadata["duration"] = metadata["total_frames"] / metadata["fps"]
                cap.release()

        if metadata["total_frames"] == 0 and metadata["duration"] > 0 and metadata["fps"] > 0:
            metadata["total_frames"] = int(metadata["duration"] * metadata["fps"])

        return metadata

    @staticmethod
    def extract_single_frame(video_path: str, timestamp_sec: float = 0.0) -> np.ndarray:
        """Extracts a single frame at the given timestamp as RGB numpy array."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_idx = int(timestamp_sec * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)

        ret, frame = cap.read()
        cap.release()

        if not ret or frame is None:
            # Fallback read first frame
            cap = cv2.VideoCapture(video_path)
            ret, frame = cap.read()
            cap.release()
            if not ret or frame is None:
                raise ValueError("Could not read frame from video.")

        return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    @staticmethod
    def read_frames(video_path: str) -> Generator[Tuple[int, np.ndarray], None, None]:
        """Generator yielding (frame_index, frame_rgb_numpy_array) frame by frame."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            yield frame_idx, frame_rgb
            frame_idx += 1

        cap.release()

    @staticmethod
    def mux_audio(original_video_path: str, processed_video_path: str, output_video_path: str) -> bool:
        """
        Combines processed video stream with original video audio stream using FFmpeg.
        """
        if not os.path.exists(original_video_path) or not os.path.exists(processed_video_path):
            logger.error("Inputs for audio muxing missing.")
            return False

        # Check if original video has audio stream
        meta = VideoEngine.get_metadata(original_video_path)
        if not meta.get("has_audio", False):
            logger.info("Original video has no audio. Copying processed video directly.")
            shutil.copyfile(processed_video_path, output_video_path)
            return True

        cmd = [
            "ffmpeg", "-y",
            "-i", processed_video_path,
            "-i", original_video_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-map", "0:v:0",
            "-map", "1:a:0?",
            "-shortest",
            output_video_path
        ]

        logger.info(f"Running audio muxing command: {' '.join(cmd)}")
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            logger.error(f"FFmpeg audio muxing failed: {res.stderr}")
            # Fallback copy video without audio
            shutil.copyfile(processed_video_path, output_video_path)
            return False

        return True
