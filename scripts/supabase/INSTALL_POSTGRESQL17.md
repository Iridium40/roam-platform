# Install PostgreSQL 17

## Quick Fix

```bash
# Install PostgreSQL 17
brew install postgresql@17

# Add to PATH (so it's used instead of @14)
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

# Verify version
psql --version
# Should show: psql (PostgreSQL) 17.x

# Now run the export
./scripts/supabase/1-export-dev-schema-clean.sh
```

## Make Permanent (Optional)

To use PostgreSQL 17 by default, add to your `~/.zshrc`:

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Or Use Docker (No Installation Needed)

If you don't want to install PostgreSQL 17:

```bash
# Just run the Docker version
./scripts/supabase/1-export-dev-schema-docker.sh
```

