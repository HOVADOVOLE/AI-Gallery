"""
The "Brain" of the application. This module wraps heavy AI models 
(CLIP and EasyOCR) to perform semantic analysis and text recognition 
on images.

Dependencies:
    - transformers (HuggingFace): For CLIP model.
    - easyocr: For reading text from images.
    - torch: PyTorch backend.
    - PIL: Image loading.
"""

import yaml
import torch
import easyocr
import concurrent.futures
from PIL import Image
from typing import List, Dict, Any, Tuple
from transformers import CLIPProcessor, CLIPModel

# --- Configuration Loader ---
CONFIG_PATH = "config.yaml"

def load_config():
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)

config = load_config()

# --- Global Model Cache ---
_clip_model = None
_clip_processor = None
_ocr_reader = None

def get_clip_model():
    """Lazy loads the CLIP model and processor."""
    global _clip_model, _clip_processor
    if _clip_model is None:
        print("INFO: Loading CLIP Model... (This may take a moment)")
        model_id = config["clip"]["model_id"]
        _clip_model = CLIPModel.from_pretrained(model_id)
        _clip_processor = CLIPProcessor.from_pretrained(model_id)
        print("INFO: CLIP Model loaded.")
    return _clip_model, _clip_processor

def get_ocr_reader():
    """Lazy loads the EasyOCR reader."""
    global _ocr_reader
    if _ocr_reader is None:
        print("INFO: Loading OCR Reader...")
        use_gpu = torch.cuda.is_available()
        _ocr_reader = easyocr.Reader(config["ocr"]["languages"], gpu=use_gpu)
        print(f"INFO: OCR Reader loaded (GPU={use_gpu}).")
    return _ocr_reader


# --- Helper: Safe Image Loading ---
def load_pil_image(path: str) -> Image.Image:
    try:
        return Image.open(path).convert("RGB")
    except Exception as e:
        print(f"ERROR: Failed to load image {path}: {e}")
        return None

# --- Analysis Functions ---

def analyze_batch_semantics(image_paths: List[str]) -> List[List[Dict[str, Any]]]:
    """
    Function: analyze_batch_semantics
    
    Description:
        Batch processes multiple images through CLIP.
        This is significantly faster than single processing.
    """
    batch_results = [[] for _ in image_paths] # Prepare empty results
    
    try:
        model, processor = get_clip_model()
        labels = config["clip"]["labels"]
        
        # 1. Parallel Load Images (I/O Bound)
        valid_images = []
        valid_indices = []
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            loaded_images = list(executor.map(load_pil_image, image_paths))
            
        for i, img in enumerate(loaded_images):
            if img:
                valid_images.append(img)
                valid_indices.append(i)
        
        if not valid_images:
            return batch_results

        # 2. Run Batch Inference
        # Process all images at once
        inputs = processor(text=labels, images=valid_images, return_tensors="pt", padding=True)
        
        with torch.no_grad(): # Disable gradient calculation for inference (saves RAM/Speed)
            outputs = model(**inputs)
        
        # 3. Map Results back to original indices
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1) # Shape: [batch_size, num_labels]
        
        threshold = config["clip"]["confidence_threshold"]
        
        for idx_in_batch, original_idx in enumerate(valid_indices):
            image_probs = probs[idx_in_batch]
            
            for label_idx, prob in enumerate(image_probs):
                score = prob.item()
                if score > threshold:
                    batch_results[original_idx].append({
                        "name": labels[label_idx],
                        "confidence": score,
                        "source": "ai_clip",
                        "category": "auto_classified"
                    })
                    
            # Sort by confidence
            batch_results[original_idx].sort(key=lambda x: x["confidence"], reverse=True)
            
    except Exception as e:
        print(f"ERROR: Batch CLIP analysis failed: {e}")
        import traceback
        traceback.print_exc()

    return batch_results


def analyze_image_text(image_path: str) -> List[Dict[str, Any]]:
    """
    Standard OCR function (same as before).
    """
    results = []
    if not config["ocr"]["enabled"]:
        return results
        
    try:
        reader = get_ocr_reader()
        texts = reader.readtext(image_path, detail=0)
        
        for text in texts:
            clean_text = text.strip()
            if clean_text.isdigit() and 1 <= int(clean_text) <= 999:
                results.append({
                    "name": clean_text,
                    "confidence": 0.90,
                    "source": "ai_ocr",
                    "category": "number"
                })
            elif len(clean_text) > 3 and clean_text.isupper():
                 results.append({
                    "name": clean_text,
                    "confidence": 0.80,
                    "source": "ai_ocr",
                    "category": "text"
                })
    except Exception as e:
        print(f"ERROR: OCR analysis failed for {image_path}: {e}")
        
    return results


def analyze_batch(image_paths: List[str]) -> List[List[Dict[str, Any]]]:
    """
    Function: analyze_batch
    
    Description:
        Master function for batch processing.
        Runs CLIP in batch (Main Thread/GPU) and OCR in parallel (ThreadPool).
    """
    print(f"DEBUG: Analyzing batch of {len(image_paths)} images...")
    
    # 1. Run CLIP (Batch)
    # Since CLIP uses the GPU/Heavy CPU matrix ops, we run it on the main thread
    # or ensure it's not fighting for resources.
    clip_results = analyze_batch_semantics(image_paths)
    
    # 2. Run OCR (Parallel)
    # OCR is CPU intensive but separate calls can run in parallel
    ocr_results = [[] for _ in image_paths]
    
    if config["ocr"]["enabled"]:
        # CRITICAL FIX: Initialize OCR reader ONCE in the main thread before forking threads.
        # Otherwise, every thread tries to load the model into RAM simultaneously, causing a freeze.
        get_ocr_reader()
        
        # Reduce workers to 2 to prevent CPU thrashing (OCR is very heavy on CPU)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            ocr_futures = list(executor.map(analyze_image_text, image_paths))
            ocr_results = ocr_futures
    
    # 3. Combine Results
    final_results = []
    for i in range(len(image_paths)):
        combined = clip_results[i] + ocr_results[i]
        final_results.append(combined)
        
    return final_results


def analyze_image(image_path: str) -> List[Dict[str, Any]]:
    """
    Wrapper for single image analysis to maintain backward compatibility.
    """
    results = analyze_batch([image_path])
    return results[0] if results else []