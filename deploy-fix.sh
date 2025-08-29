#!/bin/bash

# Fix Railway deployment by pushing schema with optional fields
echo "Fixing Railway deployment..."

# Export Railway database URL
export DATABASE_URL="postgresql://postgres:mMXWyeIXnJXKWsqWmgiHfReABwrgqVvN@postgres-8vk9.railway.internal:5432/railway"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Push schema to database
echo "Pushing schema to database..."
npx prisma db push --skip-generate

echo "Schema fix completed!"