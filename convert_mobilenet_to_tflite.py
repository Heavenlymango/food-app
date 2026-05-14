"""
Convert mobilenet_food.onnx -> mobilenet_food.tflite for Flutter.

Usage (from C:/Users/school/Documents/pp):
  evenv/Scripts/pip.exe install onnx onnx2tf tensorflow
  evenv/Scripts/python.exe convert_mobilenet_to_tflite.py
"""

from pathlib import Path
import subprocess, sys

BASE      = Path(__file__).parent
ONNX_PATH = BASE / "model/MobileNet/mobilenet_output/mobilenet_food.onnx"
OUT_DIR   = BASE / "model/MobileNet/tflite_output"
DEST      = BASE / "food_app1_flutter/assets/models/mobilenet_food.tflite"

def run(cmd):
    print(f"\n$ {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=False)
    if result.returncode != 0:
        print("FAILED — see output above")
        sys.exit(1)

print("Step 1: Converting ONNX -> TF SavedModel via onnx2tf ...")
OUT_DIR.mkdir(parents=True, exist_ok=True)
run([
    sys.executable, "-m", "onnx2tf",
    "-i", str(ONNX_PATH),
    "-o", str(OUT_DIR),
    "--non_verbose",
])

print("\nStep 2: Converting TF SavedModel -> TFLite ...")
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_saved_model(str(OUT_DIR))
converter.optimizations = [tf.lite.Optimize.DEFAULT]   # float16 quantisation
tflite_model = converter.convert()

tflite_path = OUT_DIR / "mobilenet_food.tflite"
tflite_path.write_bytes(tflite_model)
print(f"TFLite model saved: {tflite_path}  ({len(tflite_model)//1024} KB)")

print("\nStep 3: Copying to Flutter assets ...")
DEST.write_bytes(tflite_path.read_bytes())
print(f"Copied to: {DEST}")

print("\nDone! Run `flutter run` to test.")
print("NOTE: MobileNet was trained with ImageNet normalisation (mean/std).")
print("      The Flutter service already handles this correctly after this PR.")
