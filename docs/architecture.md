# Ledger Scrutiny Architecture Diagrams

## High-Level System Architecture

```mermaid
graph TD
    User([Auditor / User])
    
    subgraph Frontend [Frontend Architecture React + Vite]
        UI[UI Components]
        Pages[Pages & Views]
        State[State Management]
        APIClient[API Client]
        
        User -->|Interacts| UI
        UI <--> Pages
        Pages <--> State
        Pages <--> APIClient
    end
    
    subgraph Backend [Backend Architecture FastAPI]
        Router[API Routers]
        Services[Business Services]
        RulesEngine[Rules Engine]
        NLQuery[NL Query Engine]
        Storage[Storage & DB Access]
        
        APIClient <-->|REST API| Router
        Router <--> Services
        Services <--> RulesEngine
        Services <--> NLQuery
        Services <--> Storage
    end
    
    subgraph Database [Data Layer]
        MongoDB[(MongoDB Atlas)]
        FileStore[File Storage]
        
        Storage <--> MongoDB
        Storage <--> FileStore
    end
```

## Frontend Architecture

```mermaid
graph TD
    App[App Entry main.tsx]
    Router[React Router routes.tsx]
    
    App --> Router
    
    subgraph PagesSub [Pages Level]
        AuthPage[Auth & Login]
        Dashboard[Risk Dashboard]
        Workbook[Workbook Investigation]
        Clients[Client Management]
    end
    
    Router --> AuthPage
    Router --> Dashboard
    Router --> Workbook
    Router --> Clients
    
    subgraph Components [Component Library]
        DesignSystem[Design System index.css]
        SharedUI[Shared UI Components Buttons, Modals]
        FeatureUI[Feature Components Flagged Transactions]
    end
    
    PagesSub --> Components
    
    subgraph Core [Core Logic]
        APIUtils[API Utilities]
        Context[Global Contexts]
        Types[TypeScript Interfaces]
    end
    
    PagesSub --> Core
    Components --> Core
```

## Backend Architecture

```mermaid
graph TD
    Main[main.py FastAPI App]
    
    subgraph Routers [API Endpoints]
        AuthRouter[/api/auth]
        WorkbookRouter[/api/workbooks]
        ScrutinyRouter[/api/scrutiny]
        ClientRouter[/api/clients]
    end
    
    Main --> Routers
    
    subgraph Services [Business Logic]
        AuthService[Auth Service]
        WorkbookService[Workbook Service]
        ScrutinyService[Scrutiny Service]
        ClientService[Client Service]
        NLQueryService[Natural Language Query]
    end
    
    AuthRouter --> AuthService
    WorkbookRouter --> WorkbookService
    ScrutinyRouter --> ScrutinyService
    ClientRouter --> ClientService
    
    subgraph Engines [Processing Engines]
        RuleEngine[6-Rule Engine]
        MLEngine[Isolation Forest Machine Learning]
        QueryParser[NL Parser Intent & Constraints]
    end
    
    ScrutinyService --> RuleEngine
    ScrutinyService --> MLEngine
    NLQueryService --> QueryParser
    
    subgraph Data [Data Access]
        MongoDriver[MongoDB PyMongo]
        Schemas[Pydantic Models]
    end
    
    Services --> MongoDriver
    Services --> Schemas
```
