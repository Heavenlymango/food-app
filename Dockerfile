FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY inference_server.py .

# Model files are NOT in git (too large).
# Mount them as Railway Volumes at /app/model/
# Required paths:
#   /app/model/MobileNet/mobilenet_output/mobilenet_food.onnx
#   /app/model/MobileNet/mobilenet_output/class_names.json
#   /app/model/YoloSmall/train/weights/best.onnx

EXPOSE 8000

CMD ["python3", "inference_server.py"]
