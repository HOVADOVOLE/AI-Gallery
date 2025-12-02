# AI-Powered Smart Gallery

**A self-hosted, intelligent photo archive for any domain.**  
Automates the sorting, tagging, and organization of large photo collections using local Computer Vision (No Cloud API costs).

**Ideal for:**
*   Event Photography: Weddings, Sports, Concerts.
*   Product Archives: E-commerce, Inventory management.
*   Personal Backups: Family albums, Travel.

![Project Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Docker](https://img.shields.io/badge/Docker-Supported-blue)
![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React-orange)

---

## Key Features

*   **Context-Aware AI:**
    *   **CLIP (OpenAI):** Recognizes objects, scenes, and actions based on *your* custom text descriptions. No training required.
    *   **OCR (EasyOCR):** Automatically detects text and numbers in images.
*   **Batch Ingestion:** Drag & Drop ZIP archives or point the system to an existing server folder. Processes thousands of images in background.
*   **Smart Search:** Find photos by combining tags, dates, and AI confidence levels.
*   **Review Mode:** Interface for verifying low-confidence AI tags to ensure data quality.
*   **Analytics Dashboard:** Track storage usage, upload traffic, and tag distribution.
*   **Secure:** OAuth2 Authentication, Role-based access, and secure file serving.

---

## Technology Stack

**Backend:**
*   **Python 3.10** (FastAPI)
*   **SQLModel** (SQLite / PostgreSQL ready)
*   **PyTorch & Transformers** (AI Engine)
*   **Background Tasks** for non-blocking processing

**Frontend:**
*   **React 18** (Vite)
*   **TypeScript**
*   **Mantine UI v7** (Components & Charts)
*   **TanStack Query** (State Management)

**Infrastructure:**
*   **Docker & Docker Compose**
*   **Nginx** (Reverse Proxy)

---

## Quick Start (Docker)

The easiest way to run the application. No Python or Node.js installation required.

### Prerequisites
*   Docker & Docker Compose installed.

### 1. Standard Mode (CPU)
Suitable for laptops and standard VPS. AI processing speed: ~1-2 seconds per photo.

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/aigallery.git
cd aigallery

# 2. Start the stack
docker-compose up --build -d

# 3. Create the first Admin user
docker exec -it aigallery-backend python scripts/create_admin.py
```

Open your browser at **`http://localhost:8080`**.

### 2. High-Performance Mode (NVIDIA GPU)
Accelerates AI processing by 10-50x. Requires **NVIDIA Container Toolkit**.

```bash
# Start with GPU override
docker-compose -f docker-compose.gpu.yml up --build -d
```

---

## Development Setup (Local)

If you want to modify the code or contribute.

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies (incl. AI libs)
pip install -r requirements.txt

# Run Dev Server
python main.py
# API will be at http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install

# Run Dev Server
npm run dev
# App will be at http://localhost:5173
```

---

## Configuration (AI Model)

You can customize what the AI looks for without changing code.
Edit `backend/config.yaml` or go to **Settings** page in the app.

**Example 1: Photography**
```yaml
labels: ["Landscape", "Portrait", "Black and White"]
```

**Example 2: Weddings**
```yaml
labels: ["Bride", "Groom", "Cake", "Dancing"]
```

---

## Usage Guide

1.  **Login** with the admin account created during setup.
2.  Go to **Import** page.
3.  **Drag & Drop** a folder or ZIP file of photos.
4.  Watch the **Dashboard** as photos are processed.
5.  Go to **Review** to verify unsure tags.
6.  Browse the **Gallery** or organize photos into **Albums**.

---

## License

This project is open-source and available under the MIT License.
