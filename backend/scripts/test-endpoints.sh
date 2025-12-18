#!/bin/bash

# Base URL
API_URL="http://localhost:5002/api"

echo "🧪 Testing API Endpoints..."
echo "=========================="

# 1. Test Admin Login
echo "1. Testing Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@psikologonuruslu.com", "password": "admin123"}')

echo "Response: $LOGIN_RESPONSE"

# Extract Token (using grep/sed as jq might not be installed)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login Failed! Cannot proceed."
  exit 1
else
  echo "✅ Login Successful! Token received."
fi

echo "--------------------------"

# 2. Test Get Blogs
echo "2. Testing Get Blogs..."
BLOGS_RESPONSE=$(curl -s -X GET "$API_URL/blog")
BLOG_COUNT=$(echo $BLOGS_RESPONSE | grep -o '"title":' | wc -l)

if [ $BLOG_COUNT -gt 0 ]; then
  echo "✅ Blogs Retrieved! Found $BLOG_COUNT blogs."
else
  echo "❌ Failed to retrieve blogs."
fi

echo "--------------------------"

# 3. Test Contact Form Submission
echo "3. Testing Contact Form..."
CONTACT_RESPONSE=$(curl -s -X POST "$API_URL/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test Message",
    "message": "This is a test message from the automated script."
  }')

echo "Response: $CONTACT_RESPONSE"

if [[ $CONTACT_RESPONSE == *"success\":true"* ]]; then
  echo "✅ Contact Message Sent Successfully!"
else
  echo "❌ Contact Message Failed."
fi

echo "=========================="
echo "🎉 All Tests Completed!"
