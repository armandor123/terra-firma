FROM mcr.microsoft.com/playwright/python:v1.64.1-noble
WORKDIR /suite
RUN pip install --no-cache-dir playwright==1.64.1 pytest==9.2.0 httpx==0.28.1 pillow==13.0.0
COPY web/tests/ web/tests/
CMD ["python", "-m", "pytest", "-q", "web/tests/test_browser.py"]
