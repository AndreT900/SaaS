FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
# Install basic build tools if needed for numpy/scipy
RUN pip install --no-cache-dir -r requirements.txt

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8005", "--reload"]
