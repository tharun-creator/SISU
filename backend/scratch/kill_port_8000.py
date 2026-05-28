import os
import subprocess
import sys

def kill_port_8000():
    try:
        # Run netstat to find process using port 8000
        output = subprocess.check_output("netstat -ano", shell=True).decode('utf-8', errors='ignore')
        lines = output.strip().split('\n')
        pids = []
        for line in lines:
            if ":8000" in line and "LISTENING" in line:
                parts = line.strip().split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    pids.append(pid)
        
        if not pids:
            print("No process found listening on port 8000.")
            return True
            
        print(f"Found PIDs using port 8000: {pids}")
        for pid in pids:
            try:
                print(f"Terminating process with PID {pid}...")
                subprocess.check_call(f"taskkill /F /PID {pid}", shell=True)
                print(f"Successfully terminated PID {pid}.")
            except Exception as e:
                print(f"Failed to terminate PID {pid}: {e}")
        return True
    except Exception as e:
        print(f"Error checking netstat: {e}")
        return False

if __name__ == "__main__":
    kill_port_8000()
