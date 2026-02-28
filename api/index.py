"""
FastAPI backend for NutriVision - Food Calorie Estimation.
Wraps YOLOv5 detection + calorie calculation logic from the existing codebase.
Run: uvicorn api:app --reload --host 0.0.0.0 --port 8000
"""

import os
import sys
import io
import base64
import numpy as np
import cv2
import torch
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, 'web_app', 'backend')
YOLOV5_REPO_PATH = os.path.join(BASE_DIR, 'web_app', 'models', 'yolov5')
MODEL_WEIGHTS_PATH = os.path.join(YOLOV5_REPO_PATH, 'best.pt')

if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)
if YOLOV5_REPO_PATH not in sys.path:
    sys.path.insert(0, YOLOV5_REPO_PATH)

from calorie_calc import image_segmentation, crop_img, getCalorie, getVolume, PIXEL_TO_CM_MULTIPLIER_CONSTANT

# Create FastAPI app
app = FastAPI(title="NutriVision API", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup
model = None
LABEL_LIST = ["thumb", "apple", "banana", "orange", "qiwi", "tomato", "carrot", "onion"]


@app.on_event("startup")
def load_model_on_startup():
    global model
    try:
        if os.path.exists(MODEL_WEIGHTS_PATH):
            from models.common import DetectMultiBackend, AutoShape
            from utils.torch_utils import select_device

            device = select_device('')
            model = DetectMultiBackend(MODEL_WEIGHTS_PATH, device=device, dnn=False, data=None, fp16=False)
            model = AutoShape(model)
            model.conf = 0.15
            print("✅ Model loaded successfully!")
        else:
            print(f"❌ Model weights not found at: {MODEL_WEIGHTS_PATH}")
    except Exception as e:
        print(f"❌ Error loading model: {e}")


def process_image(img_array):
    """Run YOLOv5 detection and calorie estimation on the image."""
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    img_rgb = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
    results = model(img_rgb)
    predictions = results.pandas().xyxy[0].to_dict(orient="records")

    thumb_data = None
    fruit_data_list = []

    for i, pred in enumerate(predictions):
        label = pred['name'].lower()
        conf = pred['confidence']
        xmin, ymin, xmax, ymax = int(pred['xmin']), int(pred['ymin']), int(pred['xmax']), int(pred['ymax'])
        w = xmax - xmin
        h = ymax - ymin
        bb_cordinate = [xmin, ymin, w, h]

        crop_result = crop_img(img_array, f"{label}_{i}", bb_cordinate)
        cropped_img = crop_result['cropped_image']
        seg_res = image_segmentation(f"{label}_{i}", cropped_img)

        if seg_res is None:
            fallback_area = float(w * h)
            fallback_contour = np.array([[[0, 0]], [[w, 0]], [[w, h]], [[0, h]]], dtype=np.int32)
            seg_pixel_data = [fallback_contour, fallback_area, PIXEL_TO_CM_MULTIPLIER_CONSTANT / max(h, 1)]
        else:
            seg_pixel_data = seg_res['segmented_obj_contour_area_pixel']

        if label == "thumb":
            thumb_data = {
                "contour": seg_pixel_data[0],
                "area": seg_pixel_data[1],
                "pix_to_cm": seg_pixel_data[2] if len(seg_pixel_data) > 2 else (PIXEL_TO_CM_MULTIPLIER_CONSTANT / max(h, 1)),
                "bbox": bb_cordinate
            }
        else:
            fruit_data_list.append({
                "label": label,
                "confidence": conf,
                "bbox": bb_cordinate,
                "contour": seg_pixel_data[0],
                "area": seg_pixel_data[1]
            })

        color = (0, 255, 0) if label != "thumb" else (255, 0, 0)
        cv2.rectangle(img_array, (xmin, ymin), (xmax, ymax), color, 2)
        cv2.putText(img_array, f"{label} {conf:.2f}", (xmin, max(ymin - 10, 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Calculate calories
    final_results = []
    total_calories = 0

    if thumb_data is None:
        thumb_data = {
            "area": 100000.0,
            "pix_to_cm": 0.01
        }

    for fruit in fruit_data_list:
        label = fruit['label'].lower()
        mapToCapital = label.capitalize()
        mass = 0
        cal = 0

        if mapToCapital in ["Apple", "Banana", "Carrot", "Onion", "Orange", "Tomato", "Qiwi", "Pizza"]:
            try:
                vol = getVolume(mapToCapital, fruit['area'], thumb_data['area'], thumb_data['pix_to_cm'], fruit['contour'])
                mass, cal, cal_100 = getCalorie(mapToCapital, vol)
                total_calories += cal
            except Exception as e:
                print(f"Error calculating volume for {mapToCapital}: {e}")

        final_results.append({
            "Label": mapToCapital,
            "Confidence": f"{fruit['confidence']:.2f}",
            "Mass (g)": f"{mass:.2f}",
            "Energy (kcal)": f"{cal:.2f}"
        })

    # Encode annotated image to base64
    annotated_img = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
    _, buffer = cv2.imencode('.jpg', annotated_img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "results": final_results,
        "total_calories": total_calories,
        "thumb_detected": "contour" in (thumb_data or {}),
        "annotated_image": img_base64,
        "raw_predictions": predictions
    }


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """Upload and analyze a food image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    np_array = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    result = process_image(img.copy())
    return JSONResponse(content=result)


@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}
