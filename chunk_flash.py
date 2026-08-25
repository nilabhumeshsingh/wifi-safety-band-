#!/usr/bin/env python3
"""
Chunk-based flash writer for ESP32-C6 with unstable USB Serial/JTAG.
Splits the binary into small chunks and writes each with esptool,
reconnecting between chunks to avoid USB disconnect.
"""
import subprocess, sys, os, time, glob

BINARY = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.cache/arduino/sketches/D3BB6196284EBE47471DE0CA7DF48D77/esp32_c6_wifi_tracker.ino.bin")
BASE_ADDR = 0x10000
CHUNK_SIZE = 64 * 1024  # 64KB chunks
TEMP_DIR = "/tmp/esp32_chunks"

def find_port():
    ports = sorted(glob.glob("/dev/ttyACM*"))
    return ports[0] if ports else None

def main():
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    with open(BINARY, "rb") as f:
        data = f.read()
    
    total = len(data)
    num_chunks = (total + CHUNK_SIZE - 1) // CHUNK_SIZE
    print(f"Binary size: {total} bytes, splitting into {num_chunks} chunks of {CHUNK_SIZE//1024}KB")
    
    for i in range(num_chunks):
        offset = i * CHUNK_SIZE
        chunk = data[offset:offset + CHUNK_SIZE]
        chunk_file = f"{TEMP_DIR}/chunk_{i:03d}.bin"
        flash_addr = BASE_ADDR + offset
        
        with open(chunk_file, "wb") as f:
            f.write(chunk)
        
        print(f"\n{'='*60}")
        print(f"CHUNK {i+1}/{num_chunks}: {len(chunk)} bytes at 0x{flash_addr:08X}")
        print(f"{'='*60}")
        
        # Find current port
        port = find_port()
        if not port:
            print("ERROR: No serial port found! Waiting 5s...")
            time.sleep(5)
            port = find_port()
            if not port:
                print("FATAL: No serial port after wait. Aborting.")
                sys.exit(1)
        
        print(f"Using port: {port}")
        
        # Use esptool with stub (faster per chunk) but only writing small chunk
        cmd = [
            sys.executable, "-m", "esptool",
            "--chip", "esp32c6",
            "--port", port,
            "--baud", "460800",
            "--after", "no-reset",
            "write-flash",
            "--flash-mode", "dio",
            f"0x{flash_addr:X}", chunk_file
        ]
        
        retries = 3
        for attempt in range(retries):
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                print(f"✓ Chunk {i+1} written successfully!")
                break
            else:
                print(f"Attempt {attempt+1} failed. Output:")
                print(result.stdout[-200:] if len(result.stdout) > 200 else result.stdout)
                print(result.stderr[-200:] if len(result.stderr) > 200 else result.stderr)
                if attempt < retries - 1:
                    print("Waiting 3s before retry...")
                    time.sleep(3)
                    port = find_port()
                    if port:
                        cmd[5] = port
                else:
                    print(f"FAILED to write chunk {i+1} after {retries} attempts!")
                    sys.exit(1)
        
        # Small delay between chunks to let USB recover
        if i < num_chunks - 1:
            time.sleep(2)
    
    # Final: hard reset the board
    print(f"\n{'='*60}")
    print("ALL CHUNKS WRITTEN! Resetting board...")
    print(f"{'='*60}")
    port = find_port()
    if port:
        subprocess.run([
            sys.executable, "-m", "esptool",
            "--chip", "esp32c6", "--port", port,
            "--after", "hard-reset", "read-mac"
        ], timeout=10)
    
    print("\n✅ FLASH COMPLETE! Board should be running new firmware now.")

if __name__ == "__main__":
    main()
