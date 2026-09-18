import os
import shutil
import uuid
import logging
from typing import Dict, Optional
from backend.app.models import JobInfo, JobStatus, JobSettings, VideoMetadata

logger = logging.getLogger(__name__)

class JobManager:
    def __init__(self, upload_dir: str = "uploads", job_dir: str = "jobs", output_dir: str = "outputs", temp_dir: str = "temp"):
        self.upload_dir = upload_dir
        self.job_dir = job_dir
        self.output_dir = output_dir
        self.temp_dir = temp_dir
        self.jobs: Dict[str, JobInfo] = {}

        for directory in [self.upload_dir, self.job_dir, self.output_dir, self.temp_dir]:
            os.makedirs(directory, exist_ok=True)

    def create_job(self, filename: str, settings: JobSettings, metadata: Optional[Dict] = None) -> JobInfo:
        job_id = str(uuid.uuid4())
        job = JobInfo(
            job_id=job_id,
            filename=filename,
            status=JobStatus.QUEUED,
            settings=settings,
            video_metadata=metadata
        )
        self.jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[JobInfo]:
        return self.jobs.get(job_id)

    def update_job(self, job_id: str, **kwargs):
        if job_id in self.jobs:
            job = self.jobs[job_id]
            for key, value in kwargs.items():
                if hasattr(job, key):
                    setattr(job, key, value)

    def cancel_job(self, job_id: str) -> bool:
        if job_id in self.jobs:
            self.jobs[job_id].status = JobStatus.CANCELLED
            self.cleanup_job_temp(job_id)
            return True
        return False

    def cleanup_job_temp(self, job_id: str):
        job_temp_folder = os.path.join(self.temp_dir, job_id)
        if os.path.exists(job_temp_folder):
            try:
                shutil.rmtree(job_temp_folder)
            except Exception as e:
                logger.error(f"Failed to cleanup temp folder for job {job_id}: {e}")

job_manager = JobManager()
