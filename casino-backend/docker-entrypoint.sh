#!/bin/sh

echo "Starting application..."

echo "Waiting for database..."
sleep 5

echo "Running migrations..."
npm run migrate

echo "Running seeds..."
npm run seed

echo "Starting server..."
npm start
