# plugins/imgGen.py

import asyncio
import io
import json
import os
import random
import time
import uuid

import requests
from PIL import Image

from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

# Ensure the output directory exists
STATIC_DIR = "static"
IMAGE_DIR = os.path.join(STATIC_DIR, "generated_images")
os.makedirs(IMAGE_DIR, exist_ok=True)

# Your complete CHIMERA PRT1.json workflow is now embedded here.
WORKFLOW_PAYLOAD = {
  "prompt": {
    "1": {
      "inputs": { "ckpt_name": "juggernautXL_ragnarokBy.safetensors" },
      "class_type": "CheckpointLoaderSimple"
    },
    "2": {
      "inputs": { "text": "watermark,poorly drawn", "clip": [ "1", 1 ] },
      "class_type": "CLIPTextEncode"
    },
    "3": {
      "inputs": { "text": "placeholder prompt", "clip": [ "1", 1 ] },
      "class_type": "CLIPTextEncode"
    },
    "4": {
      "inputs": {
        "seed": 795195604733340,
        "steps": 40,
        "cfg": 8,
        "sampler_name": "dpmpp_2m",
        "scheduler": "karras",
        "denoise": 0.9,
        "model": [ "1", 0 ],
        "positive": [ "3", 0 ],
        "negative": [ "2", 0 ],
        "latent_image": [ "6", 0 ]
      },
      "class_type": "KSampler"
    },
    "5": {
      "inputs": { "samples": [ "4", 0 ], "vae": [ "1", 2 ] },
      "class_type": "VAEDecode"
    },
    "6": {
      "inputs": { "width": [ "19", 2 ], "height": [ "20", 2 ], "batch_size": 1 },
      "class_type": "EmptyLatentImage"
    },
    "9": {
      "inputs": { "filename_prefix": "Cerebra", "images": [ "5", 0 ] },
      "class_type": "SaveImage"
    },
    "19": {
      "inputs": { "number_a": [ "21", 0 ], "number_b": [ "22", 0 ], "boolean": [ "26", 0 ] },
      "class_type": "Number Input Switch"
    },
    "20": {
      "inputs": { "number_a": [ "22", 0 ], "number_b": [ "21", 0 ], "boolean": [ "26", 0 ] },
      "class_type": "Number Input Switch"
    },
    "21": { "inputs": { "a": [ "23", 0 ] }, "class_type": "CM_IntToNumber" },
    "22": { "inputs": { "a": [ "25", 0 ] }, "class_type": "CM_IntToNumber" },
    "23": { "inputs": { "value": 1344 }, "class_type": "PrimitiveInt" },
    "25": { "inputs": { "value": 896 }, "class_type": "PrimitiveInt" },
    "26": { "inputs": { "value": True }, "class_type": "PrimitiveBoolean" }
  }
}

def queue_prompt(prompt_payload: dict):
    """Queues a prompt and returns the prompt_id."""
    try:
        response = requests.post(settings.COMFYUI_URL, json=prompt_payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error queueing prompt with ComfyUI: {e}")
        return None

def get_history(prompt_id: str):
    """Gets the history for a given prompt_id."""
    try:
        url = settings.COMFYUI_URL.replace("/prompt", f"/history/{prompt_id}")
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error getting ComfyUI history: {e}")
        return None

def get_image_data(filename: str):
    """Gets the image data from the /view endpoint."""
    try:
        url = settings.COMFYUI_URL.replace("/prompt", "/view")
        params = {"filename": filename, "type": "output"}
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.content
    except requests.exceptions.RequestException as e:
        logger.error(f"Error getting image data from ComfyUI: {e}")
        return None

async def generate_image(prompt: str) -> dict:
    """
    Generates an image using ComfyUI and returns a dictionary with content and attachment info.
    """
    if not settings.COMFYUI_ENABLED:
        return {"content": "Image generation is currently disabled."}
    
    payload = WORKFLOW_PAYLOAD.copy()
    positive_prompt_node = "3" 
    sampler_node = "4"
    save_image_node = "9"

    payload["prompt"][positive_prompt_node]["inputs"]["text"] = prompt
    payload["prompt"][sampler_node]["inputs"]["seed"] = random.randint(0, 999999999999999)

    queue_res = queue_prompt(payload)
    if not queue_res or "prompt_id" not in queue_res:
        return {"content": "Error: Failed to queue prompt with ComfyUI. Is it running?"}
    
    prompt_id = queue_res['prompt_id']
    logger.info(f"ComfyUI prompt queued. ID: {prompt_id}")

    for _ in range(120): # Poll for up to 2 minutes
        await asyncio.sleep(1)
        history = get_history(prompt_id)
        if history and prompt_id in history:
            history_data = history[prompt_id]
            if 'outputs' in history_data and save_image_node in history_data['outputs']:
                logger.info("ComfyUI generation complete.")
                image_info = history_data['outputs'][save_image_node]['images'][0]
                image_data = get_image_data(image_info['filename'])
                
                if not image_data:
                    return {"content": "Error: Could not retrieve image data from ComfyUI."}
                
                image = Image.open(io.BytesIO(image_data))
                unique_filename = f"{uuid.uuid4()}.png"
                save_path = os.path.join(IMAGE_DIR, unique_filename)
                image.save(save_path)
                
                # FIX: Use full URL with backend base URL
                image_url = f"{settings.BACKEND_URL}/static/generated_images/{unique_filename}"
                logger.info(f"Image saved. Full URL: {image_url}")

                return {
                    "content": f"I've generated an image based on your prompt: '{prompt[:60]}{'...' if len(prompt) > 60 else ''}'.",
                    "attachment": {
                        "fileName": unique_filename,
                        "fileType": "image",
                        "previewUrl": image_url,  # Now includes full backend URL
                        "fileUrl": image_url      # Also provide fileUrl for consistency
                    }
                }

    return {"content": "Error: Image generation timed out after 2 minutes."}