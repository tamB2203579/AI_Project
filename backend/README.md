# Fundamental of Artificial Intelligence  
## Genetic Algorithm for Lecturer Scheduling

This guide explains how to set up the development environment for the **Genetic Algorithm Lecturer Scheduling** project using the `uv` Python package manager.
---

## 1. Install UV package manager
Open **PowerShell** and run the following command:
```bash
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## 2. Verify installation
```bash
uv --version
```
If the installation succeeded, the command prints the installed version.

## 3. Create virtual environment
Navigate to backend folder and create a python virtual environment using Python 3.11
```bash
uv venv .venv python=3.11
```

## 4. Activate environment
```bash
.venv\Scripts\activate
```

## 5. Install project dependencies
```bash
uv sync
```
