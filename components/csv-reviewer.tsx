"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";

// Define a generic type for candidate data
interface Candidate {
  [key: string]: any;
}

// Define a type for model configuration
interface ModelConfig {
  value: string;
  endpoint: string;
  label: string;
  info: string;
  apiHandler: (prompt: string, apiToken: string) => Promise<string>;
}

// Define available models for screening
const availableModels: ModelConfig[] = [
  {
    value: "tiiuae/falcon-7b-instruct",
    endpoint: "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
    label: "Falcon 7B Instruct (Default)",
    info: "Falcon 7B: Known for its balanced performance.",
    apiHandler: async (prompt, apiToken) => {
      const response = await fetch("https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data[0]?.generated_text || data.generated_text || "No response generated.";
    },
  },
  {
    value: "mistralai/Mistral-7B-Instruct-v0.2",
    endpoint: "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
    label: "Mistral 7B Instruct",
    info: "Mistral 7B: Known for high-quality performance and good reasoning capabilities.",
    apiHandler: async (prompt, apiToken) => {
      const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.6,
            top_p: 0.9,
            return_full_text: false,
          },
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data[0]?.generated_text || data.generated_text || "No response generated.";
    },
  },
  {
    value: "HuggingFaceH4/zephyr-7b-beta",
    endpoint: "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta",
    label: "Zephyr 7B Beta",
    info: "Zephyr 7B: Optimized for chat and instruction-following tasks with strong performance.",
    apiHandler: async (prompt, apiToken) => {
      const response = await fetch("https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.5,
            top_k: 50,
            return_full_text: false,
          },
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data[0]?.generated_text || data.generated_text || "No response generated.";
    },
  },
  {
    value: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    label: "OpenAI GPT-3.5 Turbo",
    info: "Higher quality but with usage restrictions.",
    apiHandler: async (prompt, apiToken) => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant specialized in resume screening and candidate evaluation." },
            { role: "user", content: prompt },
          ],
          max_tokens: 300,
          temperature: 0.6,
          top_p: 1.0,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.choices[0]?.message?.content || "No response generated.";
    },
  },
];

// Utility function to get resume URL from candidate data
const getResumeUrl = (candidate: Candidate): string | null => {
  const possibleKeys = ["resume", "cv", "portfolio", "profile"];
  for (const key in candidate) {
    const lowerKey = key.toLowerCase();
    if (possibleKeys.some((term) => lowerKey.includes(term))) {
      const value = candidate[key];
      if (value && typeof value === "string" && value.trim() !== "") {
        return value.trim();
      }
    }
  }
  return null;
};

// Utility function to get LinkedIn URL from candidate data
const getLinkedInUrl = (candidate: Candidate): string | null => {
  for (const key in candidate) {
    if (key.toLowerCase().includes("linkedin")) {
      const value = candidate[key];
      if (value && typeof value === "string" && value.trim() !== "") {
        return value.trim();
      }
    }
  }
  return null;
};

// Utility function to get WhatsApp link from candidate data using multiple possible keys
const getWhatsAppLink = (candidate: Candidate): string | null => {
  const possibleKeys = ["phone", "number", "whatsapp", "contact"];
  for (const key in candidate) {
    if (possibleKeys.some((term) => key.toLowerCase().includes(term))) {
      const value = candidate[key];
      if (value && typeof value === "string" && value.trim() !== "") {
        const number = value.replace(/\D/g, "");
        if (number) {
          return `https://wa.me/${number}`;
        }
      }
    }
  }
  return null;
};

export default function CSVReviewer() {
  const [sourceType, setSourceType] = useState<"upload" | "googleSheet">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [screeningResult, setScreeningResult] = useState<string | null>(null);
  const [isScreening, setIsScreening] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  // Remove API token input from main view; token will be entered in modal instead.
  const [apiToken, setApiToken] = useState("");

  // State for selected model; default to the first available model.
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(availableModels[0]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Fetch CSV from Google Sheets URL
  const fetchGoogleSheetCSV = async (url: string) => {
    try {
      let csvUrl = url;
      if (url.includes("/edit")) {
        const sheetIdMatch = url.match(/\/d\/([^/]+)/);
        const gidMatch = url.match(/gid=([\d]+)/);
        if (sheetIdMatch && gidMatch) {
          const sheetId = sheetIdMatch[1];
          const gid = gidMatch[1];
          csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&id=${sheetId}&gid=${gid}`;
        }
      }
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch Google Sheet CSV data.");
      }
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCandidates(results.data as Candidate[]);
        },
        error: (err: any) => {
          console.error("Error parsing CSV:", err);
        },
      });
    } catch (error) {
      console.error("Error fetching Google Sheet:", error);
    }
  };

  // Parse CSV from uploaded file
  const parseUploadedCSV = () => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCandidates(results.data as Candidate[]);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
      },
    });
  };

  // Handle submission based on selected source type
  const handleSubmit = () => {
    if (sourceType === "upload") {
      parseUploadedCSV();
    } else {
      if (!googleSheetUrl.trim().includes("docs.google.com/spreadsheets/d/")) {
        alert("Please enter a valid Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/yourSheetId/edit?gid=yourGid).");
        return;
      }
      fetchGoogleSheetCSV(googleSheetUrl.trim());
    }
  };

  // Compute full name from candidate fields
  const getFullName = (candidate: Candidate) => {
    const firstName = candidate["First name"] || "";
    const lastName = candidate["Last name"] || "";
    return `${firstName} ${lastName}`.trim() || "N/A";
  };

  // Format a date string into a proper English format
  const formatValue = (key: string, value: any) => {
    if (typeof value === "string" && key.toLowerCase().includes("date")) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
    return value || "N/A";
  };

  // When a candidate is selected, set a default custom prompt for editing
  useEffect(() => {
    if (selectedCandidate) {
      const resumeUrl = getResumeUrl(selectedCandidate) || "N/A";
      const appliedFor = selectedCandidate["Position that you are applying for"] || "the specified role";
      const optionalInfo =
        selectedCandidate["Any past experience or project work that you would like to highlight? (Optional)"] ||
        "see resume";
      const defaultPrompt = `You are a hiring evaluator. Review the resume available with the following details:

Candidate Details:
Name: ${getFullName(selectedCandidate)}
Applied For: ${appliedFor}
Extra Info: ${optionalInfo} 
Provide a concise evaluation summary of the candidate's suitability for the position of ${appliedFor} 
Resume URL: ${resumeUrl}.`;
      setCustomPrompt(defaultPrompt);
    } else {
      setCustomPrompt("");
    }
  }, [selectedCandidate]);

  // Use selected model's API handler for resume screening using the custom prompt and API token
  const handleScreenResume = async () => {
    if (!selectedCandidate || !apiToken) {
      alert("Please enter a valid API token in the modal.");
      return;
    }
    setIsScreening(true);
    setScreeningResult(null);

    try {
      const result = await selectedModel.apiHandler(customPrompt, apiToken);
      setScreeningResult(result);
    } catch (error: any) {
      console.error("Error screening resume:", error);
      let errorMsg = "Unknown error.";
      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (error && typeof error === "object") {
        // Check if the error has an "error" property with a message
        if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else {
          errorMsg = JSON.stringify(error);
        }
      }
      setScreeningResult(`An error occurred: ${errorMsg}`);
    } finally {
      setIsScreening(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h3 className="text-2xl font-bold mb-4">Candidate Review & Screening Portal</h3>

      {/* Source Type Toggle */}
      <div className="flex gap-4 mb-4">
        <Button variant={sourceType === "upload" ? "default" : "outline"} onClick={() => setSourceType("upload")}>
          Upload CSV
        </Button>
        <Button variant={sourceType === "googleSheet" ? "default" : "outline"} onClick={() => setSourceType("googleSheet")}>
          Google Sheets URL
        </Button>
      </div>

      {/* Input and Submit Button in a Row */}
      {sourceType === "upload" ? (
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
          />
          <Button variant="outline" onClick={handleSubmit}>
            Submit CSV
          </Button>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Paste Google Sheets URL"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              className="w-full px-4 py-2 border rounded"
            />
            <Button variant="outline" onClick={handleSubmit}>
              Submit CSV
            </Button>
            <span
              title="Enter the URL from Google Sheets. Ensure your sheet is set to 'Anyone with the link can view' (or published as CSV) for proper access."
              className="h-5 w-5 text-gray-500"
            >
              ℹ️
            </span>
          </div>
          <small className="text-gray-500">Example: https://docs.google.com/spreadsheets/d/yourSheetId/edit?gid=yourGid</small>
        </div>
      )}

      {/* Beautified Table View */}
      {candidates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <thead className="bg-gray-100 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied For
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Institute
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
              {candidates.map((candidate, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedCandidate(candidate);
                    setScreeningResult(null);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getFullName(candidate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {candidate["Position that you are applying for"] || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {candidate["Institute"] || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Candidate Details */}
      {selectedCandidate && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setSelectedCandidate(null)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 w-full max-w-2xl p-4 relative max-h-[80vh] overflow-y-auto">
            <button onClick={() => setSelectedCandidate(null)} className="absolute top-2 right-2 text-xl font-bold">
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">Candidate Details</h3>

            {/* API Token & Model Selection inside Modal */}
            <div className="flex flex-col gap-2 mb-4">
              <label className="block font-medium">API Token</label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter API Token (Hugging Face or OpenAI)"
                className="w-full px-4 py-2 border rounded"
              />
              <small className="text-gray-500">
                {selectedModel.value.includes("huggingface") ? "Hugging Face API Token" : "OpenAI API Token"}
              </small>

              <div className="flex items-center gap-2">
                <label className="font-medium">Select Model:</label>
                <select
                  value={selectedModel.value}
                  onChange={(e) => {
                    const model = availableModels.find((m) => m.value === e.target.value);
                    if (model) {
                      setSelectedModel(model);
                    }
                  }}
                  className="px-4 py-2 border rounded"
                >
                  {availableModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <span title={selectedModel.info} className="h-5 w-5 text-gray-500">
                  ℹ️
                </span>
              </div>
            </div>

            {/* Custom Prompt Input */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">Custom Screening Prompt</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full p-2 border rounded h-32"
                placeholder="Edit the default prompt as needed..."
              />
            </div>

            {/* Screen Resume Button */}
            <div className="mb-4">
              <Button variant="default" onClick={handleScreenResume} disabled={isScreening}>
                {isScreening ? "Screening Resume..." : "Screen Resume"}
              </Button>
              {screeningResult && (
                <div className="mt-4 p-4 border rounded bg-gray-100">
                  <h4 className="font-semibold mb-2">Screening Result:</h4>
                  <p>{screeningResult}</p>
                </div>
              )}
            </div>

            {/* External Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-4">
              {getLinkedInUrl(selectedCandidate) && (
                <a href={getLinkedInUrl(selectedCandidate)!} target="_blank" rel="noopener noreferrer">
                  <Button variant="default">LinkedIn</Button>
                </a>
              )}
              {getResumeUrl(selectedCandidate) && (
                <a href={getResumeUrl(selectedCandidate)!} target="_blank" rel="noopener noreferrer">
                  <Button variant="default">Download Resume</Button>
                </a>
              )}
              {getWhatsAppLink(selectedCandidate) && (
                <a href={getWhatsAppLink(selectedCandidate)!} target="_blank" rel="noopener noreferrer">
                  <Button variant="default">WhatsApp</Button>
                </a>
              )}
            </div>

            {/* Candidate Details Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 bg-white dark:bg-gray-800">
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(selectedCandidate).map(([key, value]) => (
                    <tr key={key}>
                      <td className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300 capitalize border">
                        {key}
                      </td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100 border">
                        {formatValue(key, value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
