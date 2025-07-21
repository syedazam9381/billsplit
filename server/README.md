# Bill Splitter Backend API

A Node.js/Express backend API for the Bill Splitter application that handles bill management, file uploads, and split calculations.

## Features

- **Bill Management**: Create, read, update, and delete bills
- **Session Management**: Handle bill splitting sessions
- **File Upload**: Upload and process receipt images
- **Split Calculation**: Automatically calculate bill splits among friends
- **Rate Limiting**: Protect against abuse
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Robust error handling and logging

## API Endpoints

### Health Check
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed health information

### Bill Management
- `POST /api/v1/bills/session` - Create a new bill session
- `GET /api/v1/bills/session/:sessionId` - Get bill session
- `PUT /api/v1/bills/session/:sessionId/items` - Update session items
- `PUT /api/v1/bills/session/:sessionId/friends` - Update session friends
- `POST /api/v1/bills/session/:sessionId/calculate` - Calculate bill split
- `POST /api/v1/bills` - Save final bill
- `GET /api/v1/bills` - Get all bills (paginated)
- `GET /api/v1/bills/:billId` - Get specific bill
- `DELETE /api/v1/bills/:billId` - Delete bill

### File Upload
- `POST /api/v1/upload/receipt` - Upload receipt image
- `GET /api/v1/upload/file/:fileId` - Get file information
- `DELETE /api/v1/upload/file/:fileId` - Delete uploaded file
- `POST /api/v1/upload/cleanup` - Clean up old files

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `MAX_FILE_SIZE` - Maximum file upload size in bytes
- `UPLOAD_DIR` - Directory for uploaded files
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- File type validation
- File size limits

## File Upload

The API supports receipt image uploads with the following features:
- Image processing and optimization with Sharp
- File type validation (JPEG, PNG, WebP)
- File size limits
- Automatic cleanup of old files

## Data Storage

Currently uses in-memory storage for development. In production, you should integrate with a proper database like PostgreSQL, MongoDB, or MySQL.

## Error Handling

The API returns consistent error responses:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": [] // Additional validation details if applicable
}
```

## Rate Limiting

- General API: 100 requests per 15 minutes
- File uploads: 5 uploads per 15 minutes
- Sensitive operations: 10 requests per 15 minutes