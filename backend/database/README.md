# Database Directory

This directory manages the data persistence layer for Stockox.

## Contents
- **`schema.sql`**: The raw PostgreSQL schema and migration script. Run this in your Supabase SQL Editor to initialize the tables, indexes, constraints, and mock demo data.
- **`connection.go`**: Go logic for initializing the GORM connection to the database.
- **`models/`**: GORM structural representations of the database tables.
- **`repositories/`**: Abstraction layer for all SQL queries. Controllers and Services must use these repositories rather than calling the `db` object directly.