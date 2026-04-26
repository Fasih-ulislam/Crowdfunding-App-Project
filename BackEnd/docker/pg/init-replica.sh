#!/bin/bash
# ── init-replica.sh ───────────────────────────────────────────────────────────
# Runs inside the replica container on first boot.
# Uses pg_basebackup to take a full physical copy of the master,
# then writes standby.signal so Postgres knows to start in replica mode.

set -e

PGDATA=/var/lib/postgresql/data
MASTER_HOST=pg-master
MASTER_PORT=5432
REPL_USER=${POSTGRES_USER}
REPL_PASS=${POSTGRES_PASSWORD}

echo "Replica init: checking if data directory is empty..."

# Only run if data dir is empty (first boot)
if [ -z "$(ls -A $PGDATA 2>/dev/null)" ]; then
  echo "Replica init: data directory empty — cloning master with pg_basebackup..."

  # Wait for master to be fully ready
  until pg_isready -h $MASTER_HOST -p $MASTER_PORT -U $REPL_USER; do
    echo "Replica init: waiting for master to be ready..."
    sleep 2
  done

  # pg_basebackup: takes a binary copy of master's data directory
  # -R flag writes postgresql.auto.conf with primary_conninfo automatically
  pg_basebackup \
    -h $MASTER_HOST \
    -p $MASTER_PORT \
    -U $REPL_USER \
    -D $PGDATA \
    -Fp \
    -Xs \
    -P \
    -R

  echo "Replica init: pg_basebackup complete"

  # standby.signal file tells Postgres to start in standby (replica) mode
  touch $PGDATA/standby.signal

  # Override connection info to point to master
  cat >> $PGDATA/postgresql.auto.conf <<EOF
primary_conninfo = 'host=${MASTER_HOST} port=${MASTER_PORT} user=${REPL_USER} password=${REPL_PASS}'
EOF

  # Fix permissions — Postgres is strict about data dir ownership
  chmod 700 $PGDATA

  echo "Replica init: standby configured — starting replica..."
else
  echo "Replica init: data directory exists — skipping pg_basebackup"
fi
