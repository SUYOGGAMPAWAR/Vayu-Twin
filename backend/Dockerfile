# Use a lightweight, official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the actual Python script into the container
COPY gee_pipeline.py .

# Command to run the script when the container starts
CMD ["python", "gee_pipeline.py"]