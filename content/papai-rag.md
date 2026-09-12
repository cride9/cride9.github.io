---
id: papai-rag
title: Knowledge, made local.
projectName: Pápai Gépalkatrészek
category: Applied AI engineering
branchId: applied-ai
shortDescription: Thousands of catalogs. One locally running intelligence system.
technologies: [Hybrid RAG, OCR, Vision extraction, SQL, Vector database, Embeddings, llama.cpp, GPU inference]
achievements: [Entire AI stack runs locally, Hybrid SQL and semantic retrieval, Local hardware deployment]
metrics: [{value: 4500, unit: catalogs, qualifier: More than, source: Supplied portfolio brief}, {value: 1600000, unit: part records, qualifier: Approximately, source: Supplied portfolio brief}]
relatedProjects: [shaiya, cridellmapi, cohort-search]
links: []
status: published
---
## The problem
Technical parts information was distributed across **4,500+ PDF catalogs**. Making that collection useful required more than placing documents behind a chat interface.

## My contribution
The system combines OCR, vision-based extraction, structured processing, and multimodal document handling. Approximately **1.6 million structured part records** were extracted from the catalog collection.

## Architecture
Documents flow through extraction into SQL storage and a vector index. Hybrid retrieval combines structured constraints with semantic search. A tool-calling AI agent retrieves relevant parts information and PDFs.

## Entirely local
The entire AI stack runs locally, including model inference with llama.cpp and GPU acceleration. Deployment work includes concurrent usage and VRAM/RAM optimization on local hardware.

## Engineering decisions
The central design task is choosing the right retrieval mechanism for each question: precise structured lookup, semantic retrieval, or a combination. Local deployment makes memory allocation and inference capacity part of the application architecture.
