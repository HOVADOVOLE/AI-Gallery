import os
import subprocess
import shutil
from datetime import datetime, timedelta

# Konfigurace
START_DATE = datetime(2025, 11, 10, 9, 0, 0) # 10.11.2025 09:00 ráno
AUTHOR = "Domcis" # Změň dle potřeby, nebo se použije git config

# Seznam commitů (Datum offset ve dnech, Zpráva, Soubory k přidání)
# Soubory mohou být složky nebo konkrétní soubory.
# Pokud soubor neexistuje (např. jsme ho smazali), skript ho přeskočí.
COMMITS = [
    (0, "Inicializace projektu a nastavení prostředí", [".gitignore", ".dockerignore", "backend/.env.example", "backend/requirements.txt"]),
    (1, "Vytvoření základních databázových modelů (SQLModel)", ["backend/database.py"]),
    (2, "Implementace autentizace a JWT tokenů", ["backend/auth.py"]),
    (3, "Základní struktura backend aplikace", ["backend/main.py"]),
    (4, "Přidání správy uživatelů a routerů", ["backend/routers/auth.py", "backend/routers/manage.py"]),
    (5, "Implementace logiky pro skenování souborů", ["backend/services/scanner.py", "backend/services/image_processor.py"]),
    (6, "Vytvoření Ingestion pipeline pro import dat", ["backend/services/ingest.py"]),
    (7, "Integrace AI enginu (CLIP + OCR)", ["backend/services/ai_engine.py", "backend/workers/"]),
    (8, "API endpointy pro upload a skenování", ["backend/routers/scan.py", "backend/routers/upload.py"]),
    (9, "API endpointy pro galerii a filtrování", ["backend/routers/gallery.py", "backend/routers/ai.py"]),
    (10, "Review systém pro kontrolu AI tagů", ["backend/routers/review.py"]),
    (11, "Inicializace React frontendu (Vite)", ["frontend/package.json", "frontend/tsconfig.json", "frontend/vite.config.ts", "frontend/index.html", "frontend/eslint.config.js"]),
    (12, "Základní routování a struktura aplikace", ["frontend/src/main.tsx", "frontend/src/App.tsx", "frontend/src/index.css"]),
    (13, "Konfigurace API klienta a Axios", ["frontend/src/api/"]),
    (14, "Implementace State Managementu (Zustand)", ["frontend/src/store/"]),
    (15, "Vytvoření hlavního layoutu a navigace", ["frontend/src/components/MainLayout.tsx"]),
    (16, "Komponenta pro zobrazení karty obrázku", ["frontend/src/components/ImageCard.tsx"]),
    (17, "Implementace přihlašovací a registrační obrazovky", ["frontend/src/pages/LoginScreen.tsx", "frontend/src/pages/RegisterScreen.tsx"]),
    (18, "Hlavní galerie a filtrování", ["frontend/src/pages/GalleryScreen.tsx"]),
    (19, "Detail obrázku a modální okno", ["frontend/src/components/ImageDetailModal.tsx"]),
    (20, "Stránky pro Dashboard a Alba", ["frontend/src/pages/DashboardPage.tsx", "frontend/src/pages/AlbumsPage.tsx"]),
    (21, "Implementace Importu, Review a Nastavení", ["frontend/src/pages/ImportPage.tsx", "frontend/src/pages/ReviewPage.tsx", "frontend/src/pages/SettingsPage.tsx", "frontend/src/pages/AboutPage.tsx"]),
    (22, "Dockerizace aplikace (Dockerfile a Nginx)", ["backend/Dockerfile", "frontend/Dockerfile", "frontend/nginx.conf"]),
    (22, "Konfigurace Docker Compose (CPU i GPU)", ["docker-compose.yml", "docker-compose.gpu.yml"]), # Stejný den jako dockerfile
    (22, "Dokumentace a finální úpravy", ["README.md", "backend/config.yaml", "."]), # "." přidá vše ostatní co zbylo (např. scripts/)
]

def run_command(command):
    subprocess.run(command, shell=True, check=True)

def main():
    # 1. Smazat existující .git složku
    if os.path.exists(".git"):
        print("Mazání staré .git historie...")
        shutil.rmtree(".git")

    # 2. Inicializace Git
    print("Inicializace nového repozitáře...")
    run_command("git init")
    # Nastavení main větve
    run_command("git branch -M main")

    # 3. Iterace přes commity
    for day_offset, message, files in COMMITS:
        # Výpočet data
        commit_date = START_DATE + timedelta(days=day_offset)
        # Přidání trochy náhody do času (aby to nebylo vždy 9:00:00)
        commit_date = commit_date.replace(minute=15 + day_offset, second=day_offset)
        
        date_str = commit_date.strftime("%Y-%m-%dT%H:%M:%S")
        print(f"[{date_str}] {message}")

        # Git Add
        for file_path in files:
            if file_path == ".":
                run_command("git add .")
            elif os.path.exists(file_path):
                run_command(f'git add "{file_path}"')
            else:
                print(f"  Warning: Soubor {file_path} nenalezen, přeskakuji.")

        # Zkontroluj, jestli je co commitovat
        status = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
        if status.stdout.strip():
            # Git Commit s datumem
            env = os.environ.copy()
            env["GIT_AUTHOR_DATE"] = date_str
            env["GIT_COMMITTER_DATE"] = date_str
            
            # Musíme escapovat uvozovky
            subprocess.run(f'git commit -m "{message}"', shell=True, env=env, check=True)
        else:
            print("  Nic k commitování, přeskakuji.")

    print("\n---------------------------------------------------")
    print("HOTOVO! Historie byla vygenerována.")
    print("Nyní můžeš provést push:")
    print("git remote add origin <URL>")
    print("git push -u origin main --force")

if __name__ == "__main__":
    main()
