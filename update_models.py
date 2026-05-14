"""
Model update workflow — run after retraining MobileNetV3 or YOLOv11-small.

Usage (from C:/Users/school/Documents/pp):
  evenv312/Scripts/python.exe update_models.py [--mobilenet] [--yolo] [--all]

What it does:
  --mobilenet  Convert mobilenet_food.onnx → TFLite → copy to Flutter assets
  --yolo       Copy yolo_small.tflite from Ultralytics export → Flutter assets
  --all        Both of the above (default)

After running:
  1. Test on-device in Flutter: flutter run
  2. Push updated .tflite files via CI secrets (see ARCHITECTURE.md)
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

BASE       = Path(__file__).parent
MODEL_DIR  = BASE / "model"
FLUTTER_ASSETS = BASE / "food_app1_flutter/assets/models"

MOBILENET_ONNX   = MODEL_DIR / "MobileNet/mobilenet_output/mobilenet_food.onnx"
MOBILENET_TFLITE_SRC = MODEL_DIR / "MobileNet/tflite_output/mobilenet_food.tflite"
MOBILENET_TFLITE_DST = FLUTTER_ASSETS / "mobilenet_food.tflite"

YOLO_TFLITE_SRC  = MODEL_DIR / "YoloSmall/train/weights/best_float16.tflite"
YOLO_TFLITE_DST  = FLUTTER_ASSETS / "yolo_small.tflite"


def run(cmd: list[str]) -> None:
    print(f"\n$ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("FAILED — see output above.")
        sys.exit(1)


def convert_mobilenet() -> None:
    print("\n── MobileNetV3: ONNX → TFLite ──────────────────────────────")
    if not MOBILENET_ONNX.exists():
        print(f"ERROR: ONNX model not found at {MOBILENET_ONNX}")
        sys.exit(1)

    out_dir = MODEL_DIR / "MobileNet/tflite_output"
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Step 1: onnx2tf — ONNX → SavedModel …")
    run([sys.executable, "-m", "onnx2tf",
         "-i", str(MOBILENET_ONNX),
         "-o", str(out_dir),
         "--non_verbose"])

    print("Step 2: TFLite conversion …")
    import tensorflow as tf
    converter = tf.lite.TFLiteConverter.from_saved_model(str(out_dir))
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_bytes = converter.convert()
    MOBILENET_TFLITE_SRC.write_bytes(tflite_bytes)
    print(f"  Saved: {MOBILENET_TFLITE_SRC} ({len(tflite_bytes)//1024} KB)")

    print("Step 3: Copy to Flutter assets …")
    shutil.copy2(MOBILENET_TFLITE_SRC, MOBILENET_TFLITE_DST)
    print(f"  Copied to: {MOBILENET_TFLITE_DST}")


def copy_yolo() -> None:
    print("\n── YOLOv11-small: copy TFLite to Flutter assets ─────────────")
    # Ultralytics export: yolo export model=best.pt format=tflite imgsz=640
    # produces best_float16.tflite in the weights folder
    candidates = [
        YOLO_TFLITE_SRC,
        MODEL_DIR / "YoloSmall/train/weights/best-fp16.tflite",
        MODEL_DIR / "YoloSmall/train/weights/best.tflite",
    ]
    src = next((p for p in candidates if p.exists()), None)
    if src is None:
        print("ERROR: YOLO TFLite not found. Export it first:")
        print("  yolo export model=model/YoloSmall/train/weights/best.pt format=tflite imgsz=640")
        sys.exit(1)
    shutil.copy2(src, YOLO_TFLITE_DST)
    print(f"  Copied {src.name} → {YOLO_TFLITE_DST} ({src.stat().st_size // 1024} KB)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Update TFLite models for Flutter")
    parser.add_argument("--mobilenet", action="store_true")
    parser.add_argument("--yolo",      action="store_true")
    parser.add_argument("--all",       action="store_true", default=True)
    args = parser.parse_args()

    do_mobilenet = args.mobilenet or args.all
    do_yolo      = args.yolo      or args.all

    if not (do_mobilenet or do_yolo):
        parser.print_help()
        return

    if do_mobilenet:
        convert_mobilenet()
    if do_yolo:
        copy_yolo()

    print("\n✓ Done. Run `flutter run` to test the updated models.")
    print("  Remember to update food_labels.txt if class count changed.")


if __name__ == "__main__":
    main()
