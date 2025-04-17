import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Webcam from "react-webcam";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import "../index.css";

function Predict() {
  const [file, setFile] = useState(null);
  // const [prediction, setPrediction] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [recommendations, setRecommendations] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState(null);
  const webcamRef = useRef(null);
  const resultsRef = useRef(null);

  // Add scroll to results when they're available
  useEffect(() => {
    if ((predictions.length > 0 || recommendations) && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [predictions, recommendations]); // Changed from [prediction, recommendations]

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Please select a valid image file (JPEG, PNG)");
        return;
      }
      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
        return;
      }
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImagePreview(imageSrc);
    // Convert base64 to file
    fetch(imageSrc)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], "webcam-capture.jpg", {
          type: "image/jpeg",
        });
        setFile(file);
        setError(null);
      });
    setShowCamera(false);
  };

  const getRecommendations = async (condition) => {
    try {
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is not configured");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro-latest",
      });

      const prompt = `Given the skin condition "${condition}", please provide:
      1. Brief description of the condition
      2. Dietary recommendations
      3. Lifestyle changes
      4. Skincare routine suggestions
      5. When to seek medical attention
      Please format the response in a clear, structured way.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      setRecommendations(text);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      let errorMessage =
        "Unable to fetch recommendations. Please try again later.";

      if (
        error.message?.includes("API key expired") ||
        error.message?.includes("API_KEY_INVALID")
      ) {
        errorMessage =
          "The API key has expired. Please contact support to get a new API key.";
      } else if (error.message?.includes("API key")) {
        errorMessage =
          "There's an issue with the API key configuration. Please check your settings.";
      }

      setRecommendations(errorMessage);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPredictions([]); // Reset predictions
    setRecommendations(""); // Reset recommendations
    const formData = new FormData();
    formData.append("file", file);

    try {
      // First check if the backend is healthy
      const healthCheck = await fetch(
        `${process.env.REACT_APP_BACKEND_URL.replace(/\/$/, "")}/health`
      );
      if (!healthCheck.ok) {
        throw new Error("Backend service is not available");
      }

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/predict`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Network response was not ok");
      }

      const data = await response.json();

      // Ensure predictions is always an array
      const receivedPredictions = Array.isArray(data.predictions)
        ? data.predictions
        : [];

      setPredictions(receivedPredictions);

      // Only get recommendations if we have predictions
      if (receivedPredictions.length > 0) {
        await getRecommendations(receivedPredictions[0].label);
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Error occurred during prediction");
      setPredictions([]);
      setRecommendations("");
    } finally {
      setIsLoading(false);
    }
  };

  const formatRecommendations = (text) => {
    let formattedText = text.replace(/##/g, "").replace(/\*\*/g, "");

    formattedText = formattedText.replace(/(\d+)\.\s+([^\n]+)/g, "## $1. $2");

    return formattedText;
  };

  return (
    <div className="flex flex-col">
      <div className="flex-grow bg-gradient-to-r from-purple-50 to-blue-50 page-wrapper">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto px-4 py-8"
        >
          <h1 className="text-4xl font-bold text-purple-700 text-center mb-8 mt-10 lg:mt-0">
            Skin Condition Analysis
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative">
                {showCamera ? (
                  <div className="relative">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full rounded-lg"
                    />
                    <button
                      onClick={captureImage}
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800 transition duration-300"
                    >
                      Capture
                    </button>
                  </div>
                ) : imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">No image selected</p>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-purple-700 mb-4">
                  Upload Image
                </h2>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowCamera(!showCamera)}
                    className="w-full bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition duration-300"
                  >
                    {showCamera ? "Hide Camera" : "Use Camera"}
                  </button>
                  <div className="relative">
                    <input
                      type="file"
                      id="file-upload"
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <label
                      htmlFor="file-upload"
                      className="w-full bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800 transition duration-300 cursor-pointer block text-center"
                    >
                      Choose File
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleSubmit}
                disabled={!file || isLoading}
                className={`bg-purple-700 text-white px-8 py-3 rounded-lg transition duration-300 ${
                  !file || isLoading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-purple-800"
                }`}
              >
                {isLoading ? "Analyzing..." : "Analyze Image"}
              </button>
            </div>
          </div>

          {(predictions.length > 0 || recommendations) && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-xl p-6"
            >
              <h2 className="text-2xl font-semibold text-purple-700 mb-4">
                Diagnosis Results
              </h2>

              {predictions.map((prediction, index) => (
                <div key={index} className="mb-6">
                  <div className="p-4 bg-purple-50 rounded-lg mb-3">
                    <h3 className="text-lg font-semibold text-purple-700">
                      {index + 1}. {prediction.label}
                      <span className="text-gray-600 ml-2">
                        ({(prediction.confidence * 100).toFixed(1)}% confidence)
                      </span>
                    </h3>
                    {index === 0 && prediction.subcategories && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-600">
                          Possible subconditions:
                        </p>
                        <ul className="list-disc pl-6 mt-1">
                          {prediction.subcategories?.map((sub, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                              {sub}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {recommendations && (
                <div>
                  <h2 className="text-2xl font-semibold text-purple-700 mb-4">
                    Recommendations
                  </h2>
                  <div className="prose prose-purple max-w-none">
                    <div className="space-y-4 text-gray-700">
                      <ReactMarkdown
                        components={{
                          h2: ({ children }) => (
                            <h2 className="text-xl font-semibold text-purple-700 mt-6 mb-3">
                              {children}
                            </h2>
                          ),
                          p: ({ children }) => (
                            <p className="text-gray-700 mb-4">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-6 mb-4">{children}</ul>
                          ),
                          li: ({ children }) => (
                            <li className="text-gray-700 mb-2">{children}</li>
                          ),
                        }}
                      >
                        {formatRecommendations(recommendations)}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default Predict;
