#!/bin/bash
set -e

# Change directory to client folder if not already there
cd "$(dirname "$0")"

echo "============================================="
echo "            BUILDING WAILS CLIENT            "
echo "============================================="

# Setup Go path for tools like wails
GOPATH=$(go env GOPATH)
if [ -n "$GOPATH" ] && [ -d "$GOPATH/bin" ]; then
    export PATH="$GOPATH/bin:$PATH"
fi
if [ -d "$HOME/go/bin" ]; then
    export PATH="$HOME/go/bin:$PATH"
fi

# Check if wails is installed
WAILS_CMD="wails"
if ! command -v wails &> /dev/null; then
    if [ -f "$HOME/go/bin/wails" ]; then
        WAILS_CMD="$HOME/go/bin/wails"
        echo "[*] Found Wails CLI at $WAILS_CMD"
    else
        echo "[-] Wails CLI not found. Please install Wails first."
        echo "    Run: go install github.com/wailsapp/wails/v2/cmd/wails@latest"
        exit 1
    fi
fi

BUILD_FLAGS=(-clean -ldflags "-s -w")

# Detect host OS
HOST_OS=$(go env GOOS)

if [ "$HOST_OS" = "darwin" ]; then
    # Build UNIVERSAL: 1 file .app chạy NATIVE cả Apple Silicon (arm64) lẫn Intel (amd64).
    # Trước đây build arm64 rồi build amd64 -> đè lên nhau, chỉ còn bản Intel nên máy ARM
    # đòi Rosetta rồi lỗi. Universal (universal2/lipo) giải quyết triệt để.
    echo "[*] Building macOS Universal (arm64 + amd64)..."
    "$WAILS_CMD" build -platform darwin/universal "${BUILD_FLAGS[@]}"
    echo "[+] macOS universal build completed!"

    # Gỡ cờ quarantine để mở được app CHƯA KÝ (nếu không, Gatekeeper chặn/hiện lỗi).
    APP_DIR="build/bin"
    for app in "$APP_DIR"/*.app; do
        [ -d "$app" ] && xattr -cr "$app" 2>/dev/null && echo "[*] Đã gỡ quarantine: $app"
    done
elif [ "$HOST_OS" = "linux" ]; then
    echo "[*] Building Linux Intel/AMD64 (amd64)..."
    "$WAILS_CMD" build -platform linux/amd64 -tags webkit2_41 "${BUILD_FLAGS[@]}"
    echo "[+] Linux amd64 build completed successfully!"
else
    echo "[!] Unsupported host OS: $HOST_OS. Please build manually using 'wails build'."
    exit 1
fi
