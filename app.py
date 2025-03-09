
# -*- coding: utf-8 -*-
"""
Created on Wed Jan 29 20:38:21 2025

@author: ekaimoh
"""

from contextlib import suppress
import glob
import json
import os
import uuid
import logging
from flask import Flask, render_template, request, send_from_directory, jsonify

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'myRecordings')
MAX_CONTENT_LENGTH = 300 * 1024 * 1024  # 300 MB limit for uploads
ALLOWED_EXTENSIONS = {'webm', 'mp4'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logger.info(f"Created upload folder: {UPLOAD_FOLDER}")

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/static/<path:path>')
def send_static(path):
    try:
        return send_from_directory('static', path)
    except Exception as e:
        logger.error(f"Error serving static file {path}: {str(e)}")
        return jsonify({'error': 'Static file not found'}), 404

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        logger.error(f"Error rendering index.html: {str(e)}")
        return jsonify({'error': 'Error rendering index page'}), 500


@app.route('/start')
def start_recording():
    try:
        if os.path.exists(UPLOAD_FOLDER):
            for f in glob.glob(os.path.join(UPLOAD_FOLDER, "*")):
                with suppress(Exception):
                    os.remove(f)
                    logger.info(f"Removed file: {f}")
        
        return jsonify({'message': 'Recording started successfully'}), 200
    except Exception as e:
        logger.error(f"Error starting recording: {str(e)}")
        return jsonify({'error': 'Failed to start recording'}), 500


@app.route('/pause')
def pause_recording():
    try:
        return jsonify({'message': 'Recording paused successfully'}), 200
    except Exception as e:
        logger.error(f"Error pausing recording: {str(e)}")
        return jsonify({'error': 'Failed to pause recording'}), 500


@app.route('/resume')
def resume_recording():
    try:
        return jsonify({'message': 'Recording resumed successfully'}), 200
    except Exception as e:
        logger.error(f"Error resuming recording: {str(e)}")
        return jsonify({'error': 'Failed to resume recording'}), 500


@app.route('/stop', methods=['GET', 'POST'])
def stop_recording():
    try:
        return jsonify({'message': 'Video stopped successfully'}), 200
    except Exception as e:
        logger.error(f"Error stopping recording: {str(e)}")
        return jsonify({'error': 'Failed to stop recording'}), 500


@app.route('/discard')
def discard_recording():
    try:
        return jsonify({'message': 'Video recording discarded successfully'}), 200
    except Exception as e:
        logger.error(f"Error discarding recording: {str(e)}")
        return jsonify({'error': 'Failed to discard recording'}), 500


@app.route('/save', methods=['GET', 'POST'])
def upload_video():
    try:
        if request.method != 'POST':
            return jsonify({'error': 'Only POST method is allowed'}), 405
        
        # Check if a file was sent in the request
        if 'file' not in request.files:
            logger.warning("No file part in the request")
            return jsonify({'error': 'No file part in the request'}), 400
        
        video_file = request.files['file']
        
        # Check if file was selected
        if video_file.filename == '':
            logger.warning("No file selected")
            return jsonify({'error': 'No file selected'}), 400
        
        # Save the file
        if video_file:
            try:
                file_name = f"{uuid.uuid4()}.webm"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
                
                video_file.save(file_path)
                logger.info(f"File saved successfully: {file_path}")
                
                return jsonify({
                    'message': 'Video uploaded successfully',
                    'filename': file_name
                }), 200
            except Exception as e:
                logger.error(f"Error saving file: {str(e)}")
                return jsonify({'error': f'Error saving file: {str(e)}'}), 500
        
        return jsonify({'error': 'No valid file found'}), 400
    
    except Exception as e:
        logger.error(f"Error in upload_video: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/videos/<path:filename>')
def get_video(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        logger.error(f"Error serving video {filename}: {str(e)}")
        return jsonify({'error': 'Video not found'}), 404


@app.errorhandler(404)
def page_not_found(e):
    return jsonify({'error': 'Page not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

