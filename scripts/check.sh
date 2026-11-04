#!/usr/bin/env bash
#
# Clucky - CI & Local Verification Script (Build + Lint)
# Domain: Cross-domain / Platform (UI-41)
# PIC: M6 - Mai Sơn Việt
#

set -euo pipefail

# Determine repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Color codes (only when running in an interactive terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  BOLD=''
  NC=''
fi

log_info() {
  echo -e "${BLUE}${BOLD}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}${BOLD}[PASS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}${BOLD}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}${BOLD}[FAIL]${NC} $1"
}

print_header() {
  echo ""
  echo -e "${BOLD}================================================================${NC}"
  echo -e "${BOLD}   $1${NC}"
  echo -e "${BOLD}================================================================${NC}"
}

usage() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --all            Run all checks (default)"
  echo "  --frontend       Run checks for frontend (Next.js & React) only"
  echo "  --backend        Run checks for backend (Java/Gradle) only"
  echo "  --lint-only      Run lint checks only"
  echo "  --build-only     Run build and typecheck checks only"
  echo "  --test-only      Run unit tests only"
  echo "  -h, --help       Show this help message"
  exit 0
}

# Parse options
MODE="all"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --all) MODE="all"; shift ;;
    --frontend) MODE="frontend"; shift ;;
    --backend) MODE="backend"; shift ;;
    --lint-only) MODE="lint"; shift ;;
    --build-only) MODE="build"; shift ;;
    --test-only) MODE="test"; shift ;;
    -h|--help) usage ;;
    *) log_error "Unknown option: $1"; usage ;;
  esac
done

export CI="${CI:-true}"
export NEXT_TELEMETRY_DISABLED=1

FAILED_STEPS=()
PASSED_STEPS=()

run_check() {
  local step_name="$1"
  shift
  echo ""
  log_info "Running: ${step_name}..."
  if "$@"; then
    log_success "${step_name}"
    PASSED_STEPS+=("${step_name}")
  else
    log_error "${step_name}"
    FAILED_STEPS+=("${step_name}")
  fi
}

# -------------------------------------------------------------
# Frontend: Next.js (Customer)
# -------------------------------------------------------------
check_frontend_nextjs() {
  local dir="${REPO_ROOT}/frontend/nextjs"
  if [ ! -d "$dir" ]; then
    log_warn "Directory ${dir} not found. Skipping."
    return 0
  fi

  print_header "Frontend: Next.js (Customer)"
  cd "$dir"

  if [ ! -d "node_modules" ]; then
    run_check "Next.js: Install dependencies (npm ci)" npm ci
  fi

  if [[ "$MODE" == "all" || "$MODE" == "frontend" || "$MODE" == "lint" ]]; then
    run_check "Next.js: ESLint (npm run lint)" npm run lint
  fi

  if [[ "$MODE" == "all" || "$MODE" == "frontend" || "$MODE" == "test" ]]; then
    run_check "Next.js: Unit tests (npm test)" npm test
  fi

  if [[ "$MODE" == "all" || "$MODE" == "frontend" || "$MODE" == "build" ]]; then
    run_check "Next.js: Build & TypeScript check (npm run build)" npm run build
  fi
}

# -------------------------------------------------------------
# Frontend: React (Admin)
# -------------------------------------------------------------
check_frontend_react() {
  local dir="${REPO_ROOT}/frontend/react"
  if [ ! -d "$dir" ]; then
    log_warn "Directory ${dir} not found. Skipping."
    return 0
  fi

  print_header "Frontend: React (Admin)"
  cd "$dir"

  if [ ! -d "node_modules" ]; then
    run_check "React: Install dependencies (npm ci)" npm ci
  fi

  if [[ "$MODE" == "all" || "$MODE" == "frontend" || "$MODE" == "lint" ]]; then
    run_check "React: ESLint (npm run lint)" npm run lint
  fi

  if [[ "$MODE" == "all" || "$MODE" == "frontend" || "$MODE" == "test" ]]; then
    run_check "React: Unit tests (npm test)" npm test
  fi

  if [[ "$MODE" == "all" || "$MODE" == "frontend" || "$MODE" == "build" ]]; then
    run_check "React: Build & TypeScript check (npm run build)" npm run build
  fi
}

# -------------------------------------------------------------
# Backend: Java / Gradle
# -------------------------------------------------------------
check_backend() {
  local dir="${REPO_ROOT}/backend"
  if [ ! -d "$dir" ]; then
    log_warn "Directory ${dir} not found. Skipping."
    return 0
  fi

  print_header "Backend: Gradle / Spring Boot"
  cd "$dir"

  local gradlew="./gradlew"
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]] && [ ! -x "$gradlew" ]; then
    if [ -f "gradlew.bat" ]; then
      gradlew="./gradlew.bat"
    fi
  fi

  if [[ "$MODE" == "all" || "$MODE" == "backend" || "$MODE" == "build" || "$MODE" == "lint" ]]; then
    run_check "Backend: Compile Java (:compileJava :compileTestJava)" $gradlew compileJava compileTestJava --no-daemon
  fi

  if [[ "$MODE" == "all" || "$MODE" == "backend" || "$MODE" == "test" ]]; then
    run_check "Backend: Unit tests (:test)" $gradlew test --no-daemon
  fi
}

# -------------------------------------------------------------
# Main Execution
# -------------------------------------------------------------
START_TIME=$(date +%s)
log_info "Starting CI checks in mode: ${MODE}"
log_info "Repository root: ${REPO_ROOT}"

if [[ "$MODE" != "backend" ]]; then
  check_frontend_nextjs
  check_frontend_react
fi

if [[ "$MODE" != "frontend" && "$MODE" != "lint" ]]; then
  check_backend
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "Summary (${DURATION}s)"

if [ ${#PASSED_STEPS[@]} -gt 0 ]; then
  echo -e "${GREEN}${BOLD}Passed checks (${#PASSED_STEPS[@]}):${NC}"
  for step in "${PASSED_STEPS[@]}"; do
    echo -e "  ${GREEN}✓${NC} ${step}"
  done
fi

if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}Failed checks (${#FAILED_STEPS[@]}):${NC}"
  for step in "${FAILED_STEPS[@]}"; do
    echo -e "  ${RED}✗${NC} ${step}"
  done
  echo ""
  log_error "One or more checks failed. Please fix the issues before merging."
  exit 1
else
  echo ""
  log_success "All checks passed successfully!"
  exit 0
fi
