#!/usr/bin/env python3
"""
Run the CME Rules Navigator backend server.

Usage:
    python run.py [--reload] [--port PORT]
"""

import argparse
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def main():
    parser = argparse.ArgumentParser(description="Run the CME Rules Navigator API")
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("PORT", 8000)),
        help="Port to run the server on"
    )
    parser.add_argument(
        "--host",
        type=str,
        default=os.getenv("HOST", "0.0.0.0"),
        help="Host to bind the server to"
    )

    args = parser.parse_args()

    print("=" * 60)
    print("CME Rules Navigator API")
    print("=" * 60)
    print(f"Starting server at http://{args.host}:{args.port}")
    print(f"API docs available at http://{args.host}:{args.port}/docs")
    print()

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )


if __name__ == "__main__":
    main()
