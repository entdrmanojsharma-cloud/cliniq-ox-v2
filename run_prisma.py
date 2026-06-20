import os
import subprocess

# Load env variables from root .env
env_vars = {}
env_path = "/Users/Shared/Mobile app cliniq-OX/.env"
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip().strip('"').strip("'")

# Run prisma db push
my_env = {**os.environ, **env_vars}
res = subprocess.run(
    ["npx", "prisma", "db", "push", "--schema=database/schema.prisma"],
    env=my_env,
    cwd="/Users/Shared/Mobile app cliniq-OX/backend",
    capture_output=True,
    text=True
)
print("STDOUT:")
print(res.stdout)
print("STDERR:")
print(res.stderr)
