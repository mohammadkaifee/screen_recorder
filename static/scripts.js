
// static/scripts.js
let mediaRecorder;
let recordedChunks = [];
let videoElement = document.getElementById('videoElement');
let stream;
let timerInterval;
let startTime;
let pausedTime = 0;
let isPaused = false;
let messageTimeout;

// Initialize UI elements
const messageElement = document.getElementById('message');
const loaderElement = document.getElementById('loader');
const timerElement = document.getElementById('timer');

// Button elements
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const discardBtn = document.getElementById('discardBtn');
const uploadBtn = document.getElementById('uploadBtn');

// Show message with status
function showMessage(text, type = 'info') {
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }
    
    messageElement.classList.remove('success', 'error', 'info');
    
    messageElement.classList.add(type, 'show');
    messageElement.textContent = text;
    
    if (type !== 'error') {
        messageTimeout = setTimeout(() => {
            messageElement.classList.remove('show');
        }, 5000);
    }
}

function startTimer() {
    timerElement.style.display = 'block';
    startTime = Date.now() - pausedTime;
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsedTime = isPaused ? pausedTime : Date.now() - startTime;
    
    const hours = Math.floor(elapsedTime / 3600000);
    const minutes = Math.floor((elapsedTime % 3600000) / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    
    timerElement.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function pauseTimer() {
    clearInterval(timerInterval);
    pausedTime = Date.now() - startTime;
    isPaused = true;
}

function resumeTimer() {
    isPaused = false;
    startTime = Date.now() - pausedTime;
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerElement.style.display = 'none';
}

function updateButtonState(action) {
    switch(action) {
        case 'start':
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            resumeBtn.disabled = true;
            stopBtn.disabled = false;
            discardBtn.disabled = true;
            uploadBtn.disabled = true;
            break;
        case 'pause':
            pauseBtn.disabled = true;
            resumeBtn.disabled = false;
            break;
        case 'resume':
            pauseBtn.disabled = false;
            resumeBtn.disabled = true;
            break;
        case 'stop':
            startBtn.disabled = true;
            pauseBtn.disabled = true;
            resumeBtn.disabled = true;
            stopBtn.disabled = true;
            discardBtn.disabled = false;
            uploadBtn.disabled = false;
            break;
        case 'discard':
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            resumeBtn.disabled = true;
            stopBtn.disabled = true;
            discardBtn.disabled = true;
            uploadBtn.disabled = true;
            break;
        case 'upload':
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            resumeBtn.disabled = true;
            stopBtn.disabled = true;
            discardBtn.disabled = true;
            uploadBtn.disabled = true;
            break;
    }
}

function showLoader() {
    loaderElement.style.display = 'block';
}

function hideLoader() {
    loaderElement.style.display = 'none';
}

async function startRecording() {
    try {
        showLoader();
        showMessage('Starting recording...', 'info');
        
        const response = await fetch('/start');
        
        if (!response.ok) {
            throw new Error('Server error: Failed to start recording');
        }
        
        stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { 
                cursor: "always",
                frameRate: 30
            },
            audio: true 
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9,opus'
        });
        
        recordedChunks = [];
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            videoElement.src = videoUrl;
        };
        
        mediaRecorder.start(1000);
        startTimer();
        updateButtonState('start');
        showMessage('Recording started successfully', 'success');
        hideLoader();
    } catch (err) {
        console.error('Error starting recording:', err);
        if (err.name === 'NotAllowedError') {
            showMessage('Permission denied. Please allow screen recording.', 'error');
        } else {
            showMessage(`Failed to start recording: ${err.message}`, 'error');
        }
        
        hideLoader();
        updateButtonState('discard');
    }
}

function pauseRecording() {
    try {
        showMessage('Pausing recording...', 'info');
        
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            pauseTimer();
            
            fetch('/pause')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Server error: Failed to pause recording');
                    }
                    return response.text();
                })
                .then(() => {
                    updateButtonState('pause');
                    showMessage('Recording paused', 'info');
                })
                .catch(error => {
                    console.error('Error during pause:', error);
                    showMessage(`Failed to pause: ${error.message}`, 'error');
                });
        } else {
            showMessage('Cannot pause: No active recording', 'error');
        }
    } catch (err) {
        console.error('Error pausing recording:', err);
        showMessage(`Failed to pause recording: ${err.message}`, 'error');
    }
}

function resumeRecording() {
    try {
        showMessage('Resuming recording...', 'info');
        
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            resumeTimer();
            
            fetch('/resume')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Server error: Failed to resume recording');
                    }
                    return response.text();
                })
                .then(() => {
                    updateButtonState('resume');
                    showMessage('Recording resumed', 'success');
                })
                .catch(error => {
                    console.error('Error during resume:', error);
                    showMessage(`Failed to resume: ${error.message}`, 'error');
                });
        } else {
            showMessage('Cannot resume: No paused recording', 'error');
        }
    } catch (err) {
        console.error('Error resuming recording:', err);
        showMessage(`Failed to resume recording: ${err.message}`, 'error');
    }
}

function stopRecording() {
    try {
        showLoader();
        showMessage('Stopping recording...', 'info');
        
        if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
            mediaRecorder.stop();
            stopTimer();
            
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            fetch('/stop', {
                method: 'POST'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Server error: Failed to stop recording');
                }
                return response.json();
            })
            .then(data => {
                updateButtonState('stop');
                showMessage(data.message || 'Recording stopped successfully', 'success');
                hideLoader();
            })
            .catch(error => {
                console.error('Error stopping recording:', error);
                showMessage(`Failed to stop recording: ${error.message}`, 'error');
                hideLoader();
            });
        } else {
            showMessage('Cannot stop: No active recording', 'error');
            hideLoader();
        }
    } catch (err) {
        console.error('Error stopping recording:', err);
        showMessage(`Failed to stop recording: ${err.message}`, 'error');
        hideLoader();
    }
}

function discardRecording() {
    try {
        showLoader();
        showMessage('Discarding recording...', 'info');
        
        recordedChunks = [];
        videoElement.src = '';
        
        if (mediaRecorder) {
            mediaRecorder = null;
        }
        
        fetch('/discard')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Server error: Failed to discard recording');
                }
                return response.text();
            })
            .then(() => {
                updateButtonState('discard');
                showMessage('Recording discarded successfully', 'success');
                hideLoader();
            })
            .catch(error => {
                console.error('Error discarding recording:', error);
                showMessage(`Failed to discard: ${error.message}`, 'error');
                hideLoader();
            });
    } catch (err) {
        console.error('Error discarding recording:', err);
        showMessage(`Failed to discard recording: ${err.message}`, 'error');
        hideLoader();
    }
}

function uploadRecording() {
    if (recordedChunks.length === 0) {
        showMessage('No recording to upload', 'error');
        return;
    }
    
    try {
        showLoader();
        showMessage('Uploading recording...', 'info');
        
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        
        fetch('/save', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server error: Failed to upload recording');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            updateButtonState('upload');
            showMessage('Recording uploaded successfully', 'success');
            hideLoader();
            recordedChunks = [];
            videoElement.src = '';
            if (mediaRecorder) {
                mediaRecorder = null;
            }
        })
        .catch(error => {
            console.error('Error uploading recording:', error);
            showMessage(`Failed to upload: ${error.message}`, 'error');
            hideLoader();
        });
    } catch (err) {
        console.error('Error uploading recording:', err);
        showMessage(`Failed to upload recording: ${err.message}`, 'error');
        hideLoader();
    }
}

window.addEventListener('beforeunload', (event) => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        event.preventDefault();
        event.stopPropagation();
        event.message = 'You have an active recording. Are you sure you want to leave?';
        return event.message;
    }
});

