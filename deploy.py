#!/usr/bin/env python3
# ============================================================================
# FRONTEND DEPLOYMENT
# ============================================================================
# Unified deployment pattern for all React SPA frontends.
# Config lives in frontblok.config.json — this file just runs it.
#
# Usage: python3 deploy.py
# ============================================================================

import subprocess
import sys

# Auto-upgrade frontblok-deploy before importing
subprocess.run(
    "uv pip install --system --upgrade --quiet "
    "git+https://github.com/velosovictor/frontblok-deploy.git",
    shell=True, check=False,
)

from frontblok_deploy import FrontendDeployer, DeploymentError

try:
    FrontendDeployer.from_config().deploy()
except (DeploymentError, Exception) as e:
    print(f"\n❌ DEPLOYMENT FAILED: {e}")
    sys.exit(1)
