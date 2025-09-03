#!/bin/bash

# Fix backend deployment by pushing schema with optional fields
echo "Fixing backend deployment..."

# Export backend database URL
export DATABASE_URL="postgresql://postgres:mMXWyeIXnJXKWsqWmgiHfReABwrgqVvN@postgres-8vk9.backend.internal:5432/backend"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Push schema to database
echo "Pushing schema to database..."
npx prisma db push --skip-generate

echo "Schema fix completed!"