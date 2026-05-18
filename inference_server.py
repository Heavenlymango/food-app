"""
Food recognition inference server.
Runs MobileNetV3 first; falls back to YOLOv11-small if confidence < 80%.

Usage (from C:/Users/school/Documents/pp):
  evenv/Scripts/python.exe inference_server.py
"""

import io
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import uvicorn

BASE = Path(__file__).parent
MODEL_DIR = BASE / "model"

MOBILENET_PATH = MODEL_DIR / "MobileNet/mobilenet_output/mobilenet_food.onnx"
YOLO_PATH      = MODEL_DIR / "YoloSmall/train/weights/best.onnx"

CLASS_NAMES = [
    "amok", "bai_sach_chrouk", "banana_pancakes", "buddha_bowl", "curry",
    "dumplings", "french_fries", "fried_egg", "fried_rice", "grilled_corn",
    "grilled_pork_ribs", "grilled_skewer", "hamburger", "khor_ko", "kuy_teav",
    "laksa", "lok_lak", "nom_banh_chok", "num_pang", "pad_thai",
    "papaya_salad", "pho", "pizza", "pleah_sach_ko", "ramen",
    "rice porridge", "samlor_korko", "samlor_machu", "spring_rolls", "sushi",
    "tofu_bowl", "tom_yum_soup",
]

# ── lazy session holders ──────────────────────────────────────────────────────
_mobilenet: ort.InferenceSession | None = None
_yolo:      ort.InferenceSession | None = None

def get_mobilenet() -> ort.InferenceSession:
    global _mobilenet
    if _mobilenet is None:
        print("Loading MobileNetV3…")
        _mobilenet = ort.InferenceSession(str(MOBILENET_PATH), providers=["CPUExecutionProvider"])
        print("MobileNetV3 ready")
    return _mobilenet

def get_yolo() -> ort.InferenceSession:
    global _yolo
    if _yolo is None:
        print("Loading YOLOv11-small…")
        _yolo = ort.InferenceSession(str(YOLO_PATH), providers=["CPUExecutionProvider"])
        print("YOLOv11-small ready")
    return _yolo

# ── image preprocessing ───────────────────────────────────────────────────────
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
IMAGENET_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)

def preprocess_mobilenet(img: Image.Image) -> np.ndarray:
    img = img.convert("RGB").resize((224, 224), Image.BILINEAR)
    arr = np.array(img, dtype=np.float32).transpose(2, 0, 1) / 255.0
    arr = (arr - IMAGENET_MEAN) / IMAGENET_STD
    return arr[np.newaxis]  # [1, 3, 224, 224]

def preprocess_yolo(img: Image.Image) -> np.ndarray:
    img = img.convert("RGB").resize((640, 640), Image.BILINEAR)
    arr = np.array(img, dtype=np.float32).transpose(2, 0, 1) / 255.0
    return arr[np.newaxis]  # [1, 3, 640, 640]

# ── softmax ───────────────────────────────────────────────────────────────────
def softmax(x: np.ndarray) -> np.ndarray:
    x = x - x.max()
    e = np.exp(x)
    return e / e.sum()

# ── inference functions ───────────────────────────────────────────────────────
def run_mobilenet(img: Image.Image) -> list[dict]:
    sess = get_mobilenet()
    inp  = preprocess_mobilenet(img)
    out  = sess.run(None, {sess.get_inputs()[0].name: inp})[0]  # [1, 32]
    probs = softmax(out[0])
    results = sorted(
        [{"label": CLASS_NAMES[i], "confidence": float(probs[i])} for i in range(len(CLASS_NAMES))],
        key=lambda x: x["confidence"], reverse=True
    )
    return [r for r in results[:5] if r["confidence"] > 0.01]


def run_yolo(img: Image.Image) -> list[dict]:
    sess = get_yolo()
    inp  = preprocess_yolo(img)
    out  = sess.run(None, {sess.get_inputs()[0].name: inp})[0]  # [1, 36, 8400]
    raw  = out[0]  # [36, 8400]
    nc   = len(CLASS_NAMES)
    # columns 4..4+nc are class scores; take max across all anchors per class
    class_scores = raw[4:4 + nc, :].max(axis=1)  # [32]
    results = sorted(
        [{"label": CLASS_NAMES[i], "confidence": float(class_scores[i])} for i in range(nc)],
        key=lambda x: x["confidence"], reverse=True
    )
    return [r for r in results[:5] if r["confidence"] > 0.10]


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="Food Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    data = await file.read()
    img  = Image.open(io.BytesIO(data))

    mobile_results = run_mobilenet(img)
    top_conf = mobile_results[0]["confidence"] if mobile_results else 0.0
    model_used = "mobilenet"

    if top_conf < 0.80:
        yolo_results = run_yolo(img)
        model_used = "yolo_small"
        results = yolo_results if yolo_results else mobile_results
        top_conf = results[0]["confidence"] if results else top_conf
    else:
        results = mobile_results

    return {
        "model_used": model_used,
        "top_confidence": round(top_conf, 4),
        "predictions": results,
    }


if __name__ == "__main__":
    print("Starting food recognition server on http://localhost:8000")
    print("Press Ctrl+C to stop.\n")
    # Pre-load MobileNet at startup so first request is fast
    get_mobilenet()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
