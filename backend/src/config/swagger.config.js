import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LeetCode Clone API',
      version: '1.0.0',
      description: 'A comprehensive coding practice platform API with problem solving, contests, and community features',
      contact: {
        name: 'API Support',
        email: 'support@leetcode-clone.com',
        url: 'https://leetcode-clone.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.leetcode-clone.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            fullName: {
              type: 'string',
              description: 'Full name of the user'
            },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN', 'MODERATOR'],
              description: 'User role'
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'Profile picture URL'
            },
            bio: {
              type: 'string',
              description: 'User biography'
            },
            location: {
              type: 'string',
              description: 'User location'
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Personal website'
            },
            github: {
              type: 'string',
              description: 'GitHub username'
            },
            linkedin: {
              type: 'string',
              description: 'LinkedIn profile URL'
            },
            isPremium: {
              type: 'boolean',
              description: 'Premium membership status'
            },
            isEmailVerified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        UserStats: {
          type: 'object',
          properties: {
            totalSolved: {
              type: 'integer',
              description: 'Total problems solved'
            },
            easyProblemsSolved: {
              type: 'integer',
              description: 'Easy problems solved'
            },
            mediumProblemsSolved: {
              type: 'integer',
              description: 'Medium problems solved'
            },
            hardProblemsSolved: {
              type: 'integer',
              description: 'Hard problems solved'
            },
            totalSubmissions: {
              type: 'integer',
              description: 'Total submissions'
            },
            acceptedSubmissions: {
              type: 'integer',
              description: 'Accepted submissions'
            },
            streak: {
              type: 'integer',
              description: 'Current solving streak'
            },
            longestStreak: {
              type: 'integer',
              description: 'Longest solving streak'
            },
            globalRanking: {
              type: 'integer',
              description: 'Global ranking position'
            },
            reputation: {
              type: 'integer',
              description: 'Reputation points'
            },
            contestRating: {
              type: 'integer',
              description: 'Contest rating'
            }
          }
        },
        Problem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            title: {
              type: 'string',
              description: 'Problem title'
            },
            slug: {
              type: 'string',
              description: 'URL-friendly slug'
            },
            description: {
              type: 'string',
              description: 'Problem description in markdown'
            },
            difficulty: {
              type: 'string',
              enum: ['EASY', 'MEDIUM', 'HARD'],
              description: 'Problem difficulty level'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Problem tags/topics'
            },
            examples: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  input: { type: 'string' },
                  output: { type: 'string' },
                  explanation: { type: 'string' }
                }
              }
            },
            constraints: {
              type: 'string',
              description: 'Problem constraints'
            },
            hints: {
              type: 'string',
              description: 'Problem hints'
            },
            acceptanceRate: {
              type: 'number',
              format: 'float',
              description: 'Acceptance rate percentage'
            },
            totalSubmissions: {
              type: 'integer',
              description: 'Total submission count'
            },
            totalAccepted: {
              type: 'integer',
              description: 'Total accepted submissions'
            },
            likes: {
              type: 'integer',
              description: 'Number of likes'
            },
            dislikes: {
              type: 'integer',
              description: 'Number of dislikes'
            },
            isPremium: {
              type: 'boolean',
              description: 'Premium-only problem'
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
              description: 'Problem status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Submission: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            userId: {
              type: 'string',
              format: 'uuid'
            },
            problemId: {
              type: 'string',
              format: 'uuid'
            },
            sourceCode: {
              type: 'string',
              description: 'Submitted source code'
            },
            language: {
              type: 'string',
              description: 'Programming language'
            },
            status: {
              type: 'string',
              enum: [
                'ACCEPTED',
                'WRONG_ANSWER',
                'TIME_LIMIT_EXCEEDED',
                'MEMORY_LIMIT_EXCEEDED',
                'RUNTIME_ERROR',
                'COMPILE_ERROR',
                'PENDING',
                'JUDGING'
              ]
            },
            passedTests: {
              type: 'integer',
              description: 'Number of passed test cases'
            },
            totalTests: {
              type: 'integer',
              description: 'Total test cases'
            },
            time: {
              type: 'string',
              description: 'Execution time'
            },
            memory: {
              type: 'string',
              description: 'Memory usage'
            },
            score: {
              type: 'integer',
              description: 'Submission score'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            statusCode: {
              type: 'integer',
              example: 400
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Success'
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string'
            },
            data: {
              type: 'array',
              items: {}
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                statusCode: 401,
                message: 'Authentication required',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                statusCode: 403,
                message: 'Access denied',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                statusCode: 404,
                message: 'Resource not found',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                statusCode: 400,
                message: 'Validation failed',
                errors: [
                  { field: 'email', message: 'Invalid email format' }
                ],
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User profile and management endpoints'
      },
      {
        name: 'Problems',
        description: 'Coding problem endpoints'
      },
      {
        name: 'Submissions',
        description: 'Code submission and execution endpoints'
      },
      {
        name: 'Contests',
        description: 'Contest management endpoints'
      },
      {
        name: 'Discussions',
        description: 'Discussion forum endpoints'
      },
      {
        name: 'Solutions',
        description: 'Solution sharing endpoints'
      },
      {
        name: 'Playlists',
        description: 'Problem playlist endpoints'
      },
      {
        name: 'Badges',
        description: 'Badge and achievement endpoints'
      },
      {
        name: 'Notifications',
        description: 'Notification endpoints'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;