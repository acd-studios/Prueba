document.addEventListener('DOMContentLoaded', () => {
    // STATE
    let currentUploadedFilename = null;
    let currentVideoMetadata = null;
    let currentJobId = null;
    let jobPollInterval = null;
    let currentPreviewData = null;
    let currentViewMode = 'processed';

    // API Base URL config (stored in localStorage or empty for relative server)
    const apiBaseUrlInput = document.getElementById('apiBaseUrlInput');
    let apiBaseUrl = localStorage.getItem('STEREO3D_API_BASE_URL') || '';
    if (apiBaseUrlInput) {
        apiBaseUrlInput.value = apiBaseUrl;
        apiBaseUrlInput.addEventListener('change', () => {
            apiBaseUrl = apiBaseUrlInput.value.trim().replace(/\/+$/, '');
            localStorage.setItem('STEREO3D_API_BASE_URL', apiBaseUrl);
        });
    }

    function getApiUrl(path) {
        if (!path.startsWith('/')) path = '/' + path;
        return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
    }

    // DEPTH CURVE STATE: array of [x, y] coordinates in [0..1] range
    let depthCurvePoints = [
        [0.0, 0.0],
        [0.5, 0.5],
        [1.0, 1.0]
    ];

    // DOM ELEMENTS
    const uploadZone = document.getElementById('uploadZone');
    const videoFileInput = document.getElementById('videoFileInput');
    const sourceInfoCard = document.getElementById('sourceInfoCard');

    // Info Fields
    const infoFilename = document.getElementById('infoFilename');
    const infoDuration = document.getElementById('infoDuration');
    const infoResolution = document.getElementById('infoResolution');
    const infoFps = document.getElementById('infoFps');
    const infoTotalFrames = document.getElementById('infoTotalFrames');
    const infoAudio = document.getElementById('infoAudio');

    // Preview Viewport Elements
    const placeholderMsg = document.getElementById('placeholderMsg');
    const singleViewContainer = document.getElementById('singleViewContainer');
    const mainPreviewImg = document.getElementById('mainPreviewImg');
    const splitViewContainer = document.getElementById('splitViewContainer');
    const splitOriginalImg = document.getElementById('splitOriginalImg');
    const splitProcessedImg = document.getElementById('splitProcessedImg');
    const splitProcessedLayer = document.getElementById('splitProcessedLayer');
    const splitHandle = document.getElementById('splitHandle');
    const dualViewContainer = document.getElementById('dualViewContainer');
    const leftEyeImg = document.getElementById('leftEyeImg');
    const rightEyeImg = document.getElementById('rightEyeImg');

    // Controls
    const previewTimestamp = document.getElementById('previewTimestamp');
    const timestampVal = document.getElementById('timestampVal');
    const btnGeneratePreview = document.getElementById('btnGeneratePreview');
    const btnProcessFullVideo = document.getElementById('btnProcessFullVideo');
    const globalStatus = document.getElementById('globalStatus');

    // Tabs & View Modes
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const viewModeBtns = document.querySelectorAll('.btn-mode');

    // Depth Controls
    const depthMethod = document.getElementById('depthMethod');
    const artisticTypeGroup = document.getElementById('artisticTypeGroup');
    const artisticType = document.getElementById('artisticType');
    const sliderIntensity = document.getElementById('sliderIntensity');
    const valIntensity = document.getElementById('valIntensity');
    const sliderDepthIn = document.getElementById('sliderDepthIn');
    const valDepthIn = document.getElementById('valDepthIn');
    const sliderDepthOut = document.getElementById('sliderDepthOut');
    const valDepthOut = document.getElementById('valDepthOut');
    const sliderSmoothing = document.getElementById('sliderSmoothing');
    const valSmoothing = document.getElementById('valSmoothing');
    const sliderTemporal = document.getElementById('sliderTemporal');
    const valTemporal = document.getElementById('valTemporal');

    // Stereo Controls
    const sliderEyeSep = document.getElementById('sliderEyeSep');
    const valEyeSep = document.getElementById('valEyeSep');
    const sliderHShift = document.getElementById('sliderHShift');
    const valHShift = document.getElementById('valHShift');
    const sliderDepthStrength = document.getElementById('sliderDepthStrength');
    const valDepthStrength = document.getElementById('valDepthStrength');
    const checkInvertEyes = document.getElementById('checkInvertEyes');
    const checkInvertDepth = document.getElementById('checkInvertDepth');

    // Output Controls
    const stereoFormat = document.getElementById('stereoFormat');
    const outputQuality = document.getElementById('outputQuality');
    const checkKeepAudio = document.getElementById('checkKeepAudio');

    // Advanced Controls
    const sliderEdgeWeight = document.getElementById('sliderEdgeWeight');
    const valEdgeWeight = document.getElementById('valEdgeWeight');
    const sliderMotionWeight = document.getElementById('sliderMotionWeight');
    const valMotionWeight = document.getElementById('valMotionWeight');
    const sliderTextureWeight = document.getElementById('sliderTextureWeight');
    const valTextureWeight = document.getElementById('valTextureWeight');
    const sliderContrastWeight = document.getElementById('sliderContrastWeight');
    const valContrastWeight = document.getElementById('valContrastWeight');
    const selectHoleFilling = document.getElementById('selectHoleFilling');

    // Job Progress Elements
    const jobProgressContainer = document.getElementById('jobProgressContainer');
    const progressBarInner = document.getElementById('progressBarInner');
    const progressPercent = document.getElementById('progressPercent');
    const progressFrames = document.getElementById('progressFrames');
    const progressFps = document.getElementById('progressFps');
    const progressEta = document.getElementById('progressEta');
    const btnCancelJob = document.getElementById('btnCancelJob');

    // Download Elements
    const downloadSection = document.getElementById('downloadSection');
    const btnDownloadResult = document.getElementById('btnDownloadResult');

    // Canvas Curve
    const depthCurveCanvas = document.getElementById('depthCurveCanvas');
    const ctxCurve = depthCurveCanvas.getContext('2d');
    const btnResetCurve = document.getElementById('btnResetCurve');

    // INITIALIZATION & EVENT LISTENERS
    initTabs();
    initSliders();
    initCurveCanvas();

    uploadZone.addEventListener('click', () => videoFileInput.click());
    videoFileInput.addEventListener('change', handleFileSelect);

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--accent-blue)';
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--panel-border)';
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--panel-border)';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadFile(e.dataTransfer.files[0]);
        }
    });

    depthMethod.addEventListener('change', () => {
        if (depthMethod.value === 'Artistic') {
            artisticTypeGroup.style.display = 'flex';
        } else {
            artisticTypeGroup.style.display = 'none';
        }
    });

    previewTimestamp.addEventListener('input', () => {
        timestampVal.textContent = parseFloat(previewTimestamp.value).toFixed(1) + 's';
    });

    btnGeneratePreview.addEventListener('click', generatePreview);
    btnProcessFullVideo.addEventListener('click', startFullProcessing);
    btnCancelJob.addEventListener('click', cancelJob);

    // View Mode Switcher
    viewModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentViewMode = btn.dataset.mode;
            renderPreviewMode();
        });
    });

    // Split Handle Dragging
    let isDraggingSplit = false;
    splitHandle.addEventListener('mousedown', () => isDraggingSplit = true);
    window.addEventListener('mouseup', () => isDraggingSplit = false);
    splitViewContainer.addEventListener('mousemove', (e) => {
        if (!isDraggingSplit) return;
        const rect = splitViewContainer.getBoundingClientRect();
        let offsetX = e.clientX - rect.left;
        offsetX = Math.max(0, Math.min(rect.width, offsetX));
        const pct = (offsetX / rect.width) * 100;
        splitProcessedLayer.style.width = `${pct}%`;
        splitHandle.style.left = `${pct}%`;
    });

    // TAB SYSTEM
    function initTabs() {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab).classList.add('active');
            });
        });
    }

    // SLIDER BINDINGS
    function initSliders() {
        const bindSlider = (slider, valElem) => {
            slider.addEventListener('input', () => valElem.textContent = slider.value);
        };
        bindSlider(sliderIntensity, valIntensity);
        bindSlider(sliderDepthIn, valDepthIn);
        bindSlider(sliderDepthOut, valDepthOut);
        bindSlider(sliderSmoothing, valSmoothing);
        bindSlider(sliderTemporal, valTemporal);
        bindSlider(sliderEyeSep, valEyeSep);
        bindSlider(sliderHShift, valHShift);
        bindSlider(sliderDepthStrength, valDepthStrength);
        bindSlider(sliderEdgeWeight, valEdgeWeight);
        bindSlider(sliderMotionWeight, valMotionWeight);
        bindSlider(sliderTextureWeight, valTextureWeight);
        bindSlider(sliderContrastWeight, valContrastWeight);
    }

    // FILE SELECTION & UPLOAD
    function handleFileSelect(e) {
        if (e.target.files && e.target.files.length > 0) {
            uploadFile(e.target.files[0]);
        }
    }

    async function uploadFile(file) {
        setGlobalStatus('Subiendo vídeo...', 'processing');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const resp = await fetch(getApiUrl('/api/upload'), {
                method: 'POST',
                body: formData
            });

            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.detail || 'Error en la subida.');
            }

            const data = await resp.json();
            currentUploadedFilename = data.filename;

            // Probe metadata
            await fetchVideoMetadata(data.filename, file.name);

            btnGeneratePreview.disabled = false;
            btnProcessFullVideo.disabled = false;
            setGlobalStatus('Vídeo Listo', 'ready');

            // Trigger initial preview
            generatePreview();

        } catch (e) {
            alert('Error al subir archivo: ' + e.message);
            setGlobalStatus('Error en Subida', 'error');
        }
    }

    async function fetchVideoMetadata(filename, originalName) {
        // Use preview endpoint with dummy call to get metadata or probe
        // Here we extract frame at 0.0 to verify and set duration
        try {
            const resp = await fetch(getApiUrl('/api/preview'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: filename,
                    timestamp: 0.0,
                    settings: getSettingsPayload()
                })
            });

            if (resp.ok) {
                sourceInfoCard.style.display = 'block';
                infoFilename.textContent = originalName;
                infoDuration.textContent = 'Calculando...';
                infoResolution.textContent = '320x240 (Auto)';
                infoFps.textContent = '30 FPS';
                infoTotalFrames.textContent = 'Auto';
                infoAudio.textContent = 'Sí';

                // Configure timestamp slider max
                previewTimestamp.max = 300; // 5 min default range
            }
        } catch (e) {
            console.warn('Could not fetch metadata:', e);
        }
    }

    // GET SETTINGS PAYLOAD
    function getSettingsPayload() {
        return {
            depth_method: depthMethod.value,
            artistic_type: artisticType.value,
            intensity: parseFloat(sliderIntensity.value),
            depth_in: parseFloat(sliderDepthIn.value),
            depth_out: parseFloat(sliderDepthOut.value),
            smoothing: parseFloat(sliderSmoothing.value),
            temporal_stability: parseFloat(sliderTemporal.value),
            depth_curve: depthCurvePoints,
            eye_separation: parseFloat(sliderEyeSep.value),
            horizontal_shift: parseFloat(sliderHShift.value),
            depth_strength: parseFloat(sliderDepthStrength.value),
            invert_eyes: checkInvertEyes.checked,
            invert_depth: checkInvertDepth.checked,
            edge_weight: parseFloat(sliderEdgeWeight.value),
            motion_weight: parseFloat(sliderMotionWeight.value),
            texture_weight: parseFloat(sliderTextureWeight.value),
            contrast_weight: parseFloat(sliderContrastWeight.value),
            hole_filling: selectHoleFilling.value,
            stereo_format: stereoFormat.value,
            quality: outputQuality.value,
            keep_audio: checkKeepAudio.checked
        };
    }

    // GENERATE PREVIEW
    async function generatePreview() {
        if (!currentUploadedFilename) return;

        setGlobalStatus('Generando vista previa...', 'processing');
        btnGeneratePreview.disabled = true;

        try {
            const payload = {
                filename: currentUploadedFilename,
                timestamp: parseFloat(previewTimestamp.value),
                settings: getSettingsPayload()
            };

            const resp = await fetch(getApiUrl('/api/preview'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.detail || 'Error al generar la vista previa.');
            }

            currentPreviewData = await resp.json();
            renderPreviewMode();
            setGlobalStatus('Vista Previa Actualizada', 'ready');

        } catch (e) {
            alert('Error generando preview: ' + e.message);
            setGlobalStatus('Error Preview', 'error');
        } finally {
            btnGeneratePreview.disabled = false;
        }
    }

    function renderPreviewMode() {
        if (!currentPreviewData) return;

        placeholderMsg.style.display = 'none';
        singleViewContainer.style.display = 'none';
        splitViewContainer.style.display = 'none';
        dualViewContainer.style.display = 'none';

        if (currentViewMode === 'processed') {
            singleViewContainer.style.display = 'flex';
            mainPreviewImg.src = currentPreviewData.processed;
        } else if (currentViewMode === 'depth') {
            singleViewContainer.style.display = 'flex';
            mainPreviewImg.src = currentPreviewData.depth_map;
        } else if (currentViewMode === 'split') {
            splitViewContainer.style.display = 'block';
            splitOriginalImg.src = currentPreviewData.original;
            splitProcessedImg.src = currentPreviewData.processed;
        } else if (currentViewMode === 'lr') {
            dualViewContainer.style.display = 'flex';
            leftEyeImg.src = currentPreviewData.left_eye;
            rightEyeImg.src = currentPreviewData.right_eye;
        }
    }

    // FULL JOB PROCESSING
    async function startFullProcessing() {
        if (!currentUploadedFilename) return;

        setGlobalStatus('Creando trabajo...', 'processing');
        btnProcessFullVideo.disabled = true;
        downloadSection.style.display = 'none';
        jobProgressContainer.style.display = 'flex';

        try {
            const resp = await fetch(getApiUrl('/api/jobs'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: currentUploadedFilename,
                    settings: getSettingsPayload()
                })
            });

            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.detail || 'Error al iniciar el trabajo.');
            }

            const jobInfo = await resp.json();
            currentJobId = jobInfo.job_id;

            // Start polling status
            startJobPolling(currentJobId);

        } catch (e) {
            alert('Error iniciando procesamiento: ' + e.message);
            setGlobalStatus('Error de Inicio', 'error');
            btnProcessFullVideo.disabled = false;
            jobProgressContainer.style.display = 'none';
        }
    }

    function startJobPolling(jobId) {
        if (jobPollInterval) clearInterval(jobPollInterval);

        jobPollInterval = setInterval(async () => {
            try {
                const resp = await fetch(getApiUrl(`/api/jobs/${jobId}`));
                if (!resp.ok) return;

                const job = await resp.json();
                updateJobUI(job);

                if (job.status === 'COMPLETED') {
                    clearInterval(jobPollInterval);
                    onJobCompleted(job);
                } else if (job.status === 'FAILED') {
                    clearInterval(jobPollInterval);
                    onJobFailed(job);
                } else if (job.status === 'CANCELLED') {
                    clearInterval(jobPollInterval);
                    onJobCancelled();
                }

            } catch (e) {
                console.error('Error polling job:', e);
            }
        }, 1000);
    }

    function updateJobUI(job) {
        const pct = job.progress || 0;
        progressBarInner.style.width = `${pct}%`;
        progressPercent.textContent = `${pct.toFixed(1)}%`;
        progressFrames.textContent = `${job.current_frame || 0} / ${job.total_frames || 0} Frames`;
        progressFps.textContent = `${job.processing_fps || 0} FPS`;

        if (job.estimated_remaining !== null && job.estimated_remaining !== undefined) {
            const mins = Math.floor(job.estimated_remaining / 60);
            const secs = Math.floor(job.estimated_remaining % 60);
            progressEta.textContent = `ETA: ${mins}m ${secs}s`;
        } else {
            progressEta.textContent = 'ETA: Calculando...';
        }

        setGlobalStatus(`Procesando (${pct.toFixed(0)}%)`, 'processing');
    }

    function onJobCompleted(job) {
        setGlobalStatus('Procesamiento Completado', 'ready');
        jobProgressContainer.style.display = 'none';
        downloadSection.style.display = 'block';
        btnDownloadResult.href = getApiUrl(`/api/jobs/${job.job_id}/result`);
        btnProcessFullVideo.disabled = false;
    }

    function onJobFailed(job) {
        alert('El procesamiento ha fallado: ' + (job.error || 'Error desconocido.'));
        setGlobalStatus('Error en Procesamiento', 'error');
        jobProgressContainer.style.display = 'none';
        btnProcessFullVideo.disabled = false;
    }

    function onJobCancelled() {
        setGlobalStatus('Procesamiento Cancelado', 'ready');
        jobProgressContainer.style.display = 'none';
        btnProcessFullVideo.disabled = false;
    }

    async function cancelJob() {
        if (!currentJobId) return;

        try {
            await fetch(getApiUrl(`/api/jobs/${currentJobId}/cancel`), { method: 'POST' });
            setGlobalStatus('Cancelando...', 'processing');
        } catch (e) {
            console.error('Error cancelling job:', e);
        }
    }

    // DEPTH CURVE CANVAS DRAWING
    function initCurveCanvas() {
        drawCurveCanvas();

        depthCurveCanvas.addEventListener('click', (e) => {
            const rect = depthCurveCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1.0 - ((e.clientY - rect.top) / rect.height); // Flip y so 1 is top

            depthCurvePoints.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
            depthCurvePoints.sort((a, b) => a[0] - b[0]);
            drawCurveCanvas();
        });

        btnResetCurve.addEventListener('click', () => {
            depthCurvePoints = [[0.0, 0.0], [0.5, 0.5], [1.0, 1.0]];
            drawCurveCanvas();
        });
    }

    function drawCurveCanvas() {
        const w = depthCurveCanvas.width;
        const h = depthCurveCanvas.height;

        ctxCurve.clearRect(0, 0, w, h);

        // Draw grid
        ctxCurve.strokeStyle = '#334155';
        ctxCurve.lineWidth = 1;
        ctxCurve.beginPath();
        ctxCurve.moveTo(0, h / 2);
        ctxCurve.lineTo(w, h / 2);
        ctxCurve.stroke();

        // Draw Curve
        ctxCurve.strokeStyle = '#38bdf8';
        ctxCurve.lineWidth = 2;
        ctxCurve.beginPath();

        depthCurvePoints.forEach((pt, idx) => {
            const px = pt[0] * w;
            const py = (1.0 - pt[1]) * h;
            if (idx === 0) ctxCurve.moveTo(px, py);
            else ctxCurve.lineTo(px, py);
        });
        ctxCurve.stroke();

        // Draw Points
        ctxCurve.fillStyle = '#6366f1';
        depthCurvePoints.forEach((pt) => {
            const px = pt[0] * w;
            const py = (1.0 - pt[1]) * h;
            ctxCurve.beginPath();
            ctxCurve.arc(px, py, 4, 0, Math.PI * 2);
            ctxCurve.fill();
        });
    }

    function setGlobalStatus(msg, type) {
        globalStatus.textContent = msg;
        globalStatus.className = `status-indicator ${type}`;
    }
});
