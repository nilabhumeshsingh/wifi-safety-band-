#!/usr/bin/env python3
"""
Robust Chunk-based flash writer for ESP32-C6.
Splits binary into 64KB chunks, auto-retries up to 10 times per chunk,
and re-scans available serial ports automatically on USB resets.
"""
import subprocess, sys, os, time, glob

BINARY = "/home/aditya/.cache/arduino/sketches/D3BB6196284EBE47471DE0CA7DF48D77/esp32_c6_wifi_tracker.ino.bin"
BASE_ADDR = 0x10000
CHUNK_SIZE = 64 * 1024  # 64KB chunks
TEMP_DIR = "/tmp/esp32_chunks"

def find_port():
    ports = sorted(glob.glob("/dev/ttyACM*") + glob.glob("/dev/ttyUSB*"))
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
        
        chunk_success = False
        retries = 10
        
        for attempt in range(retries):
            port = find_port()
            if not port:
                print(f"  [Attempt {attempt+1}/{retries}] Waiting for serial port to appear...")
                time.sleep(2)
                continue
            
            print(f"  [Attempt {attempt+1}/{retries}] Writing via {port}...")
            
            cmd = [
                sys.executable, "-m", "esptool",
                "--chip", "esp32c6",
                "--port", port,
                "--baud", "230400",
                "--after", "no-reset",
                "write-flash",
                "--flash-mode", "dio",
                f"0x{flash_addr:X}", chunk_file
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
            if result.returncode == 0:
                print(f"✓ Chunk {i+1} written successfully!")
                chunk_success = True
                break
            else:
                print(f"  Attempt {attempt+1} failed. Retrying in 2s...")
                time.sleep(2)
        
        if not chunk_success:
            print(f"❌ FAILED to write chunk {i+1} after {retries} attempts!")
            sys.exit(1)
        
        if i < num_chunks - 1:
            time.sleep(1.5)
    
    # Final hard reset
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
    
    print("\n✅ FLASH COMPLETE! Board is running the standalone Vercel firmware now.")

if __name__ == "__main__":
    main()
