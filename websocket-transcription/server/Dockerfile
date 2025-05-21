# FROM python:3.13
FROM nvidia/cuda:12.8.0-cudnn-runtime-ubuntu24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 python3-pip \
  ffmpeg \
  gcc \
  g++ \
  make \
  libffi-dev \
  libssl-dev \
  pkg-config \
  cmake \
  portaudio19-dev \
  libsndfile1-dev \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -u 1000 -m whisperuser
USER whisperuser

WORKDIR /app

RUN pip install --no-cache-dir uv
ENV PATH="/home/whisperuser/.local/bin:${PATH}"
RUN uv venv
RUN uv pip install whisperlivekit diart

CMD ["uv", "run", "whisperlivekit-server", "--model", "$MODEL", "--host", "0.0.0.0", "--port", "8000", "--model_cache_dir", "/app/cache"]