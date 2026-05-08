# CORS Configuration & Deployment Guide

## Issue
CORS (Cross-Origin Resource Sharing) errors prevented the frontend on Vercel from communicating with the backend on Render:
```
Access to fetch at 'https://audit-ledger-scrutiny.onrender.com/api/auth/me' from origin 'https://audit-ledger-scrutiny.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

## Root Cause
- Frontend and backend are hosted on different domains (Vercel vs Render)
- Backend CORS middleware wasn't explicitly configured with Vercel domain
- Frontend fetch requests weren't including CORS-required options

## Solution Summary

### 1. Backend (Render) Configuration

**File**: `backend/main.py`

Updated CORS middleware to:
- Parse `ALLOWED_ORIGINS` environment variable from deployment
- Default to common development origins if not specified
- Include `max_age: 3600` for preflight request caching

**Required Environment Variables on Render**:
```
ALLOWED_ORIGINS=https://audit-ledger-scrutiny.vercel.app,https://www.audit-ledger-scrutiny.vercel.app,http://localhost:3000,http://localhost:5173
```

✅ This is already configured in `render.yaml`

### 2. Frontend (Vercel) Configuration

#### API Client Updates
**File**: `frontend/src/api/client.ts`

Added CORS headers to all fetch requests:
```typescript
fetch(url, {
  mode: 'cors',              // Enable CORS for this request
  credentials: 'include',    // Include cookies if needed
  headers: { ... },
  ...
})
```

#### Environment Variables
**File**: `frontend/.env.production`

```
VITE_API_URL=https://audit-ledger-scrutiny.onrender.com
```

**Also set in Vercel Dashboard**:
- Project Settings → Environment Variables
- Add: `VITE_API_URL` = `https://audit-ledger-scrutiny.onrender.com`

### 3. Vercel Configuration

**File**: `frontend/vercel.json`

- Updated rewrite rules to use correct backend URL (`https://audit-ledger-scrutiny.onrender.com`)
- Added environment variable references for build time

## Deployment Steps

### Deploy Backend to Render
1. Push changes to GitHub
2. Render auto-deploys when changes are detected
3. Verify `ALLOWED_ORIGINS` environment variable is set in Render dashboard

### Deploy Frontend to Vercel
1. Push changes to GitHub
2. Vercel auto-deploys when changes are detected
3. Set environment variable in Vercel Dashboard:
   - **Project Settings** → **Environment Variables**
   - Add: `VITE_API_URL=https://audit-ledger-scrutiny.onrender.com`
   - Apply to Production environment

### Testing

1. Open the app: https://audit-ledger-scrutiny.vercel.app
2. Try logging in or any API call
3. Check browser console (F12 → Console) for errors
4. Should see successful API requests

## Troubleshooting

### Still getting CORS errors?

1. **Clear browser cache**: Press `Ctrl+Shift+Delete`, clear all data
2. **Check network tab**: F12 → Network → Look for preflight OPTIONS requests
3. **Verify environment variable**: Vercel Dashboard → Project Settings → Environment Variables
4. **Check backend logs**: Render Dashboard → Logs for any errors
5. **Test backend directly**: Visit https://audit-ledger-scrutiny.onrender.com/docs

### If backend is on free tier:
- May spin down after 15 mins of inactivity
- First request might take 30+ seconds
- Consider upgrading to paid plan for production use

## Files Modified

- ✅ `backend/main.py` - Updated CORS configuration
- ✅ `frontend/src/api/client.ts` - Added CORS headers to all fetch calls
- ✅ `frontend/.env.production` - Set API URL for production builds
- ✅ `frontend/vercel.json` - Updated backend URL and environment config
- ✅ `render.yaml` - Configured ALLOWED_ORIGINS with Vercel domain

## Key Changes

### Before
```python
# Backend: Any origin allowed with wildcard
ALLOWED_ORIGINS = ["*"]
```

```javascript
// Frontend: Basic fetch without CORS options
fetch(url, { headers: ... })
```

### After
```python
# Backend: Explicit origins configured, wildcard as fallback
ALLOWED_ORIGINS = [
  "https://audit-ledger-scrutiny.vercel.app",
  "https://www.audit-ledger-scrutiny.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "*"  # Fallback
]
```

```javascript
// Frontend: CORS-enabled fetch requests
fetch(url, {
  mode: 'cors',
  credentials: 'include',
  headers: { ... }
})
```

## References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [FastAPI CORS Documentation](https://fastapi.tiangolo.com/tutorial/cors/)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Render Environment Variables](https://render.com/docs/environment-variables)
