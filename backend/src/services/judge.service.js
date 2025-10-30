import axios from 'axios';
import { ApiError } from '../utils/apiError.js';
import { 
  JUDGE0_CONFIG, 
  getLanguageId, 
  mapJudge0Status,
  EXECUTION_LIMITS 
} from '../config/judge0.config.js';
import logger from '../utils/logger.js';

const judge0Api = axios.create(JUDGE0_CONFIG);

export const submitToJudge0 = async (sourceCode, languageId, stdin = '', expectedOutput = '') => {
  try {
    const submission = {
      source_code: Buffer.from(sourceCode).toString('base64'),
      language_id: languageId,
      stdin: stdin ? Buffer.from(stdin).toString('base64') : '',
      expected_output: expectedOutput ? Buffer.from(expectedOutput).toString('base64') : '',
      ...EXECUTION_LIMITS
    };

    const response = await judge0Api.post('/submissions?base64_encoded=true&wait=false', submission);

    logger.info('Code submitted to Judge0', { token: response.data.token });
    
    return response.data.token;
  } catch (error) {
    logger.error('Failed to submit to Judge0', { 
      error: error.message,
      response: error.response?.data 
    });
    
    if (error.response?.status === 429) {
      throw new ApiError(429, 'Rate limit exceeded. Please try again later.');
    }
    
    throw new ApiError(500, 'Failed to submit code for execution');
  }
};

export const getSubmissionResult = async (token, maxRetries = 10, retryDelay = 1000) => {
  try {
    let retries = 0;
    
    while (retries < maxRetries) {
      const response = await judge0Api.get(`/submissions/${token}?base64_encoded=true`);
      const result = response.data;

      const decodedResult = {
        ...result,
        stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : null,
        stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : null,
        compile_output: result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : null,
        message: result.message ? Buffer.from(result.message, 'base64').toString() : null
      };

      if (result.status.id === 1 || result.status.id === 2) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      logger.info('Got submission result from Judge0', { 
        token, 
        status: result.status.description 
      });

      return decodedResult;
    }

    throw new ApiError(408, 'Code execution timeout. Please try again.');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    logger.error('Failed to get submission result', { 
      error: error.message,
      token 
    });
    
    throw new ApiError(500, 'Failed to get execution result');
  }
};

export const executeCode = async (sourceCode, language, stdin = '') => {
  const languageId = getLanguageId(language);
  
  if (!languageId) {
    throw new ApiError(400, `Unsupported language: ${language}`);
  }

  const token = await submitToJudge0(sourceCode, languageId, stdin);

  const result = await getSubmissionResult(token);

  return {
    status: mapJudge0Status(result.status.id),
    stdout: result.stdout,
    stderr: result.stderr,
    compile_output: result.compile_output,
    message: result.message,
    time: result.time,
    memory: result.memory,
    statusDescription: result.status.description
  };
};

export const executeCodeWithTestCases = async (sourceCode, language, testCases) => {
  const languageId = getLanguageId(language);
  
  if (!languageId) {
    throw new ApiError(400, `Unsupported language: ${language}`);
  }
  const tokens = await Promise.all(
    testCases.map(tc => 
      submitToJudge0(sourceCode, languageId, tc.input, tc.output)
    )
  );

  const results = await Promise.all(
    tokens.map(token => getSubmissionResult(token))
  );

  return results.map((result, index) => ({
    testcase: index + 1,
    input: testCases[index].input,
    expectedOutput: testCases[index].output,
    actualOutput: result.stdout?.trim() || '',
    passed: result.status.id === 3,
    status: mapJudge0Status(result.status.id),
    stdout: result.stdout,
    stderr: result.stderr,
    compile_output: result.compile_output,
    time: result.time,
    memory: result.memory,
    statusDescription: result.status.description
  }));
};

export const batchSubmit = async (submissions) => {
  try {
    const response = await judge0Api.post('/submissions/batch?base64_encoded=true', {
      submissions: submissions.map(sub => ({
        source_code: Buffer.from(sub.sourceCode).toString('base64'),
        language_id: sub.languageId,
        stdin: sub.stdin ? Buffer.from(sub.stdin).toString('base64') : '',
        expected_output: sub.expectedOutput ? Buffer.from(sub.expectedOutput).toString('base64') : '',
        ...EXECUTION_LIMITS
      }))
    });

    return response.data.map(item => item.token);
  } catch (error) {
    logger.error('Batch submit failed', { error: error.message });
    throw new ApiError(500, 'Failed to submit batch');
  }
};

export const getBatchResults = async (tokens) => {
  try {
    const tokenString = tokens.join(',');
    const response = await judge0Api.get(`/submissions/batch?tokens=${tokenString}&base64_encoded=true`);
    
    return response.data.submissions.map(result => ({
      ...result,
      stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : null,
      stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : null,
      compile_output: result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : null,
      message: result.message ? Buffer.from(result.message, 'base64').toString() : null
    }));
  } catch (error) {
    logger.error('Get batch results failed', { error: error.message });
    throw new ApiError(500, 'Failed to get batch results');
  }
};