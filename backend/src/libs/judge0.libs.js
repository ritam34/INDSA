import axios from "axios";

export const getJudge0LanguageId = (language) => {
  const languageMap = {
    JAVASCRIPT: 63,
    PYTHON: 71,
    JAVA: 62,
  };
  return languageMap[language.toUpperCase()];
};

export const getJudge0LanguageName = (languageId) => {
  const languageMap = {
    63: "JAVASCRIPT",
    71: "PYTHON",
    62: "JAVA",
  };
  return languageMap[languageId] || "UNKNOWN";
};

export const judge0Request = async (
  method,
  path,
  encoded,
  data,
  params = "",
) => {
  const url = `https://${process.env.JUDGE0_API_HOST}${path}?base64_encoded=${encoded}${params ? `&${params}` : ""}`;
  const options = {
    method,
    url,
    headers: {
      "x-rapidapi-key": process.env.JUDGE0_API_KEY,
      "x-rapidapi-host": process.env.JUDGE0_API_HOST,
      "Content-Type": "application/json",
    },
    data,
  };
  return await axios.request(options);
};

export const submitBatch = async (submissions) => {
  const { data } = await judge0Request("POST", "/submissions/batch", false, {
    submissions,
  });
  return data;
};

export const pollJudge0 = async (tokens) => {
  while (true) {
    const response = await judge0Request(
      "GET",
      "/submissions/batch",
      false,
      null,
      `tokens=${tokens.join(",")}`,
    );
    const result = response.data.submissions;
    if (!result) throw new ApiError(500, "Invalid response from Judge0");
    const isAllDone = result.every(
      (result) => result.status.id !== 1 && result.status.id !== 2,
    );
    if (isAllDone) return result;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};
