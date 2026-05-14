"""
Convert mobilenet_food.onnx -> mobilenet_food.tflite for Flutter.

onnx2tf directly produces TFLite (float32 + float16) — no separate TF step needed.

Usage (from C:/Users/school/Documents/pp):
  evenv312/Scripts/pip.exe install onnx onnx2tf tensorflow-cpu
  evenv312/Scripts/python.exe convert_mobilenet_to_tflite.py
"""

from pathlib import Path
import subprocess, sys, shutil

BASE      = Path(__file__).parent
ONNX_PATH = BASE / "model/MobileNet/mobilenet_output/mobilenet_food.onnx"
OUT_DIR   = BASE / "model/MobileNet/tflite_output"
# onnx2tf names its output: <model_name>_float16.tflite
TFLITE_SRC = OUT_DIR / "mobilenet_food_float16.tflite"
DEST       = BASE / "food_app1_flutter/assets/models/mobilenet_food.tflite"

def run(cmd):
    print(f"\n$ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("FAILED — see output above")
        sys.exit(1)

if not ONNX_PATH.exists():
    print(f"ERROR: ONNX model not found at {ONNX_PATH}")
    sys.exit(1)

print("Step 1: Converting ONNX → TFLite via onnx2tf ...")
OUT_DIR.mkdir(parents=True, exist_ok=True)
run([
    sys.executable, "-m", "onnx2tf",
    "-i", str(ONNX_PATH),
    "-o", str(OUT_DIR),
    "--non_verbose",
])

if not TFLITE_SRC.exists():
    print(f"ERROR: Expected output not found at {TFLITE_SRC}")
    print("Files in output dir:", list(OUT_DIR.glob("*.tflite")))
    sys.exit(1)

print(f"\nStep 2: Copying float16 TFLite to Flutter assets ...")
shutil.copy2(TFLITE_SRC, DEST)
size_kb = DEST.stat().st_size // 1024
print(f"Copied to: {DEST}  ({size_kb} KB)")

print("\nDone! Run `flutter run` to test.")
print("NOTE: MobileNet was trained with ImageNet normalisation (mean/std).")
print("      The Flutter service already handles this correctly.")
