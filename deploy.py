#!/usr/bin/env python3
# ============================================================================
# FRONTEND DEPLOYMENT SCRIPT
# ============================================================================
# Deploy any React SPA to Kubernetes via Docker + GHCR
#
# 100% config-driven: ALL values from .env file
# Flow: Build Docker → Push to GHCR → kubectl apply
# K8s handles SSL (cert-manager), health checks, rollout
#
# CONFIGURATION (.env file):
#     DEPLOY_SERVICE_NAME=myapp              # K8s deployment name
#     DEPLOY_NAMESPACE=myapp                 # K8s namespace
#     DEPLOY_DOMAIN=app.example.com          # Primary domain
#     DEPLOY_GITHUB_OWNER=yourusername       # GitHub username
#     DEPLOY_REGISTRY=ghcr.io/yourusername   # Container registry
#     DEPLOY_VPS_ENV_PATH=/etc/myapp/.env    # VPS secrets path (optional)
#     VITE_DATABASE_API_URL=https://api.example.com
#     VITE_GOOGLE_CLIENT_ID=your-client-id
#     GITHUB_TOKEN=ghp_xxxxx
#
# USAGE: python3 deploy.py
# ============================================================================

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime


# ============================================================================
# ENVIRONMENT LOADING
# ============================================================================

def load_env_file(path):
    # Parse .env file and load into os.environ
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip().replace("\r", "")
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()


def load_env():
    # Load .env file with priority:
    # 1. VPS path from DEPLOY_VPS_ENV_PATH (if set and exists)
    # 2. Default VPS path /etc/<service>/.env (if exists)
    # 3. Local .env in project root
    local_env = Path(__file__).parent / ".env"
    
    # First load local .env to get config values
    if local_env.exists():
        load_env_file(local_env)
    
    # Check for VPS override path
    vps_env_path = os.getenv("DEPLOY_VPS_ENV_PATH", "")
    if vps_env_path:
        vps_env = Path(vps_env_path)
        if vps_env.exists():
            load_env_file(vps_env)  # VPS values override local
            return True
    
    # Fallback: default VPS path based on service name
    service_name = os.getenv("DEPLOY_SERVICE_NAME", "frontend")
    default_vps_env = Path(f"/etc/{service_name}/.env")
    if default_vps_env.exists():
        load_env_file(default_vps_env)
        return True
    
    return local_env.exists()


# ============================================================================
# CONFIGURATION
# ============================================================================

# Load environment - exit if no .env found
if not load_env():
    print("FATAL: No .env file found")
    print("Create .env file in project root or set DEPLOY_VPS_ENV_PATH")
    sys.exit(1)

# All config from environment
SERVICE_NAME = os.getenv("DEPLOY_SERVICE_NAME", "frontend")
NAMESPACE = os.getenv("DEPLOY_NAMESPACE", SERVICE_NAME)
DOMAIN = os.getenv("DEPLOY_DOMAIN", "")
GITHUB_OWNER = os.getenv("DEPLOY_GITHUB_OWNER", "")
REGISTRY = os.getenv("DEPLOY_REGISTRY", f"ghcr.io/{GITHUB_OWNER}")
IMAGE_NAME = f"{REGISTRY}/{SERVICE_NAME}"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# Build-time Vite variables
VITE_DATABASE_API_URL = os.getenv("VITE_DATABASE_API_URL", "")
VITE_API_URL = os.getenv("VITE_API_URL", "")
VITE_GOOGLE_CLIENT_ID = os.getenv("VITE_GOOGLE_CLIENT_ID", "")

# Validate required config
if not GITHUB_TOKEN:
    print("FATAL: GITHUB_TOKEN not found in .env")
    sys.exit(1)
if not GITHUB_OWNER:
    print("FATAL: DEPLOY_GITHUB_OWNER not found in .env")
    sys.exit(1)
if not DOMAIN:
    print("FATAL: DEPLOY_DOMAIN not found in .env")
    sys.exit(1)


# ============================================================================
# DEPLOYMENT
# ============================================================================

def deploy():
    # Main deployment function - single chain of events
    # If any step fails, the whole deployment fails
    
    print("=" * 80)
    print(f"{SERVICE_NAME.upper()} DEPLOYMENT - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    try:
        # STEP 1: Get Git SHA for image tag
        result = subprocess.run(
            "git rev-parse --short HEAD",
            shell=True,
            capture_output=True,
            text=True,
            check=True
        )
        git_sha = result.stdout.strip()
        image_tag = f"{IMAGE_NAME}:{git_sha}"
        image_latest = f"{IMAGE_NAME}:latest"
        
        print(f"\nConfiguration:")
        print(f"  Service: {SERVICE_NAME}")
        print(f"  Image: {image_tag}")
        print(f"  Namespace: {NAMESPACE}")
        print(f"  Domain: {DOMAIN}")
        print(f"  API: {VITE_DATABASE_API_URL or '[NOT SET]'}")
        print(f"  OAuth: {'[SET]' if VITE_GOOGLE_CLIENT_ID else '[NOT SET]'}")
        
        # STEP 2: Build Docker image with VITE_ vars
        print(f"\n▶ Building Docker image")
        build_args = []
        if VITE_DATABASE_API_URL:
            build_args.append(f"--build-arg VITE_DATABASE_API_URL={VITE_DATABASE_API_URL}")
        if VITE_API_URL:
            build_args.append(f"--build-arg VITE_API_URL={VITE_API_URL}")
        if VITE_GOOGLE_CLIENT_ID:
            build_args.append(f"--build-arg VITE_GOOGLE_CLIENT_ID={VITE_GOOGLE_CLIENT_ID}")
        
        build_cmd = f"docker build --platform linux/amd64 {' '.join(build_args)} -t {image_tag} -t {image_latest} ."
        subprocess.run(build_cmd, shell=True, check=True, capture_output=True)
        print("✓ Image built")
        
        # STEP 3: Login to GHCR
        print(f"\n▶ Logging in to GHCR")
        subprocess.run(
            f"echo {GITHUB_TOKEN} | docker login ghcr.io -u {GITHUB_OWNER} --password-stdin",
            shell=True,
            check=True,
            capture_output=True
        )
        print("✓ Logged in")
        
        # STEP 4: Push images
        print(f"\n▶ Pushing images to GHCR")
        subprocess.run(f"docker push {image_tag}", shell=True, check=True, capture_output=True)
        subprocess.run(f"docker push {image_latest}", shell=True, check=True, capture_output=True)
        print("✓ Images pushed")
        
        # STEP 5: Create namespace (idempotent)
        print(f"\n▶ Creating namespace")
        subprocess.run(
            f"kubectl create namespace {NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -",
            shell=True,
            check=True,
            capture_output=True
        )
        print("✓ Namespace ready")
        
        # STEP 6: Create GHCR pull secret (idempotent)
        print(f"\n▶ Creating GHCR pull secret")
        subprocess.run(
            f"kubectl create secret docker-registry ghcr-login-secret "
            f"-n {NAMESPACE} "
            f"--docker-server=ghcr.io "
            f"--docker-username={GITHUB_OWNER} "
            f"--docker-password={GITHUB_TOKEN} "
            f"--dry-run=client -o yaml | kubectl apply -f -",
            shell=True,
            check=True,
            capture_output=True
        )
        print("✓ Secret ready")
        
        # STEP 7: Load and process K8s manifest
        print(f"\n▶ Applying Kubernetes manifest")
        manifest_path = Path(__file__).parent / "k8s" / "deployment.yaml"
        if not manifest_path.exists():
            manifest_path = Path(__file__).parent / "k8s" / f"{SERVICE_NAME}-deployment.yaml"
        
        if not manifest_path.exists():
            raise FileNotFoundError(f"No k8s manifest found at {manifest_path}")
        
        manifest = manifest_path.read_text()
        
        # Replace all placeholders
        manifest = manifest.replace("DEPLOY_SERVICE_NAME", SERVICE_NAME)
        manifest = manifest.replace("DEPLOY_NAMESPACE", NAMESPACE)
        manifest = manifest.replace("CONTAINER_IMAGE", image_tag)
        manifest = manifest.replace("DEPLOY_DOMAIN", DOMAIN)
        
        # Apply manifest
        subprocess.run(
            "kubectl apply -f -",
            shell=True,
            input=manifest,
            text=True,
            check=True,
            capture_output=True
        )
        print("✓ Manifest applied")
        
        # STEP 8: Wait for rollout
        print(f"\n▶ Waiting for deployment rollout")
        subprocess.run(
            f"kubectl rollout status deployment/{SERVICE_NAME}-app -n {NAMESPACE} --timeout=5m",
            shell=True,
            check=True,
            capture_output=True
        )
        print("✓ Rollout complete")
        
        # Success
        print("\n" + "=" * 80)
        print("✅ DEPLOYMENT COMPLETE")
        print("=" * 80)
        print(f"\nDeployed successfully!")
        print(f"  URL: https://{DOMAIN}")
        print(f"  Image: {image_tag}")
        print(f"  Namespace: {NAMESPACE}")
        print(f"\nCert-manager will provision SSL automatically.")
        print(f"Check: kubectl get certificate -n {NAMESPACE}")
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ DEPLOYMENT FAILED")
        print(f"Command failed: {e.cmd}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"\n❌ DEPLOYMENT FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    deploy()
