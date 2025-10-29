class ApiResponse {
  constructor(statusCode = 200, data = null, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.timestamp = new Date().toISOString();
  }
}

export { ApiResponse };

// Usage examples:
// return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));