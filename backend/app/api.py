import os
import shutil
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
import base64
import cv2
import numpy as np
from backend.app.models import JobSettings, JobInfo, JobStatus
from backend.app.job_manager import job_manager
from backend.app.video_engine import VideoEngine
from backend.app.depth_engine import get_depth_provider
from backend.app.stereo_engine import StereoEngine
from backend.app.export_engine import ExportEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = os.path.join(job_manager.upload_dir, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Error saving upload: {e}")
        raise HTTPException(status_code=500, detail="Error guardando el archivo de vídeo.")

    return {
        "filename": safe_filename,
        "original_name": file.filename,
        "file_path": file_path
    }

@router.post("/jobs")
async def create_job(data: dict, background_tasks: BackgroundTasks):
    filename = data.get("filename")
    if not filename:
        raise HTTPException(status_code=400, detail="Filename parameter is required.")

    file_path = os.path.join(job_manager.upload_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found.")

    raw_settings = data.get("settings", {})
    try:
        settings = JobSettings(**raw_settings)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid settings parameter: {str(e)}")

    job = job_manager.create_job(filename, settings)

    # Dispatch background task for job processing
    background_tasks.add_task(
        ExportEngine.process_job,
        job=job,
        upload_dir=job_manager.upload_dir,
        output_dir=job_manager.output_dir,
        temp_dir=job_manager.temp_dir
    )

    return job

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job

@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    success = job_manager.cancel_job(job_id)
    return {"success": success, "status": job.status}

@router.post("/preview")
async def generate_preview(data: dict):
    filename = data.get("filename")
    timestamp = float(data.get("timestamp", 0.0))
    raw_settings = data.get("settings", {})

    if not filename:
        raise HTTPException(status_code=400, detail="Filename parameter is required.")

    file_path = os.path.join(job_manager.upload_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found.")

    try:
        settings = JobSettings(**raw_settings)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid settings parameter: {str(e)}")

    try:
        # Extract single frame
        frame_rgb = VideoEngine.extract_single_frame(file_path, timestamp_sec=timestamp)

        # Generate Depth
        depth_provider = get_depth_provider(settings.depth_method)
        depth_map = depth_provider.generate_depth_map(frame_rgb, settings=settings)

        # Generate Stereo
        left_eye, right_eye = StereoEngine.generate_stereo_pair(frame_rgb, depth_map, settings)
        combined = StereoEngine.combine_3d_format(left_eye, right_eye, settings.stereo_format)

        # Convert Depth map to 3-channel grayscale visualization (0-255 uint8)
        depth_vis = (depth_map * 255.0).astype(np.uint8)
        depth_vis_rgb = cv2.cvtColor(depth_vis, cv2.COLOR_GRAY2RGB)

        # Helper to encode numpy array to base64 jpeg
        def frame_to_base64(img_rgb: np.ndarray) -> str:
            img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            _, buffer = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
            return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

        return {
            "original": frame_to_base64(frame_rgb),
            "depth_map": frame_to_base64(depth_vis_rgb),
            "left_eye": frame_to_base64(left_eye),
            "right_eye": frame_to_base64(right_eye),
            "processed": frame_to_base64(combined)
        }

    except Exception as e:
        logger.error(f"Error generating preview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al generar la vista previa: {str(e)}")

@router.get("/jobs/{job_id}/result")
async def download_result(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != JobStatus.COMPLETED or not job.output_filename:
        raise HTTPException(status_code=400, detail="Result not ready or job failed.")

    output_path = os.path.join(job_manager.output_dir, job.output_filename)
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Output file missing.")

    return FileResponse(output_path, media_type="video/mp4", filename=f"3D_{job.filename}")
