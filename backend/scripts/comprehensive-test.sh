#!/bin/bash

API_URL="http://localhost:5002/api"
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_NC='\033[0m' # No Color

function print_result {
    if [ $1 -eq 0 ]; then
        echo -e "${COLOR_GREEN}✅ $2 Passed${COLOR_NC}"
    else
        echo -e "${COLOR_RED}❌ $2 Failed${COLOR_NC}"
        echo "Response: $3"
    fi
}

echo "🚀 Starting Comprehensive Backend Tests..."

# 1. Health Check
echo "--- Health Check ---"
HEALTH_RES=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$HEALTH_RES" == "200" ]; then print_result 0 "Health Check"; else print_result 1 "Health Check" "$HEALTH_RES"; fi

# 2. Auth Tests
echo "--- Auth Tests ---"
# 2.1 Admin Login Success
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/admin/login" -H "Content-Type: application/json" -d '{"email": "admin@psikologonuruslu.com", "password": "admin123"}')
TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    print_result 0 "Admin Login"
else
    print_result 1 "Admin Login" "$LOGIN_RES"
    exit 1
fi

# 2.2 Admin Login Failure (Wrong Password)
FAIL_LOGIN_RES=$(curl -s -X POST "$API_URL/auth/admin/login" -H "Content-Type: application/json" -d '{"email": "admin@psikologonuruslu.com", "password": "wrongpassword"}')
if [[ $FAIL_LOGIN_RES == *"success\":false"* ]]; then print_result 0 "Admin Login Failure Check"; else print_result 1 "Admin Login Failure Check" "$FAIL_LOGIN_RES"; fi

# 3. Blog Tests
echo "--- Blog Tests ---"
# 3.1 Get All Blogs
BLOGS_RES=$(curl -s "$API_URL/blog")
if [[ $BLOGS_RES == *"success\":true"* ]]; then print_result 0 "Get All Blogs"; else print_result 1 "Get All Blogs" "$BLOGS_RES"; fi

# 3.2 Create Blog (Authorized)
CREATE_BLOG_RES=$(curl -s -X POST "$API_URL/blog" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Test Blog",
        "category": "genel",
        "summary": "Test Summary",
        "content": "Test Content",
        "published": "true"
    }')
if [[ $CREATE_BLOG_RES == *"success\":true"* ]]; then print_result 0 "Create Blog (Authorized)"; else print_result 1 "Create Blog (Authorized)" "$CREATE_BLOG_RES"; fi

# 3.3 Create Blog (Unauthorized)
FAIL_BLOG_RES=$(curl -s -X POST "$API_URL/blog" \
    -H "Content-Type: application/json" \
    -d '{"title": "Fail Blog"}')
if [[ $FAIL_BLOG_RES == *"No token provided"* ]] || [[ $FAIL_BLOG_RES == *"Unauthorized"* ]]; then print_result 0 "Create Blog (Unauthorized Check)"; else print_result 1 "Create Blog (Unauthorized Check)" "$FAIL_BLOG_RES"; fi

# 4. Contact Tests
echo "--- Contact Tests ---"
# 4.1 Send Message Success
CONTACT_RES=$(curl -s -X POST "$API_URL/contact" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Tester",
        "email": "tester@test.com",
        "subject": "Test Subject",
        "message": "Test Message"
    }')
if [[ $CONTACT_RES == *"success\":true"* ]]; then print_result 0 "Send Contact Message"; else print_result 1 "Send Contact Message" "$CONTACT_RES"; fi

# 4.2 Send Message Validation Error (Invalid Email)
FAIL_CONTACT_RES=$(curl -s -X POST "$API_URL/contact" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Tester",
        "email": "invalid-email",
        "subject": "Test Subject",
        "message": "Test Message"
    }')
if [[ $FAIL_CONTACT_RES == *"Validation failed"* ]]; then print_result 0 "Contact Validation Check"; else print_result 1 "Contact Validation Check" "$FAIL_CONTACT_RES"; fi

echo "🏁 Backend Tests Completed."
