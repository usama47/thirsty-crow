"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";

// Define a generic type for candidate data
interface Candidate {
  [key: string]: any;
}

export default function CSVReviewer() {
  // Toggle between "upload" and "googleSheet" source types
  const [sourceType, setSourceType] = useState<"upload" | "googleSheet">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // State for resume screening result
  const [screeningResult, setScreeningResult] = useState<string | null>(null);
  const [isScreening, setIsScreening] = useState(false);

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
      // Validate Google Sheet URL format
      if (!googleSheetUrl.trim().includes("docs.google.com/spreadsheets/d/")) {
        alert("Please enter a valid Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/yourSheetId/edit?gid=yourGid).");
        return;
      }
      fetchGoogleSheetCSV(googleSheetUrl.trim());
    }
  };

  // Compute full name from "First name" and "Last name" fields
  const getFullName = (candidate: Candidate) => {
    const firstName = candidate["First name"] || "";
    const lastName = candidate["Last name"] || "";
    return `${firstName} ${lastName}`.trim() || "N/A";
  };

  // Get WhatsApp link using candidate phone info
  const getWhatsAppLink = (candidate: Candidate) => {
    const contact = candidate["Phone (WhatsApp)"] || candidate["Phone"];
    if (!contact) return null;
    const number = contact.replace(/\D/g, "");
    return number ? `https://wa.me/${number}` : null;
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

  // Use Hugging Face's Inference API for resume screening
  const handleScreenResume = async () => {
    if (!selectedCandidate) return;
    // For prototyping only: replace with your actual Hugging Face API token!
    const HF_API_TOKEN = "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";

    setIsScreening(true);
    setScreeningResult(null);

    const resumeUrl = selectedCandidate["Resume upload"] || selectedCandidate["CV"] || "N/A";
    const appliedFor = selectedCandidate["Position that you are applying for"] || "the specified role";
    const optionalInfo = selectedCandidate["Any past experience or project work that you would like to highlight? (Optional)"] || "see resume";
    const prompt = `You are a hiring evaluator. Review the resume available at the following URL:
    ${resumeUrl}

    Candidate Details:
    Name: ${getFullName(selectedCandidate)}
    Applied For: ${appliedFor}
    Extra Info: ${optionalInfo}
    Provide a concise evaluation summary of the candidate's suitability for the position of ${appliedFor}.`;

    try {
      const response = await fetch("https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HF_API_TOKEN}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.5,
          },
        }),
      });
      const data = await response.json();
      let result = "No response.";

      if (data.error) {
        result = data.error;
      } else if (data.generated_text) {
        result = data.generated_text.trim();
      } else if (Array.isArray(data) && data[0].generated_text) {
        result = data[0].generated_text.trim();
      }
      // Remove the prompt if it's echoed back (optional)
      result = result.replace(prompt, "").trim();
  
      setScreeningResult(result);
    } catch (error) {
      console.error("Error screening resume:", error);
      setScreeningResult("An error occurred while screening the resume.");
    } finally {
      setIsScreening(false);
    }
  };
  

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold mb-4">CSV Reviewer</h2>

      {/* Source Type Toggle */}
      <div className="flex gap-4 mb-4">
        <Button variant={sourceType === "upload" ? "default" : "outline"} onClick={() => setSourceType("upload")}>
          Upload CSV
        </Button>
        <Button variant={sourceType === "googleSheet" ? "default" : "outline"} onClick={() => setSourceType("googleSheet")}>
          Google Sheets URL
        </Button>
      </div>

      {/* Input Based on Source Type */}
      {sourceType === "upload" ? (
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-1 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
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
              placeholder="Enter Google Sheets URL"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              className="w-full px-4 py-2 border rounded"
            />
            <Button variant="outline" onClick={handleSubmit}>
              Submit CSV
            </Button>
            <span className="text-gray-500 text-xl" title="Enter the URL from Google Sheets. Ensure your sheet is set to 'Anyone with the link can view' and In Google Sheets, go to File > Publish to the web and publish it as CSV.">ℹ️</span>
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
          {/* Modal Overlay */}
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setSelectedCandidate(null)}></div>
          {/* Modal Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 w-full max-w-2xl p-4 relative max-h-[80vh] overflow-y-auto">
            <button onClick={() => setSelectedCandidate(null)} className="absolute top-2 right-2 text-xl font-bold">
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">Candidate Details</h3>
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
              {selectedCandidate["LinkedIn Url"] && (
                <a href={selectedCandidate["LinkedIn Url"]} target="_blank" rel="noopener noreferrer">
                  <Button variant="default">LinkedIn</Button>
                </a>
              )}
              {(selectedCandidate["Resume upload"] || selectedCandidate["CV"]) && (
                <a href={selectedCandidate["Resume upload"] || selectedCandidate["CV"]} target="_blank" rel="noopener noreferrer">
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
                      <td className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300 capitalize border">{key}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100 border">{formatValue(key, value)}</td>
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
