from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class DepthMethod(str, Enum):
    AUTOMATIC = "Automatic"
    ARTISTIC = "Artistic"

class ArtisticType(str, Enum):
    RADIAL_CENTER_IN = "radial_center_in"
    RADIAL_CENTER_OUT = "radial_center_out"
    UNIFORM = "uniform"
    GRADIENT_HORIZONTAL = "gradient_horizontal"
    GRADIENT_VERTICAL = "gradient_vertical"
    CUSTOM_CURVE = "custom_curve"

class StereoFormat(str, Enum):
    ANAGLYPH_RED_CYAN = "anaglyph_red_cyan"
    ANAGLYPH_RED_GREEN = "anaglyph_red_green"
    ANAGLYPH_RED_BLUE = "anaglyph_red_blue"
    SIDE_BY_SIDE_FULL = "side_by_side_full"
    SIDE_BY_SIDE_HALF = "side_by_side_half"
    TOP_BOTTOM = "top_bottom"
    LEFT_EYE = "left_eye"
    RIGHT_EYE = "right_eye"
    LEFT_RIGHT_DUAL = "left_right_dual"

class JobSettings(BaseModel):
    # Depth Settings
    depth_method: DepthMethod = DepthMethod.AUTOMATIC
    artistic_type: ArtisticType = ArtisticType.RADIAL_CENTER_OUT
    intensity: float = Field(default=50.0, ge=0.0, le=100.0)
    depth_in: float = Field(default=50.0, ge=0.0, le=100.0)
    depth_out: float = Field(default=50.0, ge=0.0, le=100.0)
    smoothing: float = Field(default=30.0, ge=0.0, le=100.0)
    temporal_stability: float = Field(default=50.0, ge=0.0, le=100.0)

    # Depth Curve Points (list of [x, y] coordinates from 0 to 1)
    depth_curve: Optional[List[List[float]]] = None

    # Stereo Settings
    eye_separation: float = Field(default=30.0, ge=0.0, le=100.0)
    horizontal_shift: float = Field(default=0.0, ge=-100.0, le=100.0)
    depth_strength: float = Field(default=50.0, ge=0.0, le=100.0)
    invert_eyes: bool = False
    invert_depth: bool = False

    # Advanced Weights
    edge_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    motion_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    texture_weight: float = Field(default=0.2, ge=0.0, le=1.0)
    contrast_weight: float = Field(default=0.2, ge=0.0, le=1.0)
    temporal_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    hole_filling: str = "nearest"  # options: nearest, horizontal_propagation, bilinear

    # Output Settings
    stereo_format: StereoFormat = StereoFormat.ANAGLYPH_RED_CYAN
    quality: str = "medium"  # low, medium, high, custom
    bitrate: Optional[str] = None
    codec: str = "libx264"
    fps: Optional[float] = None
    resolution: Optional[str] = None  # e.g. "1280x720"
    keep_audio: bool = True

class JobInfo(BaseModel):
    job_id: str
    filename: str
    status: JobStatus = JobStatus.QUEUED
    progress: float = 0.0
    current_frame: int = 0
    total_frames: int = 0
    start_time: Optional[float] = None
    estimated_remaining: Optional[float] = None
    processing_fps: Optional[float] = None
    error: Optional[str] = None
    settings: JobSettings
    output_filename: Optional[str] = None
    video_metadata: Optional[Dict[str, Any]] = None

class VideoMetadata(BaseModel):
    filename: str
    duration: float
    width: int
    height: int
    fps: float
    total_frames: int
    codec: str
    has_audio: bool
    size_bytes: int
