@echo off
setlocal
cd /d "%~dp0"

set "CMAKE=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
set "LIBCLANG_PATH=D:\Tools\LLVM\bin"
set "PATH=D:\Tools\LLVM\bin;D:\Tools\NASM\nasm-3.02;%USERPROFILE%\.cargo\bin;%PATH%"
set "CARGO_TARGET_DIR=%~dp0src-tauri\target"

if not exist "%CMAKE%" (
  echo ERROR: CMake was not found at "%CMAKE%".
  exit /b 1
)
if not exist "%LIBCLANG_PATH%\libclang.dll" (
  echo ERROR: libclang.dll was not found in "%LIBCLANG_PATH%".
  exit /b 1
)
where cargo.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: Cargo was not found. Install Rust first.
  exit /b 1
)
where nasm.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: NASM was not found.
  exit /b 1
)
if /i "%~1"=="--check" (
  "%CMAKE%" --version
  cargo --version
  nasm --version
  exit /b 0
)

if /i "%~1"=="--build" goto build
if exist "%CARGO_TARGET_DIR%\debug\desktop-standalone.ready" if exist "%CARGO_TARGET_DIR%\debug\shardbrowser-launcher.exe" goto launch

:build
echo Building the standalone desktop app. No web server will be started.
call npm.cmd run desktop:build
if errorlevel 1 exit /b 1
type nul > "%CARGO_TARGET_DIR%\debug\desktop-standalone.ready"

:launch
start "" "%CARGO_TARGET_DIR%\debug\shardbrowser-launcher.exe"
exit /b 0
