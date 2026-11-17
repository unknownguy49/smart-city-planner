# Smart City Planner

An end-to-end urban planning, regulatory compliance, and generative architectural design platform combining geospatial site intelligence, domain-grounded Retrieval-Augmented Generation (RAG) over statutory building codes, deterministic constraint solving, multi-agent stakeholder evaluation, and interactive 2D/3D spatial synthesis.

## Live Deployments

- **Frontend Application:** <https://smartcityplanner.vercel.app>

- **Backend API Base URL:** <https://unknownguy494-scp-backend.hf.space/v1/>

- **Interactive API Documentation (Swagger/OpenAPI):** <https://unknownguy494-scp-backend.hf.space/v1/docs>

- **Android Mobile App (Direct APK Download):** Download [`SmartCityPlanner-v1.0.apk`](https://github.com/unknownguy49/smart-city-planner/raw/main/releases/SmartCityPlanner-v1.0.apk) (Packaged via **Capacitor** with native Firebase Auth, connected directly to the live cloud backend—enable _"Install from unknown sources"_ on Android to install).

## Table of Contents

- [System Overview](#system-overview)

- [Architectural Design](#architectural-design)

- [System Data Flow](#system-data-flow)

- [Core Subsystems](#core-subsystems)
  - [1. Geospatial Site Intelligence and OSM Extraction](#1-geospatial-site-intelligence-and-osm-extraction)

  - [2. Jurisdiction-Aware Regulatory RAG and Rule Extraction](#2-jurisdiction-aware-regulatory-rag-and-rule-extraction)

  - [3. Deterministic Constraint and Scoring Engines](#3-deterministic-constraint-and-scoring-engines)

  - [4. Multi-Agent Stakeholder Evaluation Pipeline](#4-multi-agent-stakeholder-evaluation-pipeline)

  - [5. Generative Space Programming, 2D Floor Plans, and 3D Massing](#5-generative-space-programming-2d-floor-plans-and-3d-massing)

  - [6. Scenario Simulation and Dossier Export](#6-scenario-simulation-and-dossier-export)

- [Repository Structure](#repository-structure)

- [Technology Stack](#technology-stack)

- [API Reference](#api-reference)

- [Local Setup and Execution](#local-setup-and-execution)

- [Environment Variables](#environment-variables)

## System Overview

Pre-construction architectural feasibility and urban planning workflows typically require manual coordination across GIS extraction, statutory development control regulation (DCR) verification, space programming, and multidisciplinary engineering review.

Smart City Planner consolidates these stages into a unified computational pipeline. Given a user-digitized land parcel on an interactive map, the system:

1. Extracts surrounding road networks, abutting road widths, and civic infrastructure via OpenStreetMap (OSM).

2. Retrieves and parses applicable statutory building codes (specifically the _Andhra Pradesh Final Standardized Development and Building Regulations 2024_ and _G.O.Ms.No.119_).

3. Computes deterministic buildable envelopes (front/rear/side setbacks, Floor Area Ratio / FSI, ground coverage limits, maximum permissible height, and parking requirements).

4. Runs a five-agent evaluation board across Architecture, Civil Engineering, Municipal Compliance, Sustainability, and Citizen Impact domains.

5. Generates parametric 2D floor plans, interactive 3D building massing models, comparative "what-if" urban intervention scenarios, and multi-page PDF feasibility reports.

## Architectural Design

To prevent Large Language Models from hallucinating spatial dimensions or violating hard statutory limits, the backend enforces a strict separation between semantic reasoning and deterministic computation:

- **Semantic and Generative Layer:** Handles unstructured statutory PDF ingestion, jurisdiction filtering, natural-language clause extraction (`rule_extractor.py`), multi-perspective qualitative audits (`agents/`), and workspace-grounded conversational queries (`chatbot_service.py`).

- **Deterministic Symbolic Layer:** Executes all polygon area calculations, road-width-dependent setback deductions, net buildable footprint geometry, structural heuristics, multi-criteria weighted scoring (`scoring_engine.py`), and room-packing space schedules (`space_program_service.py`) algorithmically.

## System Data Flow

```
+---------------------------------------------------------------------------------------------------+
|                                     NEXT.JS CLIENT WORKSPACE                                      |
|  +-----------------------+  +-----------------------+  +-------------------+  +----------------+  |
|  |   Geospatial Selector |  |  Multi-Agent Review   |  |  Generative CAD   |  |  Scenario &    |  |
|  |   (Leaflet + Polygon) |  |  Dashboard & Copilot  |  |  (2D Plan / 3D)   |  |  PDF Exporter  |  |
|  +-----------+-----------+  +-----------+-----------+  +---------+---------+  +-------+--------+  |
+--------------|--------------------------|------------------------|--------------------|-----------+
               | REST / JSON (Firebase Auth Bearer Token)          |                    |
               v                                                   v                    v
+---------------------------------------------------------------------------------------------------+
|                                      FASTAPI ORCHESTRATION LAYER                                  |
|  /api/land   /api/osm   /api/planner   /api/design   /api/scenario   /api/chatbot   /api/projects |
+------+------------------------+------------------------+-------------------+----------------------+
       |                        |                        |                   |
       v                        v                        v                   v
+--------------+     +---------------------+    +-----------------+    +----------------------------+
|  Geospatial  |     |   Regulatory RAG    |    |  Deterministic  |    |   Multi-Agent Orchestrator |
|  & OSM       |     |   (ChromaDB + PDF)  |    |  Math Engines   |    |   (planner.py)             |
|  Services    |     |                     |    |                 |    |                            |
| - Site Ctx   |     | - Jurisdiction      |    | - Constraint    |    | - Architecture Agent       |
| - Suitability|     |   Filter            |    |   Engine        |    | - Civil Eng. Agent         |
| - Nearby POI |     | - Rule Extractor    |    | - Space Program |    | - Municipal Reg. Agent     |
+--------------+     +----------+----------+    | - Scoring Eng.  |    | - Sustainability Agent     |
                                |               +--------+--------+    | - Citizen Impact Agent     |
                                +------------------------+-------------+----------------------------+
                                                         |
                                                         v
                                          +-----------------------------+
                                          |    Persistent Data Layer    |
                                          |  (SQLAlchemy / Workspace)   |
                                          +-----------------------------+

```

## Core Subsystems

### 1. Geospatial Site Intelligence and OSM Extraction

- **Polygon Digitization:** Users draw custom land parcels directly on a Leaflet map interface (`MapSelector.tsx`, `polygonStore.ts`) or search target coordinates (`SearchLocation.tsx`).

- **Contextual Enrichment:** `osm_service.py` and `site_context_service.py` query surrounding road classifications, abutting road widths, transit nodes, utilities, and nearby civic infrastructure (`NearbyInfrastructure.tsx`).

- **Site Suitability Analysis:** `site_suitability_service.py` evaluates topological and contextual fitness prior to building parameterization.

### 2. Jurisdiction-Aware Regulatory RAG and Rule Extraction

- **Statutory Corpus:** Indexed against building code documents located in `backend/app/rag/data/Building_Regulations/`, including the _2024 Andhra Pradesh Final Standardized Development and Building Regulations_ and _G.O.Ms.No.119 (AP Building Rules-2017)_.

- **Jurisdiction Filtering:** `jurisdiction_filter.py` and `regulation_applicability.py` isolate regulatory clauses applicable to the parcel's municipality, land-use zone, plot area, and abutting road width.

- **Structured Rule Extraction:** `rule_extractor.py` converts retrieved statutory passages into structured rule schemas (setbacks, ground coverage caps, FAR/FSI limits, and maximum height restrictions) with source citations.

### 3. Deterministic Constraint and Scoring Engines

- **Constraint Solver (`constraint_engine.py`):** Evaluates extracted regulatory parameters against the user's drawn polygon geometry to compute net buildable area, maximum floor plates, and compliance pass/fail flags.

- **Building Profiling (`building_profile_service.py`):** Computes occupancy loads, structural typology baselines, vertical circulation cores, and MEP requirements based on project classification (residential, commercial, mixed-use, institutional).

- **Scoring Engine (`scoring_engine.py`):** Calculates normalized performance metrics across spatial efficiency, regulatory adherence, environmental resilience, and civic impact.

### 4. Multi-Agent Stakeholder Evaluation Pipeline

Orchestrated by `backend/app/agents/planner.py`, five domain-specific agents audit the site context, deterministic constraints, and proposed design configuration:

| Agent Module              | Domain                          | Evaluation Scope                                                                                                               |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `architecture_agent.py`   | Spatial Design and Form         | Massing proportions, solar orientation, spatial hierarchy, circulation efficiency, and programmatic zoning.                    |
| `civil_agent.py`          | Structural and Site Engineering | Site feasibility, structural grid regularity, utility load demand, drainage, and access road capacity.                         |
| `municipal_agent.py`      | Statutory Compliance            | Audit against extracted DCR clauses, setback boundaries, FAR caps, fire tender access, and parking ratios.                     |
| `sustainability_agent.py` | Environmental Performance       | Solar heat gain, natural cross-ventilation potential, green cover ratio, rainwater harvesting, and embodied carbon heuristics. |
| `citizen_agent.py`        | Socio-Civic Impact              | Neighborhood shadow impact, local traffic congestion delta, public realm integration, and community livability.                |

Outputs are aggregated into an executive summary (`ExecutiveSummary.tsx`), per-agent scorecards (`ScoreCard.tsx`, `AgentCard.tsx`), and remediation recommendations (`recommendation_service.py`).

### 5. Generative Space Programming, 2D Floor Plans, and 3D Massing

- **Space Programming (`space_program_service.py`, `design_service.py`):** Partitions gross floor area into functional room schedules, corridors, vertical cores, and open spaces aligned to structural grids.

- **2D CAD Floor Plan Viewer (`FloorPlan2D.tsx`, `architectureLayout.ts`):** Renders scaled architectural floor layouts displaying room allocations, dimensions, circulation paths, and setback envelopes.

- **3D Building Massing (`Building3D.tsx`, `DesignMap.tsx`):** Extrudes multi-story building volumes onto the geospatial parcel for spatial bulk and height inspection.

### 6. Scenario Simulation and Dossier Export

- **Intervention Scenario Lab (`ScenarioPanel.tsx`, `scenario_generator.py`, `scenario_evaluator.py`):** Allows planners to apply policy and design interventions (`intervention_service.py`)—such as FAR bonuses, green roof mandates, transit-oriented density adjustments, or setback relaxations—and compare baseline versus modified scorecards.

- **Workspace-Grounded Copilot (`ChatbotPanel.tsx`, `chatbot_service.py`, `speech.py`):** A text and voice-enabled assistant wired into the active project's serialized workspace state, agent critiques, and regulatory vector store.

- **PDF Dossier Export (`reportPdf.ts`, `ReportSnapshotBridge.tsx`, `ReportVisualGallery.tsx`):** Captures 2D/3D canvas snapshots alongside multi-agent evaluations and compiles a formatted multi-page PDF feasibility report.

## Repository Structure

```
.
├── releases/
│   └── SmartCityPlanner-v1.0.apk           # Pre-built standalone Android APK
├── backend/                                # FastAPI Application & AI/Symbolic Engines
│   ├── app.py                              # Application entrypoint
│   ├── requirements.txt                    # Python dependencies
│   └── app/
│       ├── main.py                         # FastAPI initialization, CORS & router mounting
│       ├── database.py                     # SQLAlchemy database session & engine setup
│       ├── agents/                         # Multi-Agent Review Board
│       │   ├── planner.py                  # Master multi-agent orchestrator
│       │   ├── architecture_agent.py       # Architectural massing & spatial critique agent
│       │   ├── civil_agent.py              # Structural & infrastructure feasibility agent
│       │   ├── municipal_agent.py          # Building code & DCR compliance audit agent
│       │   ├── sustainability_agent.py     # Environmental & climate resilience agent
│       │   └── citizen_agent.py            # Public realm & neighborhood impact agent
│       ├── api/                            # RESTful API Endpoints
│       │   ├── land.py                     # Parcel geometry & land analysis endpoints
│       │   ├── osm.py                      # OpenStreetMap context proxy endpoints
│       │   ├── planner.py                  # Multi-agent evaluation execution endpoints
│       │   ├── design.py                   # Space program, 2D layout & 3D massing endpoints
│       │   ├── scenario.py                 # Comparative urban scenario simulation endpoints
│       │   ├── chatbot.py                  # Context-aware RAG copilot endpoints
│       │   ├── speech.py                   # Speech-to-text transcription endpoints
│       │   ├── projects.py                 # Project CRUD lifecycle
│       │   ├── project_workspace.py        # Unified workspace state synchronization
│       │   ├── persistence.py              # Snapshot & evaluation state persistence
│       │   └── notifications.py            # User alerts & status updates
│       ├── auth/
│       │   └── firebase_auth.py            # Firebase Admin JWT verification middleware
│       ├── models/                         # SQLAlchemy ORM Models
│       ├── schemas/                        # Pydantic Request/Response Contracts
│       ├── rag/                            # Regulatory Retrieval-Augmented Generation
│       │   ├── loader.py                   # Statutory PDF document loader & chunker
│       │   ├── embeddings.py               # Vector embedding model configuration
│       │   ├── vector_store.py             # ChromaDB persistent client wrapper
│       │   ├── jurisdiction_filter.py      # Metadata filtering by region & code version
│       │   ├── retriever.py                # Hybrid semantic + metadata retriever
│       │   ├── query.py                    # Query formulation & expansion
│       │   ├── rule_extractor.py           # LLM-guided structured regulation parser
│       │   └── data/Building_Regulations/  # Source statutory PDFs (AP Building Rules)
│       └── services/                       # Deterministic Math & Domain Services
│           ├── constraint_engine.py        # Setback, FAR, coverage & height solver
│           ├── regulation_applicability.py # Rule-to-parcel matching logic
│           ├── scoring_engine.py           # Multi-criteria quantitative evaluation engine
│           ├── building_profile_service.py # Typology & structural parameter generator
│           ├── space_program_service.py    # Algorithmic room & core schedule generator
│           ├── design_service.py           # 2D/3D geometric layout synthesizer
│           ├── scenario_generator.py       # Parametric intervention generator
│           ├── scenario_evaluator.py       # Delta scoring across scenarios
│           ├── scenario_design_service.py  # Scenario-specific spatial recalculation
│           ├── intervention_service.py     # Urban policy & design intervention catalog
│           ├── recommendation_service.py   # Actionable remediation generator
│           ├── osm_service.py              # Overpass / OSM feature extraction
│           ├── site_context_service.py     # Urban fabric & road network analyzer
│           ├── site_suitability_service.py # Parcel viability assessment
│           ├── chatbot_service.py          # Workspace-grounded conversational engine
│           ├── project_service.py          # Project persistence operations
│           ├── email_service.py            # Notification dispatch service
│           └── config.py                   # Centralized environment & model settings
│
└── frontend/                               # Next.js (App Router) + Capacitor Android Client
    ├── package.json                        # Node dependencies & scripts
    ├── tsconfig.json                       # TypeScript compiler configuration
    ├── next.config.ts                      # Next.js runtime configuration
    ├── capacitor.config.ts                 # Capacitor native Android wrapper configuration
    ├── android/                            # Native Android Gradle project
    ├── app/                                # Next.js App Router Pages
    │   ├── page.tsx                        # Landing & platform overview
    │   ├── login/ & signup/                # Firebase authentication flows
    │   ├── projects/                       # Project portfolio & creation wizard
    │   ├── map/                            # Interactive geospatial parcel selection
    │   ├── planner/                        # Multi-agent audit & constraint dashboard
    │   ├── dashboard/                      # Unified project command center
    │   ├── reports/                        # Visual gallery & PDF dossier builder
    │   └── settings/                       # Workspace & preferences configuration
    ├── components/                         # Modular UI & Visualization Components
    │   ├── map/                            # Leaflet map, polygon drawer, OSM overlays
    │   ├── agents/                         # Agent cards, executive summary, scorecards
    │   ├── design/                         # 2D floor plan renderer & 3D building viewer
    │   ├── scenario/                       # Scenario comparison lab & intervention controls
    │   ├── chatbot/                        # AI copilot interface with voice input
    │   ├── reports/                        # Canvas snapshot bridge & report gallery
    │   ├── dashboard/                      # Project telemetry & export triggers
    │   ├── forms/                          # Parametric project configuration forms
    │   ├── layout/                         # AppShell, Sidebar, Navbar & State Guards
    │   └── auth/                           # Protected route wrappers
    ├── contexts/                           # React Context providers (AuthContext)
    ├── store/                              # Client state stores (projectStore, polygonStore)
    ├── services/                           # Typed API service clients & snapshot capture
    ├── lib/                                # HTTP wrappers, Firebase SDK, PDF compiler
    └── types/                              # Shared TypeScript interfaces

```

## Technology Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Leaflet / React-Leaflet, HTML5 Canvas / SVG Parametric Drafting, WebGL 3D Massing, Firebase Client SDK, Client-side PDF Generation.

- **Backend:** Python 3.10+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy ORM, Firebase Admin SDK.

- **AI, RAG, and Geospatial:** ChromaDB, PyPDF, LLM Agent Orchestration, Shapely / GeoJSON Geometry Processing, OpenStreetMap Overpass API.

- **Deployment Infrastructure:** Vercel (Frontend), Hugging Face Spaces (Backend API).

## API Reference

All endpoints are served under the `/v1` API prefix (Production: `https://unknownguy494-scp-backend.hf.space/v1/`).

| Route Prefix   | Module                 | Description                                                                                |
| -------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `/projects`    | `projects.py`          | Create, list, retrieve, and delete urban planning projects.                                |
| `/workspace`   | `project_workspace.py` | Load and synchronize unified workspace state (parcel, constraints, scores, designs).       |
| `/land`        | `land.py`              | Compute parcel geometry metrics, bounding boxes, and site suitability profiles.            |
| `/osm`         | `osm.py`               | Query surrounding OpenStreetMap road networks, abutting road widths, and POIs.             |
| `/planner`     | `planner.py`           | Execute regulatory RAG retrieval, deterministic constraint solving, and the 5-agent audit. |
| `/design`      | `design.py`            | Generate space programs, 2D room layouts, and 3D massing parameters.                       |
| `/scenario`    | `scenario.py`          | Simulate and evaluate alternative urban policy and design intervention scenarios.          |
| `/chatbot`     | `chatbot.py`           | Query the workspace-aware regulatory and planning copilot.                                 |
| `/speech`      | `speech.py`            | Transcribe audio inputs into planning queries.                                             |
| `/persistence` | `persistence.py`       | Persist visual report snapshots and historical evaluation runs.                            |

## Local Setup and Execution

### Prerequisites

- Node.js 18+ and npm

- Python 3.10+

- Firebase project credentials

- LLM / Embedding provider API key

### 1. Backend Setup

```
cd backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

```

Local API documentation will be accessible at `http://localhost:8000/docs`.

### 2. Frontend Setup

```
cd frontend

npm install
npm run dev

```

Local frontend client will be accessible at `http://localhost:3000`.

## Environment Variables

### `backend/.env`

```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

CHROMA_PERSIST_DIR=./app/rag/chroma
DATABASE_URL=postgresql+psycopg://user:password@host/dbname?sslmode=require

# Use path locally or raw JSON string in cloud deployment
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-service-account.json
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

FRONTEND_ORIGINS=http://localhost:3000,http://localhost:3001,https://vercel.app,https://localhost,http://localhost,capacitor://localhost
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=https://hf.space

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Acknowledgements

This project is developed as a university capstone project and is not affiliated with any government or municipal authority. The statutory building codes referenced are publicly available documents, and the system is intended for educational and research purposes only. The contributors acknowledge the use of open-source libraries and frameworks, including FastAPI, Next.js, Leaflet, ChromaDB, and others, which have been instrumental in the development of this platform.

Contributors: [Adityaraj Singh Rathore](https://github.com/adityaraj-25), [Aryan Puri](https://github.com/Aryan-Puri-23), [Dibyadyuti Dutta](https://github.com/unknownguy49), [Vishal Ch](https://github.com/Vishalch118)
