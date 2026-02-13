#!/usr/bin/env python3
# ============================================================================
# FRONTEND DEPLOYMENT
# ============================================================================
# Thin shim — all logic lives in the frontblok-deploy package.
# This file should NEVER need updating across repos.
#
# Usage: python3 deploy.py
# ============================================================================

import os
import subprocess
import sys

# Non-interactive SSH sessions don't source .bashrc — ensure uv is findable
os.environ["PATH"] = "/root/.local/bin:" + os.environ.get("PATH", "")

try:
    # Upgrade frontblok-deploy to latest (uv MUST be installed on VPS)
    subprocess.run(
        "uv pip install --system --upgrade --quiet "
        "git+https://github.com/velosovictor/frontblok-deploy.git",
        shell=True, check=True,
    )

    from frontblok_deploy import FrontendDeployer
    FrontendDeployer.from_config().deploy()

except Exception as e:
    print(f"\n\u274c DEPLOYMENT FAILED: {e}")
    sys.exit(1)
