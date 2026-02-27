import streamlit as st
import torch
import cv2
import numpy as np
import os
import sys
from PIL import Image

# Add the backend directory to sys.path so we can import calorie_calc
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web_app', 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

try:
    from calorie_calc import image_segmentation, crop_img, getCalorie, getVolume, PIXEL_TO_CM_MULTIPLIER_CONSTANT
except ImportError as e:
    st.error(f"Error importing backend functions: {e}. Please ensure calorie_calc.py exists in web_app/backend")
    st.stop()

# Set page config
st.set_page_config(
    page_title="Food Calorie Estimation",
    page_icon="🍎",
    layout="wide"
)

# Constants
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLOV5_REPO_PATH = os.path.join(BASE_DIR, 'web_app', 'models', 'yolov5')
MODEL_WEIGHTS_PATH = os.path.join(YOLOV5_REPO_PATH, 'best.pt')
LABEL_LIST = ["thumb", "apple", "banana", "orange", "qiwi", "tomato", "carrot", "onion"]

# Load model, cache to prevent reloading on every interaction
@st.cache_resource
def load_model():
    try:
        if os.path.exists(MODEL_WEIGHTS_PATH):
            import sys
            if YOLOV5_REPO_PATH not in sys.path:
                sys.path.insert(0, YOLOV5_REPO_PATH)
            
            # Using DetectMultiBackend directly bypasses the torch.hub.load GitHub fetch issue
            from models.common import DetectMultiBackend, AutoShape
            from utils.torch_utils import select_device
            
            device = select_device('') # Auto select CPU/GPU
            model = DetectMultiBackend(MODEL_WEIGHTS_PATH, device=device, dnn=False, data=None, fp16=False)
            model = AutoShape(model)
            model.conf = 0.15 # Use standard YOLOv5 configuration logic in prediction
            return model, True # True denotes custom model
        else:
            model = torch.hub.load('ultralytics/yolov5', 'yolov5s')
            model.conf = 0.15
            return model, False # False denotes standard model
    except Exception as e:
        st.error(f"Failed to load model: {e}")
        import traceback
        st.error(traceback.format_exc())
        return None, False

def process_image(img_array, model):
    # img_array is expected to be BGR image as that's what cv2 and our functions use

    # Convert BGR to RGB for YOLOv5 model inference
    img_rgb = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
    results = model(img_rgb)
    predictions = results.pandas().xyxy[0].to_dict(orient="records")
    
    thumb_data = None
    fruit_data_list = []
    
    # Process predictions
    for i, pred in enumerate(predictions):
        label = pred['name'].lower()
        conf = pred['confidence']
        xmin, ymin, xmax, ymax = int(pred['xmin']), int(pred['ymin']), int(pred['xmax']), int(pred['ymax'])
        w = xmax - xmin
        h = ymax - ymin
        
        bb_cordinate = [xmin, ymin, w, h]
        
        # Crop and segment
        crop_result = crop_img(img_array, f"{label}_{i}", bb_cordinate)
        cropped_img = crop_result['cropped_image']
        
        seg_res = image_segmentation(f"{label}_{i}", cropped_img)
        
        if seg_res is None:
            # Fallback if segmentation fails
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

        # Draw bounding boxes
        color = (0, 255, 0) if label != "thumb" else (255, 0, 0)
        cv2.rectangle(img_array, (xmin, ymin), (xmax, ymax), color, 2)
        cv2.putText(img_array, f"{label} {conf:.2f}", (xmin, max(ymin - 10, 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Calculate calories
    final_results = []
    total_calories = 0
    
    # Fallback if thumb is missing
    if thumb_data is None:
        # If there is no thumb, we want the default volume calculation to yield roughly 100-150cm^3 for a typical fruit crop.
        # Previously we yielded ~3700g, which is enormous.
        # Let's adjust the multiplier ratio.
        thumb_data = {
            "area": 100000.0, 
            "pix_to_cm": 0.01 
        }
    
    for fruit in fruit_data_list:
        label = fruit['label'].lower()
        mapToCapital = label.capitalize()
        
        mass = 0
        cal = 0
        
        # In the original calorie_calc, Pizza might not be exactly supported in shape logic, 
        # but let's assume it gets passed.
        # Ensure we pass the capitalized label to match calorie_dict keys
        if mapToCapital in ["Apple", "Banana", "Carrot", "Onion", "Orange", "Tomato", "Qiwi", "Pizza"]:
            try:
                vol = getVolume(mapToCapital, fruit['area'], thumb_data['area'], thumb_data['pix_to_cm'], fruit['contour'])
                mass, cal, cal_100 = getCalorie(mapToCapital, vol)
                total_calories += cal
            except Exception as e:
                st.warning(f"Error calculating volume for {mapToCapital}: {e}")
        
        final_results.append({
            "Label": mapToCapital,
            "Confidence": f"{fruit['confidence']:.2f}",
            "Mass (g)": f"{mass:.2f}",
            "Energy (kcal)": f"{cal:.2f}"
        })

    # Return the annotated image (convert back to RGB for Streamlit)
    annotated_img = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
    
    return annotated_img, final_results, total_calories, thumb_data is not None and "contour" in thumb_data, predictions

# --- UI Layout ---

st.title("🍎 Food Calorie Estimation System")
st.markdown("Estimate calories from food items using Deep Learning & Computer Vision. Upload an image of your food alongside a thumb (as a size reference object).")

model, is_custom = load_model()

if model is None:
    st.error("Model failed to load. Please check the backend model configuration.")
    st.stop()

if not is_custom:
    st.warning("⚠️ Currently using standard YOLOv5 model. It is not trained to detect 'thumb' and specific fruits accurately. Model weights are expected at web_app/models/yolov5/best.pt.")

st.markdown("---")

uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Original Image")
        # Read the file
        file_bytes = np.asarray(bytearray(uploaded_file.read()), dtype=np.uint8)
        opencv_image = cv2.imdecode(file_bytes, 1)
        # Display RGB version
        st.image(cv2.cvtColor(opencv_image, cv2.COLOR_BGR2RGB), use_container_width=True)
    
    with col2:
        st.subheader("Processed Analysis")
        with st.spinner('Detecting objects and estimating calories...'):
            try:
                img_copy = opencv_image.copy()
                annotated_img, results_list, total_cal, found_thumb, raw_preds = process_image(img_copy, model)
                
                st.image(annotated_img, caption="Annotated Image with Bounding Boxes", use_container_width=True)
                
                with st.expander("Show Raw Model Predictions (Debug)"):
                    st.json(raw_preds)
                
                if results_list:
                    st.success(f"**Total Estimated Energy:** {total_cal:.2f} kcal")
                    st.table(results_list)
                else:
                    st.info("No food items successfully detected from the list of supported objects.")
                    
            except Exception as e:
                st.error(f"Error during processing: {e}")
