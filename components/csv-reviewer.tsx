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

  // Handle file selection from upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Fetch and parse CSV from a Google Sheets URL
  const fetchGoogleSheetCSV = async (url: string) => {
    try {
      // Ensure the provided URL is in CSV export format.
      // For example, transform:
      // https://docs.google.com/spreadsheets/d/<sheetId>/edit?gid=<gid>
      // into:
      // https://docs.google.com/spreadsheets/d/<sheetId>/export?format=csv&id=<sheetId>&gid=<gid>
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
      if (googleSheetUrl.trim()) {
        fetchGoogleSheetCSV(googleSheetUrl.trim());
      }
    }
  };

  // Compute full name from "First name" and "Last name" fields
  const getFullName = (candidate: Candidate) => {
    const firstName = candidate["First name"] || "";
    const lastName = candidate["Last name"] || "";
    return `${firstName} ${lastName}`.trim() || "N/A";
  };

  // Get WhatsApp link from WhatsApp or Phone field
  const getWhatsAppLink = (candidate: Candidate) => {
    const contact = candidate["Phone (WhatsApp)"] || candidate["Phone"];
    if (!contact) return null;
    const number = contact.replace(/\D/g, "");
    return number ? `https://wa.me/${number}` : null;
  };

  // Format a date string into a proper English format if the key includes "date"
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold mb-4">CSV Reviewer</h2>

      {/* Source Type Toggle */}
      <div className="flex gap-4 mb-4">
        <Button
          variant={sourceType === "upload" ? "default" : "outline"}
          onClick={() => setSourceType("upload")}
        >
          Upload CSV
        </Button>
        <Button
          variant={sourceType === "googleSheet" ? "default" : "outline"}
          onClick={() => setSourceType("googleSheet")}
          disabled
        >
          Google Sheets URL
        </Button>
      </div>

      {/* Conditionally render input based on source type */}
      {sourceType === "upload" ? (
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4
                       file:rounded file:border-0 file:text-sm file:font-semibold
                       file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
          />
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Enter Google Sheets URL"
            value={googleSheetUrl}
            onChange={(e) => setGoogleSheetUrl(e.target.value)}
            className="w-full px-4 py-2 border rounded"
          />
        </div>
      )}

      <Button variant="outline" onClick={handleSubmit}>
        Submit CSV
      </Button>

      {/* Beautified Table View with Selected Columns */}
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
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getFullName(candidate)}
                  </td>
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

      {/* Responsive, Scrollable Modal for Candidate Details */}
      {selectedCandidate && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setSelectedCandidate(null)}
          ></div>
          {/* Modal Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 w-full max-w-2xl p-4 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-2 right-2 text-xl font-bold"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">Candidate Details</h3>
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-4">
              {selectedCandidate["LinkedIn Url"] && (
                <a
                  href={selectedCandidate["LinkedIn Url"]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="default">LinkedIn</Button>
                </a>
              )}
              {(selectedCandidate["Resume upload"] || selectedCandidate["CV"]) && (
                <a
                  href={selectedCandidate["Resume upload"] || selectedCandidate["CV"]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="default">Download Resume</Button>
                </a>
              )}
              {getWhatsAppLink(selectedCandidate) && (
                <a
                  href={getWhatsAppLink(selectedCandidate)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="default">WhatsApp</Button>
                </a>
              )}
            </div>
            {/* Beautified Candidate Details Table */}
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
